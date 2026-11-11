"""Give the user's Tripo weapon models a real size and attachment sockets (model_3d_002).

Tripo normalises every model so its longest side is 0.998 m. Each model is scaled uniformly about its origin
(centre, floor) so its length (shield: height) equals the proposed real size below, then empty nodes socket_* are
added. Sockets were read from 1 mm-grid side renders of the Tripo models (normalised units, Blender: +X muzzle,
+Z up, -Y = the side the side camera sees) and are scaled with the model. HP-14T (two pistols in one mesh) is split
by height into two meshes, one per hand. The real files keep metres; attaching to a character multiplies by the
character scale (1.0 unit tall ~ 1.65 m -> 0.606).

Usage: blender -b --python tools/weapons/size_tripo_weapons.py -- <shoot/gun dir> <art/weapons dir> [model_3d_003 [id ...]]
model_3d_003 (2026-11-11, user: AR-12, AMR-21 and HMG-15 look too big) re-exports only the weapons in RESIZE_003 at
smaller lengths into model_3d_003; sockets keep their normalised positions so they scale with the model.
Optional ids after model_3d_003 limit the run to those weapons (ML-70 was added later the same day).
"""
import bpy, bmesh, os, sys, json
from mathutils import Vector
_args = sys.argv[sys.argv.index('--') + 1:]
src_dir, art_dir = _args[:2]
VERSION = _args[2] if len(_args) > 2 else 'model_3d_002'
ONLY = set(_args[3:])
RESIZE_003 = {'ar12_rupture': 0.85, 'amr21_nail': 1.20, 'hmg15_goliath': 1.20,   # m (were 1.00 / 1.40 / 1.45)
              'ml70_mule': 0.70}                                                 # m (was 0.85)

