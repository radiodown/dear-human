"""Blend the start and/or end of a clip into another clip's pose so the two play one after the other without a jump.

    blender -b --python tools/glb_retarget/blend_clip_ends.py -- <ref.glb> <clip.glb> <out.glb> <clip>
            [start=<ref clip>[@first|@last]] [end=<ref clip>[@first|@last]] [frames=8] [bones=arms] [map=a=b ...]

ref.glb holds the neighbouring clips (e.g. a loadout with rifle_idle / rifle_aim_idle), clip.glb the clip to fix (its own
export, e.g. from attach_weapon.py); both must share the rig rest pose. The reference pose is read on the reference clip's
first (default for end=) or last (default for start=) real key. Over `frames` frames from the clip's start (end) the
listed bones' local transforms (rotation slerp, location lerp) go from the reference pose to the clip's own: weight 1 at
the first (last) key, smoothstep down to 0. bones=arms: both shoulders / arms / hands / fingers plus every non-deforming
weapon bone (any bone without the mixamorig: prefix); bones=all: every bone. map=weapon_rifle=weapon reads ref bone weapon_rifle for clip bone weapon.
Only that clip is exported (add it to a loadout with add_loadout_clips.py).
"""
import bpy, sys
argv = sys.argv[sys.argv.index('--') + 1:]
ref_path, clip_path, out_path, CLIP = argv[:4]
opts = {}; MAP = {}
for a in argv[4:]:
    k, v = a.split('=', 1)
    if k == 'map': src, dst = v.split('='); MAP[dst] = src
    else: opts[k] = v
FRAMES = int(opts.get('frames', 8)); BONES = opts.get('bones', 'arms')
sc = bpy.context.scene
def fcurves(a): return [f for l in a.layers for st in l.strips for cb in st.channelbags for f in cb.fcurves]
def span(a):
    fcs = [fc for fc in fcurves(a) if len(fc.keyframe_points) > 1]
    return min(fc.keyframe_points[0].co[0] for fc in fcs), max(fc.keyframe_points[-1].co[0] for fc in fcs)
def use(arm, a):
    arm.animation_data.action = a
    if a.slots: arm.animation_data.action_slot = a.slots[0]

def ref_pose(spec, default_at):
    name, _, at = spec.partition('@'); at = at or default_at
    bpy.ops.wm.read_factory_settings(use_empty=True); bpy.ops.import_scene.gltf(filepath=ref_path)
    arm = next(o for o in bpy.data.objects if o.type == 'ARMATURE'); a = bpy.data.actions[name]; use(arm, a)
    s, e = span(a); f = s if at == 'first' else e; bpy.context.scene.frame_set(int(f), subframe=f - int(f))
    return {pb.name: (pb.location.copy(), pb.rotation_quaternion.copy()) for pb in arm.pose.bones}

REF = {}
if 'start' in opts: REF['start'] = ref_pose(opts['start'], 'last')
if 'end' in opts: REF['end'] = ref_pose(opts['end'], 'first')

bpy.ops.wm.read_factory_settings(use_empty=True); sc = bpy.context.scene
bpy.ops.import_scene.gltf(filepath=clip_path)
arm = next(o for o in bpy.data.objects if o.type == 'ARMATURE'); act = bpy.data.actions[CLIP]; use(arm, act)
deform = {b.name for b in arm.data.bones if b.use_deform}
def wanted(n):
    if BONES == 'all': return True
    side = n.startswith('mixamorig:Left') or n.startswith('mixamorig:Right')
    return (side and any(t in n for t in ('Shoulder', 'Arm', 'Hand'))) or not n.startswith('mixamorig:')   # weapon bones (glTF imports them as deform joints)
s, e = span(act)
def smooth(t): t = max(0.0, min(1.0, t)); return t * t * (3 - 2 * t)
def weight(f):
    w = {}
    if 'start' in REF: w['start'] = 1 - smooth((f - s) / FRAMES)
    if 'end' in REF: w['end'] = 1 - smooth((e - f) / FRAMES)
    return w
changed = set()
for fc in fcurves(act):
    if not fc.data_path.startswith('pose.bones["'): continue
    n = fc.data_path.split('"')[1]; prop = fc.data_path.rsplit('.', 1)[1]
    if prop not in ('rotation_quaternion', 'location') or not wanted(n): continue
    changed.add(n)
groups = {}
for fc in fcurves(act):
    if fc.data_path.startswith('pose.bones["'):
        n = fc.data_path.split('"')[1]; prop = fc.data_path.rsplit('.', 1)[1]
        if n in changed and prop in ('rotation_quaternion', 'location'): groups.setdefault((n, prop), {})[fc.array_index] = fc
from mathutils import Quaternion, Vector
for (n, prop), fcs in groups.items():
    size = 4 if prop == 'rotation_quaternion' else 3
    if len(fcs) != size: continue
    for i in range(len(fcs[0].keyframe_points)):
        f = fcs[0].keyframe_points[i].co[0]
        val = [fcs[j].keyframe_points[i].co[1] for j in range(size)]
        for side, w in weight(f).items():
            if w <= 1e-4: continue
            loc, rot = REF[side][MAP.get(n, n)]
            if prop == 'rotation_quaternion':
                q = Quaternion(val); r = rot.copy()
                if q.dot(r) < 0: r = -r
                val = list(r.slerp(q, 1 - w))
            else:
                val = list(loc.lerp(Vector(val), 1 - w))
        for j in range(size): fcs[j].keyframe_points[i].co[1] = val[j]
    for c in fcs.values(): c.update()
print('BLEND %s keys %.1f-%.1f, %s over %d frames, %d bones' % (CLIP, s, e, ', '.join('%s<-%s' % (k, opts[k]) for k in REF), FRAMES, len(changed)))
for a in list(bpy.data.actions):
    if a.name != CLIP: bpy.data.actions.remove(a)
act.use_fake_user = True; arm.animation_data.action = None
bpy.ops.object.select_all(action='DESELECT')
for o in bpy.data.objects: o.select_set(True)
bpy.ops.export_scene.gltf(filepath=out_path, use_selection=True, export_animations=True, export_animation_mode='ACTIONS')
print('SAVED', out_path)
