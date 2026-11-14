"""Shield + one-handed melee weapon clips (Yuna): shield held in the left-arm guard, hammer in the right hand.

The melee clips come from Mixamo one-hand combos already retargeted onto the character (retarget_mixamo_fbx.py).
  right - the combo's own right arm swings the weapon. The weapon is fixed to the right hand: its socket_grip sits at
          the fist centre (centre of the loop made by the palm and the curled middle finger), its +X (handle towards the
          head) runs out of the thumb side of the fist (pinky knuckle -> index knuckle), its +Z (head's long axis, a
          striking face at each end) points along the fingers so the face leads a forward swing. The combo's open
          right fingers are replaced by the closed pistol-grip fist of the same loadout_008 guard.
  left  - the combo's own left arm (free off-hand swing) is replaced by the shield guard of loadout_008
          (`shield_guard` first key). The guard shield is carried with the chest (Spine2): it turns fully with the
          chest's heading but only TILT_FOLLOW of the chest's lean / side-bend, so it stays nearly upright while the
          combo leans into a swing. The left hand follows the shield (same hand-to-shield placement as the guard) by
          two-bone IK, the elbow on the guard's side; shoulder and finger rotations are the guard's. The shield mesh is
          fixed to the left hand.
Everything else (hips travel, legs, spine, head) is the combo unchanged.

Both items are meshes parented to the hand bones (no extra bones / keys needed).

usage: blender -b --python tools/glb_retarget/make_shield_melee_clips.py --
       <combos.glb> <guard_loadout.glb> <weapon.glb> <out.glb> src_clip=out_clip [src_clip=out_clip ...]"""
import bpy, sys, math
from mathutils import Matrix, Vector, Quaternion
argv = sys.argv[sys.argv.index('--') + 1:]
combo_path, guard_path, weapon_path, out_path = argv[:4]
CLIPS = [a.split('=', 1) for a in argv[4:]]
GUARD_CLIP = 'shield_guard'
GRIP_ALONG = 0.45     # palm point of the finger loop, between the wrist (0) and the middle knuckle (1)
TILT_FOLLOW = 0.25    # share of the chest's lean / side-bend the shield follows (heading always followed fully)
REACH = 0.97          # never lock the left elbow fully straight
FOREARM_TWIST = 0.5   # share of the wrist roll carried by the forearm
bpy.ops.wm.read_factory_settings(use_empty=True); sc = bpy.context.scene

# ---------- 1) guard: left-arm local rotations and the shield in left-hand space
bpy.ops.import_scene.gltf(filepath=guard_path)
ga = next(o for o in bpy.data.objects if o.type == 'ARMATURE')
gact = bpy.data.actions[GUARD_CLIP]
ga.animation_data.action = gact
if gact.slots: ga.animation_data.action_slot = gact.slots[0]
sc.frame_set(int(gact.frame_range[0])); bpy.context.view_layer.update()
LEFT = [b.name for b in ga.data.bones if b.name.startswith('mixamorig:Left') and
        any(k in b.name for k in ('Shoulder', 'Arm', 'ForeArm', 'Hand'))]
guard_rot = {n: ga.pose.bones[n].matrix_basis.copy() for n in LEFT}
RFING = [b.name for b in ga.data.bones if b.name.startswith('mixamorig:RightHand') and b.name != 'mixamorig:RightHand']
fist_rot = {n: ga.pose.bones[n].matrix_basis.to_quaternion() for n in RFING}   # the guard's pistol-grip fist
shield_obj = next(o for o in bpy.data.objects if o.type == 'MESH' and o.name.startswith('shield'))
lh_world = ga.matrix_world @ ga.pose.bones['mixamorig:LeftHand'].matrix
shield_world = shield_obj.matrix_world.copy()
gp = ga.pose.bones; ginv = ga.matrix_world.inverted()
G_CHEST = gp['mixamorig:Spine2'].matrix.copy()
G_SHIELD = ginv @ shield_world                                  # armature space
G_HAND = gp['mixamorig:LeftHand'].matrix.copy()
G_POLE = gp['mixamorig:LeftForeArm'].head - (gp['mixamorig:LeftArm'].head + gp['mixamorig:LeftHand'].head) / 2
shield_mesh = shield_obj.data.copy(); shield_mesh.name = 'shield'
shield_mesh.transform(lh_world.inverted() @ shield_world)        # vertices in left-hand space
for o in list(bpy.data.objects): bpy.data.objects.remove(o, do_unlink=True)
for a in list(bpy.data.actions): bpy.data.actions.remove(a)
print('GUARD bones', len(guard_rot))

