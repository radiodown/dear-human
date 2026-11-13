"""Put a weapon in a character's hands for its gun clips and export a loadout GLB.

The weapon (art/weapons/<id>/model_3d_002, real metres, socket_* empties) is scaled to the character (character
height / 1.65 m) and driven by an extra non-deforming bone `weapon` under the Hips (keyed per clip, the mesh is parented to it).

Base pose of the gun on every frame = rigidly carried by the right hand, with an offset found on a reference frame:
  long guns: grip socket on the right palm, grip->support direction along right palm->left palm, gun up ~ world up
  pistols:   grip socket on the right palm, barrel along the right forearm levelled to horizontal, gun up ~ world up
Long guns (version 2, loadout_002): shoulder mount. A shoulder pocket point is found on the reference frame (front
surface of the chest between the shoulder joint and the clavicle, by ray cast on the body mesh) and carried by the
RightShoulder (clavicle) bone. In every clip except HIP_CLIPS (low-ready rifle_idle keeps the Mixamo hip carry) the
gun is translated on every frame so the stock socket sits on the pocket (barrel direction from the hand is kept). Then both arms are re-solved with an analytic two-bone IK (original elbow plane, original hand
orientation): right palm -> grip socket, left palm -> support socket (slid back toward the grip when out of reach,
never closer than MIN_SUPPORT). Only the listed clips are exported.
Palm = midpoint of the hand bone head and the middle-finger base.

long-vgrip (ML-70, PDW-9: the support socket is on a vertical foregrip): same as long, but the left hand is also
turned to wrap the foregrip instead of cupping the barrel: on every frame the hand is rotated so wrist->middle
knuckle runs along the barrel (gun +X) and index->pinky knuckles run down the grip (gun -Z), and the palm goal sits
VGRIP_SIDE (real m) on the gun's left of the grip axis and VGRIP_BACK behind it. The finger curl stays as in the clip.
usage: blender -b --python tools/glb_retarget/attach_weapon.py -- <character.glb> <weapon.glb> <long|long-vgrip|pistol>
       <reference clip> <out.glb> clip [clip ...]"""
import bpy, sys, math, statistics
from mathutils import Matrix, Vector, Quaternion
argv = sys.argv[sys.argv.index('--') + 1:]
char_path, gun_path, mode, ref_clip, out_path = argv[:5]
CLIPS = argv[5:]
VGRIP_SIDE = 0.025           # m (real): palm centre to foregrip axis, on the gun's left
VGRIP_BACK = 0.035           # m (real): palm centre behind the foregrip axis (the grip sits in the finger curl)
VGRIP = mode == 'long-vgrip'
if VGRIP: mode = 'long'
CLEAR = True                 # push hands out of the gun mesh (hand_clearance.py)
CLEAR_STEP = 2
MAX_CLEAR = 0.12             # m real: largest clearance move of a hand
HIP_CLIPS = {'rifle_idle', 'pistol_idle', 'rifle_walk', 'rifle_run', 'rifle_walk_to_stop'}   # low-ready / hip carry: gun stays in the right hand, no shoulder mount (walk / run / walk-to-stop added 2026-11-13: same low-ready hands as rifle_idle)
# transitions between the low ready and the aim (2026-11-13): the shoulder mount fades in (or out) with the gun's rise,
# measured on the hand-carried gun: 0 while the muzzle is within RAMP_SPAN[0] of its start->end pitch change, 1 past
# RAMP_SPAN[1] of it (smoothstep between), so the start matches the hip carry of rifle_idle and the end the shouldered aim
RAMP_CLIPS = {'rifle_down_to_aim', 'rifle_aim_to_down'}
RAMP_SPAN = (0.35, 0.9)
RAMP_MIN = 8                 # frames: the mount never fades in faster than this (a fast raise would snap the stock)
MIN_SUPPORT = 0.12            # m (real) in front of the grip
bpy.ops.wm.read_factory_settings(use_empty=True); sc = bpy.context.scene

def fcurves(a): return [f for l in a.layers for st in l.strips for cb in st.channelbags for f in cb.fcurves]

