"""Turn the neck and head so the face looks level and straight ahead (the character's forward), per clip.

    blender -b --python tools/glb_retarget/level_head.py -- <in.glb> <out.glb> clip=mode [clip=mode ...] [neck=0.4]

mode: full            the correction on every frame
      in:<a>:<b>      none up to frame a, full from frame b (smoothstep between)
      out:<a>:<b>     full up to frame a, none from frame b
Face direction = the head bone's local axis that points to world forward (-Y) in the rest pose. On each frame the shortest
rotation that turns it to level forward is split: `neck` share goes to the Neck, the rest to the Head (so the head does not
bend at one joint only). A clip whose first / last pose equals another clip's first pose gets the same correction there,
so fading it in / out keeps the clips joined. Only the listed clips are exported (swap them into a loadout with
remove_glb_clips.py + add_loadout_clips.py).
"""
import bpy, sys, math
from mathutils import Vector, Quaternion, Matrix
argv = sys.argv[sys.argv.index('--') + 1:]
in_path, out_path = argv[:2]
NECK = 0.4; SPECS = {}
for a in argv[2:]:
    k, v = a.split('=', 1)
    if k == 'neck': NECK = float(v)
    else: SPECS[k] = v
bpy.ops.wm.read_factory_settings(use_empty=True); sc = bpy.context.scene
bpy.ops.import_scene.gltf(filepath=in_path)
arm = next(o for o in bpy.data.objects if o.type == 'ARMATURE'); pbs = arm.pose.bones; mw = arm.matrix_world
H, N = 'mixamorig:Head', 'mixamorig:Neck'
arm.data.pose_position = 'REST'; bpy.context.view_layer.update()
FWD = (mw.inverted().to_3x3() @ Vector((0, -1, 0))).normalized()          # character forward, armature space
AXIS = (pbs[H].matrix.to_3x3().inverted() @ FWD).normalized()               # face axis in head-bone space
arm.data.pose_position = 'POSE'
def smooth(t): t = max(0.0, min(1.0, t)); return t * t * (3 - 2 * t)
def weight(mode, f):
    if mode == 'full': return 1.0
    kind, a, b = mode.split(':'); a, b = float(a), float(b)
    return smooth((f - a) / (b - a)) if kind == 'in' else 1 - smooth((f - a) / (b - a))
def face(): return (pbs[H].matrix.to_3x3() @ AXIS).normalized()
def angles(d):
    w = mw.to_3x3() @ d
    return math.degrees(math.asin(max(-1, min(1, w.z)))), math.degrees(math.atan2(w.x, -w.y))
def turn(pb, q):
    M = pb.matrix.copy(); pb.matrix = Matrix.Translation(M.translation) @ (q.to_matrix() @ M.to_3x3()).to_4x4()
    bpy.context.view_layer.update()
for clip, mode in SPECS.items():
    act = bpy.data.actions[clip]; arm.animation_data.action = act
    if act.slots: arm.animation_data.action_slot = act.slots[0]
    fcs = [fc for l in act.layers for st in l.strips for cb in st.channelbags for fc in cb.fcurves]
    multi = [fc for fc in fcs if len(fc.keyframe_points) > 1]
    frames = list(range(int(round(min(fc.keyframe_points[0].co[0] for fc in multi))), int(round(max(fc.keyframe_points[-1].co[0] for fc in multi))) + 1))
    # bake Neck / Head to one LINEAR key per frame first: held clips may carry only a first and a last (stepped) key,
    # and a fade needs its own value on every frame
    orig = {}
    for f in frames:
        sc.frame_set(f); orig[f] = {n: pbs[n].rotation_quaternion.copy() for n in (N, H)}
    for fc in list(fcs):
        if any(fc.data_path == f'pose.bones["{n}"].rotation_quaternion' for n in (N, H)):
            n = fc.data_path.split('"')[1]; fc.keyframe_points.clear()
            for f in frames: fc.keyframe_points.insert(f, orig[f][n][fc.array_index], options={'FAST'}).interpolation = 'LINEAR'
            fc.update()
    new = {}; before = []; after = []
    for f in frames:
        sc.frame_set(f); w = weight(mode, f); d0 = face(); before.append(angles(d0))
        q_all = d0.rotation_difference(FWD)
        goal = Quaternion().slerp(q_all, w) @ d0                            # partial correction toward level forward
        turn(pbs[N], Quaternion().slerp(q_all, NECK * w))
        turn(pbs[H], face().rotation_difference(goal))
        after.append(angles(face()))
        new[f] = {n: pbs[n].rotation_quaternion.copy() for n in (N, H)}
    for fc in fcs:
        for n in (N, H):
            if fc.data_path == f'pose.bones["{n}"].rotation_quaternion':
                for kp in fc.keyframe_points:
                    f = int(round(kp.co[0]))
                    if f in new: kp.co[1] = new[f][n][fc.array_index]
                fc.update()
    for n in (N, H):   # keep quaternion signs continuous
        four = sorted([fc for fc in fcs if fc.data_path == f'pose.bones["{n}"].rotation_quaternion'], key=lambda c: c.array_index)
        prev = None
        for i in range(len(four[0].keyframe_points)):
            q = Quaternion([four[j].keyframe_points[i].co[1] for j in range(4)])
            if prev is not None and prev.dot(q) < 0:
                for j in range(4): four[j].keyframe_points[i].co[1] *= -1
                q = -q
            prev = q
        for c in four: c.update()
    # export only the real key span: merged loadouts carry one-key weapon-scale channels at frame 0, which would make the
    # exporter sample (and a loop repeat) frame 1's pose at frame 0
    act.use_frame_range = True; act.frame_start = frames[0]; act.frame_end = frames[-1]
    print('HEADF %s %s' % (clip, ' '.join('%d:%+.0f/%+.0f' % ((f,) + a_) for f, a_ in zip(frames, after) if len(frames) <= 20)))
    fmt = lambda v: '%+.0f/%+.0f' % v
    print('HEAD %-18s %-12s frames %d-%d  face pitch/yaw first %s -> %s, last %s -> %s, max |pitch|,|yaw| after %.1f, %.1f' % (
        clip, mode, frames[0], frames[-1], fmt(before[0]), fmt(after[0]), fmt(before[-1]), fmt(after[-1]),
        max(abs(p) for p, _ in after), max(abs(y) for _, y in after)))
for a in list(bpy.data.actions):
    if a.name not in SPECS: bpy.data.actions.remove(a)
for a in bpy.data.actions: a.use_fake_user = True
arm.animation_data.action = None
bpy.ops.object.select_all(action='DESELECT')
for o in bpy.data.objects: o.select_set(True)
bpy.ops.export_scene.gltf(filepath=out_path, use_selection=True, export_animations=True, export_animation_mode='ACTIONS')
print('SAVED', out_path)