# ---------- 2) combos
bpy.ops.import_scene.gltf(filepath=combo_path)
arm = next(o for o in bpy.data.objects if o.type == 'ARMATURE')
bodies = [o for o in bpy.data.objects if o.type == 'MESH' and o.parent == arm]
height = max((b.matrix_world @ v.co).z for b in bodies for v in b.data.vertices)
k = height / 1.65
keep = {src for src, _ in CLIPS}
for a in list(bpy.data.actions):
    if a.name not in keep: bpy.data.actions.remove(a)
pbs = arm.pose.bones
def head(n): return (arm.matrix_world @ pbs['mixamorig:' + n].matrix).to_translation()

# ---------- 3) weapon: load, scale to the character, place in right-hand space from the first combo frame
before = set(bpy.data.objects)
bpy.ops.import_scene.gltf(filepath=weapon_path)
new = [o for o in bpy.data.objects if o not in before]
sock = {o.name.split('.')[0]: o.matrix_world.translation * k for o in new if o.name.startswith('socket_')}
wpn = None
for o in new:
    if o.type != 'MESH': bpy.data.objects.remove(o, do_unlink=True); continue
    bpy.ops.object.select_all(action='DESELECT'); o.select_set(True); bpy.context.view_layer.objects.active = o
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    o.data.transform(Matrix.Scale(k, 4)); wpn = o
src0 = CLIPS[0][0]; act0 = bpy.data.actions[src0]
arm.animation_data.action = act0
if act0.slots: arm.animation_data.action_slot = act0.slots[0]
sc.frame_set(int(act0.frame_range[0])); bpy.context.view_layer.update()
for n, q in fist_rot.items(): pbs[n].rotation_mode = 'QUATERNION'; pbs[n].rotation_quaternion = q
bpy.context.view_layer.update()
wrist = head('RightHand'); m1 = head('RightHandMiddle1')
fdir = (m1 - wrist).normalized()                                    # fingers' direction
loop = [wrist + (m1 - wrist) * GRIP_ALONG] + [head(f'RightHandMiddle{i}') for i in (1, 2, 3, 4)]
fist = sum(loop, Vector()) / len(loop)                              # centre of the loop of palm and curled middle finger
kn_i, kn_p = head('RightHandIndex1'), head('RightHandPinky1')
x = kn_i - kn_p; x = (x - fdir * x.dot(fdir)).normalized()          # handle: out of the thumb side
z = fdir                                                            # head's long axis: toward the knuckles
y = z.cross(x)
w_world = Matrix((x, y, z)).transposed().to_4x4(); w_world.translation = fist
w_world = w_world @ Matrix.Translation(-sock['socket_grip'])        # socket_grip onto the fist centre
rh_world = arm.matrix_world @ pbs['mixamorig:RightHand'].matrix
wpn.data.transform(rh_world.inverted() @ w_world); wpn.name = 'weapon_hammer'; wpn.data.name = 'weapon_hammer'   # not 'weapon': glb-gun-fx would look for a muzzle
print('FIST from wrist mm', round((fist - wrist).length / k * 1000, 1))

# ---------- 4) parent both items to the hand bones (child frame = bone head frame)
shield = bpy.data.objects.new('shield', shield_mesh); sc.collection.objects.link(shield)
for obj, bn in ((shield, 'mixamorig:LeftHand'), (wpn, 'mixamorig:RightHand')):
    obj.matrix_world = Matrix.Identity(4)
    obj.parent = arm; obj.parent_type = 'BONE'; obj.parent_bone = bn
    obj.matrix_parent_inverse = Matrix.Translation((0, -arm.data.bones[bn].length, 0)); obj.matrix_basis = Matrix.Identity(4)

# ---------- 5) left arm: shield carried with the chest, hand by IK
bones = arm.data.bones; REST = {b.name: b.matrix_local.copy() for b in bones}
def rest_child(parent_pose, n): return parent_pose @ REST[bones[n].parent.name].inverted() @ REST[n]
def swing(M, direction):
    q = M.to_3x3().col[1].normalized().rotation_difference(direction.normalized())
    return Matrix.Translation(M.to_translation()) @ (q.to_matrix() @ M.to_3x3()).to_4x4()