# id: (source file, real length m (shield: height), axis, sockets in normalised units)
WEAPONS = {
    'amr21_nail': ('amr-21.glb', 1.40, 'x', {
        'socket_stock': (-0.495, 0, 0.11), 'socket_grip': (-0.275, 0, 0.05), 'socket_support': (0.10, 0, 0.125),
        'socket_muzzle': (0.499, 0, 0.13), 'socket_mag': (-0.13, 0, 0.09)}),
    'pdw9_wasp': ('pdw-9.glb', 0.60, 'x', {
        'socket_stock': (-0.495, 0, 0.366), 'socket_grip': (-0.10, 0, 0.236), 'socket_support': (0.315, 0, 0.246),
        'socket_muzzle': (0.499, 0, 0.446), 'socket_mag': (-0.14, 0, 0.166)}),
    'hmg15_goliath': ('hmg-15.glb', 1.45, 'x', {
        'socket_stock': (-0.495, 0, 0.142), 'socket_grip': (-0.31, 0, 0.062), 'socket_support': (0.07, 0, 0.15),
        'socket_muzzle': (0.499, 0, 0.182), 'socket_mag': (-0.09, 0, 0.132)}),
    'ml70_mule': ('ml-70.glb', 0.85, 'x', {
        'socket_stock': (-0.495, 0, 0.21), 'socket_grip': (-0.20, 0, 0.075), 'socket_support': (0.385, 0, 0.125),
        'socket_muzzle': (0.499, 0, 0.26), 'socket_mag': (0.10, 0, 0.175)}),
    'ar12_rupture': ('ar12.glb', 1.00, 'x', {
        'socket_stock': (-0.495, 0, 0.174), 'socket_grip': (-0.255, 0, 0.084), 'socket_support': (0.15, 0, 0.162),
        'socket_muzzle': (0.499, 0, 0.214), 'socket_mag': (-0.04, 0, 0.184)}),
    # the Tripo SG-23 lies 25.6 deg off the X axis in the ground plane: STRAIGHTEN rotates it onto X (muzzle +X),
    # recentres and re-normalises to 0.998 m before the sockets (read from the straightened render) are applied
    'sg23_breacher': ('sg-23.glb', 1.05, 'x', {
        'socket_stock': (-0.495, 0, 0.134), 'socket_grip': (-0.235, 0, 0.074), 'socket_support': (0.10, 0, 0.184),
        'socket_muzzle': (0.499, 0, 0.241)}),
    'hp14_bastion': ('hp-14.glb', 0.32, 'x', {
        'socket_grip': (-0.31, 0, 0.214), 'socket_support': (-0.24, 0, 0.184),
        'socket_muzzle': (0.499, 0, 0.474), 'socket_mag': (-0.35, 0, 0.03)}),
    'hp14t_gemini': ('hp-14t.glb', 0.30, 'x', {
        # upper pistol -> right hand, lower pistol -> left hand
        'socket_grip_r': (-0.36, 0, 0.681), 'socket_muzzle_r': (0.468, 0, 0.861),
        'socket_grip_l': (-0.33, 0, 0.181), 'socket_muzzle_l': (0.498, 0, 0.361)}),
    'yuna_physical_shield': ('shield.glb', 0.95, 'z', {
        # front faces -Y like the characters; left hand grip and forearm strap behind the plate
        'socket_grip': (0.0, 0.085, 0.55), 'socket_forearm': (0.0, 0.085, 0.38)}),
}
STRAIGHTEN = {'sg23_breacher'}
report = {}
for wid, (fn, real, axis, sockets) in WEAPONS.items():
    if VERSION == 'model_3d_003':
        if wid not in RESIZE_003 or (ONLY and wid not in ONLY): continue
        real = RESIZE_003[wid]
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=os.path.join(src_dir, fn))
    mesh = next(o for o in bpy.data.objects if o.type == 'MESH')
    bpy.ops.object.select_all(action='DESELECT'); mesh.select_set(True); bpy.context.view_layer.objects.active = mesh
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    if wid in STRAIGHTEN:
        import math, numpy as np
        from mathutils import Matrix
        P = np.array([tuple(v.co) for v in mesh.data.vertices]); xy = P[:, :2] - P[:, :2].mean(0)
        _, vec = np.linalg.eigh(xy.T @ xy); ax = vec[:, -1]; ang = math.atan2(ax[1], ax[0]) + (math.pi if ax[0] < 0 else 0)
        mesh.data.transform(Matrix.Rotation(-ang, 4, 'Z'))
        P = np.array([tuple(v.co) for v in mesh.data.vertices]); c = (P.max(0) + P.min(0)) / 2
        mesh.data.transform(Matrix.Translation((-c[0], -c[1], -P[:, 2].min())))
        P = np.array([tuple(v.co) for v in mesh.data.vertices]); mesh.data.transform(Matrix.Scale(0.998 / (P[:, 0].max() - P[:, 0].min()), 4))
        mesh.data.update(); print('STRAIGHTENED', wid, round(math.degrees(ang), 2))
    co = [v.co for v in mesh.data.vertices]
    k = 0 if axis == 'x' else 2
    span = max(c[k] for c in co) - min(c[k] for c in co)
    s = real / span
    mesh.data.transform(__import__('mathutils').Matrix.Scale(s, 4)); mesh.data.update()
    mesh.name = wid
    if wid == 'hp14t_gemini':
        # split by height (normalised 0.5 -> scaled) into right (upper) and left (lower) pistols
        lower = mesh.copy(); lower.data = mesh.data.copy(); bpy.context.scene.collection.objects.link(lower)
        cut = 0.5 * s
        for obj, keep_upper in ((mesh, True), (lower, False)):
            bm = bmesh.new(); bm.from_mesh(obj.data)
            bmesh.ops.delete(bm, geom=[v for v in bm.verts if (v.co.z > cut) != keep_upper], context='VERTS')
            bm.to_mesh(obj.data); bm.free(); obj.data.update()
        mesh.name, lower.name = 'hp14t_gemini_right', 'hp14t_gemini_left'
    # Left/right (Y) placement: the side render only gives x and z, and several models are not centred on y=0
    # (HMG-15's ammo box pushes the body to +0.07 m). Cast rays along Y through each socket's (x, z), nudging
    # inward when the point is on an open end, and put the socket midway between the two body surfaces.
    from mathutils.bvhtree import BVHTree
    meshes_now = [o for o in bpy.data.objects if o.type == 'MESH']
    bvhs = [BVHTree.FromObject(o, bpy.context.evaluated_depsgraph_get()) for o in meshes_now]
    def body_mid_y(x, z):
        best = None
        for dx, dz in [(0, 0)] + [(sx * r, sz * r) for r in (0.004, 0.008, 0.015, 0.025) for sx, sz in ((-1, 0), (1, 0), (0, -1), (0, 1), (-1, -1), (-1, 1), (1, -1), (1, 1))]:
            lo = hi = None
            for b in bvhs:
                h1 = b.ray_cast(Vector((x + dx, -2, z + dz)), Vector((0, 1, 0)), 4)
                h2 = b.ray_cast(Vector((x + dx, 2, z + dz)), Vector((0, -1, 0)), 4)
                if h1[0] is not None and h2[0] is not None:
                    lo = h1[0].y if lo is None else min(lo, h1[0].y); hi = h2[0].y if hi is None else max(hi, h2[0].y)
            if lo is not None:
                return (lo + hi) / 2, (dx, dz)
        return None, None
    for name, p in sockets.items():
        loc = Vector(p) * s
        if wid != 'yuna_physical_shield':           # shield sockets sit behind the plate on purpose
            y, nudge = body_mid_y(loc.x, loc.z)
            if y is not None:
                print('SOCKET_Y', wid, name, 'y %.4f -> %.4f' % (loc.y, y), 'probe offset', tuple(round(v, 3) for v in nudge))
                loc.y = y
            else:
                print('SOCKET_Y', wid, name, 'no body hit, kept y', round(loc.y, 4))
        sockets[name] = tuple(loc / s)
        e = bpy.data.objects.new(name, None); e.empty_display_type = 'PLAIN_AXES'; e.empty_display_size = 0.02
        e.location = loc; bpy.context.scene.collection.objects.link(e)
    out_dir = os.path.join(art_dir, wid, VERSION); os.makedirs(out_dir, exist_ok=True)
    out = os.path.join(out_dir, f'{wid}.glb')
    bpy.ops.export_scene.gltf(filepath=out, export_apply=True, export_animations=False)
    meshes = [o for o in bpy.data.objects if o.type == 'MESH']
    pts = [o.matrix_world @ v.co for o in meshes for v in o.data.vertices]
    size = [round(max(p[i] for p in pts) - min(p[i] for p in pts), 3) for i in range(3)]
    report[wid] = {'scale': round(s, 4), 'size_m': size, 'sockets': {n: [round(c * s, 4) for c in p] for n, p in sockets.items()}, 'meshes': [o.name for o in meshes]}
    print('SIZED', wid, 'scale', round(s, 4), 'size', size, 'meshes', [o.name for o in meshes])
print('REPORT', json.dumps(report))
