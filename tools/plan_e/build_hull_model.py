"""Plan E: build a riggable clone_01 model from the four turnaround paintings.

Run (from the project root):
  /Applications/Blender.app/Contents/MacOS/Blender -b --factory-startup \
    --python tools/plan_e/build_hull_model.py -- \
    --views art/characters/clone_01/concepts/turnaround_001/source \
    --out art/characters/clone_01/motion/plan_e/model_hull_002

Method
  1. Silhouettes: background is flood-filled from the image border, so gray
     armor inside the figure is kept.
  2. Visual hull: a voxel is solid when it falls inside all four silhouettes;
     each cross-section is rounded with a superellipse fitted to the front and
     side runs, then box-blurred and meshed through a volume.
  3. Limbs: capsules along the measured joints cut the arms and legs out as
     separate meshes (legs only in front of the cape and below the skirt). Limb
     pixels are inpainted out of the images the body uses, so the body does not
     keep painted ghost limbs. The cape region is tagged for the spring chain.
  4. Texture: every surface point picks the painting whose camera it faces
     (weight = max(0, n.d)^8). Rest position/normal are stored as attributes, so
     the paint stays attached when the armature deforms the mesh. Emission only:
     the paintings already carry their lighting.
  5. Rig: the 21-joint names of the Plan D rig, so render_sprites.py can pose it.

Axes match render_sprites.py: +X forward, +Z up, the -Y side faces the sprite
camera (the right.png view). Units are meters.
"""
import argparse
import json
import math
import os
import sys
import time

import bpy
import numpy as np
from mathutils import Vector

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
ap = argparse.ArgumentParser()
ap.add_argument('--views', required=True)
ap.add_argument('--out', required=True)
ap.add_argument('--height', type=float, default=1.75, help='hair top to sole, meters')
ap.add_argument('--voxel', type=float, default=0.007)
args = ap.parse_args(argv)
VIEWS = os.path.abspath(args.views)
OUT = os.path.abspath(args.out)
SRC_DIR = os.path.join(OUT, 'source')
os.makedirs(SRC_DIR, exist_ok=True)
T0 = time.time()

# camera of each painting: which world axis runs to image-right, and its facing normal
CAMS = {
    'right': dict(axis=0, sign=+1, normal=(0, -1, 0)),   # camera at -Y, character faces image-right
    'left': dict(axis=0, sign=-1, normal=(0, +1, 0)),
    'front': dict(axis=1, sign=+1, normal=(+1, 0, 0)),
    'back': dict(axis=1, sign=-1, normal=(-1, 0, 0)),
}
FLOOR_CUT = 0.022   # the paintings' floor shadow occupies the lowest ~2 cm

# Joints measured on the paintings (front view gives Y, side view gives X).
# left_* is the -Y arm/leg, the one nearest the sprite camera.
J = {
    'pelvis': (0.02, 0.0, 0.97), 'waist': (0.02, 0.0, 1.07), 'chest': (0.02, 0.0, 1.24),
    'neck': (0.015, 0.0, 1.44), 'head': (0.01, 0.0, 1.51), 'head_top': (0.01, 0.0, 1.73),
    'left_shoulder': (-0.02, -0.175, 1.37), 'left_elbow': (-0.01, -0.24, 1.17),
    'left_wrist': (0.01, -0.255, 0.96), 'left_hand': (0.015, -0.258, 0.83),
    'right_shoulder': (-0.02, 0.185, 1.37), 'right_elbow': (-0.01, 0.25, 1.17),
    'right_wrist': (0.01, 0.262, 0.96), 'right_hand': (0.015, 0.265, 0.83),
    'left_hip': (0.04, -0.075, 0.93), 'left_knee': (0.06, -0.095, 0.645),
    'left_ankle': (0.03, -0.098, 0.12), 'left_toe': (0.15, -0.098, 0.03),
    'right_hip': (0.04, 0.085, 0.93), 'right_knee': (0.06, 0.105, 0.645),
    'right_ankle': (0.03, 0.105, 0.12), 'right_toe': (0.15, 0.105, 0.03),
}
J = {k: np.array(v, dtype=np.float64) for k, v in J.items()}
ARM_SEGS = [('shoulder', 'elbow', 0.072), ('elbow', 'wrist', 0.058), ('wrist', 'hand', 0.052)]
LEG_SEGS = [('hip', 'knee', 0.095), ('knee', 'ankle', 0.078), ('ankle', 'toe', 0.075)]

