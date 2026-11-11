"""Retarget Mixamo FBX clips (any 'mixamorigNN:' prefix, cm units, any fps) onto a character GLB.
Per bone (matched by the name after ':'), the target's posed rotation follows the source bone's WORLD direction:
    T_b = S_b @ Rs_b^-1 @ A_b @ Rt_b      (world-space rotations; A_b = shortest rotation target rest dir -> source rest dir)
Hips travel = source hips world offset from rest x (target hip height / source hip height).
Clips are resampled to 24 fps. Each clip's median lowest point is lifted to the source's median lowest point
(scaled by the hip ratio) so feet do not sink. Existing target clips are untouched.
args: out.glb target.glb name=path.fbx [name=path.fbx ...]"""
import bpy, sys, os, numpy as np
from mathutils import Matrix, Vector
argv = sys.argv[sys.argv.index('--') + 1:]
out_path, tgt_path = argv[0], argv[1]
clips = [a.split('=', 1) for a in argv[2:]]
FPS = 24
sc = bpy.context.scene

def short(n): return n.split(':')[-1]

# ---------- sample every source clip in world space
samples = {}; src_rest = None; src_hips_z = None; src_low = {}
for name, path in clips:
    bpy.ops.wm.read_factory_settings(use_empty=True); sc = bpy.context.scene
    bpy.ops.import_scene.fbx(filepath=path)
    a = next(o for o in bpy.data.objects if o.type == 'ARMATURE')
    mw = a.matrix_world
    rest = {short(b.name): (mw @ b.matrix_local) for b in a.data.bones}
    if src_rest is None: src_rest = rest; src_hips_z = rest['Hips'].to_translation().z
    act = a.animation_data.action; s, e = act.frame_range
    src_fps = sc.render.fps / sc.render.fps_base
    n = int(round((e - s) / src_fps * FPS)) + 1
    fr = []; lows = []
    for k in range(n):
        t = s + k / FPS * src_fps; fi = int(t); sc.frame_set(fi, subframe=t - fi)
        fr.append({short(pb.name): (mw @ pb.matrix) for pb in a.pose.bones})
        # lowest joint height (toe ends) as the ground reference for a mesh-less source
        lows.append(min((mw @ pb.tail).z for pb in a.pose.bones if 'Toe' in pb.name or 'Foot' in pb.name))
    samples[name] = fr; src_low[name] = float(np.median(lows))
    print('SRC', name, os.path.basename(path), 'frames', n, 'src_fps', src_fps, 'hips_z', round(rest['Hips'].to_translation().z, 3), 'toe low', round(src_low[name], 3))

# ---------- target
bpy.ops.wm.read_factory_settings(use_empty=True); sc = bpy.context.scene
bpy.ops.import_scene.gltf(filepath=tgt_path)
arm = next(o for o in bpy.data.objects if o.type == 'ARMATURE')
mesh = next(o for o in bpy.data.objects if o.type == 'MESH' and o.parent == arm)
bones = arm.data.bones; amw = arm.matrix_world
rest_t = {b.name: amw @ b.matrix_local for b in bones}
key = {b.name: short(b.name) for b in bones}
missing = [b.name for b in bones if key[b.name] not in src_rest]
print('MISSING_BONES', missing)
ratio = rest_t['mixamorig:Hips'].to_translation().z / src_hips_z
print('HIP_RATIO', round(ratio, 4))
align = {}
for b in bones:
    k = key[b.name]
    if k not in src_rest: continue
    dt = (rest_t[b.name].to_3x3() @ Vector((0, 1, 0))).normalized(); ds = (src_rest[k].to_3x3() @ Vector((0, 1, 0))).normalized()
    align[b.name] = dt.rotation_difference(ds).to_matrix()
rel = {b.name: (b.parent.matrix_local.inverted() @ b.matrix_local) if b.parent else b.matrix_local.copy() for b in bones}
inv_amw3 = amw.to_3x3().inverted()
toe_rest_t = min((amw @ b.tail_local).z for b in bones if 'Toe' in b.name or 'Foot' in b.name)
toe_rest_s = min(src_rest[k].to_translation().z for k in src_rest if 'Toe' in k or 'Foot' in k)

