"""Shield + pistol clips (Yuna): shield on the left arm, pistol in the right hand. Export a loadout GLB.

Same structure as make_dual_pistol_clips.py: legs / hips / spine / head come from a base clip, both arms are authored
from scratch in "weapon space":
  left  - per frame a goal for the SHIELD itself (grip socket relative to the left shoulder joint, yaw, backward tilt,
          roll) -> the left hand follows from a fixed grip offset (fist around a vertical handle at socket_grip, palm
          toward the body, back of the hand toward the plate) -> two-bone IK. The forearm lies across the back of the
          plate; the point where it touches (STRAP_ALONG of the forearm from the wrist) is fixed in shield space on the
          first frame and its drift is reported.
          The model's socket_forearm sits 0.16 m straight BELOW socket_grip (a vertical forearm); with the hand at chest
          height that would need the elbow far below what the upper arm reaches (or the shield above the head), so the
          strap point is taken where the forearm crosses the back of the plate instead (printed in real metres).
  right - per frame a goal for the PISTOL (grip relative to the right shoulder joint, muzzle pitch / yaw, cant) -> hand
          from a fixed grip offset -> two-bone IK (same as the dual pistols).
Fingers: the right hand's pistol-grip curl of `pistol_idle2`, mirrored onto the left hand (fist around the handle).

Clips (24 fps, all loop; the last frame equals the first):
  shield_guard 65 f  base pistol_idle2 x2  shield upright close in front of the body up to below the eyes, pistol upright
                                           beside the head (muzzle up, elbow tucked down), slow breathing
  shield_fire  25 f  base pistol_idle2     shield kept in the guard, right arm straight out and level past the right edge;
                                           2 shots per loop (frames 1 and 13) with recoil
  shield_walk  20 f  base pistol_walk      the guard carried through the pistol walk (keeps the base clip's hips travel)
In all clips the neck / head are turned so the face looks level and straight ahead (HEAD_LEVEL).
The shield is scaled by the height ratio x SHIELD_SCALE (default 1.25, optional 5th argument; loadout_007 used 1.0 and
older goal values, see the Yuna README).
The shield and the pistol are driven by non-deforming bones under the Hips (`shield`, `weapon`).

usage: blender -b --python tools/glb_retarget/make_shield_pistol_clips.py -- <character.glb> <shield.glb> <pistol.glb> <out.glb> [shield scale]"""
import bpy, sys, math, os
from mathutils import Matrix, Vector, Quaternion
argv = sys.argv[sys.argv.index('--') + 1:]
char_path, shield_path, gun_path, out_path = argv[:4]
SHIELD_SCALE = float(argv[4]) if len(argv) > 4 else 1.25   # shield enlarged against the character on top of the height ratio (user request)
RAKE = math.radians(14)      # pistol: barrel raised from the fingers' direction (grip rake)
GRIP_ALONG = 0.45            # palm point of the finger loop, between the wrist (0) and the middle knuckle (1)
MAX_CLEAR = 0.012            # m real: largest move of the pistol out of the palm
HIGH_GRIP = 0.014            # m real: the hand sits this much above the pistol's grip socket
SHIELD_CLEAR = 0.06          # m real: largest move of the left hand back from the plate (handle stand-off)
HAND_DROOP = math.radians(30)  # the left fist is turned this much (knuckles down) about the palm normal: the forearm comes down to the handle
STRAP_ALONG = 0.55           # forearm point resting on the plate, from the wrist (0) to the elbow (1)
REACH = 0.97                 # never lock the elbow fully straight
FIRE_REACH = 0.995           # firing: right arm straight out (user request), short of a hard lock
FIRE_FWD = 0.985             # firing grip distance from the shoulder joint, as a share of the arm + hand-to-grip length
HEAD_LEVEL = True            # neck / head turned so the face looks level and straight ahead (the base clips look down)
FOREARM_TWIST = 0.5          # share of the wrist roll carried by the forearm
bpy.ops.wm.read_factory_settings(use_empty=True); sc = bpy.context.scene