bpy.ops.import_scene.gltf(filepath=char_path)
arm = next(o for o in bpy.data.objects if o.type == 'ARMATURE')
bodies = [o for o in bpy.data.objects if o.type == 'MESH' and o.parent == arm]
height = max((b.matrix_world @ v.co).z for b in bodies for v in b.data.vertices)
k = height / 1.65
before = set(bpy.data.objects)
bpy.ops.import_scene.gltf(filepath=gun_path)
gun_objs = [o for o in bpy.data.objects if o not in before]
sockets = {o.name.split('.')[0]: o.matrix_world.translation * k for o in gun_objs if o.name.startswith('socket_')}
gun_meshes = [o for o in gun_objs if o.type == 'MESH']
for o in gun_objs:
    if o.type != 'MESH': bpy.data.objects.remove(o, do_unlink=True)
bpy.ops.object.select_all(action='DESELECT')
for o in gun_meshes: o.select_set(True)
bpy.context.view_layer.objects.active = gun_meshes[0]
if len(gun_meshes) > 1: bpy.ops.object.join()
gun = bpy.context.view_layer.objects.active
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
gun.data.transform(Matrix.Scale(k, 4)); gun.name = 'weapon'          # gun space now in character units
G, S, ST = sockets['socket_grip'], sockets.get('socket_support'), sockets.get('socket_stock')
mw = arm.matrix_world; mwi = mw.inverted(); pbs = arm.pose.bones

# ---- extra bone that carries the gun
bpy.ops.object.select_all(action='DESELECT'); arm.select_set(True); bpy.context.view_layer.objects.active = arm
bpy.ops.object.mode_set(mode='EDIT')
eb = arm.data.edit_bones.new('weapon'); eb.head = (0, 0, 0); eb.tail = (0, 0.1, 0); eb.use_deform = False
eb.parent = arm.data.edit_bones['mixamorig:Hips']; eb.use_connect = False   # follows the hips (in-place playback strips hips travel)
bpy.ops.object.mode_set(mode='OBJECT')
wpb = pbs['weapon']; wpb.rotation_mode = 'QUATERNION'; WLEN = arm.data.bones['weapon'].length
gun.parent = arm; gun.parent_type = 'BONE'; gun.parent_bone = 'weapon'
gun.matrix_parent_inverse = Matrix.Identity(4); gun.matrix_basis = Matrix.Translation((0, -WLEN, 0))

def palm_a(side):   # armature space
    return (pbs[f'mixamorig:{side}Hand'].head + pbs[f'mixamorig:{side}HandMiddle1'].head) / 2
def frame_basis(a, up):
    a = a.normalized(); u = (up - up.dot(a) * a).normalized(); return Matrix((a, u, a.cross(u))).transposed()