def basis_quat(parent_pose, n, pose): return (rest_child(parent_pose, n).inverted() @ pose).to_quaternion()
LA = (REST['mixamorig:LeftForeArm'].to_translation() - REST['mixamorig:LeftArm'].to_translation()).length
LF = (REST['mixamorig:LeftHand'].to_translation() - REST['mixamorig:LeftForeArm'].to_translation()).length
def solve_arm(shoulder_pose, hand_goal, pole):
    A0 = rest_child(shoulder_pose, 'mixamorig:LeftArm'); p_sh = A0.to_translation()
    d_vec = hand_goal.to_translation() - p_sh
    d = min(max(d_vec.length, abs(LA - LF) + 1e-4), (LA + LF) * REACH); dirn = d_vec.normalized()
    cos_a = max(-1.0, min(1.0, (LA * LA + d * d - LF * LF) / (2 * LA * d)))
    pp = (pole - pole.dot(dirn) * dirn).normalized()
    p_el = p_sh + dirn * (LA * cos_a) + pp * (LA * math.sqrt(max(0.0, 1 - cos_a * cos_a))); p_wr = p_sh + dirn * d
    A = swing(A0, p_el - p_sh)
    F = swing(rest_child(A, 'mixamorig:LeftForeArm'), p_wr - p_el)
    Rh = hand_goal.to_3x3()
    q = (rest_child(F, 'mixamorig:LeftHand').to_3x3().inverted() @ Rh).to_quaternion()
    if q.w < 0: q.negate()
    tw = Quaternion((q.w, 0, q.y, 0)); tw.normalize()
    F = F @ Quaternion((1, 0, 0, 0)).slerp(tw, FOREARM_TWIST).to_matrix().to_4x4()
    H = Matrix.Translation(rest_child(F, 'mixamorig:LeftHand').to_translation()) @ Rh.to_4x4()
    return ({'mixamorig:LeftArm': basis_quat(shoulder_pose, 'mixamorig:LeftArm', A),
             'mixamorig:LeftForeArm': basis_quat(A, 'mixamorig:LeftForeArm', F),
             'mixamorig:LeftHand': basis_quat(F, 'mixamorig:LeftHand', H)}, max(0.0, d_vec.length - d))
HAX = min((0, 2), key=lambda i: abs(G_CHEST.to_3x3().col[i].normalized().z))   # the chest bone axis lying most level
def heading(M):   # direction of that chest axis on the ground
    f = M.to_3x3().col[HAX]; return math.atan2(f.y, f.x)
HAND_IN_SHIELD = G_SHIELD.inverted() @ G_HAND
FINGERS = [n for n in LEFT if n.startswith('mixamorig:LeftHand') and n != 'mixamorig:LeftHand']
for src, dst in CLIPS:
    act = bpy.data.actions[src]
    arm.animation_data.action = act
    if act.slots: arm.animation_data.action_slot = act.slots[0]
    s, e = int(act.frame_range[0]), int(act.frame_range[1])
    miss = 0.0; last = {}
    def put(n, q, f):
        if n in last and last[n].dot(q) < 0: q = -q
        last[n] = q; pbs[n].rotation_mode = 'QUATERNION'; pbs[n].rotation_quaternion = q; pbs[n].keyframe_insert('rotation_quaternion', frame=f)
    for f in range(s, e + 1):
        sc.frame_set(f)
        C = pbs['mixamorig:Spine2'].matrix.copy()
        Rz = Matrix.Rotation(heading(C) - heading(G_CHEST), 3, 'Z')
        full = C.to_3x3() @ G_CHEST.to_3x3().inverted()
        tilt = (full @ Rz.inverted()).to_quaternion()
        R = (Quaternion((1, 0, 0, 0)).slerp(tilt, TILT_FOLLOW).to_matrix() @ Rz).to_4x4()
        P_f, P_g = C.to_translation(), G_CHEST.to_translation()
        S = Matrix.Translation(P_f) @ R @ Matrix.Translation(-P_g) @ G_SHIELD
        q_sh = guard_rot['mixamorig:LeftShoulder'].to_quaternion()
        put('mixamorig:LeftShoulder', q_sh, f)
        sh_pose = rest_child(C, 'mixamorig:LeftShoulder') @ q_sh.to_matrix().to_4x4()
        quats, m = solve_arm(sh_pose, S @ HAND_IN_SHIELD, R.to_3x3() @ G_POLE)
        miss = max(miss, m)
        for n, q in quats.items(): put(n, q, f)
        for n in FINGERS: put(n, guard_rot[n].to_quaternion(), f)
        for n in RFING: put(n, fist_rot[n].copy(), f)
    act.name = dst
    print('CLIP', dst, 'frames', s, e, 'left hand out of reach max mm', round(miss / k * 1000, 1))

bpy.ops.object.select_all(action='SELECT')
bpy.ops.export_scene.gltf(filepath=out_path, use_selection=True, export_animations=True, export_animation_mode='ACTIONS')
print('SAVED', out_path)
