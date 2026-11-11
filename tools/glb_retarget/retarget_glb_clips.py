"""Retarget the idle clips of wait.glb (Yuna rig, Mixamo 65 joints) onto another Mixamo-named character.
Per bone, the target's posed armature-space rotation follows the source bone's world direction:
    T_b = S_b @ Rs_b^-1 @ A_b @ Rt_b
S_b source pose, Rs_b / Rt_b source / target rest, A_b the shortest rotation taking the target rest bone direction to
the source rest bone direction (so the target matches the source's absolute limb directions; its own roll offset is kept).
Hips travel = source hips offset from rest x (target hip height / source hip height). Existing target clips are untouched.
args: wait.glb target.glb out.glb"""
import bpy, sys, numpy as np
from mathutils import Matrix, Vector, Quaternion
src_path, tgt_path, out_path = sys.argv[sys.argv.index('--') + 1:][:3]
CLIPS = ['idle.001', 'wait.001']
bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene

def fcurves(a): return [f for l in a.layers for st in l.strips for cb in st.channelbags for f in cb.fcurves]

# ---------- source
bpy.ops.import_scene.gltf(filepath=src_path)
src_objs = set(bpy.data.objects)
sarm = next(o for o in src_objs if o.type == 'ARMATURE')
src_actions = {a.name: a for a in bpy.data.actions}
rest_s = {b.name: b.matrix_local.copy() for b in sarm.data.bones}
hips_rest_s = rest_s['mixamorig:Hips'].to_translation()
samples = {}
for clip in CLIPS:
    act = src_actions[clip]; sarm.animation_data.action = act
    s, e = map(int, act.frame_range); fr = {}
    for f in range(s, e + 1):
        sc.frame_set(f); fr[f] = {pb.name: pb.matrix.copy() for pb in sarm.pose.bones}
    samples[clip] = fr
smesh = next(o for o in src_objs if o.type == 'MESH' and o.parent == sarm)
def lowest(armobj, meshobj, act, step=8):
    armobj.animation_data.action = act; s_, e_ = map(int, act.frame_range); vals = []
    for f in range(s_, e_ + 1, step):
        sc.frame_set(f); ev = meshobj.evaluated_get(bpy.context.evaluated_depsgraph_get())
        c = np.empty(len(ev.data.vertices) * 3); ev.data.vertices.foreach_get('co', c); vals.append(float(c.reshape(-1, 3)[:, 2].min()))
    return float(np.median(vals))
src_low = {clip: lowest(sarm, smesh, src_actions[clip]) for clip in CLIPS}
print('SRC_LOWEST_MM', {k: round(v * 1000, 1) for k, v in src_low.items()})
# remove source objects and its actions so the target import keeps clean names
for o in list(src_objs): bpy.data.objects.remove(o, do_unlink=True)
for a in list(bpy.data.actions): bpy.data.actions.remove(a)

# ---------- target
bpy.ops.import_scene.gltf(filepath=tgt_path)
arm = next(o for o in bpy.data.objects if o.type == 'ARMATURE')
mesh = next(o for o in bpy.data.objects if o.type == 'MESH' and o.parent == arm)
bones = arm.data.bones
missing = [n for n in rest_s if n not in bones]
print('MISSING_BONES', missing)
rest_t = {b.name: b.matrix_local.copy() for b in bones}
ratio = rest_t['mixamorig:Hips'].to_translation().z / hips_rest_s.z
print('HIP_RATIO', round(ratio, 4))
align = {}
for n, Rt in rest_t.items():
    if n not in rest_s: continue
    dt = (Rt.to_3x3() @ Vector((0, 1, 0))).normalized(); ds = (rest_s[n].to_3x3() @ Vector((0, 1, 0))).normalized()
    align[n] = dt.rotation_difference(ds).to_matrix()