# ---- reference frame: gun offset from the right hand, shoulder pocket on the clavicle
ref = bpy.data.actions[ref_clip]; arm.animation_data.action = ref
s0, e0 = map(int, ref.frame_range); sc.frame_set((s0 + e0) // 2)
pr, pl = palm_a('Right'), palm_a('Left')
up_a = (mwi.to_3x3() @ Vector((0, 0, 1))).normalized()
if mode == 'long':
    world_dir, gun_dir = pl - pr, S - G
else:
    world_dir = pbs['mixamorig:RightHand'].head - pbs['mixamorig:RightForeArm'].head
    world_dir = world_dir - world_dir.dot(up_a) * up_a      # level barrel on the reference frame (aiming idle)
    gun_dir = sockets['socket_muzzle'] - G; gun_dir = Vector((gun_dir.x, 0, 0))
R = frame_basis(world_dir, up_a) @ frame_basis(gun_dir, Vector((0, 0, 1))).inverted()
M_ref = Matrix.Translation(pr) @ R.to_4x4() @ Matrix.Translation(-G)       # gun -> armature space
HAND = 'mixamorig:RightHand'
OFFSET = pbs[HAND].matrix.inverted() @ M_ref
pocket_local = None
if mode == 'long' and ST is not None:
    sh_j, cl = pbs['mixamorig:RightArm'].head, pbs['mixamorig:RightShoulder'].head
    lr = (pbs['mixamorig:LeftArm'].head - sh_j).normalized()
    fwd = lr.cross(up_a).normalized()
    base = sh_j + (cl - sh_j) * 0.45 - up_a * 0.015
    dg = bpy.context.evaluated_depsgraph_get(); best = None
    for b in bodies:
        be = b.evaluated_get(dg); m = mw @ Matrix.Identity(4); bw = b.matrix_world
        o_l = bw.inverted() @ (mw @ base); d_l = (bw.inverted().to_3x3() @ (mw.to_3x3() @ fwd)).normalized()
        hit, loc, nor, idx = be.ray_cast(o_l, d_l, distance=0.12)
        if hit:
            dist = ((bw @ loc) - (mw @ base)).length
            if best is None or dist < best: best = dist
    depth = (best if best is not None else 0.05) + 0.004
    pocket = base + fwd * depth
    pocket_local = pbs['mixamorig:RightShoulder'].matrix.inverted() @ pocket
    print('POCKET depth %.1f mm (char units %.4f) ray %s' % (depth / k * 1000, depth, 'hit' if best is not None else 'miss'))
print('ATTACH', mode, 'char height %.3f scale %.4f' % (height, k), 'ref', ref_clip, (s0 + e0) // 2)

sys.path.insert(0, __import__('os').path.dirname(__file__))
from hand_clearance import HandClearance
clear = HandClearance(arm, bodies, [v.co.copy() for v in gun.data.vertices], [tuple(p.vertices) for p in gun.data.polygons], k)
# outward directions in gun space (+X muzzle, +Y gun left, +Z up): right hand to the gun's right, left hand to its left / below
DIRS = {'Right': [(0, -1, 0), (0, -0.7, -0.7), (-0.7, -0.7, 0), (-1, 0, 0), (-0.7, 0, -0.7), (0, -0.7, 0.7)],
        'Left': [(0, 1, 0), (-0.7, 0.7, 0)] if VGRIP else [(0, 1, 0), (0, 0.7, -0.7), (0, 0, -1), (0, 0.7, 0.7), (0, 0, 1), (0, -0.7, -0.7)]}
PISTOL_SHIFT = 0.015         # m real: max constant move of a pistol out of the right palm
if mode == 'pistol':
    # Two-handed pistol grips wrap the grip from both sides, so moving the hands out per frame bends the arms and
    # leaves the pistol floating. Keep the clip's arms; move the pistol once (reference frame, capped) out of the palm.
    sc.frame_set((s0 + e0) // 2)
    hb = pbs[HAND]
    v, d0, rest = clear.shift(clear.local('Right'), hb.matrix.to_3x3(), hb.head.copy(), M_ref, DIRS['Right'], max_shift=PISTOL_SHIFT)
    M_ref = Matrix.Translation(-v) @ M_ref; OFFSET = hb.matrix.inverted() @ M_ref
    CLEAR = False
    print('PISTOL palm in gun %.0f -> %.0f mm on the reference frame, pistol moved %.0f mm' % (d0 / k * 1000, rest / k * 1000, v.length / k * 1000))
bones = arm.data.bones
def chain(side): return [f'mixamorig:{side}Arm', f'mixamorig:{side}ForeArm', f'mixamorig:{side}Hand']
rel = {n: (bones[n].parent.matrix_local.inverted() @ bones[n].matrix_local) for s in ('Left', 'Right') for n in chain(s)}


LEVEL = True                 # long guns: muzzle level at the firing and aiming moments (not held level throughout)
FIRE_KICK = 1.5              # deg/frame: a muzzle rise at least this fast starts a recoil kick (the frame before it fires)
AIM_PITCH, AIM_STILL = 25.0, 1.5   # deg, deg/frame: steady aiming frames (near level and not moving)
RECOIL_SKIP = 4              # frames after a shot that are recoil, not aiming
HOLD, BLEND = 3, 6           # frames: past a key the correction is held HOLD frames, then fades to none over BLEND

def level_moments(clip, s, e, gun_frames):
    """Rotate the gun about the stock so the muzzle is level at key moments: the frame before each recoil kick
    (the shot) and steady aiming frames. Between keys the correction is interpolated, so the kick after a shot and
    the clip's other gun moves stay; farther than BLEND from any key it fades to zero."""
    pitch = {f: math.degrees(math.asin(max(-1.0, min(1.0, gun_frames[f].to_3x3().col[0].normalized().dot(up_a))))) for f in gun_frames}
    fires = [f for f in range(s, e) if pitch[f + 1] - pitch[f] >= FIRE_KICK and (f == s or pitch[f] - pitch[f - 1] < FIRE_KICK)
             and abs(pitch[f]) <= AIM_PITCH]   # a kick from a near-level gun (raising a lowered gun is not a shot)
    if clip in RAMP_CLIPS: fires = []   # the raise / lowering itself would read as kicks: no shots in these clips
    recoil = {x for f in fires for x in range(f + 1, f + 1 + RECOIL_SKIP)}
    aims = [f for f in range(s, e + 1) if f not in recoil and abs(pitch[f]) <= AIM_PITCH
            and abs(pitch[min(e, f + 1)] - pitch[max(s, f - 1)]) / 2 <= AIM_STILL]
    keys = sorted(set(fires) | set(aims))
    if not keys: return
    delta = {}
    for f in range(s, e + 1):
        a = max((k for k in keys if k <= f), default=None); b = min((k for k in keys if k >= f), default=None)
        if a is not None and b is not None and b - a <= 2 * BLEND:
            t = 0 if a == b else (f - a) / (b - a); d = -pitch[a] * (1 - t) - pitch[b] * t
        else:
            near = min((k for k in (a, b) if k is not None), key=lambda k: abs(k - f))
            dist = abs(f - near); w = 1.0 if dist <= HOLD else max(0.0, 1 - (dist - HOLD) / BLEND); w = w * w * (3 - 2 * w); d = -pitch[near] * w
        delta[f] = d
    for f in range(s, e + 1):
        M = gun_frames[f]; gx = M.to_3x3().col[0].normalized(); axis = gx.cross(up_a)
        if axis.length < 1e-6 or abs(delta[f]) < 1e-4: continue
        pivot = M @ ST
        R = Matrix.Rotation(math.radians(delta[f]), 4, axis.normalized())   # +angle about gx x up raises the muzzle
        gun_frames[f] = Matrix.Translation(pivot) @ R @ Matrix.Translation(-pivot) @ M
    after = {f: math.degrees(math.asin(max(-1.0, min(1.0, gun_frames[f].to_3x3().col[0].normalized().dot(up_a))))) for f in gun_frames}
    print('LEVEL %-15s shots at %s, %d aiming frames; muzzle at shots %s deg, at aiming %+.1f..%+.1f deg (clip %+.0f..%+.0f -> %+.0f..%+.0f)' % (
        clip, fires, len(aims), ['%+.1f' % after[f] for f in fires], min(after[f] for f in aims) if aims else 0, max(after[f] for f in aims) if aims else 0,
        min(pitch.values()), max(pitch.values()), min(after.values()), max(after.values())))

LAST_POLE = {}   # per side, reset per clip: elbow direction of the previous solved frame
ELBOW_LIKE_CLIP = {'Right'}   # arms whose elbow keeps the clip's angle from straight down (see solve)
def solve(side, goal_palm, slide_to=None, min_len=0.0, hand_rot=None, remember=False):
    """two-bone IK in armature space; returns (local quats for the 3 bones, miss, slid distance)"""
    names = chain(side)
    A = {n: pbs[n].matrix.copy() for n in names}; sh = pbs[f'mixamorig:{side}Shoulder'].matrix.copy()
    la, lf = bones[names[0]].length, bones[names[1]].length
    p_sh, p_el, p_wr = A[names[0]].to_translation(), A[names[1]].to_translation(), A[names[2]].to_translation()
    palm_off = palm_a(side) - p_wr
    if hand_rot is not None:   # new hand orientation: the palm point turns with it
        palm_off = hand_rot @ A[names[2]].to_3x3().inverted() @ palm_off
    def goal(t): return goal_palm + ((slide_to - goal_palm) * t if slide_to is not None else Vector()) - palm_off
    t = 0.0; reach = (la + lf) * 0.93   # keep the elbow bent (a locked straight arm reads as broken)
    if slide_to is not None and (goal(0.0) - p_sh).length > reach:
        t_max = max(0.0, 1.0 - min_len / max((goal_palm - slide_to).length, 1e-6)); lo_t, hi_t = 0.0, t_max
        for _ in range(30):
            mid = (lo_t + hi_t) / 2
            if (goal(mid) - p_sh).length > reach: lo_t = mid
            else: hi_t = mid
        t = hi_t
    w = goal(t); d_vec = w - p_sh; d = min(max(d_vec.length, abs(la - lf) + 1e-4), (la + lf) * 0.97)   # never lock the elbow fully straight
    miss = max(0.0, d_vec.length - (la + lf)); dirn = d_vec.normalized()
    cos_a = max(-1, min(1, (la * la + d * d - lf * lf) / (2 * la * d)))
    pole = (p_el - p_sh); pole = pole - pole.dot(dirn) * dirn
    if side in ELBOW_LIKE_CLIP:
        # keep the clip's elbow angle measured from straight down around the shoulder-wrist axis: projecting the old
        # elbow onto the new plane swings it out sideways ("chicken wing") once the hand has moved
        ax0 = (p_wr - p_sh).normalized(); off0 = (p_el - p_sh) - (p_el - p_sh).dot(ax0) * ax0
        dn0 = -up_a - (-up_a).dot(ax0) * ax0; dnN = -up_a - (-up_a).dot(dirn) * dirn
        if off0.length > 1e-6 and dn0.length > 1e-6 and dnN.length > 1e-6:
            off0.normalize(); dn0.normalize(); dnN.normalize()
            phi = math.atan2(ax0.dot(dn0.cross(off0)), dn0.dot(off0))
            pole = Matrix.Rotation(phi, 3, dirn) @ dnN
    lp = LAST_POLE.get(side)
    if lp is not None:
        lp = lp - lp.dot(dirn) * dirn
        # the clip's elbow lies almost on the shoulder-goal line (ill-defined) or would flip: keep the previous side;
        # otherwise blend with it so the elbow does not jump between frames
        if lp.length > 1e-6:
            lp.normalize()
            if pole.length < 0.25 * la or pole.normalized().dot(lp) < 0.2: pole = lp.copy()
            else: pole = pole.normalized() + lp
    if pole.length < 1e-6: pole = -up_a - (-up_a).dot(dirn) * dirn
    pole.normalize()
    if remember: LAST_POLE[side] = pole.copy()
    new_el = p_sh + dirn * (la * cos_a) + pole * (la * math.sqrt(max(0, 1 - cos_a * cos_a))); new_wr = p_sh + dirn * d
    def rot_to(Mold, new_dir):
        old = (Mold.to_3x3() @ Vector((0, 1, 0))).normalized()
        return old.rotation_difference(new_dir.normalized()).to_matrix() @ Mold.to_3x3()
    R_arm = rot_to(A[names[0]], new_el - p_sh); R_fore = rot_to(A[names[1]], new_wr - new_el); R_hand = hand_rot if hand_rot is not None else A[names[2]].to_3x3()
    b_arm = rel[names[0]].to_3x3().inverted() @ sh.to_3x3().inverted() @ R_arm
    b_fore = rel[names[1]].to_3x3().inverted() @ R_arm.inverted() @ R_fore
    b_hand = rel[names[2]].to_3x3().inverted() @ R_fore.inverted() @ R_hand
    slid = t * ((slide_to - goal_palm).length if slide_to is not None else 0)
    return {n: b.to_quaternion().normalized() for n, b in zip(names, (b_arm, b_fore, b_hand))}, miss, slid

W_REL = arm.data.bones['mixamorig:Hips'].matrix_local.inverted() @ arm.data.bones['weapon'].matrix_local
def key_weapon(act, f, M):
    loc, rot, _ = M.decompose()
    wpb.location = loc; wpb.rotation_quaternion = rot       # M is already in the bone's basis space
    wpb.keyframe_insert('location', frame=f); wpb.keyframe_insert('rotation_quaternion', frame=f)

for clip in CLIPS:
    act = bpy.data.actions[clip]; arm.animation_data.action = act
    s, e = map(int, act.frame_range); keys = {}; stat = {'miss_r': [], 'miss_l': [], 'slide': [], 'dist': [], 'w': []}
    gun_frames = {}; plan = {}; LAST_POLE.clear()
    ramp = None
    if clip in RAMP_CLIPS and pocket_local is not None:
        pit = {}
        for f in range(s, e + 1):
            sc.frame_set(f); pit[f] = (pbs[HAND].matrix @ OFFSET).to_3x3().col[0].normalized().dot(up_a)
        p0, p1 = pit[s], pit[e]; lo_, hi_ = RAMP_SPAN
        def prog(f): return (pit[f] - p0) / (p1 - p0) if abs(p1 - p0) > 1e-6 else 1.0
        def sm(t): t = max(0.0, min(1.0, t)); return t * t * (3 - 2 * t)
        # weight follows the progress toward the END pose; for aim -> down the mount fades out instead
        to_aim = p1 > p0
        ramp = {f: sm((prog(f) - lo_) / (hi_ - lo_)) if to_aim else 1 - sm((prog(f) - (1 - hi_)) / (hi_ - lo_)) for f in range(s, e + 1)}
        # then in time: centred where the pitch ramp passes 0.5, at least RAMP_MIN frames long
        f_mid = next((f for f in range(s, e + 1) if (ramp[f] >= 0.5) == to_aim), (s + e) // 2)
        f_a = next((f for f in range(s, e + 1) if (ramp[f] > 0.01) == to_aim), f_mid); f_b = next((f for f in range(s, e + 1) if (ramp[f] > 0.99) == to_aim), f_mid)
        half = max(RAMP_MIN, abs(f_b - f_a)) / 2
        ramp = {f: (sm((f - (f_mid - half)) / (2 * half)) if to_aim else 1 - sm((f - (f_mid - half)) / (2 * half))) for f in range(s, e + 1)}
        print('RAMP %s muzzle %+.0f -> %+.0f deg, shoulder mount weight 0.01 at frame %d, 0.99 at frame %d' % (clip, math.degrees(math.asin(p0)), math.degrees(math.asin(p1)),
              next((f for f in range(s, e + 1) if (ramp[f] > 0.01) == to_aim), e), next((f for f in range(s, e + 1) if (ramp[f] > 0.99) == to_aim), e)))
    # pass 0: gun pose (hand carry, stock pinned to the shoulder pocket)
    for f in range(s, e + 1):
        sc.frame_set(f)
        M = pbs[HAND].matrix @ OFFSET
        if pocket_local is not None:
            P = pbs['mixamorig:RightShoulder'].matrix @ pocket_local
            st0 = M @ ST; dist = (st0 - P).length
            w = ramp[f] if ramp is not None else 0.0 if clip in HIP_CLIPS else 1.0
            M = Matrix.Translation((P - st0) * w) @ M
            stat['dist'].append(dist); stat['w'].append(w)
        gun_frames[f] = M
    if LEVEL and mode == 'long' and ST is not None and clip not in HIP_CLIPS:
        level_moments(clip, s, e, gun_frames)
    # pass 1: hand goals / orientations, and (every CLEAR_STEP frames) the clearance shift of each hand
    for f in range(s, e + 1):
        sc.frame_set(f)
        M = gun_frames[f]
        R3 = M.to_3x3(); gx, gy, gz = (R3.col[i].normalized() for i in range(3))
        hands = {'Right': [M @ G, None, None]}
        if S is not None:
            hand_rot, goal_l = None, M @ S
            if VGRIP:
                f_c = (pbs['mixamorig:LeftHandMiddle1'].head - pbs['mixamorig:LeftHand'].head).normalized()
                k_c = pbs['mixamorig:LeftHandPinky1'].head - pbs['mixamorig:LeftHandIndex1'].head
                k_c = (k_c - k_c.dot(f_c) * f_c).normalized()
                f_t = gx; k_t = -gz
                cur = Matrix((f_c, k_c, f_c.cross(k_c))).transposed(); tgt = Matrix((f_t, k_t, f_t.cross(k_t))).transposed()
                hand_rot = tgt @ cur.transposed() @ pbs['mixamorig:LeftHand'].matrix.to_3x3()
                goal_l = M @ S + gy * (VGRIP_SIDE * k) - gx * (VGRIP_BACK * k)
            # the support goal slides toward the grip when out of reach: resolve that first, IK later without sliding
            _, _, sl = solve('Left', goal_l, slide_to=M @ G, min_len=MIN_SUPPORT * k, hand_rot=hand_rot)
            if sl > 0: goal_l = goal_l + (M @ G - goal_l).normalized() * sl
            stat['slide'].append(sl / k)
            hands['Left'] = [goal_l, hand_rot, None]
        elif mode == 'pistol':
            hands['Left'] = [palm_a('Left'), None, None]       # free support hand: keep it, only clear it from the gun
        if CLEAR and ((f - s) % CLEAR_STEP == 0 or f == e):
            for side, h in hands.items():
                R_orig = pbs[f'mixamorig:{side}Hand'].matrix.to_3x3(); R_new = h[1] if h[1] is not None else R_orig
                palm_off = R_new @ R_orig.inverted() @ (palm_a(side) - pbs[f'mixamorig:{side}Hand'].head)
                dirs = DIRS[side]
                ds, d0 = clear.dists(clear.local(side), R_new, h[0] - palm_off, M, dirs)
                # how far the hand may move along each direction before the arm cannot reach (elbow would lock)
                names = chain(side); p_sh = pbs[names[0]].head; reach = (bones[names[0]].length + bones[names[1]].length) * 0.93
                wrist0 = h[0] - palm_off; allow = []
                for dg in dirs:
                    dv = (M.to_3x3() @ Vector(dg)).normalized()
                    if (wrist0 - p_sh).length > reach: allow.append(0.0); continue
                    lo, hi = 0.0, MAX_CLEAR * k
                    if (wrist0 + dv * hi - p_sh).length <= reach: allow.append(hi); continue
                    for _ in range(20):
                        mid = (lo + hi) / 2
                        if (wrist0 + dv * mid - p_sh).length > reach: hi = mid
                        else: lo = mid
                    allow.append(lo)
                h[2] = (ds, allow, M.to_3x3()); stat.setdefault('pen0_' + side, []).append(d0 / k)
        plan[f] = hands
    # clearance: ONE direction per hand for the whole clip (switching directions between frames made the hand shake),
    # the move capped to the arm's reach per frame, then smoothed in time (peak over 5 frames, mean over 9)
    if CLEAR:
        for side in plan[s]:
            known = sorted(f for f in plan if plan[f][side][2] is not None)
            nd = len(DIRS[side]); top = MAX_CLEAR * k
            def need(f, i):
                ds, allow, _ = plan[f][side][2]; d = ds[i] if ds[i] is not None else top
                return min(d, allow[i])
            def left_inside(f, i):
                ds, allow, _ = plan[f][side][2]; d = ds[i] if ds[i] is not None else float('inf')
                return d > allow[i] + 1e-9
            # best direction: fewest frames it cannot clear within reach, then the smallest largest move
            best = min(range(nd), key=lambda i: (sum(left_inside(f, i) for f in known), max(need(f, i) for f in known)))
            dg = Vector(DIRS[side][best]).normalized()
            mag = {}
            for f in range(s, e + 1):
                a = max(x for x in known if x <= f); b = min(x for x in known if x >= f)
                t = 0 if a == b else (f - a) / (b - a)
                mag[f] = need(a, best) * (1 - t) + need(b, best) * t
            peak = {f: max(mag[x] for x in range(max(s, f - 2), min(e, f + 2) + 1)) for f in mag}
            smooth = {f: sum(peak[x] for x in range(max(s, f - 4), min(e, f + 4) + 1)) / (min(e, f + 4) - max(s, f - 4) + 1) for f in mag}
            stat.setdefault('dir_' + side, []).append(tuple(DIRS[side][best]))
            stat.setdefault('shift_' + side, []).append(max(smooth.values()) / k)
            stat.setdefault('inside_' + side, []).append(sum(left_inside(f, best) for f in known))
            for f in range(s, e + 1):
                plan[f][side][2] = (gun_frames[f].to_3x3() @ dg).normalized() * smooth[f]
    # pass 2: arm IK onto the (cleared) goals (pistols keep the clip's arms)
    for f in (range(s, e + 1) if mode != 'pistol' else ()):
        sc.frame_set(f)
        ks = {}
        for side, (goal, hand_rot, sh) in plan[f].items():
            sh = sh if sh is not None else Vector()
            if sh.length > 0:
                # never push a hand beyond the arm's reach (that locks the elbow straight): shrink the move instead
                names = chain(side); p_sh = pbs[names[0]].head; reach = (bones[names[0]].length + bones[names[1]].length) * 0.93
                R_orig = pbs[names[2]].matrix.to_3x3(); R_new = hand_rot if hand_rot is not None else R_orig
                palm_off = R_new @ R_orig.inverted() @ (palm_a(side) - pbs[names[2]].head)
                if (goal + sh - palm_off - p_sh).length > reach and (goal - palm_off - p_sh).length <= reach:
                    lo, hi = 0.0, 1.0
                    for _ in range(20):
                        mid = (lo + hi) / 2
                        if (goal + sh * mid - palm_off - p_sh).length > reach: hi = mid
                        else: lo = mid
                    sh = sh * lo
            q, miss, _ = solve(side, goal + sh, hand_rot=hand_rot, remember=True)
            ks.update(q); stat['miss_r' if side == 'Right' else 'miss_l'].append(miss)
        keys[f] = ks
    for fc in fcurves(act):
        for n in chain('Left') + chain('Right'):
            if fc.data_path == f'pose.bones["{n}"].rotation_quaternion':
                for kp in fc.keyframe_points:
                    f = int(round(kp.co[0]))
                    if f in keys and n in keys[f]: kp.co[1] = keys[f][n][fc.array_index]
                fc.update()
    for n in chain('Left') + chain('Right'):
        fcs = sorted([fc for fc in fcurves(act) if fc.data_path == f'pose.bones["{n}"].rotation_quaternion'], key=lambda c: c.array_index)
        if len(fcs) != 4: continue
        prev = None
        for i in range(len(fcs[0].keyframe_points)):
            q = Quaternion([fcs[j].keyframe_points[i].co[1] for j in range(4)])
            if prev is not None and prev.dot(q) < 0:
                for j in range(4): fcs[j].keyframe_points[i].co[1] = -fcs[j].keyframe_points[i].co[1]
                q = -q
            prev = q
        for c in fcs: c.update()
    prevq = None
    for f in range(s, e + 1):
        sc.frame_set(f)
        M = W_REL.inverted() @ pbs['mixamorig:Hips'].matrix.inverted() @ gun_frames[f]
        loc, rot, _ = M.decompose()
        if prevq is not None and prevq.dot(rot) < 0: rot = -rot
        prevq = rot
        key_weapon(act, f, Matrix.LocRotScale(loc, rot, None))
    # verify after the bake: palms vs grip / support line, stock vs pocket
    gr, gl, sp = [], [], []
    for f in range(s, e + 1, 3):
        sc.frame_set(f); M = gun_frames[f]
        gr.append((palm_a('Right') - M @ G).length)
        if S is not None:
            a_, b_ = M @ S, M @ G; p_ = palm_a('Left'); ab = b_ - a_
            tt = max(0.0, min(1.0, (p_ - a_).dot(ab) / ab.dot(ab))); gl.append((p_ - (a_ + ab * tt)).length)
        if pocket_local is not None:
            sp.append((M @ ST - pbs['mixamorig:RightShoulder'].matrix @ pocket_local).length)
    mm = lambda v: max(v) / k * 1000 if v else 0
    if CLEAR:
        print('CLEAR %-15s ' % clip + '  '.join('%s skin in gun %.0f mm, dir %s, hand moved max %.0f mm, sampled frames not cleared %d' % (sd, max(stat['pen0_' + sd]) * 1000, stat['dir_' + sd][0], max(stat['shift_' + sd]) * 1000, stat['inside_' + sd][0]) for sd in ('Right', 'Left') if 'pen0_' + sd in stat))
    print('CLIP %-15s frames %3d right palm-grip max %5.1f mm  left palm-gun line max %5.1f mm  slid %3.0f mm  '
          'stock-pocket min/med/max %s  shouldered frames %s' % (
              clip, e - s + 1, mm(gr), mm(gl), (max(stat['slide']) * 1000 if stat['slide'] else 0),
              ('%.0f/%.0f/%.0f mm' % tuple(x / k * 1000 for x in (min(sp), statistics.median(sp), max(sp)))) if sp else '-',
              ('%d%% (carried dist med %.0f mm)' % (100 * sum(1 for w in stat['w'] if w > .99) / len(stat['w']), statistics.median(stat['dist']) / k * 1000)) if stat['w'] else '-'))
for a in list(bpy.data.actions):
    if a.name not in CLIPS: bpy.data.actions.remove(a)
if arm.animation_data:
    for t in list(arm.animation_data.nla_tracks):
        if not t.strips or t.strips[0].action is None or t.strips[0].action.name not in CLIPS: arm.animation_data.nla_tracks.remove(t)
    arm.animation_data.action = None
for a in bpy.data.actions: a.use_fake_user = True
bpy.ops.object.select_all(action='DESELECT'); arm.select_set(True); gun.select_set(True)
for b in bodies: b.select_set(True)
bpy.ops.export_scene.gltf(filepath=out_path, use_selection=True, export_animations=True, export_animation_mode='ACTIONS')
print('SAVED', out_path)