# ----------------------------------------------------------------------------
# 1. paintings and silhouettes


def load_rgb(path):
    im = bpy.data.images.load(path, check_existing=True)
    w, h = im.size
    px = np.array(im.pixels[:], dtype=np.float32).reshape(h, w, 4)[::-1, :, :3].copy()
    return px


def silhouette(px):
    h, w, _ = px.shape
    bg_row = np.median(np.concatenate([px[:, :40], px[:, -40:]], 1), 1)
    bglike = np.abs(px - bg_row[:, None, :]).sum(2) < 0.09
    reach = np.zeros_like(bglike)
    reach[:, 0], reach[:, -1], reach[0] = bglike[:, 0], bglike[:, -1], bglike[0]
    while True:
        g = reach.copy()
        g[1:] |= reach[:-1]; g[:-1] |= reach[1:]; g[:, 1:] |= reach[:, :-1]; g[:, :-1] |= reach[:, 1:]
        g &= bglike
        if (g == reach).all():
            break
        reach = g
    return ~reach


IMG, MASK, P = {}, {}, {}
for v in CAMS:
    px = load_rgb(os.path.join(VIEWS, f'{v}.png'))
    m = silhouette(px)
    h, w = m.shape
    rows = np.where(m.any(1))[0]
    top, bot = rows.min(), rows.max()
    cols = np.where(m[bot - 160:bot - 90].any(0))[0]
    band = np.arange(h) > bot - 70                     # trim the wide floor shadow beside the feet
    m[band, :cols.min() - 12] = False
    m[band, cols.max() + 12:] = False
    bot = np.where(m.any(1))[0].max()
    if v in ('front', 'back'):
        mid = np.where(m[int(top + 0.48 * (bot - top))])[0]
        origin = (mid.min() + mid.max()) / 2
    else:
        ank = np.where(m[bot - 120:bot - 40].any(0))[0]
        origin = (ank.min() + ank.max()) / 2
    P[v] = dict(top=int(top), bot=int(bot), origin=float(origin), scale=args.height / (bot - top), w=w, h=h)
    IMG[v], MASK[v] = px, m


def to_pixel(v, pts):
    """World points (N,3) -> (row, col) float in painting v."""
    p, c = P[v], CAMS[v]
    u = pts[:, c['axis']] * c['sign']
    col = p['origin'] + u / p['scale']
    row = p['bot'] - (pts[:, 2] + FLOOR_CUT) / p['scale']
    return row, col

# ----------------------------------------------------------------------------
# 2. visual hull


def runs(m):
    h, w = m.shape
    idx = np.broadcast_to(np.arange(w), (h, w))
    st = np.where(m & ~np.concatenate([np.zeros((h, 1), bool), m[:, :-1]], 1), idx, -1)
    st = np.maximum.accumulate(st, 1)
    en = np.where(m & ~np.concatenate([m[:, 1:], np.zeros((h, 1), bool)], 1), idx, w * 10)
    en = np.minimum.accumulate(en[:, ::-1], 1)[:, ::-1]
    return st, en


RUNS = {v: runs(MASK[v]) for v in CAMS}
res = args.voxel
xs = np.arange(-0.48, 0.48, res)
ys = np.arange(-0.62, 0.62, res)
zs = np.arange(0.0, args.height + 0.03, res)
GX, GY = np.meshgrid(xs, ys, indexing='ij')


