"""Remove named animation clips from a GLB without re-exporting it (everything else stays byte-for-byte equivalent).

The clips' animations are dropped from the glTF JSON, then accessors / bufferViews no longer referenced by anything
are removed and the binary chunk is repacked (remaining bufferViews keep their data, 4-byte aligned).

usage: py tools/glb_retarget/remove_glb_clips.py <in.glb> <out.glb> clip [clip ...]"""
import json, struct, sys


def read_glb(path):
    b = open(path, 'rb').read()
    assert b[:4] == b'glTF'
    jl = struct.unpack('<I', b[12:16])[0]
    j = json.loads(b[20:20 + jl])
    rest = b[20 + jl:]
    binc = b''
    if rest:
        bl = struct.unpack('<I', rest[:4])[0]
        binc = rest[8:8 + bl]
    return j, binc


def write_glb(path, j, binc):
    js = json.dumps(j, separators=(',', ':'), ensure_ascii=False).encode('utf-8')
    js += b' ' * (-len(js) % 4)
    binc += b'\0' * (-len(binc) % 4)
    total = 12 + 8 + len(js) + (8 + len(binc) if binc else 0)
    out = struct.pack('<4sII', b'glTF', 2, total) + struct.pack('<I4s', len(js), b'JSON') + js
    if binc: out += struct.pack('<I4s', len(binc), b'BIN\0') + binc
    open(path, 'wb').write(out)


def refs(o, key, acc):
    """collect integer indices stored under `key` anywhere in o"""
    if isinstance(o, dict):
        for k, v in o.items():
            if k == key and isinstance(v, int): acc.add(v)
            else: refs(v, key, acc)
    elif isinstance(o, list):
        for v in o: refs(v, key, acc)


def main():
    src, dst, *names = sys.argv[1:]
    j, binc = read_glb(src)
    anims = j.get('animations', [])
    found = [a.get('name') for a in anims if a.get('name') in names]
    missing = [n for n in names if n not in found]
    j['animations'] = [a for a in anims if a.get('name') not in names]
    if not j['animations']: del j['animations']
    # accessors still used: by meshes, skins, remaining animations (sampler input/output)
    used_acc = set()
    for sec in ('meshes', 'skins'):
        for m in j.get(sec, []):
            if sec == 'meshes':
                for p in m['primitives']:
                    used_acc |= set(p['attributes'].values())
                    if 'indices' in p: used_acc.add(p['indices'])
                    for t in p.get('targets', []): used_acc |= set(t.values())
            else:
                if 'inverseBindMatrices' in m: used_acc.add(m['inverseBindMatrices'])
    for a in j.get('animations', []):
        for s in a['samplers']: used_acc |= {s['input'], s['output']}
    acc_map = {old: new for new, old in enumerate(sorted(used_acc))}
    accessors = [j['accessors'][i] for i in sorted(used_acc)]
    used_bv = {a['bufferView'] for a in accessors if 'bufferView' in a}
    refs(j.get('images', []), 'bufferView', used_bv)
    for a in accessors:
        if 'sparse' in a:
            used_bv |= {a['sparse']['indices']['bufferView'], a['sparse']['values']['bufferView']}
    bv_map = {}; views = []; new_bin = bytearray()
    for old in sorted(used_bv):
        v = dict(j['bufferViews'][old]); data = binc[v.get('byteOffset', 0): v.get('byteOffset', 0) + v['byteLength']]
        new_bin += b'\0' * (-len(new_bin) % 4)
        v['byteOffset'] = len(new_bin); new_bin += data
        bv_map[old] = len(views); views.append(v)
    for a in accessors:
        if 'bufferView' in a: a['bufferView'] = bv_map[a['bufferView']]
        if 'sparse' in a:
            a['sparse']['indices']['bufferView'] = bv_map[a['sparse']['indices']['bufferView']]
            a['sparse']['values']['bufferView'] = bv_map[a['sparse']['values']['bufferView']]
    for img in j.get('images', []):
        if 'bufferView' in img: img['bufferView'] = bv_map[img['bufferView']]
    for m in j.get('meshes', []):
        for p in m['primitives']:
            p['attributes'] = {k: acc_map[v] for k, v in p['attributes'].items()}
            if 'indices' in p: p['indices'] = acc_map[p['indices']]
            if 'targets' in p: p['targets'] = [{k: acc_map[v] for k, v in t.items()} for t in p['targets']]
    for s in j.get('skins', []):
        if 'inverseBindMatrices' in s: s['inverseBindMatrices'] = acc_map[s['inverseBindMatrices']]
    for a in j.get('animations', []):
        for s in a['samplers']: s['input'], s['output'] = acc_map[s['input']], acc_map[s['output']]
    j['accessors'] = accessors; j['bufferViews'] = views
    j['buffers'][0]['byteLength'] = len(new_bin) + (-len(new_bin) % 4)
    write_glb(dst, j, bytes(new_bin))
    print('REMOVED', found, 'missing', missing, 'clips left', [a.get('name') for a in j.get('animations', [])],
          'bin %d -> %d bytes' % (len(binc), len(new_bin)))


if __name__ == '__main__':
    main()