def lowest_mesh(act, step=4):
    arm.animation_data.action = act; s_, e_ = map(int, act.frame_range); vals = []
    for f in range(s_, e_ + 1, step):
        sc.frame_set(f); ev = mesh.evaluated_get(bpy.context.evaluated_depsgraph_get())
        c = np.empty(len(ev.data.vertices) * 3); ev.data.vertices.foreach_get('co', c); vals.append(float(c.reshape(-1, 3)[:, 2].min()))
    return float(np.median(vals))

for name, _ in clips:
    fr = samples[name]; fl = list(range(1, len(fr) + 1))
    keys = {b.name: {'loc': [], 'rot': []} for b in bones}
    for f, S in zip(fl, fr):
        P = {}  # armature-space pose matrices of the target
        for b in bones:
            n = b.name; k = key[n]
            if k in S:
                Rw = S[k].to_3x3() @ src_rest[k].to_3x3().inverted() @ align[n] @ rest_t[n].to_3x3()
                Ra = inv_amw3 @ Rw                                   # world -> armature space
            else:
                Ra = (P[b.parent.name].to_3x3() @ rel[n].to_3x3()) if b.parent else b.matrix_local.to_3x3()
            if b.parent:
                head = P[b.parent.name] @ rel[n].to_translation()
                basis_r = rel[n].to_3x3().inverted() @ P[b.parent.name].to_3x3().inverted() @ Ra
                P[n] = Matrix.Translation(head) @ Ra.to_4x4(); l = Vector((0, 0, 0))
            else:
                off_w = (S[k].to_translation() - src_rest[k].to_translation()) * ratio
                head = b.matrix_local.to_translation() + inv_amw3 @ off_w
                P[n] = Matrix.Translation(head) @ Ra.to_4x4()
                basis = rel[n].inverted() @ P[n]; l = basis.to_translation(); basis_r = basis.to_3x3()
            q = basis_r.to_quaternion().normalized()
            prev = keys[n]['rot'][-1] if keys[n]['rot'] else None
            if prev is not None and prev.dot(q) < 0: q = -q
            keys[n]['loc'].append(l); keys[n]['rot'].append(q)
    act = bpy.data.actions.new(name)
    slot = act.slots.new(id_type='OBJECT', name=arm.name)
    layer = act.layers.new('Layer'); strip = layer.strips.new(type='KEYFRAME'); cb = strip.channelbag(slot, ensure=True)
    for b in bones:
        n = b.name
        for prop, kk, size in (('location', 'loc', 3), ('rotation_quaternion', 'rot', 4), ('scale', None, 3)):
            for i in range(size):
                fc = cb.fcurves.new(f'pose.bones["{n}"].{prop}', index=i, group_name=n)
                vals = [1.0] * len(fl) if kk is None else [v[i] for v in keys[n][kk]]
                fc.keyframe_points.add(len(fl)); fc.keyframe_points.foreach_set('co', [x for f, v in zip(fl, vals) for x in (f, v)])
                for kp in fc.keyframe_points: kp.interpolation = 'LINEAR'
                fc.update()
    act.use_fake_user = True
    track = arm.animation_data.nla_tracks.new(); track.name = name; track.mute = True; track.strips.new(name, 1, act)
    # ground: the clip's median lowest mesh point sits on z = 0 (the mesh-less source cannot give sole thickness)
    dz = -lowest_mesh(act, step=2)
    lift_local = rel['mixamorig:Hips'].to_3x3().inverted() @ (inv_amw3 @ Vector((0, 0, dz)))
    for fc in cb.fcurves:
        if fc.data_path == 'pose.bones["mixamorig:Hips"].location':
            for kp in fc.keyframe_points: kp.co[1] += lift_local[fc.array_index]
            fc.update()
    print('CLIP', name, len(fl), 'frames @24', 'ground lift mm', round(dz * 1000, 1), 'mesh lowest median mm', round(lowest_mesh(act) * 1000, 1))
arm.animation_data.action = None
print('ACTIONS', sorted(a.name for a in bpy.data.actions))
bpy.ops.object.select_all(action='DESELECT'); arm.select_set(True); mesh.select_set(True)
bpy.ops.export_scene.gltf(filepath=out_path, use_selection=True, export_animations=True, export_animation_mode='ACTIONS')
print('SAVED', out_path)
