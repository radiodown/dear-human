"""Dual-pistol draw / holster clips: the two pistols appear in / vanish from the hands.

    blender -b --python tools/glb_retarget/make_dual_draw_clips.py -- <dual loadout.glb> <bare source.glb> <out.glb>
            [pitch_min=-40] [blend=10] [pull_clip=rifle_pull_out] [put_clip=rifle_put_away]

There is no Mixamo pistol draw, so the bare "Rifle Pull Out" / "Rifle Put Away" of the source GLB give the body,
legs, spine and head, and the arms (shoulders, arms, hands, fingers) are blended with the first frame of the
loadout's `dual_idle` (per bone, local rotation slerp):
  dual_pull_out: the clip's own arms until the pistols appear at frame A, then blended to dual_idle over `blend`
                 frames (ends in the dual_idle pose, so it can hand over to dual_idle).
  dual_put_away: dual_pull_out played backward (the rifle put-away's arm path carried the pistols across the face
                 and belly): from the dual_idle pose back down to the hips, where the pistols vanish.
Each pistol rides on its hand with the dual_idle grip offset (hand bone -> pistol bone, measured on that frame) and is
keyed to scale 0 while hidden. A follows the right pistol's muzzle like the rifle clips (make_draw_holster_clips):
shown only while it is above pitch_min (a hand-carried pistol pointing down would pass through the thigh).
The pistol bones are the loadout's own (`weapon_pistol_r`, `weapon_pistol_l`); add the clips to the loadout with
add_loadout_clips.py (hide the rifle there).
"""
import bpy, sys, math
from mathutils import Vector
argv = sys.argv[sys.argv.index('--') + 1:]
load_path, src_path, out_path = argv[:3]
opts = dict(a.split('=', 1) for a in argv[3:])
PITCH_MIN = float(opts.get('pitch_min', -40)); BLEND = int(opts.get('blend', 10))
PULL = opts.get('pull_clip', 'rifle_pull_out'); PUT = opts.get('put_clip', 'rifle_put_away')
PISTOLS = {'Right': 'weapon_pistol_r', 'Left': 'weapon_pistol_l'}
bpy.ops.wm.read_factory_settings(use_empty=True); sc = bpy.context.scene
def fcurves(a): return [f for l in a.layers for st in l.strips for cb in st.channelbags for f in cb.fcurves]

bpy.ops.import_scene.gltf(filepath=load_path)
arm = next(o for o in bpy.data.objects if o.type == 'ARMATURE')
keep = set(bpy.data.objects); acts_before = set(bpy.data.actions)
bpy.ops.import_scene.gltf(filepath=src_path)
src_acts = {a.name.split('.')[0]: a for a in bpy.data.actions if a not in acts_before}
for o in [o for o in bpy.data.objects if o not in keep]: bpy.data.objects.remove(o, do_unlink=True)
pbs = arm.pose.bones; mw = arm.matrix_world
up_a = (mw.inverted().to_3x3() @ Vector((0, 0, 1))).normalized()
ARM_BONES = [b.name for b in arm.data.bones if (b.name.startswith('mixamorig:Left') or b.name.startswith('mixamorig:Right'))
             and any(t in b.name for t in ('Shoulder', 'Arm', 'Hand'))]
def use(act):
    arm.animation_data.action = act
    if act.slots: arm.animation_data.action_slot = act.slots[0]

# dual_idle first frame: arm pose, grip offsets, barrel axis of each pistol bone
dual = bpy.data.actions['dual_idle']; use(dual); sc.frame_set(int(dual.frame_range[0]))
IDLE_Q = {n: pbs[n].rotation_quaternion.copy() for n in ARM_BONES}
OFF = {sd: pbs[f'mixamorig:{sd}Hand'].matrix.inverted() @ pbs[p].matrix for sd, p in PISTOLS.items()}
lr = pbs['mixamorig:LeftArm'].head - pbs['mixamorig:RightArm'].head; lr = (lr - lr.dot(up_a) * up_a).normalized()
fwd = lr.cross(up_a).normalized()
BARREL = {sd: (pbs[p].matrix.to_3x3().inverted() @ fwd).normalized() for sd, p in PISTOLS.items()}  # dual_idle aims level ahead
def pistol_matrix(sd): return pbs[f'mixamorig:{sd}Hand'].matrix @ OFF[sd]
def pitch(sd, M=None):
    M = pistol_matrix(sd) if M is None else M
    return math.degrees(math.asin(max(-1.0, min(1.0, (M.to_3x3() @ BARREL[sd]).normalized().dot(up_a)))))
def smooth(t): t = max(0.0, min(1.0, t)); return t * t * (3 - 2 * t)

