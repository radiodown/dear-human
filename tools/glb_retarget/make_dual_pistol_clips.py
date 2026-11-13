"""Dual-pistol clips (HP-14T): author new arm motion for one pistol in each hand and export a loadout GLB.

The Mixamo pistol clips hold ONE pistol with both hands, so two pistols end up glued side by side
(attach_dual_pistols.py). Here the legs / hips / spine / head still come from those clips, but both arms are
authored from scratch, in "gun space":
  per frame and per hand a goal is given for the pistol itself (grip position relative to the shoulder line,
  muzzle pitch / yaw, cant) -> the hand follows from a fixed grip offset -> the arm is solved with a two-bone IK
  (elbow pole down and out, half of the wrist roll moved into the forearm).
Fingers: the right hand's pistol-grip curl of `pistol_idle2` is used on the right hand and mirrored onto the left.
Grip offset: grip socket under the knuckles, barrel along the fingers' direction raised by the grip rake, sights
toward the thumb; then each pistol is moved once out of the palm skin (hand_clearance.py).

Clips (24 fps, loops; the last frame equals the first):
  dual_idle  65 f  base pistol_idle2 x2   arms straight out, pistols level, slow breathing rise and fall
  dual_idle_high 65 f base pistol_idle2 x2  both pistols held upright: right beside the head, left lower
  dual_fire  25 f  base pistol_idle2      arms straight out, alternating shots R L R L (6 frames apart) with recoil
  dual_kneel_fire 97 f base pistol_kneel_idle  kneeling, the same alternating fire (16 shots per loop)
  dual_walk  20 f  base pistol_walk       arms straight out, small rise and fall with the stride
  dual_run   31 f  base run.001 (unarmed) the unarmed run's whole body incl. its arm swing; fingers curled on the grips,
                                          each pistol carried by its hand (goal None = arms copied from the base clip)
Transitions (24 fps, played once; body held on the first frame of pistol_idle2, which is also the body of the first
frame of both idles, so the first / last key equals the first key of the idle it leaves / enters):
  dual_ready_to_aim 16 f  dual_idle_high frame 1 -> dual_idle frame 1: the pistols come down and forward while the
                          arms straighten; the muzzles level before the arms are fully out; the left hand starts 10 %
                          later and the right hand arrives 10 % earlier (Move)
  dual_aim_to_ready 16 f  the same path backwards
Walk / run keep the base clips' hips travel (use the tab's in-place playback).
Each pistol is driven by a non-deforming bone under the Hips (`weapon` right, `weapon_l` left).

usage: blender -b --python tools/glb_retarget/make_dual_pistol_clips.py -- <character.glb> <weapon.glb> <out.glb>"""
import bpy, sys, math, os
from mathutils import Matrix, Vector, Quaternion
argv = sys.argv[sys.argv.index('--') + 1:]
char_path, gun_path, out_path = argv[:3]
RAKE = math.radians(14)      # barrel raised from the fingers' direction (grip rake)
GRIP_ALONG = 0.45            # palm point of the finger loop, between the wrist (0) and the middle knuckle (1)
MAX_CLEAR = 0.012            # m real: largest move of a pistol out of the palm (a flat skinned palm cannot cup the grip)
HIGH_GRIP = 0.014            # m real: the hand sits this much above the grip socket (web of the thumb under the slide)
REACH = 0.97                # never lock the elbow fully straight
FIRE_REACH = 0.995          # firing clips: arms straight out (user request), short of a hard lock
FIRE_FWD = 1.06             # firing grip distance in front of the shoulder, as a share of the arm + hand-to-grip length
FOREARM_TWIST = 0.5          # share of the wrist roll carried by the forearm
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
    side = 'Right' if o.name.endswith('_right') or '_right.' in o.name else 'Left'
    bpy.ops.object.select_all(action='DESELECT'); o.select_set(True); bpy.context.view_layer.objects.active = o
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    o.data.transform(Matrix.Scale(k, 4)); o.name = 'weapon' if side == 'Right' else 'weapon_l'; guns[side] = o
SUF = {'Right': 'r', 'Left': 'l'}; WBONE = {'Right': 'weapon', 'Left': 'weapon_l'}
GRIP = {s: sockets[f'socket_grip_{SUF[s]}'] for s in SUF}
MUZZLE = {s: sockets[f'socket_muzzle_{SUF[s]}'] for s in SUF}