def sample(v, z, plane):
    p, c = P[v], CAMS[v]
    u = plane * c['sign']
    r = np.clip(np.round(p['bot'] - (z + FLOOR_CUT) / p['scale']).astype(int), 0, p['h'] - 1)
    col = np.round(p['origin'] + u / p['scale']).astype(int)
    ok = (col >= 0) & (col < p['w'])
    col = np.clip(col, 0, p['w'] - 1)
    st, en = RUNS[v]
    a, b = st[r, col], en[r, col]
    center = ((a + b) / 2 - p['origin']) * p['scale'] * c['sign']
    radius = np.maximum((b - a + 1) / 2 * p['scale'], 1e-4)
    return MASK[v][r, col] & ok, center, radius


occ = np.zeros((len(xs), len(ys), len(zs)), bool)
for k, z in enumerate(zs):
    if z < 0.0:
        continue
    mf, cy, ry = sample('front', z, GY)
    mb, _, _ = sample('back', z, GY)
    mr, cx, rx = sample('right', z, GX)
    ml, _, _ = sample('left', z, GX)
    ell = (np.abs((GY - cy) / ry) ** 2.4 + np.abs((GX - cx) / rx) ** 2.4) <= 1.0
    occ[:, :, k] = mf & mb & mr & ml & ell

GRID = np.stack(np.meshgrid(xs, ys, zs, indexing="ij"), -1).astype(np.float32)


def seg_dist(pts, a, b):
    ab = b - a
    t = np.clip(((pts - a) @ ab) / (ab @ ab), 0, 1)
    return np.linalg.norm(pts - (a + t[..., None] * ab), axis=-1), t


def capsule_mask(side, segs, grow=0.0):
    out = np.zeros(occ.shape, bool)
    for a, b, r in segs:
        d, _ = seg_dist(GRID, J[f'{side}_{a}'], J[f'{side}_{b}'])
        out |= d < r + grow
    return out


# the paintings' floor shadow survives as a thin disc: near the floor keep only the feet
near_floor = zs < 0.035
feet = capsule_mask('left', LEG_SEGS[2:]) | capsule_mask('right', LEG_SEGS[2:])
occ[:, :, near_floor] &= feet[:, :, near_floor]
ARM = {s: occ & capsule_mask(s, ARM_SEGS) for s in ('left', 'right')}
# Legs: in front of the cape, below the skirt line, split at the midline so the
# two thigh capsules never claim the same voxels.
MID_Y = (J['left_hip'][1] + J['right_hip'][1]) / 2
leg_zone = (GRID[..., 0] > -0.10) & (GRID[..., 2] < 0.93)
LEG = {s: occ & capsule_mask(s, LEG_SEGS) & leg_zone & ((GRID[..., 1] < MID_Y) if s == 'left' else (GRID[..., 1] >= MID_Y))
       for s in ('left', 'right')}
body_occ = occ.copy()
for s in ('left', 'right'):
    body_occ &= ~capsule_mask(s, ARM_SEGS, 0.006)
    body_occ &= ~(capsule_mask(s, LEG_SEGS, 0.006) & leg_zone)


def smooth(o, passes=2):
    b = o.astype(np.float32)

    def box(a, ax, r):
        pad = [(r + 1, r) if i == ax else (0, 0) for i in range(3)]
        c = np.cumsum(np.pad(a, pad), axis=ax)
        hi = [slice(None)] * 3; lo = [slice(None)] * 3
        hi[ax] = slice(2 * r + 1, None); lo[ax] = slice(0, -(2 * r + 1))
        return (c[tuple(hi)] - c[tuple(lo)]) / (2 * r + 1)
    for _ in range(passes):
        for ax, r in ((0, 1), (1, 1), (2, 2)):
            b = box(b, ax, r)
    return b > 0.5

# ----------------------------------------------------------------------------
# 3. inpaint arm and leg pixels out of the paintings the body uses


def arm_pixel_mask(v):
    m = np.zeros((P[v]['h'], P[v]['w']), bool)
    for part in (*ARM.values(), *LEG.values()):
        pts = GRID[part]
        r, c = to_pixel(v, pts)
        r = np.clip(np.round(r).astype(int), 0, P[v]['h'] - 1)
        c = np.clip(np.round(c).astype(int), 0, P[v]['w'] - 1)
        m[r, c] = True
    # voxel splats are sparse at this resolution: close the holes and grow a little
    for _ in range(6):
        g = m.copy(); g[1:] |= m[:-1]; g[:-1] |= m[1:]; g[:, 1:] |= m[:, :-1]; g[:, :-1] |= m[:, 1:]; m = g
    return m & MASK[v]


