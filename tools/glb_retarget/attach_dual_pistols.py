"""Dual pistols (HP-14T): one pistol in each hand, carried rigidly by that hand. Export a loadout GLB.

The weapon GLB holds two meshes (*_right, *_left) and sockets socket_grip_r/l, socket_muzzle_r/l in real metres.
Each pistol is scaled to the character (height / 1.65 m) and driven by its own non-deforming bone under the Hips
(`weapon` = right, `weapon_l` = left, keyed per frame so in-place playback keeps it with the body). The offset from
each hand is found on a reference frame: grip socket on that palm, barrel (+X) along that forearm levelled to horizontal, gun up ~ world
up. No IK: the arms keep the clip as retargeted. On the reference frame each pistol is moved once, at most
PISTOL_SHIFT, out of its palm (hand_clearance.py) and that fixed offset is used on every frame (a per-frame move left
the pistols floating in front of the fists). Only the listed clips are exported.

usage: blender -b --python tools/glb_retarget/attach_dual_pistols.py -- <character.glb> <weapon.glb>
       <reference clip> <out.glb> clip [clip ...]"""
import bpy, sys
from mathutils import Matrix, Vector
argv = sys.argv[sys.argv.index('--') + 1:]
char_path, gun_path, ref_clip, out_path = argv[:4]
CLIPS = argv[4:]
bpy.ops.wm.read_factory_settings(use_empty=True); sc = bpy.context.scene

bpy.ops.import_scene.gltf(filepath=char_path)
arm = next(o for o in bpy.data.objects if o.type == 'ARMATURE')
bodies = [o for o in bpy.data.objects if o.type == 'MESH' and o.parent == arm]
height = max((b.matrix_world @ v.co).z for b in bodies for v in b.data.vertices)
k = height / 1.65
before = set(bpy.data.objects)
bpy.ops.import_scene.gltf(filepath=gun_path)
new = [o for o in bpy.data.objects if o not in before]
sockets = {o.name.split('.')[0]: o.matrix_world.translation * k for o in new if o.name.startswith('socket_')}
guns = {}
for o in new:
    if o.type != 'MESH': bpy.data.objects.remove(o, do_unlink=True); continue
    side = 'r' if o.name.endswith('_right') or '_right.' in o.name else 'l'
    bpy.ops.object.select_all(action='DESELECT'); o.select_set(True); bpy.context.view_layer.objects.active = o
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    o.data.transform(Matrix.Scale(k, 4)); o.name = 'weapon' if side == 'r' else 'weapon_l'; guns[side] = o
mw = arm.matrix_world; mwi = mw.inverted(); pbs = arm.pose.bones
up_a = (mwi.to_3x3() @ Vector((0, 0, 1))).normalized()

bpy.ops.object.select_all(action='DESELECT'); arm.select_set(True); bpy.context.view_layer.objects.active = arm
bpy.ops.object.mode_set(mode='EDIT')
for name in ('weapon', 'weapon_l'):
    eb = arm.data.edit_bones.new(name); eb.head = (0, 0, 0); eb.tail = (0, 0.1, 0); eb.use_deform = False
    eb.parent = arm.data.edit_bones['mixamorig:Hips']; eb.use_connect = False
bpy.ops.object.mode_set(mode='OBJECT')
SIDE = {'r': ('Right', 'weapon'), 'l': ('Left', 'weapon_l')}
for side, (_, bname) in SIDE.items():
    pb = pbs[bname]; pb.rotation_mode = 'QUATERNION'; g = guns[side]
    g.parent = arm; g.parent_type = 'BONE'; g.parent_bone = bname
    g.matrix_parent_inverse = Matrix.Identity(4); g.matrix_basis = Matrix.Translation((0, -arm.data.bones[bname].length, 0))

def palm_a(s): return (pbs[f'mixamorig:{s}Hand'].head + pbs[f'mixamorig:{s}HandMiddle1'].head) / 2
def frame_basis(a, up):
    a = a.normalized(); u = (up - up.dot(a) * a).normalized(); return Matrix((a, u, a.cross(u))).transposed()

