"""Add clips from another GLB of the same character into an existing loadout GLB, without re-exporting.

    py add_loadout_clips.py <base.glb> <add.glb> <out.glb> [--rename old=new ...] [--hide node ...] [--show node ...]
                            [--clips name ...]

The base file is kept as is (meshes, skin, weapons, clips). From the add file only animations are copied, byte for
byte (keys, times, interpolation): each channel is retargeted by node name (after --rename, e.g. the add file's
`weapon` bone -> the base file's `weapon_rifle`), channels on nodes the base file does not have (e.g. the add file's
own gun mesh node) are dropped. The rest pose of every animated node must match between the files (checked), so the
same keys give the same pose. Each added clip also gets a constant scale key: 0 on --hide nodes (the base file's
other weapons), 1 on --show nodes.
"""
import struct
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))
from merge_loadout_glbs import read_glb, write_glb, view_bytes, append_view


def args_after(args, flag):
    out = []
    if flag in args:
        i = args.index(flag) + 1
        while i < len(args) and not args[i].startswith('--'):
            out.append(args[i]); i += 1
    return out


def main():
    args = sys.argv[1:]
    base_path, add_path, out_path = args[:3]
    renames = dict(a.split('=') for a in args_after(args, '--rename'))
    hide, show, only = args_after(args, '--hide'), args_after(args, '--show'), args_after(args, '--clips')
    base, bbin = read_glb(base_path)
    add, abin = read_glb(add_path)
    index = {n.get('name'): i for i, n in enumerate(base['nodes'])}
    memo = {}

    def copy_accessor(i):
        if i not in memo:
            acc = dict(add['accessors'][i])
            src = add['bufferViews'][acc['bufferView']]
            extra = {k: v for k, v in src.items() if k not in ('buffer', 'byteOffset', 'byteLength')}
            acc['bufferView'] = append_view(base, bbin, view_bytes(add, abin, acc['bufferView']), extra)
            base['accessors'].append(acc)
            memo[i] = len(base['accessors']) - 1
        return memo[i]

    existing = {a['name'] for a in base['animations']}
    checked, dropped = set(), set()
    t_acc = len(base['accessors'])
    base['accessors'].append({'bufferView': append_view(base, bbin, struct.pack('<f', 0.0)), 'componentType': 5126, 'count': 1, 'type': 'SCALAR', 'min': [0.0], 'max': [0.0]})
    base['accessors'].append({'bufferView': append_view(base, bbin, struct.pack('<3f', 0, 0, 0)), 'componentType': 5126, 'count': 1, 'type': 'VEC3'})
    base['accessors'].append({'bufferView': append_view(base, bbin, struct.pack('<3f', 1, 1, 1)), 'componentType': 5126, 'count': 1, 'type': 'VEC3'})
    added = []
    for anim in add['animations']:
        if only and anim['name'] not in only:
            continue
        assert anim['name'] not in existing, f'clip already in the base file: {anim["name"]}'
        new = {'name': anim['name'], 'samplers': [], 'channels': []}
        for c in anim['channels']:
            src_node = add['nodes'][c['target']['node']]
            name = renames.get(src_node['name'], src_node['name'])
            if name not in index:
                dropped.add(src_node['name']); continue
            if name not in checked:
                dst = base['nodes'][index[name]]
                for key, rest in (('translation', [0, 0, 0]), ('rotation', [0, 0, 0, 1]), ('scale', [1, 1, 1])):
                    a, b = src_node.get(key, rest), dst.get(key, rest)
                    assert max(abs(x - y) for x, y in zip(a, b)) < 1e-5, f'rest pose differs: {name} {key} {a} {b}'
                checked.add(name)
            s = dict(anim['samplers'][c['sampler']])
            s['input'], s['output'] = copy_accessor(s['input']), copy_accessor(s['output'])
            new['samplers'].append(s)
            new['channels'].append({'sampler': len(new['samplers']) - 1, 'target': {'node': index[name], 'path': c['target']['path']}})
        for names, out_acc in ((hide, t_acc + 1), (show, t_acc + 2)):
            for name in names:
                node = index[name]
                new['channels'] = [c for c in new['channels'] if not (c['target']['node'] == node and c['target']['path'] == 'scale')]
                new['samplers'].append({'input': t_acc, 'output': out_acc, 'interpolation': 'STEP'})
                new['channels'].append({'sampler': len(new['samplers']) - 1, 'target': {'node': node, 'path': 'scale'}})
        base['animations'].append(new); added.append(new['name'])
    write_glb(out_path, base, bbin)
    print('added', added, 'rest-checked nodes', len(checked), 'dropped channels on', sorted(dropped))
    print('clips', [a['name'] for a in base['animations']])


if __name__ == '__main__':
    main()