bpy.ops.object.select_all(action='DESELECT'); arm.select_set(True); bpy.context.view_layer.objects.active = arm
bpy.ops.object.mode_set(mode='EDIT')
for name in WBONE.values():
    eb = arm.data.edit_bones.new(name); eb.head = (0, 0, 0); eb.tail = (0, 0.1, 0); eb.use_deform = False
    eb.parent = arm.data.edit_bones['mixamorig:Hips']; eb.use_connect = False
bpy.ops.object.mode_set(mode='OBJECT')
pbs = arm.pose.bones; bones = arm.data.bones
for s, bname in WBONE.items():
    pbs[bname].rotation_mode = 'QUATERNION'; g = guns[s]
    g.parent = arm; g.parent_type = 'BONE'; g.parent_bone = bname
    g.matrix_parent_inverse = Matrix.Identity(4); g.matrix_basis = Matrix.Translation((0, -bones[bname].length, 0))
REST = {b.name: b.matrix_local.copy() for b in bones}
UP, FWD = Vector((0, 0, 1)), Vector((0, -1, 0))          # armature space: the character faces -Y, +X is its left
OUT = {'Left': Vector((1, 0, 0)), 'Right': Vector((-1, 0, 0))}
def B(side, part): return f'mixamorig:{side}{part}'
def fingers(side): return [b.name for b in bones if b.name.startswith(B(side, 'Hand')) and b.name != B(side, 'Hand')]   # parents first
ARM_BONES = {n for s in SUF for n in [B(s, 'Arm'), B(s, 'ForeArm'), B(s, 'Hand')] + fingers(s)} | set(WBONE.values())
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
s0, e0 = map(int, src.frame_range); sc.frame_set((s0 + e0) // 2)
FINGER = {n: pbs[n].matrix_basis.to_quaternion() for n in fingers('Right')}
MIRROR = Matrix.Diagonal((-1, 1, 1))
hand_pose = pbs[B('Right', 'Hand')].matrix.copy(); delta = {B('Left', 'Hand'): Matrix.Identity(3)}
for n in fingers('Right'):
    # rotation from rest in armature space with the hand at rest, mirrored across the body's centre plane
    at_rest_hand = (REST[B('Right', 'Hand')] @ hand_pose.inverted() @ pbs[n].matrix).to_3x3()
    d = MIRROR @ (at_rest_hand @ REST[n].to_3x3().inverted()) @ MIRROR
    ln = n.replace('Right', 'Left'); delta[ln] = d
    r = REST[ln].to_3x3()
    FINGER[ln] = (r.inverted() @ delta[bones[ln].parent.name].inverted() @ d @ r).to_quaternion()

# ---- grip offset (hand bone -> gun), found on the rest pose with the fingers curled
arm.animation_data.action = None
for pb in pbs: pb.matrix_basis = Matrix.Identity(4)
for n, q in FINGER.items(): pbs[n].rotation_quaternion = q
bpy.context.view_layer.update()
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from hand_clearance import HandClearance
OFFSET = {}
for s in SUF:
    h, m = REST[B(s, 'Hand')].to_translation(), REST[B(s, 'HandMiddle1')].to_translation()
    a = (m - h).normalized()                                    # fingers' direction (T pose: palms down, thumbs forward)
    t = (FWD - FWD.dot(a) * a).normalized()                     # toward the thumb = gun up
    x = (a * math.cos(RAKE) + t * math.sin(RAKE)).normalized(); z = (t * math.cos(RAKE) - a * math.sin(RAKE)).normalized()
    R = Matrix((x, z.cross(x), z)).transposed()
    # grip axis in the middle of the loop made by the palm and the curled middle finger
    loop = [h + (m - h) * GRIP_ALONG] + [pbs[B(s, f'HandMiddle{i}')].head.copy() for i in (1, 2, 3, 4)]
    centre = sum(loop, Vector()) / len(loop)
    M = Matrix.Translation(centre - z * (HIGH_GRIP * k)) @ R.to_4x4() @ Matrix.Translation(-GRIP[s])
    g = guns[s]; clear = HandClearance(arm, bodies, [v.co.copy() for v in g.data.vertices], [tuple(p.vertices) for p in g.data.polygons], k)
    hb = pbs[B(s, 'Hand')]
    # the palm faces down here; the hand would leave the gun upward (gun right for the right hand, gun left for the left)
    v, d0, rest = clear.shift(clear.local(s), hb.matrix.to_3x3(), hb.head.copy(), M, [(0, -1 if s == 'Right' else 1, 0)], max_shift=MAX_CLEAR)
    if rest < d0: M = Matrix.Translation(-v) @ M
    else: v, rest = Vector(), d0                               # the move did not help: keep the loop-centred grip
    OFFSET[s] = REST[B(s, 'Hand')].inverted() @ M
    print('GRIP %-5s palm in gun %.0f -> %.0f mm, pistol moved %.0f mm out of the palm' % (s, d0 / k * 1000, rest / k * 1000, v.length / k * 1000))
LEN = {s: ((REST[B(s, 'ForeArm')].to_translation() - REST[B(s, 'Arm')].to_translation()).length,
           (REST[B(s, 'Hand')].to_translation() - REST[B(s, 'ForeArm')].to_translation()).length) for s in SUF}
# straight-arm grip distance: shoulder joint -> wrist (arm at FIRE_REACH) + wrist -> grip socket along the arm
FIRE_DIST = {s: (LEN[s][0] + LEN[s][1]) * FIRE_REACH + (OFFSET[s] @ GRIP[s]).to_3d().length * 0.85 for s in SUF}
print('SETUP char height %.3f scale %.4f arm lengths %s straight-arm grip distance %s' % (height, k, {s: tuple(round(x, 3) for x in LEN[s]) for s in LEN}, {s: round(v, 3) for s, v in FIRE_DIST.items()}))

def gun_matrix(side, grip, pitch, yaw_in, cant):
    """gun -> armature: grip socket at `grip`, muzzle pitched up / turned toward the body's centre, sights canted inward (degrees)"""
    inward = -OUT[side]
    d = (FWD * math.cos(math.radians(yaw_in)) + inward * math.sin(math.radians(yaw_in))).normalized()
    d = (d * math.cos(math.radians(pitch)) + UP * math.sin(math.radians(pitch))).normalized()
    z = (UP - UP.dot(d) * d).normalized()
    z = Quaternion(d, math.radians(cant) * (1 if side == 'Left' else -1)) @ z
    R = Matrix((d, z.cross(d), z)).transposed()
    return Matrix.Translation(grip) @ R.to_4x4() @ Matrix.Translation(-GRIP[side])

def solve_arm(side, shoulder_pose, hand_goal, pole, reach=REACH):
    """two-bone IK; returns ({bone: basis quaternion}, hand pose actually reached, how far the goal was out of reach)"""
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
    return quats, H, max(0.0, d_vec.length - d)

# ---- clip designs: goal(side, ctx) -> (grip relative to the shoulder line's centre [forward, outward, up], pitch, yaw_in, cant, pole)
SHOULDER_HALF = 0.064
def pole_of(side, out=0.55, back=0.0): return -UP + OUT[side] * out - FWD * back
RECOIL = {1: 1.0, 2: 0.72, 3: 0.42, 4: 0.2, 5: 0.06}   # frames after the shot -> share of the kick
SHOTS = {'Right': (1, 13), 'Left': (7, 19)}             # dual_fire: frame of each shot in the 24-frame loop
def kick(side, f):
    return max(RECOIL.get((f - 1 - (s - 1)) % 24, 0.0) for s in SHOTS[side])

def idle_goal(side, c):
    # arms straight out like the firing pose (user request), pistols level; only a slow breathing rise and fall
    w = 2 * math.pi * c['t']; ph = 0.0 if side == 'Right' else 0.9
    breathe = math.sin(w - ph)
    return (FIRE_DIST[side] * FIRE_FWD, -0.010, -0.006 + 0.005 * breathe), 1.0 * breathe, 2.0, 0.0, pole_of(side, 0.2)
def idle_high_goal(side, c):
    # both pistols upright (muzzle up, forearm vertical, elbow tucked down): right beside the head, left lower beside the shoulder
    breathe = math.sin(2 * math.pi * c['t'] - (0.0 if side == 'Right' else 0.9))
    if side == 'Left': return (0.110, 0.045, 0.020 + 0.004 * breathe), 55 + 1.5 * breathe, 0.0, 0.0, pole_of(side, 0.35)   # tilted forward
    return (0.085, 0.050, 0.095 + 0.004 * breathe), 82 + 1.5 * breathe, 0.0, 0.0, pole_of(side, 0.35)
def fire_goal(side, c):
    # arms straight out (user request): each pistol right in front of its own shoulder joint at its height, the
    # grip as far forward as the straightened arm + hand reaches; the kick pulls it back a little and raises the muzzle
    e = kick(side, c['f']); other = kick('Left' if side == 'Right' else 'Right', c['f'])
    pos = (FIRE_DIST[side] * FIRE_FWD - 0.030 * e - 0.004 * other, -0.010, 0.000 + 0.010 * e)
    return pos, 14.0 * e, 2.0, 0.0, pole_of(side, 0.2)
def walk_goal(side, c):
    # arms straight out (user request); the straightened arm cannot swing forward / back, so the stride shows as a
    # small rise and fall of each pistol instead (right up while the left foot is forward)
    sw = c['swing'] * (1 if side == 'Right' else -1)
    return (FIRE_DIST[side] * FIRE_FWD, -0.010, -0.006 + 0.006 * sw + 0.003 * abs(c['swing'])), 0.8 * sw, 2.0, 0.0, pole_of(side, 0.2)
def run_goal(side, c):
    sw = c['swing'] * (1 if side == 'Right' else -1)
    return (0.135 + 0.034 * sw, 0.012, -0.105 + 0.016 * sw), 14.0 + 9.0 * sw, 3.0, 10.0, pole_of(side, 0.7, 0.25)
def fire_spine(c):   # the firing side's shoulder is pushed back: yaw about the vertical (degrees, + = left shoulder back)
    return 2.2 * (kick('Left', c['f']) - kick('Right', c['f']))

STRAIGHT = {fire_goal, idle_goal, walk_goal}   # straight-arm clips: grip from each shoulder joint, reach FIRE_REACH
def resolve(goal, s, ctx, joints, mid):
    """goal -> (grip in armature space, pitch, yaw_in, cant, pole, reach)"""
    (fw, out, up), pitch, yaw_in, cant, pole = goal(s, ctx)
    # firing: from each arm's own shoulder joint (the base stance turns the torso, the left shoulder sits
    # ~4 cm further forward), so both arms straighten the same; other clips: from the shoulder line's centre
    origin = joints[s] if goal in STRAIGHT else mid + OUT[s] * SHOULDER_HALF
    return origin + OUT[s] * out + FWD * fw + UP * up, pitch, yaw_in, cant, pole, FIRE_REACH if goal in STRAIGHT else REACH
class Move:
    """transition from the first frame of goal `a` to the first frame of goal `b` (reverse: the same path backwards).
    Exactly a / b at the ends. The grip travels on a straight line with a soft start and stop; the muzzle angle runs
    ahead of the travel (PITCH_LEAD) so the pistol is level before the arm is straight."""
    DELAY = {'Right': 0.0, 'Left': 0.1}; SPAN = 0.9; PITCH_LEAD = 1.3
    def __init__(self, a, b, reverse=False): self.a, self.b, self.reverse = a, b, reverse
    def at(self, s, ctx, joints, mid):
        c0 = {'f': 1, 't': 0.0, 'swing': 0.0}
        A, Bg = resolve(self.a, s, c0, joints, mid), resolve(self.b, s, c0, joints, mid)
        t = 1.0 - ctx['t'] if self.reverse else ctx['t']
        x = (t - self.DELAY[s]) / self.SPAN
        if x <= 0: return A
        if x >= 1: return Bg
        e = x * x * x * (x * (6 * x - 15) + 10)                        # travel: smootherstep
        xp = min(1.0, x * self.PITCH_LEAD); ep = xp * xp * (3 - 2 * xp)   # muzzle angle, pole
        mix = lambda i, w: A[i] + (Bg[i] - A[i]) * w
        return mix(0, e), mix(1, ep), mix(2, ep), mix(3, ep), mix(4, ep), mix(5, e)
CLIPS = [  # name, base clip, output frames (last = first), base loops, goal, extra spine yaw
    ('dual_idle', 'pistol_idle2', 65, 2, idle_goal, None),
    ('dual_idle_high', 'pistol_idle2', 65, 2, idle_high_goal, None),
    ('dual_fire', 'pistol_idle2', 25, 1, fire_goal, fire_spine),
    ('dual_kneel_fire', 'pistol_kneel_idle', 97, 1, fire_goal, fire_spine),   # 4 firing loops over one kneeling-idle loop
    ('dual_walk', 'pistol_walk', 20, 1, walk_goal, None),
    ('dual_run', 'run.001', 31, 1, None, None),   # goal None: the unarmed run's own arm swing (user request), pistols in the hands
    # transitions between the two idles (base loops 0 = the body stays on the base clip's first frame)
    ('dual_ready_to_aim', 'pistol_idle2', 16, 0, Move(idle_high_goal, idle_goal), None),
    ('dual_aim_to_ready', 'pistol_idle2', 16, 0, Move(idle_high_goal, idle_goal, reverse=True), None),
]

def key(pb, f, loc=False):
    pb.keyframe_insert('rotation_quaternion', frame=f)
    if loc: pb.keyframe_insert('location', frame=f)

hips_rest_inv = REST['mixamorig:Hips'].inverted()
made = []
for name, base_name, count, loops, goal, spine in CLIPS:
    base = bpy.data.actions[base_name]; bs, be = map(int, base.frame_range)
    # pass A: sample the body of the base clip
    arm.animation_data.action = base; body = {}; swing_raw = {}; drift = 0.0; base_arms = {}
    for f in range(1, count + 1):
        u = (f - 1) / (count - 1) * loops; u = (u % 1.0) if f < count else 0.0
        bf = bs + u * (be - bs); sc.frame_set(int(bf), subframe=bf - int(bf))
        frame = {}
        for n in BODY_BONES:
            pb = pbs[n]; frame[n] = (pb.location.copy(), pb.rotation_quaternion.copy())
            if n != 'mixamorig:Hips': drift = max(drift, pb.location.length)
        if spine:
            yaw = math.radians(spine({'f': f})) / 2
            for n in ('mixamorig:Spine1', 'mixamorig:Spine2'):   # rotation about the vertical through the bone, in bone space
                r = pbs[n].matrix.to_3x3(); add = (r.inverted() @ Matrix.Rotation(yaw, 3, 'Z') @ r).to_quaternion()
                frame[n] = (frame[n][0], frame[n][1] @ add)
        body[f] = frame
        if goal is None:   # keep the base clip's own arms
            base_arms[f] = {n: pbs[n].rotation_quaternion.copy() for s_ in SUF for n in (B(s_, 'Arm'), B(s_, 'ForeArm'), B(s_, 'Hand'))}
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
    # pass C: arms, hands, pistols
    miss = 0.0; apart = []; pitch_at = {}
    for f in range(1, count + 1):
        sc.frame_set(f)
        ctx = {'f': f, 't': (f - 1) / (count - 1), 'swing': -swing_raw[f] / top}
        joints = {s: rest_child(pbs[B(s, 'Shoulder')].matrix, B(s, 'Arm')).to_translation() for s in SUF}
        mid = (joints['Left'] + joints['Right']) / 2
        hips_inv = pbs['mixamorig:Hips'].matrix.inverted(); grips = {}
        if goal is None:
            for s in SUF:
                for n in (B(s, 'Arm'), B(s, 'ForeArm'), B(s, 'Hand')): put(n, base_arms[f][n].copy(), f)
                for n in fingers(s): put(n, FINGER[n].copy(), f)
            bpy.context.view_layer.update()
            for s in SUF:
                G = pbs[B(s, 'Hand')].matrix @ OFFSET[s]; grips[s] = G @ GRIP[s]
                pitch_at[(s, f)] = math.degrees(math.asin(max(-1, min(1, G.to_3x3().col[0].normalized().dot(UP)))))
                rel = (hips_rest_inv @ REST[WBONE[s]]).inverted()
                loc, rot, _ = (rel @ hips_inv @ G).decompose()
                pbs[WBONE[s]].location = loc; pbs[WBONE[s]].keyframe_insert('location', frame=f); put(WBONE[s], rot, f)
            apart.append((grips['Left'] - grips['Right']).length)
            continue
        for s in SUF:
            grip, pitch, yaw_in, cant, pole, reach = goal.at(s, ctx, joints, mid) if isinstance(goal, Move) else resolve(goal, s, ctx, joints, mid)
            hand_goal = gun_matrix(s, grip, pitch, yaw_in, cant) @ OFFSET[s].inverted()
            quats, H, m = solve_arm(s, pbs[B(s, 'Shoulder')].matrix.copy(), hand_goal, pole, reach); miss = max(miss, m)
            for n, q in quats.items(): put(n, q, f)
            for n in fingers(s): put(n, FINGER[n].copy(), f)
            G = H @ OFFSET[s]; grips[s] = G @ GRIP[s]
            pitch_at[(s, f)] = math.degrees(math.asin(max(-1, min(1, G.to_3x3().col[0].normalized().dot(UP)))))
            rel = (hips_rest_inv @ REST[WBONE[s]]).inverted()
            loc, rot, _ = (rel @ hips_inv @ G).decompose()
            pbs[WBONE[s]].location = loc; pbs[WBONE[s]].keyframe_insert('location', frame=f); put(WBONE[s], rot, f)
        apart.append((grips['Left'] - grips['Right']).length)
    extra = ''
    if goal is fire_goal:
        extra = ' muzzle at shots %s deg, peak kick %+.1f deg' % (['%+.1f' % pitch_at[(s, f)] for s in SUF for f in SHOTS[s] if f <= count], max(pitch_at.values()))
    print('CLIP %-10s base %-13s frames %2d  out of reach %.0f mm  grips apart %.0f..%.0f mm (real)  other bones moved %.1f mm%s' % (
        name, base_name, count, miss / k * 1000, min(apart) / k * 1000, max(apart) / k * 1000, drift / k * 1000, extra))
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
for o in list(guns.values()) + bodies: o.select_set(True)
bpy.ops.export_scene.gltf(filepath=out_path, use_selection=True, export_animations=True, export_animation_mode='ACTIONS')
print('SAVED', out_path)