ref = bpy.data.actions[ref_clip]; arm.animation_data.action = ref
s0, e0 = map(int, ref.frame_range); sc.frame_set((s0 + e0) // 2)
OFFSET = {}
for side, (S, _) in SIDE.items():
    G = sockets[f'socket_grip_{side}']; gd = sockets[f'socket_muzzle_{side}'] - G; gd = Vector((gd.x, 0, 0))
    wd = pbs[f'mixamorig:{S}Hand'].head - pbs[f'mixamorig:{S}ForeArm'].head
    wd = wd - wd.dot(up_a) * up_a      # level barrel on the reference frame (aiming idle)
    R = frame_basis(wd, up_a) @ frame_basis(gd, Vector((0, 0, 1))).inverted()
    M_ref = Matrix.Translation(palm_a(S)) @ R.to_4x4() @ Matrix.Translation(-G)
    OFFSET[side] = pbs[f'mixamorig:{S}Hand'].matrix.inverted() @ M_ref
sys.path.insert(0, __import__('os').path.dirname(__file__))
from hand_clearance import HandClearance
CLEAR = {side: HandClearance(arm, bodies, [v.co.copy() for v in guns[side].data.vertices], [tuple(p.vertices) for p in guns[side].data.polygons], k) for side in guns}
# hand moves (gun space) that would clear it: right hand to its pistol's right, left hand to its pistol's left; the pistol moves the opposite way
DIRS = {'r': [(0, -1, 0), (0, -0.7, -0.7), (-0.7, -0.7, 0), (-1, 0, 0), (-0.7, 0, -0.7)], 'l': [(0, 1, 0), (0, 0.7, -0.7), (-0.7, 0.7, 0), (-1, 0, 0), (-0.7, 0, -0.7)]}
PISTOL_SHIFT = 0.015   # m real
sc.frame_set((s0 + e0) // 2)
for side, (S, _) in SIDE.items():
    hb = pbs[f'mixamorig:{S}Hand']; Mg = hb.matrix @ OFFSET[side]
    v, d0, rest = CLEAR[side].shift(CLEAR[side].local(S), hb.matrix.to_3x3(), hb.head.copy(), Mg, DIRS[side], max_shift=PISTOL_SHIFT)
    OFFSET[side] = hb.matrix.inverted() @ (Matrix.Translation(-v) @ Mg)
    print('PISTOL %s palm in gun %.0f -> %.0f mm on the reference frame, pistol moved %.0f mm' % (side, d0 / k * 1000, rest / k * 1000, v.length / k * 1000))
print('ATTACH dual char height %.3f scale %.4f ref %s %d' % (height, k, ref_clip, (s0 + e0) // 2))

hips_rest_inv = arm.data.bones['mixamorig:Hips'].matrix_local.inverted()
for clip in CLIPS:
    act = bpy.data.actions[clip]; arm.animation_data.action = act
    s, e = map(int, act.frame_range); prev = {}; gap = []; pen = {}
    frames = {}
    for f in range(s, e + 1):
        sc.frame_set(f)
        frames[f] = {side: pbs[f'mixamorig:{S}Hand'].matrix @ OFFSET[side] for side, (S, _) in SIDE.items()}
        hips = pbs['mixamorig:Hips'].matrix.inverted()
        frames[f]['hips'] = hips
    for f in range(s, e + 1):
        for side, (S, bname) in SIDE.items():
            rel = (hips_rest_inv @ arm.data.bones[bname].matrix_local).inverted()
            loc, rot, _ = (rel @ frames[f]['hips'] @ frames[f][side]).decompose()
            if side in prev and prev[side].dot(rot) < 0: rot = -rot
            prev[side] = rot
            pb = pbs[bname]; pb.location = loc; pb.rotation_quaternion = rot
            pb.keyframe_insert('location', frame=f); pb.keyframe_insert('rotation_quaternion', frame=f)
        a, b = frames[f]['r'] @ sockets['socket_grip_r'], frames[f]['l'] @ sockets['socket_grip_l']
        gap.append((a - b).length)
    print('CLIP %-18s frames %3d pistol grips apart min %.0f mm (real)' % (clip, e - s + 1, min(gap) / k * 1000))
for a in list(bpy.data.actions):
    if a.name not in CLIPS: bpy.data.actions.remove(a)
if arm.animation_data:
    for t in list(arm.animation_data.nla_tracks):
        if not t.strips or t.strips[0].action is None or t.strips[0].action.name not in CLIPS: arm.animation_data.nla_tracks.remove(t)
    arm.animation_data.action = None
for a in bpy.data.actions: a.use_fake_user = True
bpy.ops.object.select_all(action='DESELECT'); arm.select_set(True)
for o in list(guns.values()) + bodies: o.select_set(True)
bpy.ops.export_scene.gltf(filepath=out_path, use_selection=True, export_animations=True, export_animation_mode='ACTIONS')
print('SAVED', out_path)