def inpaint(px, hole, figure):
    # fill only from the figure's own pixels: the gray backdrop must not leak in
    valid = (~hole & figure).astype(np.float32)
    out = px.copy()
    todo = hole.copy()
    for radius in (6, 12, 24, 48, 96):
        k = 2 * radius + 1

        def blur(a):
            for ax in (0, 1):
                pad = [(radius + 1, radius) if i == ax else (0, 0) for i in range(a.ndim)]
                c = np.cumsum(np.pad(a, pad, mode='edge'), axis=ax)
                hi = [slice(None)] * a.ndim; lo = [slice(None)] * a.ndim
                hi[ax] = slice(k, None); lo[ax] = slice(0, -k)
                a = (c[tuple(hi)] - c[tuple(lo)]) / k
            return a
        wsum = blur(valid)
        csum = blur(px * valid[..., None])
        ok = todo & (wsum > 0.25)
        out[ok] = csum[ok] / wsum[ok, None]
        todo &= ~ok
    return out


def save_png(px, path):
    h, w, _ = px.shape
    im = bpy.data.images.new(os.path.basename(path), w, h, alpha=True)
    rgba = np.concatenate([px, np.ones((h, w, 1), np.float32)], 2)
    im.pixels = rgba[::-1].ravel()
    im.filepath_raw = path
    im.file_format = 'PNG'
    im.save()
    bpy.data.images.remove(im)


BODY_PAINT = {}
for v in CAMS:
    hole = arm_pixel_mask(v)
    path = os.path.join(SRC_DIR, f'body_{v}.png')
    save_png(inpaint(IMG[v], hole, MASK[v]), path)
    BODY_PAINT[v] = path

# ----------------------------------------------------------------------------
# 4. meshes

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene


def mesh_from_occ(name, o, decimate):
    s = smooth(o)
    inner = s.copy()
    for ax in range(3):
        for sh in (1, -1):
            inner &= np.roll(s, sh, ax)
    ii, jj, kk = np.nonzero(s & ~inner)
    pts = np.stack([xs[ii], ys[jj], zs[kk]], 1).astype(np.float32)
    me = bpy.data.meshes.new(name + '_pts')
    me.vertices.add(len(pts))
    me.vertices.foreach_set('co', pts.ravel())
    ob = bpy.data.objects.new(name, me)
    scene.collection.objects.link(ob)
    ng = bpy.data.node_groups.new(name + '_gn', 'GeometryNodeTree')
    ng.interface.new_socket('Geometry', in_out='INPUT', socket_type='NodeSocketGeometry')
    ng.interface.new_socket('Geometry', in_out='OUTPUT', socket_type='NodeSocketGeometry')
    gi, go = ng.nodes.new('NodeGroupInput'), ng.nodes.new('NodeGroupOutput')
    m2p = ng.nodes.new('GeometryNodeMeshToPoints')
    p2v = ng.nodes.new('GeometryNodePointsToVolume')
    v2m = ng.nodes.new('GeometryNodeVolumeToMesh')
    for nd in (p2v, v2m):
        nd.inputs['Resolution Mode'].default_value = 'Size'
        nd.inputs['Voxel Size'].default_value = 0.004
    p2v.inputs['Radius'].default_value = res * 1.15
    v2m.inputs['Threshold'].default_value = 0.3
    ng.links.new(gi.outputs[0], m2p.inputs[0]); ng.links.new(m2p.outputs[0], p2v.inputs[0])
    ng.links.new(p2v.outputs[0], v2m.inputs[0]); ng.links.new(v2m.outputs[0], go.inputs[0])
    ob.modifiers.new('hull', 'NODES').node_group = ng
    sm = ob.modifiers.new('smooth', 'CORRECTIVE_SMOOTH')
    sm.iterations, sm.smooth_type, sm.use_only_smooth = 12, 'SIMPLE', True
    dec = ob.modifiers.new('decimate', 'DECIMATE')
    dec.ratio = decimate
    dg = bpy.context.evaluated_depsgraph_get()
    final = bpy.data.meshes.new_from_object(ob.evaluated_get(dg))
    ob.modifiers.clear()
    old = ob.data
    ob.data = final
    final.name = name
    bpy.data.meshes.remove(old)
    bpy.data.node_groups.remove(ng)
    for poly in final.polygons:
        poly.use_smooth = True
    # rest position/normal drive the projection after the armature deforms the mesh
    co = np.empty(len(final.vertices) * 3, np.float32); final.vertices.foreach_get('co', co)
    no = np.empty(len(final.vertices) * 3, np.float32); final.vertices.foreach_get('normal', no)
    for attr, data in (('rest_co', co), ('rest_no', no)):
        a = final.attributes.new(attr, 'FLOAT_VECTOR', 'POINT')
        a.data.foreach_set('vector', data)
    return ob