def build(src_name, name, draw):
    act = src_acts[src_name].copy(); act.name = name; act.use_fake_user = True; use(act)
    s, e = map(int, act.frame_range)
    # visibility frame from the clip's own arms (draw) / after the blend (holster)
    pr = {}
    for f in range(s, e + 1): sc.frame_set(f); pr[f] = pitch('Right')
    if draw:
        A = next(f for f in range(s, e + 1) if all(pr[x] >= PITCH_MIN for x in range(f, e + 1)))
        weight = lambda f: smooth((f - A) / BLEND); shown = lambda f: f >= A
    else:
        weight = lambda f: 1 - smooth((f - s) / BLEND)
    fcs = {}
    for fc in fcurves(act):
        for n in ARM_BONES:
            if fc.data_path == f'pose.bones["{n}"].rotation_quaternion': fcs.setdefault(n, [None] * 4)[fc.array_index] = fc
    for n, four in fcs.items():
        if None in four: continue
        for i in range(len(four[0].keyframe_points)):
            f = four[0].keyframe_points[i].co[0]; w = weight(f)
            if w <= 0: continue
            q = __import__('mathutils').Quaternion([four[j].keyframe_points[i].co[1] for j in range(4)])
            t = IDLE_Q[n].copy()
            if q.dot(t) < 0: t = -t
            r = q.slerp(t, w)
            for j in range(4): four[j].keyframe_points[i].co[1] = r[j]
        for c in four: c.update()
    if not draw:
        for f in range(s, e + 1): sc.frame_set(f); pr[f] = pitch('Right')
        V = next((f for f in range(s + BLEND, e + 1) if pr[f] < PITCH_MIN), e + 1)
        shown = lambda f: f < V
    for f in range(s, e + 1):
        sc.frame_set(f)
        for sd, p in PISTOLS.items():
            pb = pbs[p]; pb.matrix = pistol_matrix(sd)
            pb.scale = (1, 1, 1) if shown(f) else (0, 0, 0)
            for path in ('location', 'rotation_quaternion', 'scale'): pb.keyframe_insert(path, frame=f)
    for fc in fcurves(act):
        if fc.data_path.endswith('.scale') and any(p in fc.data_path for p in PISTOLS.values()):
            for kp in fc.keyframe_points: kp.interpolation = 'CONSTANT'
    vis = [f for f in range(s, e + 1) if shown(f)]
    sc.frame_set(vis[-1] if not draw else vis[0])
    print('CLIP %-14s from %s frames %d-%d  pistols %s at frame %d (right muzzle %+.0f, left %+.0f deg), shown %d-%d, '
          'arms dual_idle %s' % (name, src_name, s, e, 'appear' if draw else 'vanish', vis[0] if draw else vis[-1] + 1,
          pitch('Right'), pitch('Left'), vis[0], vis[-1], ('from %d to %d' % (A, A + BLEND)) if draw else ('%d -> clip arms by %d' % (s, s + BLEND))))

build(PULL, 'dual_pull_out', True)
# holster = the draw played backward (the rifle put-away's arm path carries the pistols across the face and belly):
# arms go from dual_idle back down to the hips, the pistols vanish there, the hands fall to the sides
rev = bpy.data.actions['dual_pull_out'].copy(); rev.name = 'dual_put_away'; rev.use_fake_user = True
s0, e0 = map(int, rev.frame_range)
for fc in fcurves(rev):
    pts = [(s0 + e0 - kp.co[0], kp.co[1], kp.interpolation) for kp in fc.keyframe_points]
    pts.sort()
    # every frame is keyed, so each reversed frame keeps exactly its own value (also the step-keyed scale)
    for kp, (t, v, ip) in zip(fc.keyframe_points, pts): kp.co = (t, v); kp.handle_left = kp.handle_right = (t, v); kp.interpolation = ip
    fc.update()
use(rev); hidden = [f for f in range(s0, e0 + 1) if (sc.frame_set(f) or True) and pbs['weapon_pistol_r'].scale.length < 0.5]
print('CLIP dual_put_away  = dual_pull_out reversed, frames %d-%d, pistols vanish at frame %d' % (s0, e0, hidden[0] if hidden else -1))
for a in list(bpy.data.actions):
    if a.name not in ('dual_pull_out', 'dual_put_away'): bpy.data.actions.remove(a)
if arm.animation_data:
    for t in list(arm.animation_data.nla_tracks): arm.animation_data.nla_tracks.remove(t)
    arm.animation_data.action = None
bpy.ops.object.select_all(action='DESELECT')
for o in bpy.data.objects: o.select_set(True)
bpy.ops.export_scene.gltf(filepath=out_path, use_selection=True, export_animations=True, export_animation_mode='ACTIONS')
print('SAVED', out_path)