bpy.ops.import_scene.gltf(filepath=char_path)
arm = next(o for o in bpy.data.objects if o.type == 'ARMATURE')
bodies = [o for o in bpy.data.objects if o.type == 'MESH' and o.parent == arm]
height = max((b.matrix_world @ v.co).z for b in bodies for v in b.data.vertices)
k = height / 1.65
def load_weapon(path, name, scale):
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=path)
    new = [o for o in bpy.data.objects if o not in before]
    sockets = {o.name.split('.')[0]: o.matrix_world.translation * scale for o in new if o.name.startswith('socket_')}
    mesh = None
    for o in new:
        if o.type != 'MESH': bpy.data.objects.remove(o, do_unlink=True); continue
        bpy.ops.object.select_all(action='DESELECT'); o.select_set(True); bpy.context.view_layer.objects.active = o
        bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
        o.data.transform(Matrix.Scale(scale, 4)); o.name = name; mesh = o
    return mesh, sockets
shield, s_sock = load_weapon(shield_path, 'shield', k * SHIELD_SCALE)
gun, g_sock = load_weapon(gun_path, 'weapon', k)
S_GRIP = s_sock['socket_grip']; G_GRIP = g_sock['socket_grip']
WBONE = {'Left': 'shield', 'Right': 'weapon'}; ITEM = {'Left': shield, 'Right': gun}; SIDES = ('Left', 'Right')

bpy.ops.object.select_all(action='DESELECT'); arm.select_set(True); bpy.context.view_layer.objects.active = arm
bpy.ops.object.mode_set(mode='EDIT')
for name in WBONE.values():
    eb = arm.data.edit_bones.new(name); eb.head = (0, 0, 0); eb.tail = (0, 0.1, 0); eb.use_deform = False
    eb.parent = arm.data.edit_bones['mixamorig:Hips']; eb.use_connect = False
bpy.ops.object.mode_set(mode='OBJECT')
pbs = arm.pose.bones; bones = arm.data.bones
for s, bname in WBONE.items():
    pbs[bname].rotation_mode = 'QUATERNION'; g = ITEM[s]
    g.parent = arm; g.parent_type = 'BONE'; g.parent_bone = bname
    g.matrix_parent_inverse = Matrix.Identity(4); g.matrix_basis = Matrix.Translation((0, -bones[bname].length, 0))
REST = {b.name: b.matrix_local.copy() for b in bones}
UP, FWD = Vector((0, 0, 1)), Vector((0, -1, 0))          # armature space: the character faces -Y, +X is its left
OUT = {'Left': Vector((1, 0, 0)), 'Right': Vector((-1, 0, 0))}
def B(side, part): return f'mixamorig:{side}{part}'
def fingers(side): return [b.name for b in bones if b.name.startswith(B(side, 'Hand')) and b.name != B(side, 'Hand')]   # parents first
ARM_BONES = {n for s in SIDES for n in [B(s, 'Arm'), B(s, 'ForeArm'), B(s, 'Hand')] + fingers(s)} | set(WBONE.values())
BODY_BONES = [b.name for b in bones if b.name not in ARM_BONES]

def rest_child(parent_pose, n):
    """armature-space pose of bone n with no rotation of its own"""
    return parent_pose @ REST[bones[n].parent.name].inverted() @ REST[n]
def swing(M, direction):
    """turn M the shortest way so its Y axis (the bone) points along direction"""
    q = M.to_3x3().col[1].normalized().rotation_difference(direction.normalized())
    return Matrix.Translation(M.to_translation()) @ (q.to_matrix() @ M.to_3x3()).to_4x4()
def basis_quat(parent_pose, n, pose): return (rest_child(parent_pose, n).inverted() @ pose).to_quaternion()