body = mesh_from_occ('clone_01_body', body_occ, 0.25)
arms = {s: mesh_from_occ(f'clone_01_arm_{s}', ARM[s], 0.6) for s in ('left', 'right')}
legs = {s: mesh_from_occ(f'clone_01_leg_{s}', LEG[s], 0.6) for s in ('left', 'right')}

# ----------------------------------------------------------------------------
# 5. projection materials


def projection_material(name, paths):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    nt = mat.node_tree
    nt.nodes.clear()
    N, L = nt.nodes, nt.links

    def math(op, a, b=None, c=None):
        n = N.new('ShaderNodeMath'); n.operation = op
        for i, x in enumerate((a, b, c)):
            if x is None:
                continue
            if isinstance(x, (int, float)):
                n.inputs[i].default_value = x
            else:
                L.new(x, n.inputs[i])
        return n.outputs[0]
    co = N.new('ShaderNodeAttribute'); co.attribute_name = 'rest_co'
    no = N.new('ShaderNodeAttribute'); no.attribute_name = 'rest_no'
    pos = N.new('ShaderNodeSeparateXYZ'); nor = N.new('ShaderNodeSeparateXYZ')
    L.new(co.outputs['Vector'], pos.inputs[0]); L.new(no.outputs['Vector'], nor.inputs[0])
    nn = N.new('ShaderNodeVectorMath'); nn.operation = 'NORMALIZE'
    L.new(no.outputs['Vector'], nn.inputs[0]); L.new(nn.outputs[0], nor.inputs[0])
    cols, wts = [], []
    for v, c in CAMS.items():
        p = P[v]
        u = math('MULTIPLY_ADD', pos.outputs[c['axis']], c['sign'] / p['scale'] / p['w'], p['origin'] / p['w'])
        row = math('MULTIPLY_ADD', math('ADD', pos.outputs[2], FLOOR_CUT), -1 / p['scale'], p['bot'])
        vv = math('MULTIPLY_ADD', row, -1 / p['h'], 1 - 0.5 / p['h'])
        uv = N.new('ShaderNodeCombineXYZ'); L.new(u, uv.inputs[0]); L.new(vv, uv.inputs[1])
        tex = N.new('ShaderNodeTexImage')
        tex.image = bpy.data.images.load(paths[v], check_existing=True)
        tex.extension = 'EXTEND'
        L.new(uv.outputs[0], tex.inputs[0])
        nax = [i for i in range(3) if c['normal'][i]][0]
        w = math('POWER', math('MAXIMUM', math('MULTIPLY', nor.outputs[nax], c['normal'][nax]), 0.0), 8.0)
        cols.append(tex.outputs['Color']); wts.append(w)
    total = math('MAXIMUM', math('ADD', math('ADD', wts[0], wts[1]), math('ADD', wts[2], wts[3])), 1e-4)
    acc = None
    for col, w in zip(cols, wts):
        sc = N.new('ShaderNodeVectorMath'); sc.operation = 'SCALE'
        L.new(col, sc.inputs[0]); L.new(math('DIVIDE', w, total), sc.inputs['Scale'])
        if acc is None:
            acc = sc.outputs[0]
        else:
            ad = N.new('ShaderNodeVectorMath'); ad.operation = 'ADD'
            L.new(acc, ad.inputs[0]); L.new(sc.outputs[0], ad.inputs[1]); acc = ad.outputs[0]
    em = N.new('ShaderNodeEmission'); L.new(acc, em.inputs['Color'])
    out = N.new('ShaderNodeOutputMaterial'); L.new(em.outputs[0], out.inputs['Surface'])
    return mat


