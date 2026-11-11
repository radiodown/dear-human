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
HIP_CLIPS = {'rifle_idle', 'pistol_idle'}   # low-ready / hip carry: gun stays in the right hand, no shoulder mount
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

def solve(side, goal_palm, slide_to=None, min_len=0.0, hand_rot=None):
    """two-bone IK in armature space; returns (local quats for the 3 bones, miss, slid distance)"""
    names = chain(side)
    A = {n: pbs[n].matrix.copy() for n in names}; sh = pbs[f'mixamorig:{side}Shoulder'].matrix.copy()
    la, lf = bones[names[0]].length, bones[names[1]].length
    p_sh, p_el, p_wr = A[names[0]].to_translation(), A[names[1]].to_translation(), A[names[2]].to_translation()
    palm_off = palm_a(side) - p_wr
    if hand_rot is not None:   # new hand orientation: the palm point turns with it
        palm_off = hand_rot @ A[names[2]].to_3x3().inverted() @ palm_off
    def goal(t): return goal_palm + ((slide_to - goal_palm) * t if slide_to is not None else Vector()) - palm_off
    t = 0.0; reach = (la + lf) * 0.985
    if slide_to is not None and (goal(0.0) - p_sh).length > reach:
        t_max = max(0.0, 1.0 - min_len / max((goal_palm - slide_to).length, 1e-6)); lo_t, hi_t = 0.0, t_max
        for _ in range(30):
            mid = (lo_t + hi_t) / 2
            if (goal(mid) - p_sh).length > reach: lo_t = mid
            else: hi_t = mid
        t = hi_t
    w = goal(t); d_vec = w - p_sh; d = min(max(d_vec.length, abs(la - lf) + 1e-4), la + lf - 1e-4)
    miss = max(0.0, d_vec.length - (la + lf)); dirn = d_vec.normalized()
    cos_a = max(-1, min(1, (la * la + d * d - lf * lf) / (2 * la * d)))
    pole = (p_el - p_sh); pole = pole - pole.dot(dirn) * dirn
    if pole.length < 1e-6: pole = -up_a - (-up_a).dot(dirn) * dirn
    pole.normalize()
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
    gun_frames = {}; plan = {}
    # pass 1: gun pose, hand goals / orientations, and (every CLEAR_STEP frames) the clearance shift of each hand
    for f in range(s, e + 1):
        sc.frame_set(f)
        M = pbs[HAND].matrix @ OFFSET
        if pocket_local is not None:
            P = pbs['mixamorig:RightShoulder'].matrix @ pocket_local
            st0 = M @ ST; dist = (st0 - P).length
            w = 0.0 if clip in HIP_CLIPS else 1.0
            M = Matrix.Translation((P - st0) * w) @ M
            stat['dist'].append(dist); stat['w'].append(w)
        gun_frames[f] = M
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
                v, d0, rest = clear.shift(clear.local(side), R_new, h[0] - palm_off, M, dirs)
                h[2] = v; stat.setdefault('pen0_' + side, []).append(d0 / k); stat.setdefault('pen1_' + side, []).append(rest / k)
                stat.setdefault('shift_' + side, []).append(v.length / k)
        plan[f] = hands
    # clearance shifts: fill the skipped frames linearly, then smooth over 5 frames
    if CLEAR:
        for side in plan[s]:
            known = sorted(f for f in plan if plan[f][side][2] is not None)
            raw = {}
            for f in range(s, e + 1):
                a = max(x for x in known if x <= f); b = min(x for x in known if x >= f)
                t = 0 if a == b else (f - a) / (b - a)
                raw[f] = plan[a][side][2].lerp(plan[b][side][2], t)
            for f in range(s, e + 1):
                win = [raw[x] for x in range(max(s, f - 2), min(e, f + 2) + 1)]
                avg = sum(win, Vector()) / len(win)
                # never smaller than the frame's own need (smoothing must not reintroduce overlap)
                plan[f][side][2] = avg if avg.length >= raw[f].length else raw[f]
    # pass 2: arm IK onto the (cleared) goals (pistols keep the clip's arms)
    for f in (range(s, e + 1) if mode != 'pistol' else ()):
        sc.frame_set(f)
        ks = {}
        for side, (goal, hand_rot, sh) in plan[f].items():
            q, miss, _ = solve(side, goal + (sh if sh is not None else Vector()), hand_rot=hand_rot)
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
        print('CLEAR %-15s ' % clip + '  '.join('%s skin in gun %.0f->%.0f mm, hand moved max %.0f mm' % (sd, max(stat['pen0_' + sd]) * 1000, max(stat['pen1_' + sd]) * 1000, max(stat['shift_' + sd]) * 1000) for sd in ('Right', 'Left') if 'pen0_' + sd in stat))
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