# ---- finger curl: right hand of pistol_idle2 (a pistol grip), mirrored onto the left hand
src = bpy.data.actions['pistol_idle2']; arm.animation_data.action = src
if src.slots: arm.animation_data.action_slot = src.slots[0]
s0, e0 = map(int, src.frame_range); sc.frame_set((s0 + e0) // 2)
FINGER = {n: pbs[n].matrix_basis.to_quaternion() for n in fingers('Right')}
MIRROR = Matrix.Diagonal((-1, 1, 1))
hand_pose = pbs[B('Right', 'Hand')].matrix.copy(); delta = {B('Left', 'Hand'): Matrix.Identity(3)}
for n in fingers('Right'):
    at_rest_hand = (REST[B('Right', 'Hand')] @ hand_pose.inverted() @ pbs[n].matrix).to_3x3()
    d = MIRROR @ (at_rest_hand @ REST[n].to_3x3().inverted()) @ MIRROR
    ln = n.replace('Right', 'Left'); delta[ln] = d
    r = REST[ln].to_3x3()
    FINGER[ln] = (r.inverted() @ delta[bones[ln].parent.name].inverted() @ d @ r).to_quaternion()

# ---- grip offsets (hand bone -> weapon), found on the rest pose with the fingers curled
arm.animation_data.action = None
for pb in pbs: pb.matrix_basis = Matrix.Identity(4)
for n, q in FINGER.items(): pbs[n].rotation_quaternion = q
bpy.context.view_layer.update()
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from hand_clearance import HandClearance
OFFSET = {}
def hand_frame(s):
    h, m = REST[B(s, 'Hand')].to_translation(), REST[B(s, 'HandMiddle1')].to_translation()
    a = (m - h).normalized()                                    # fingers' direction
    t = (FWD - FWD.dot(a) * a).normalized()                     # toward the thumb
    loop = [h + (m - h) * GRIP_ALONG] + [pbs[B(s, f'HandMiddle{i}')].head.copy() for i in (1, 2, 3, 4)]
    return a, t, sum(loop, Vector()) / len(loop)                # + centre of the loop made by the palm and the curled middle finger
def clearance(s, mesh): return HandClearance(arm, bodies, [v.co.copy() for v in mesh.data.vertices], [tuple(p.vertices) for p in mesh.data.polygons], k)
# right: pistol (as make_dual_pistol_clips.py)
a, t, centre = hand_frame('Right')
x = (a * math.cos(RAKE) + t * math.sin(RAKE)).normalized(); z = (t * math.cos(RAKE) - a * math.sin(RAKE)).normalized()
M = Matrix.Translation(centre - z * (HIGH_GRIP * k)) @ Matrix((x, z.cross(x), z)).transposed().to_4x4() @ Matrix.Translation(-G_GRIP)
clear = clearance('Right', gun); hb = pbs[B('Right', 'Hand')]
v, d0, rest = clear.shift(clear.local('Right'), hb.matrix.to_3x3(), hb.head.copy(), M, [(0, -1, 0)], max_shift=MAX_CLEAR)
if rest < d0: M = Matrix.Translation(-v) @ M
else: v, rest = Vector(), d0
OFFSET['Right'] = REST[B('Right', 'Hand')].inverted() @ M
print('GRIP pistol: palm in gun %.0f -> %.0f mm, pistol moved %.0f mm out of the palm' % (d0 / k * 1000, rest / k * 1000, v.length / k * 1000))
# left: shield. Handle vertical (shield Z) across the palm = thumb direction, the palm faces the body (shield +Y),
# the fingers point toward the character's right (shield -X), turned down by HAND_DROOP
a, t, centre = hand_frame('Left')
n = a.cross(t).normalized()                                     # palm normal (the way the left palm faces)
a2 = (Quaternion(n, -HAND_DROOP) @ a).normalized()
if a2.dot(t) > 0: a2 = (Quaternion(n, HAND_DROOP) @ a).normalized()   # knuckles away from the thumb side
t2 = n.cross(a2).normalized()
M = Matrix.Translation(centre) @ Matrix((-a2, n, t2)).transposed().to_4x4() @ Matrix.Translation(-S_GRIP)
clear = clearance('Left', shield); hb = pbs[B('Left', 'Hand')]
v, d0, rest = clear.shift(clear.local('Left'), hb.matrix.to_3x3(), hb.head.copy(), M, [(0, 1, 0)], max_shift=SHIELD_CLEAR)
M = Matrix.Translation(-v) @ M
OFFSET['Left'] = REST[B('Left', 'Hand')].inverted() @ M
STANDOFF = v.length
print('GRIP shield (x%.2f): hand in plate %.0f -> %.0f mm, fist centre %.0f mm behind socket_grip (real, character scale)' % (SHIELD_SCALE, d0 / k * 1000, rest / k * 1000, STANDOFF / k * 1000))
LEN = {s: ((REST[B(s, 'ForeArm')].to_translation() - REST[B(s, 'Arm')].to_translation()).length,
           (REST[B(s, 'Hand')].to_translation() - REST[B(s, 'ForeArm')].to_translation()).length) for s in SIDES}
FIRE_DIST = (LEN['Right'][0] + LEN['Right'][1]) * FIRE_REACH + (OFFSET['Right'] @ G_GRIP).to_3d().length * 0.85
print('SETUP char height %.3f scale %.4f arm lengths %s' % (height, k, {s: tuple(round(x, 3) for x in LEN[s]) for s in LEN}))

def gun_matrix(grip, pitch, yaw_in, cant):
    """pistol -> armature: grip socket at `grip`, muzzle pitched up / turned toward the body's centre, sights canted inward (degrees)"""
    inward = -OUT['Right']
    d = (FWD * math.cos(math.radians(yaw_in)) + inward * math.sin(math.radians(yaw_in))).normalized()
    d = (d * math.cos(math.radians(pitch)) + UP * math.sin(math.radians(pitch))).normalized()
    z = (UP - UP.dot(d) * d).normalized()
    z = Quaternion(d, -math.radians(cant)) @ z
    return Matrix.Translation(grip) @ Matrix((d, z.cross(d), z)).transposed().to_4x4() @ Matrix.Translation(-G_GRIP)
def shield_matrix(grip, yaw, tilt, roll):
    """shield -> armature: grip socket at `grip`; yaw + = the face turns toward the character's left, tilt + = the top
    leans back toward the character, roll + = the top leans toward the character's left (degrees)"""
    R = Matrix.Rotation(math.radians(-yaw), 4, 'Z') @ Matrix.Rotation(math.radians(-tilt), 4, 'X') @ Matrix.Rotation(math.radians(roll), 4, 'Y')
    return Matrix.Translation(grip) @ R @ Matrix.Translation(-S_GRIP)

def solve_arm(side, shoulder_pose, hand_goal, pole, reach=REACH):
    """two-bone IK; returns ({bone: basis quaternion}, hand pose actually reached, how far the goal was out of reach, elbow, elbow angle)"""
    la, lf = LEN[side]; A0 = rest_child(shoulder_pose, B(side, 'Arm')); p_sh = A0.to_translation()
    d_vec = hand_goal.to_translation() - p_sh
    d = min(max(d_vec.length, abs(la - lf) + 1e-4), (la + lf) * reach); dirn = d_vec.normalized()
    cos_a = max(-1.0, min(1.0, (la * la + d * d - lf * lf) / (2 * la * d)))
    pp = (pole - pole.dot(dirn) * dirn).normalized()
    p_el = p_sh + dirn * (la * cos_a) + pp * (la * math.sqrt(max(0.0, 1 - cos_a * cos_a))); p_wr = p_sh + dirn * d
    A = swing(A0, p_el - p_sh)
    F = swing(rest_child(A, B(side, 'ForeArm')), p_wr - p_el)
    Rh = hand_goal.to_3x3()
    q = (rest_child(F, B(side, 'Hand')).to_3x3().inverted() @ Rh).to_quaternion()
    if q.w < 0: q.negate()
    tw = Quaternion((q.w, 0, q.y, 0)); tw.normalize()                # roll about the bone's own axis
    F = F @ Quaternion((1, 0, 0, 0)).slerp(tw, FOREARM_TWIST).to_matrix().to_4x4()
    H = Matrix.Translation(rest_child(F, B(side, 'Hand')).to_translation()) @ Rh.to_4x4()
    quats = {B(side, 'Arm'): basis_quat(shoulder_pose, B(side, 'Arm'), A), B(side, 'ForeArm'): basis_quat(A, B(side, 'ForeArm'), F),
             B(side, 'Hand'): basis_quat(F, B(side, 'Hand'), H)}
    bend = math.degrees(math.acos(max(-1, min(1, (la * la + lf * lf - d * d) / (2 * la * lf)))))
    return quats, H, max(0.0, d_vec.length - d), p_el, bend

# ---- clip designs (character units, 1.0 = body height; positions [forward, outward, up] from that arm's shoulder joint)
RECOIL = {1: 1.0, 2: 0.72, 3: 0.42, 4: 0.2, 5: 0.06}   # frames after the shot -> share of the kick
SHOTS = (1, 13)                                          # shield_fire: frame of each shot in the 24-frame loop
def kick(f): return max(RECOIL.get((f - 1 - (s - 1)) % 24, 0.0) for s in SHOTS)
def pole_of(side, out, back=0.0, down=1.0): return -UP * down + OUT[side] * out - FWD * back
SHIELD_POS = (0.110, -0.015, -0.198)      # shield grip socket: close in front of the left shoulder, toward the body's centre, below it
SHIELD_TILT = 6.0
SHIELD_POLE = dict(out=1.0, back=0.0, down=0.55)
GUN_X = 0.100                             # firing: pistol grip this far outside the right shoulder joint, just past the shield's right edge
def shield_goal(c, e=0.0):
    breathe = math.sin(2 * math.pi * c['t'] * c['breaths'])
    fw, out, up = SHIELD_POS
    # the shot shakes the shield a little (pushed 3 mm back, 1 degree of roll)
    return (fw + c['carry'][0] - 0.003 * e, out, up + 0.003 * breathe * c['calm']), 0.0, SHIELD_TILT + c['carry'][1] + 0.6 * breathe * c['calm'], 1.0 * e, pole_of('Left', **SHIELD_POLE)
HIGH_POS = (0.085, 0.040, 0.095)          # pistol upright beside the head (as Lian's dual_idle_high right hand)
def guard_gun(c):
    breathe = math.sin(2 * math.pi * c['t'] * c['breaths'] - 0.9)
    fw, out, up = HIGH_POS
    return (fw, out, up + 0.004 * breathe * c['calm']), 82.0 + 1.5 * breathe * c['calm'], 0.0, 0.0, pole_of('Right', 0.35)
FIRE_UP = -0.022                          # grip this far below the shoulder joint: the wrist ends level with the shoulder
def fire_gun(c):
    # right arm straight out and level from its own shoulder joint; the kick pulls the grip back a little and raises the muzzle
    e = kick(c['f']); d = FIRE_DIST * FIRE_FWD
    return (math.sqrt(d * d - GUN_X * GUN_X) - 0.020 * e, GUN_X, FIRE_UP + 0.010 * e), 14.0 * e, 0.0, 0.0, pole_of('Right', 0.2)
def walk_gun(c):
    sw = c['swing']; fw, out, up = HIGH_POS
    return (fw, out, up + 0.004 * sw), 82.0 + 1.5 * sw, 0.0, 0.0, pole_of('Right', 0.35)
def fire_spine(c): return -2.2 * kick(c['f'])          # the right shoulder is pushed back by the shot (degrees about the vertical)
def face(head_pose): return (head_pose.to_3x3() @ REST['mixamorig:Head'].to_3x3().inverted() @ FWD).normalized()

CLIPS = [  # name, base clip, output frames (last = first), base loops, pistol goal, shield shaken by the shots, breathing share, extra spine yaw,
           # shield carried (further forward, tilted more: the bottom swings out of the striding legs' way)
    ('shield_guard', 'pistol_idle2', 65, 2, guard_gun, False, 1.0, None, (0.0, 0.0)),
    ('shield_fire', 'pistol_idle2', 25, 1, fire_gun, True, 0.0, fire_spine, (0.0, 0.0)),
    ('shield_walk', 'pistol_walk', 20, 1, walk_gun, False, 0.0, None, (0.004, 8.0)),
]

def key(pb, f): pb.keyframe_insert('rotation_quaternion', frame=f)
hips_rest_inv = REST['mixamorig:Hips'].inverted()
STRAP = None            # forearm contact point in shield space (fixed on the first frame made)
made = []
for name, base_name, count, loops, gun_goal, shaken, calm, spine, carry in CLIPS:
    base = bpy.data.actions[base_name]; bs, be = map(int, base.frame_range)
    # pass A: sample the body of the base clip
    arm.animation_data.action = base
    if base.slots: arm.animation_data.action_slot = base.slots[0]
    body = {}; swing_raw = {}; feet = {}
    for f in range(1, count + 1):
        u = (f - 1) / (count - 1) * loops; u = (u % 1.0) if f < count else 0.0
        bf = bs + u * (be - bs); sc.frame_set(int(bf), subframe=bf - int(bf))
        frame = {n: (pbs[n].location.copy(), pbs[n].rotation_quaternion.copy()) for n in BODY_BONES}
        if HEAD_LEVEL:   # shortest turn of the face onto level-straight-ahead: half on the neck, all of it reached at the head
            NK, HD = 'mixamorig:Neck', 'mixamorig:Head'; par = pbs[bones[NK].parent.name].matrix.copy()
            q = face(pbs[HD].matrix).rotation_difference(FWD); half = Quaternion((1, 0, 0, 0)).slerp(q, 0.5)
            neck = Matrix.Translation(pbs[NK].matrix.to_translation()) @ (half.to_matrix() @ pbs[NK].matrix.to_3x3()).to_4x4()
            head = Matrix.Translation(rest_child(neck, HD).to_translation()) @ (q.to_matrix() @ pbs[HD].matrix.to_3x3()).to_4x4()
            frame[NK] = (frame[NK][0], basis_quat(par, NK, neck)); frame[HD] = (frame[HD][0], basis_quat(neck, HD, head))
        if spine:
            yaw = math.radians(spine({'f': f})) / 2
            for n in ('mixamorig:Spine1', 'mixamorig:Spine2'):   # rotation about the vertical through the bone, in bone space
                r = pbs[n].matrix.to_3x3(); add = (r.inverted() @ Matrix.Rotation(yaw, 3, 'Z') @ r).to_quaternion()
                frame[n] = (frame[n][0], frame[n][1] @ add)
        body[f] = frame
        feet[f] = [pbs[B(s, p)].matrix.copy() for s in SIDES for p in ('Foot', 'ToeBase')]
        swing_raw[f] = pbs['mixamorig:LeftFoot'].head.y - pbs['mixamorig:RightFoot'].head.y   # negative: left foot forward
    top = max(abs(v) for v in swing_raw.values()) or 1.0
    # pass B: new action, body keys
    act = base.copy(); act.name = name
    for l in act.layers:
        for st in l.strips:
            for cb in st.channelbags:
                for fc in list(cb.fcurves): cb.fcurves.remove(fc)
    arm.animation_data.action = act
    if act.slots: arm.animation_data.action_slot = act.slots[0]
    last = {}
    def put(n, q, f):
        if n in last and last[n].dot(q) < 0: q = -q
        last[n] = q; pbs[n].rotation_quaternion = q; key(pbs[n], f)
    for f in range(1, count + 1):
        for n in BODY_BONES:
            loc, q = body[f][n]
            if n == 'mixamorig:Hips':
                pbs[n].location = loc; pbs[n].keyframe_insert('location', frame=f)
            put(n, q.copy(), f)
    # pass C: arms, hands, shield, pistol
    miss = {'Left': 0.0, 'Right': 0.0}; bends = {'Left': [], 'Right': []}; pitch_at = {}; expect = {}
    for f in range(1, count + 1):
        sc.frame_set(f)
        ctx = {'f': f, 't': (f - 1) / (count - 1), 'swing': -swing_raw[f] / top, 'breaths': loops, 'calm': calm, 'carry': carry}
        joints = {s: rest_child(pbs[B(s, 'Shoulder')].matrix, B(s, 'Arm')).to_translation() for s in SIDES}
        hips_inv = pbs['mixamorig:Hips'].matrix.inverted()
        (fw, out, up), yaw, tilt, roll, pole = shield_goal(ctx, kick(f) if shaken else 0.0)
        G = {'Left': shield_matrix(joints['Left'] + OUT['Left'] * out + FWD * fw + UP * up, yaw, tilt, roll)}
        poles = {'Left': pole}
        (fw, out, up), pitch, yaw_in, cant, poles['Right'] = gun_goal(ctx)
        G['Right'] = gun_matrix(joints['Right'] + OUT['Right'] * out + FWD * fw + UP * up, pitch, yaw_in, cant)
        for s in SIDES:
            quats, H, m, elbow, bend = solve_arm(s, pbs[B(s, 'Shoulder')].matrix.copy(), G[s] @ OFFSET[s].inverted(), poles[s], FIRE_REACH if s == 'Right' and gun_goal is fire_gun else REACH)
            miss[s] = max(miss[s], m); bends[s].append(bend)
            for n, q in quats.items(): put(n, q, f)
            for n in fingers(s): put(n, FINGER[n].copy(), f)
            W = H @ OFFSET[s]                                   # where the weapon really is (the hand may fall short of the goal)
            rel = (hips_rest_inv @ REST[WBONE[s]]).inverted()
            loc, rot, _ = (rel @ hips_inv @ W).decompose()
            pbs[WBONE[s]].location = loc; pbs[WBONE[s]].keyframe_insert('location', frame=f); put(WBONE[s], rot, f)
            expect[(s, f)] = W
            if s == 'Left':
                touch = H.to_translation() + (elbow - H.to_translation()) * STRAP_ALONG
                if STRAP is None:
                    STRAP = W.inverted() @ touch
                    print('STRAP forearm contact point in the shield model (real m): (%.3f, %.3f, %.3f); socket_grip (%.3f, %.3f, %.3f), model socket_forearm (%.3f, %.3f, %.3f)' % (
                        *(STRAP / (k * SHIELD_SCALE)), *(S_GRIP / (k * SHIELD_SCALE)), *(s_sock['socket_forearm'] / (k * SHIELD_SCALE))))
            else:
                pitch_at[f] = math.degrees(math.asin(max(-1, min(1, W.to_3x3().col[0].normalized().dot(UP)))))
    # pass D: read the keyed result back (what the exporter sees) and measure contacts and feet
    worst = {'pistol grip': 0.0, 'shield grip': 0.0, 'strap': 0.0, 'feet': 0.0}; back = []; look = []; tops = []; arm_pitch = []
    for f in range(1, count + 1):
        sc.frame_set(f)
        for s in SIDES:
            W = pbs[WBONE[s]].matrix @ REST[WBONE[s]].inverted()          # weapon -> armature
            Hh = pbs[B(s, 'Hand')].matrix @ OFFSET[s]                     # where the hand says the weapon is
            sock = G_GRIP if s == 'Right' else S_GRIP
            worst['pistol grip' if s == 'Right' else 'shield grip'] = max(worst['pistol grip' if s == 'Right' else 'shield grip'], ((W @ sock) - (Hh @ sock)).length)
            if s == 'Left':
                wrist = pbs[B(s, 'Hand')].head; elbow = pbs[B(s, 'ForeArm')].head
                worst['strap'] = max(worst['strap'], ((W @ STRAP) - (wrist + (elbow - wrist) * STRAP_ALONG)).length)
                back.append((W.inverted() @ elbow).y)                    # elbow behind the plate's centre plane
        d = face(pbs['mixamorig:Head'].matrix); look.append((math.degrees(math.asin(d.z)), math.degrees(math.atan2(-d.x, -d.y))))
        Ws = pbs['shield'].matrix @ REST['shield'].inverted(); zs = [(Ws @ v.co).z for v in list(shield.data.vertices)[::40]]; tops.append((max(zs), min(zs)))
        av = pbs[B('Right', 'Hand')].head - pbs[B('Right', 'Arm')].head; arm_pitch.append(math.degrees(math.asin(av.normalized().z)))
        now = [pbs[B(s, p)].matrix for s in SIDES for p in ('Foot', 'ToeBase')]
        worst['feet'] = max(worst['feet'], max((a.to_translation() - b.to_translation()).length for a, b in zip(now, feet[f])))
    extra = ''
    extra = '  muzzle %+.1f..%+.1f deg' % (min(pitch_at.values()), max(pitch_at.values()))
    if gun_goal is fire_gun: extra = '  muzzle at shots %s deg, peak kick %+.1f deg, right arm (shoulder->wrist) pitch %+.1f..%+.1f deg' % (['%+.1f' % pitch_at[f] for f in SHOTS], max(pitch_at.values()), min(arm_pitch), max(arm_pitch))
    extra += '  face pitch %+.1f..%+.1f yaw %+.1f..%+.1f deg  shield top %.3f..%.3f bottom %.3f' % (min(l[0] for l in look), max(l[0] for l in look), min(l[1] for l in look), max(l[1] for l in look), min(t[0] for t in tops), max(t[0] for t in tops), min(t[1] for t in tops))
    print('CLIP %-12s base %-12s frames %2d  out of reach L %.0f R %.0f mm  elbow angle L %.0f..%.0f R %.0f..%.0f deg  read back (real mm): %s%s' % (
        name, base_name, count, miss['Left'] / k * 1000, miss['Right'] / k * 1000, min(bends['Left']), max(bends['Left']), min(bends['Right']), max(bends['Right']),
        ', '.join('%s %.2f' % (n, v / k * 1000) for n, v in worst.items()), extra))
    made.append(name)

for a in list(bpy.data.actions):
    if a.name not in made: bpy.data.actions.remove(a)
if arm.animation_data:
    for t in list(arm.animation_data.nla_tracks): arm.animation_data.nla_tracks.remove(t)
    arm.animation_data.action = None
for a in bpy.data.actions:
    a.use_fake_user = True
    track = arm.animation_data.nla_tracks.new(); track.name = a.name      # the exporter collects actions from NLA tracks
    strip = track.strips.new(a.name, 1, a)
    if a.slots and getattr(strip, 'action_slot', None) is None: strip.action_slot = a.slots[0]
bpy.ops.object.select_all(action='DESELECT'); arm.select_set(True)
for o in [shield, gun] + bodies: o.select_set(True)
bpy.ops.export_scene.gltf(filepath=out_path, use_selection=True, export_animations=True, export_animation_mode='ACTIONS')
print('SAVED', out_path)
