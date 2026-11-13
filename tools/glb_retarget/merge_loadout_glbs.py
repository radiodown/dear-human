"""Merge two loadout GLBs of the same character into one file without re-exporting.

    py merge_loadout_glbs.py <base.glb> <add.glb> <out.glb> [--base-rename old=new ...] [--add-rename old=new ...]

The base file is kept as is (character mesh, skin, its weapon and clips). From the add file the
weapon subtrees below Hips (bones that the base skeleton does not have), their meshes/materials/
textures and every animation are copied byte for byte: no retarget, no IK, no resampling.
Weapon bones are renamed with the rename maps (a mesh child that shares the bone's name becomes
<new>_mesh). Each clip gets a constant scale-0 key on the weapon bones of the other file so only
that clip's weapons are visible; rest scales stay as authored so viewers can still measure them.
"""
import json
import struct
import sys

COMPONENTS = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4, 'MAT4': 16}


def read_glb(path):
    with open(path, 'rb') as f:
        data = f.read()
    assert data[:4] == b'glTF'
    n = struct.unpack_from('<I', data, 12)[0]
    gltf = json.loads(data[20:20 + n])
    m = struct.unpack_from('<I', data, 20 + n)[0]
    return gltf, bytearray(data[28 + n:28 + n + m])


def write_glb(path, gltf, bin_):
    while len(bin_) % 4:
        bin_.append(0)
    gltf['buffers'] = [{'byteLength': len(bin_)}]
    text = json.dumps(gltf, ensure_ascii=False, separators=(',', ':')).encode('utf-8')
    text += b' ' * (-len(text) % 4)
    with open(path, 'wb') as f:
        f.write(b'glTF' + struct.pack('<II', 2, 28 + len(text) + len(bin_)))
        f.write(struct.pack('<I', len(text)) + b'JSON' + text)
        f.write(struct.pack('<I', len(bin_)) + b'BIN\0' + bytes(bin_))


def view_bytes(gltf, bin_, index):
    view = gltf['bufferViews'][index]
    start = view.get('byteOffset', 0)
    return bin_[start:start + view['byteLength']]


def append_view(gltf, bin_, payload, extra=None):
    while len(bin_) % 4:
        bin_.append(0)
    view = {'buffer': 0, 'byteOffset': len(bin_), 'byteLength': len(payload)}
    view.update(extra or {})
    bin_.extend(payload)
    gltf['bufferViews'].append(view)
    return len(gltf['bufferViews']) - 1


def parse_renames(args, flag):
    out = {}
    if flag in args:
        i = args.index(flag) + 1
        while i < len(args) and not args[i].startswith('--'):
            old, new = args[i].split('=')
            out[old] = new
            i += 1
    return out


def weapon_roots(gltf, shared):
    """Children of Hips that are not part of the shared skeleton."""
    hips = next(i for i, n in enumerate(gltf['nodes']) if n.get('name', '').endswith('Hips'))
    return hips, [c for c in gltf['nodes'][hips]['children'] if gltf['nodes'][c]['name'] not in shared]


def rename_subtree(gltf, root, renames):
    node = gltf['nodes'][root]
    old = node['name']
    new = renames.get(old, old)
    node['name'] = new
    for child in node.get('children', []):
        if gltf['nodes'][child]['name'] == old:
            gltf['nodes'][child]['name'] = new + '_mesh'