rel = {b.name: (b.parent.matrix_local.inverted() @ b.matrix_local) if b.parent else b.matrix_local.copy() for b in bones}
order = [b for b in bones]  # parents come before children in Blender's bone list
template = next((a for a in bpy.data.actions), None)
for clip in CLIPS:
    fr = samples[clip]; fl = sorted(fr)
    keys = {b.name: {'loc': [], 'rot': [], 'scl': []} for b in bones}
    for f in fl:
        S = fr[f]; P = {}
        for b in order:
            n = b.name
            if n in S:
                Rw = S[n].to_3x3() @ rest_s[n].to_3x3().inverted() @ align[n] @ rest_t[n].to_3x3()
            else:
                Rw = (P[b.parent.name].to_3x3() @ rel[n].to_3x3()) if b.parent else rest_t[n].to_3x3()
            if b.parent:
                head = P[b.parent.name] @ rel[n].to_translation()
                basis_r = (rel[n].to_3x3().inverted() @ P[b.parent.name].to_3x3().inverted() @ Rw)
                P[n] = Matrix.Translation(head) @ Rw.to_4x4()
                l = Vector((0, 0, 0))
            else:
                src_off = S[n].to_translation() - hips_rest_s
                head = rest_t[n].to_translation() + src_off * ratio
                P[n] = Matrix.Translation(head) @ Rw.to_4x4()
                basis = rel[n].inverted() @ P[n]
                l = basis.to_translation(); basis_r = basis.to_3x3()
            q = basis_r.to_quaternion().normalized()
            prev = keys[n]['rot'][-1] if keys[n]['rot'] else None
            if prev is not None and prev.dot(q) < 0: q = -q
            keys[n]['loc'].append(l); keys[n]['rot'].append(q); keys[n]['scl'].append(Vector((1, 1, 1)))
    act = bpy.data.actions.new(clip)
    slot = act.slots.new(id_type='OBJECT', name=arm.name)
    layer = act.layers.new('Layer'); strip = layer.strips.new(type='KEYFRAME'); cb = strip.channelbag(slot, ensure=True)
    for b in bones:
        n = b.name
        for prop, key, size in (('location', 'loc', 3), ('rotation_quaternion', 'rot', 4), ('scale', 'scl', 3)):
            for i in range(size):
                fc = cb.fcurves.new(f'pose.bones["{n}"].{prop}', index=i, group_name=n)
                vals = [v[i] for v in keys[n][key]]
                fc.keyframe_points.add(len(fl)); fc.keyframe_points.foreach_set('co', [x for f, v in zip(fl, vals) for x in (f, v)])
                for kp in fc.keyframe_points: kp.interpolation = 'LINEAR'
                fc.update()
    act.use_fake_user = True
    # stash as an NLA track (like the importer does) so the exporter writes every action
    track = arm.animation_data.nla_tracks.new(); track.name = clip; track.mute = True
    track.strips.new(clip, int(fl[0]), act)
    tl = lowest(arm, mesh, act); dz = src_low[clip] - tl
    for fc in cb.fcurves:
        if fc.data_path == 'pose.bones["mixamorig:Hips"].location':
            # basis location is in the Hips rest frame: convert the world +Z lift into it
            pass
    lift_local = rel['mixamorig:Hips'].to_3x3().inverted() @ Vector((0, 0, dz))
    for fc in cb.fcurves:
        if fc.data_path == 'pose.bones["mixamorig:Hips"].location':
            for kp in fc.keyframe_points: kp.co[1] += lift_local[fc.array_index]
            fc.update()
    print('CLIP', clip, len(fl), 'frames', 'ground lift mm', round(dz * 1000, 1), 'lowest after', round(lowest(arm, mesh, act) * 1000, 1))
arm.animation_data.action = None
bpy.ops.object.select_all(action='DESELECT'); arm.select_set(True); mesh.select_set(True)
bpy.ops.export_scene.gltf(filepath=out_path, use_selection=True, export_animations=True, export_animation_mode='ACTIONS')
print('SAVED', out_path)