ORIG = {v: os.path.join(VIEWS, f'{v}.png') for v in CAMS}
LIMBS = [*arms.values(), *legs.values()]
for ob in [body, *LIMBS]:
    ob.data.materials.clear()          # new_from_object leaves an empty slot 0
body.data.materials.append(projection_material('clone_01_body_paint', BODY_PAINT))
arm_mat = projection_material('clone_01_arm_paint', ORIG)
for ob in LIMBS:
    ob.data.materials.append(arm_mat)

# ----------------------------------------------------------------------------
# 6. armature and weights

CHILD = {
    'pelvis': 'waist', 'waist': 'chest', 'chest': 'neck', 'neck': 'head', 'head': 'head_top',
    **{f'{s}_shoulder': f'{s}_elbow' for s in ('left', 'right')},
    **{f'{s}_elbow': f'{s}_wrist' for s in ('left', 'right')},
    **{f'{s}_wrist': f'{s}_hand' for s in ('left', 'right')},
    **{f'{s}_hip': f'{s}_knee' for s in ('left', 'right')},
    **{f'{s}_knee': f'{s}_ankle' for s in ('left', 'right')},
    **{f'{s}_ankle': f'{s}_toe' for s in ('left', 'right')},
}
PARENT = {'waist': 'pelvis', 'chest': 'waist', 'neck': 'chest', 'head': 'neck'}
for s in ('left', 'right'):
    PARENT.update({f'{s}_shoulder': 'chest', f'{s}_elbow': f'{s}_shoulder', f'{s}_wrist': f'{s}_elbow',
                   f'{s}_hand': f'{s}_wrist', f'{s}_hip': 'pelvis', f'{s}_knee': f'{s}_hip',
                   f'{s}_ankle': f'{s}_knee', f'{s}_toe': f'{s}_ankle'})

arm_data = bpy.data.armatures.new('clone_01_rig')
rig = bpy.data.objects.new('clone_01_rig', arm_data)
scene.collection.objects.link(rig)
bpy.context.view_layer.objects.active = rig
bpy.ops.object.mode_set(mode='EDIT')
for name in ['pelvis', 'waist', 'chest', 'neck', 'head'] + [f'{s}_{j}' for s in ('left', 'right')
                                                            for j in ('shoulder', 'elbow', 'wrist', 'hand', 'hip', 'knee', 'ankle', 'toe')]:
    b = arm_data.edit_bones.new(name)
    b.head = Vector(J[name])
    tail = J[CHILD[name]] if name in CHILD else J[name] + np.array([0.05, 0, 0]) if name.endswith('toe') else J[name] + np.array([0, 0, -0.06])
    b.tail = Vector(tail)
    if np.linalg.norm(np.array(b.tail) - np.array(b.head)) < 1e-4:
        b.tail = b.head + Vector((0, 0, 0.05))
for name, parent in PARENT.items():
    arm_data.edit_bones[name].parent = arm_data.edit_bones[parent]
bpy.ops.object.mode_set(mode='OBJECT')


def verts(ob):
    co = np.empty(len(ob.data.vertices) * 3, np.float32)
    ob.data.vertices.foreach_get('co', co)
    return co.reshape(-1, 3).astype(np.float64)