def main():
    args = sys.argv[1:]
    base_path, add_path, out_path = args[:3]
    base, bbin = read_glb(base_path)
    add, abin = read_glb(add_path)
    for g in (base, add):
        assert len(g['skins']) == 1 and not any('sparse' in a for a in g['accessors'])

    # shared nodes: same name in both files and not under a weapon bone
    def owner_names(g):
        hips = next(i for i, n in enumerate(g['nodes']) if n.get('name', '').endswith('Hips'))
        names, stack = set(), [i for i in g['scenes'][0]['nodes']]
        while stack:
            i = stack.pop()
            n = g['nodes'][i]
            names.add(n['name'])
            for c in n.get('children', []):
                if i == hips and not g['nodes'][c]['name'].startswith('mixamorig'):
                    continue
                stack.append(c)
        return names
    shared = owner_names(base) & owner_names(add)
    base_index = {n['name']: i for i, n in enumerate(base['nodes']) if n['name'] in shared}
    for i, n in enumerate(add['nodes']):
        if n['name'] not in shared:
            continue
        m = base['nodes'][base_index[n['name']]]
        for key, rest in (('translation', [0, 0, 0]), ('rotation', [0, 0, 0, 1]), ('scale', [1, 1, 1])):
            a, b = n.get(key, rest), m.get(key, rest)
            assert max(abs(x - y) for x, y in zip(a, b)) < 1e-6, f'rest pose differs: {n["name"]} {key}'

    base_hips, base_weapons = weapon_roots(base, shared)
    add_hips, add_weapons = weapon_roots(add, shared)
    for root in base_weapons:
        rename_subtree(base, root, parse_renames(args, '--base-rename'))
    for root in add_weapons:
        rename_subtree(add, root, parse_renames(args, '--add-rename'))

    # --- copy helpers (memoised by source index) ---
    memo = {'view': {}, 'accessor': {}, 'image': {}, 'texture': {}, 'material': {}, 'mesh': {}, 'sampler': {}}

    def copy_view(i):
        if i not in memo['view']:
            src = add['bufferViews'][i]
            extra = {k: v for k, v in src.items() if k not in ('buffer', 'byteOffset', 'byteLength')}
            memo['view'][i] = append_view(base, bbin, view_bytes(add, abin, i), extra)
        return memo['view'][i]

    def copy_accessor(i):
        if i not in memo['accessor']:
            acc = dict(add['accessors'][i])
            acc['bufferView'] = copy_view(acc['bufferView'])
            base['accessors'].append(acc)
            memo['accessor'][i] = len(base['accessors']) - 1
        return memo['accessor'][i]

    def copy_texture(i):
        if i not in memo['texture']:
            tex = dict(add['textures'][i])
            if 'sampler' in tex:
                s = tex['sampler']
                if s not in memo['sampler']:
                    base.setdefault('samplers', []).append(dict(add['samplers'][s]))
                    memo['sampler'][s] = len(base['samplers']) - 1
                tex['sampler'] = memo['sampler'][s]
            s = tex['source']
            if s not in memo['image']:
                img = dict(add['images'][s])
                img['bufferView'] = copy_view(img['bufferView'])
                base['images'].append(img)
                memo['image'][s] = len(base['images']) - 1
            tex['source'] = memo['image'][s]
            base['textures'].append(tex)
            memo['texture'][i] = len(base['textures']) - 1
        return memo['texture'][i]

    def remap_textures(obj):
        if isinstance(obj, dict):
            return {k: (copy_texture(v) if k == 'index' and 'index' in obj and isinstance(v, int) else remap_textures(v)) for k, v in obj.items()}
        if isinstance(obj, list):
            return [remap_textures(v) for v in obj]
        return obj

    def copy_material(i):
        if i not in memo['material']:
            base['materials'].append(remap_textures(add['materials'][i]))
            memo['material'][i] = len(base['materials']) - 1
        return memo['material'][i]

    def copy_mesh(i):
        if i not in memo['mesh']:
            mesh = json.loads(json.dumps(add['meshes'][i]))
            for prim in mesh['primitives']:
                assert 'targets' not in prim
                prim['attributes'] = {k: copy_accessor(v) for k, v in prim['attributes'].items()}
                if 'indices' in prim:
                    prim['indices'] = copy_accessor(prim['indices'])
                if 'material' in prim:
                    prim['material'] = copy_material(prim['material'])
            base['meshes'].append(mesh)
            memo['mesh'][i] = len(base['meshes']) - 1
        return memo['mesh'][i]

    # --- weapon subtrees of the add file ---
    node_map = {i: base_index[n['name']] for i, n in enumerate(add['nodes']) if n['name'] in shared}

    def copy_node(i):
        node = json.loads(json.dumps(add['nodes'][i]))
        assert 'skin' not in node
        base['nodes'].append(node)
        new = node_map[i] = len(base['nodes']) - 1
        if 'mesh' in node:
            node['mesh'] = copy_mesh(node['mesh'])
        if 'children' in node:
            node['children'] = [copy_node(c) for c in add['nodes'][i]['children']]
        return new

    new_weapons = [copy_node(root) for root in add_weapons]
    base['nodes'][base_hips]['children'].extend(new_weapons)
    names = [n['name'] for n in base['nodes']]
    assert len(set(names)) == len(names), 'node names still collide; add a rename'

    # skin: append the added weapon bones with their own inverse bind matrices
    skin, add_skin = base['skins'][0], add['skins'][0]
    def ibm_bytes(g, b, s):
        acc = g['accessors'][s['inverseBindMatrices']]
        start = acc.get('byteOffset', 0)
        return bytearray(view_bytes(g, b, acc['bufferView'])[start:start + 64 * len(s['joints'])])
    ibm, add_ibm = ibm_bytes(base, bbin, skin), ibm_bytes(add, abin, add_skin)
    for root, new in zip(add_weapons, new_weapons):
        if root in add_skin['joints']:
            j = add_skin['joints'].index(root)
            ibm.extend(add_ibm[64 * j:64 * j + 64])
            skin['joints'].append(new)
    base['accessors'].append({'bufferView': append_view(base, bbin, ibm), 'componentType': 5126, 'count': len(skin['joints']), 'type': 'MAT4'})
    skin['inverseBindMatrices'] = len(base['accessors']) - 1

    # --- animations ---
    base_names = {a['name'] for a in base['animations']}
    base_count = len(base['animations'])
    for anim in add['animations']:
        assert anim['name'] not in base_names, f'clip name in both files: {anim["name"]}'
        new = {'name': anim['name'], 'samplers': [], 'channels': []}
        for s in anim['samplers']:
            s = dict(s)
            s['input'], s['output'] = copy_accessor(s['input']), copy_accessor(s['output'])
            new['samplers'].append(s)
        for c in anim['channels']:
            new['channels'].append({'sampler': c['sampler'], 'target': {'node': node_map[c['target']['node']], 'path': c['target']['path']}})
        base['animations'].append(new)

    # hide the other file's weapons: one constant key, scale 0
    t_acc = len(base['accessors'])
    base['accessors'].append({'bufferView': append_view(base, bbin, struct.pack('<f', 0.0)), 'componentType': 5126, 'count': 1, 'type': 'SCALAR', 'min': [0.0], 'max': [0.0]})
    base['accessors'].append({'bufferView': append_view(base, bbin, struct.pack('<3f', 0.0, 0.0, 0.0)), 'componentType': 5126, 'count': 1, 'type': 'VEC3'})
    for index, anim in enumerate(base['animations']):
        for node in (new_weapons if index < base_count else base_weapons):
            anim['channels'] = [c for c in anim['channels'] if not (c['target']['node'] == node and c['target']['path'] == 'scale')]
            anim['samplers'].append({'input': t_acc, 'output': t_acc + 1, 'interpolation': 'STEP'})
            anim['channels'].append({'sampler': len(anim['samplers']) - 1, 'target': {'node': node, 'path': 'scale'}})

    write_glb(out_path, base, bbin)
    print('clips', [a['name'] for a in base['animations']])
    print('weapons', [base['nodes'][i]['name'] for i in base_weapons + new_weapons])


if __name__ == '__main__':
    main()