def add_weights(ob, weights):
    for name, w in weights.items():
        g = ob.vertex_groups.get(name) or ob.vertex_groups.new(name=name)
        idx = np.nonzero(w > 1e-3)[0]
        for i in idx:
            g.add([int(i)], float(w[i]), 'REPLACE')


def chain_weights(pts, side, segs, bones, blend=0.04):
    """Nearest segment wins; vertices near a joint blend across it."""
    d = np.stack([seg_dist(pts, J[f'{side}_{a}'], J[f'{side}_{b}'])[0] for a, b, _ in segs], 1)
    t = np.stack([seg_dist(pts, J[f'{side}_{a}'], J[f'{side}_{b}'])[1] for a, b, _ in segs], 1)
    best = d.argmin(1)
    W = {b: np.zeros(len(pts)) for b in bones}
    for i, b in enumerate(bones):
        W[b][best == i] = 1.0
    seglen = [np.linalg.norm(J[f'{side}_{b}'] - J[f'{side}_{a}']) for a, b, _ in segs]
    for i in range(len(segs) - 1):          # blend segment i and i+1 around their shared joint
        near_end = (best == i) & ((1 - t[:, i]) * seglen[i] < blend)
        near_start = (best == i + 1) & (t[:, i + 1] * seglen[i + 1] < blend)
        for sel, dist in ((near_end, (1 - t[:, i]) * seglen[i]), (near_start, -t[:, i + 1] * seglen[i + 1])):
            k = np.clip(0.5 - dist[sel] / (2 * blend), 0, 1)
            W[bones[i]][sel] = 1 - k
            W[bones[i + 1]][sel] = k
    return W


SPINE = [(0.99, 'pelvis'), (1.10, 'waist'), (1.28, 'chest'), (1.44, 'neck'), (1.50, 'head')]
pts = verts(body)
z = pts[:, 2]
knots = [zk for zk, _ in SPINE]
# piecewise-linear blend between neighbouring spine bones by height
W = {name: np.interp(z, knots, [1.0 if j == i else 0.0 for j in range(len(SPINE))]) for i, (_, name) in enumerate(SPINE)}
add_weights(body, W)
# Cape region for render_sprites.py's spring chain: behind the back or out at the
# sides, below the shoulders. Membership only; the chain sets the real weights.
cape = (z < 1.42) & ((pts[:, 0] < -0.075) | (np.abs(pts[:, 1]) > 0.19))
add_weights(body, {'plan_e_cape': cape.astype(float)})
for s, ob in arms.items():
    add_weights(ob, chain_weights(verts(ob), s, ARM_SEGS, [f'{s}_shoulder', f'{s}_elbow', f'{s}_wrist']))
for s, ob in legs.items():
    add_weights(ob, chain_weights(verts(ob), s, LEG_SEGS, [f'{s}_hip', f'{s}_knee', f'{s}_ankle']))

for ob in [body, *LIMBS]:
    ob.parent = rig
    mod = ob.modifiers.new('Armature', 'ARMATURE')
    mod.object = rig

# ----------------------------------------------------------------------------
# 7. save

blend = os.path.join(SRC_DIR, 'clone_01_hull.blend')
bpy.ops.wm.save_as_mainfile(filepath=blend, relative_remap=True)
records = os.path.join(OUT, 'records')
os.makedirs(records, exist_ok=True)
info = {
    'tool': 'Blender headless + tools/plan_e/build_hull_model.py',
    'blender_version': bpy.app.version_string,
    'views': os.path.relpath(VIEWS),
    'params': {k: (v if not isinstance(v, float) else round(v, 5)) for k, v in vars(args).items()},
    'painting_params': P,
    'joints': {k: [round(float(x), 3) for x in v] for k, v in J.items()},
    'faces': {ob.name: len(ob.data.polygons) for ob in [body, *LIMBS]},
    'elapsed_seconds': round(time.time() - T0, 1),
}
with open(os.path.join(records, 'build.json'), 'w', encoding='utf-8') as fh:
    json.dump(info, fh, ensure_ascii=False, indent=2)
print('HULL_DONE', json.dumps(info['faces']), info['elapsed_seconds'])
