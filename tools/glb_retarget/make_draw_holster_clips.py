"""Long gun draw / holster clips.

    blender -b --python tools/glb_retarget/make_draw_holster_clips.py -- <character.glb> <weapon.glb> <out.glb>
            [style=vanish|back] [pitch_min=-40] [pull_clip=rifle_pull_out] [put_clip=rifle_put_away]

The character GLB holds the bare Mixamo clips "Rifle Pull Out" / "Rifle Put Away". The weapon gets the same
non-deforming `weapon` bone under the Hips as attach_weapon.py (same scale, same reference offset from the right
palm on the middle frame of rifle_aim_idle, so the rifle at the end of the draw sits as in the armed rifle clips).

style=vanish (default; user choice 2026-11-13: the gun appears / disappears instead of being slung):
  the gun rides on the clip's right hand in the ready carry and is keyed to scale 0 while hidden. Draw: shown from
  the frame from which the hand-carried muzzle stays above pitch_min (earlier it would point down through the leg);
  holster: hidden from the first frame it drops below pitch_min. The right arm keeps the clip's motion; the left hand
  is put on the support socket (IK, slid toward the grip when out of reach) only while the gun is shown.

style=back (first version, kept for reference): slung on the back.
  Back mount: in the Spine2 bone's space, diagonal across the back, muzzle up over the left shoulder, stock toward
  the right hip, gun's left side facing out. Its depth is the smallest distance behind the back at which no sampled
  gun vertex lies in front of the back surface (back-to-front rays; hair and arm faces ignored) on the mounted
  frames, plus MARGIN. Draw: mounted until the grab frame g = the frame the clip's right palm comes closest to the
  mounted grip. From REACH frames before g the right hand is pulled (two-bone IK) onto the grip by a growing offset;
  after g the gun rides on the hand while that offset decays back to the clip's own hand path by frame r (the hands
  come together at the ready), and the gun turns from the back orientation to the ready carry. Holster: the same in
  reverse.
Only the arms (both chains) and the weapon bone are changed; legs, spine, head and fingers are the clip's.
"""
import bpy, sys, math, os
from mathutils import Matrix, Vector, Quaternion
argv = sys.argv[sys.argv.index('--') + 1:]
char_path, gun_path, out_path = argv[:3]
opts = dict(a.split('=', 1) for a in argv[3:])
PULL = opts.get('pull_clip', 'rifle_pull_out'); PUT = opts.get('put_clip', 'rifle_put_away')
PITCH_MIN = float(opts.get('pitch_min', -40))   # vanish style: shown only while the hand-carried muzzle is above this (deg)
STYLE = opts.get('style', 'vanish')   # vanish: the gun appears in / vanishes from the right hand; back: slung on the back
REF_CLIP = 'rifle_aim_idle'
TILT = math.radians(float(opts.get('tilt', 50)))      # barrel above horizontal on the back
GRIP_SIDE = float(opts.get('side', -0.085))            # grip, character units from Spine2: + left / - right
GRIP_UP = float(opts.get('up', -0.07))                 # + up
MARGIN = 0.006
REACH, RETURN, LEFT_IN, LEFT_OUT = 8, 8, 6, 6          # frames
MIN_SUPPORT = 0.12
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
gun.data.transform(Matrix.Scale(k, 4)); gun.name = 'weapon'
G, S = sockets['socket_grip'], sockets['socket_support']
mw = arm.matrix_world; mwi = mw.inverted(); pbs = arm.pose.bones; bones = arm.data.bones

bpy.ops.object.select_all(action='DESELECT'); arm.select_set(True); bpy.context.view_layer.objects.active = arm
bpy.ops.object.mode_set(mode='EDIT')
eb = arm.data.edit_bones.new('weapon'); eb.head = (0, 0, 0); eb.tail = (0, 0.1, 0); eb.use_deform = False
eb.parent = arm.data.edit_bones['mixamorig:Hips']; eb.use_connect = False
bpy.ops.object.mode_set(mode='OBJECT')
wpb = pbs['weapon']; wpb.rotation_mode = 'QUATERNION'; WLEN = bones['weapon'].length
gun.parent = arm; gun.parent_type = 'BONE'; gun.parent_bone = 'weapon'
gun.matrix_parent_inverse = Matrix.Identity(4); gun.matrix_basis = Matrix.Translation((0, -WLEN, 0))

def palm_a(side): return (pbs[f'mixamorig:{side}Hand'].head + pbs[f'mixamorig:{side}HandMiddle1'].head) / 2
def frame_basis(a, up):
    a = a.normalized(); u = (up - up.dot(a) * a).normalized(); return Matrix((a, u, a.cross(u))).transposed()
up_a = (mwi.to_3x3() @ Vector((0, 0, 1))).normalized()

# ---- ready offset (same as attach_weapon long mode)
ref = bpy.data.actions[REF_CLIP]; arm.animation_data.action = ref
s0, e0 = map(int, ref.frame_range); sc.frame_set((s0 + e0) // 2)
pr, pl = palm_a('Right'), palm_a('Left')
R = frame_basis(pl - pr, up_a) @ frame_basis(S - G, Vector((0, 0, 1))).inverted()
M_ref = Matrix.Translation(pr) @ R.to_4x4() @ Matrix.Translation(-G)
HAND, SPINE = 'mixamorig:RightHand', 'mixamorig:Spine2'
OFFSET = pbs[HAND].matrix.inverted() @ M_ref

# ---- back mount in Spine2 space, defined on the first frame of the pull clip
pull = bpy.data.actions[PULL]; arm.animation_data.action = pull; sc.frame_set(int(pull.frame_range[0]))
Lv = pbs['mixamorig:LeftArm'].head - pbs['mixamorig:RightArm'].head; Lv = (Lv - Lv.dot(up_a) * up_a).normalized()
Fv = Lv.cross(up_a).normalized()          # forward ( (F, L, U) right-handed: F x L = U )
if Fv.dot(up_a.cross(Lv)) > 0: Fv = -Fv
c, s_ = math.cos(TILT), math.sin(TILT)
gx = (Lv * c + up_a * s_).normalized()     # barrel: up and to the left
gz = (up_a * c - Lv * s_).normalized()     # gun up: in the back plane
Rm = Matrix((gx, gz.cross(gx), gz)).transposed()   # gun +Y (its left) = gz x gx = -F: faces out of the back
sp0 = pbs[SPINE].matrix.copy()
F_LOCAL = sp0.to_3x3().inverted() @ Fv
def mount_world(depth):
    grip = sp0.translation + Lv * GRIP_SIDE + up_a * GRIP_UP - Fv * depth
    return Matrix.Translation(grip) @ Rm.to_4x4() @ Matrix.Translation(-G)
GV = [v.co.copy() for i, v in enumerate(gun.data.vertices) if i % 7 == 0]

def inside_depth(Mgun, fwd=None):
    """how far the deepest sampled gun vertex lies in front of the body's back surface (armature space, 0 if none):
    a ray from behind each vertex toward the front finds the first surface; open shells (hair, cloth) make
    closest-point inside tests unreliable, a back-to-front ray does not care"""
    fwd = (pbs[SPINE].matrix.to_3x3() @ F_LOCAL).normalized() if fwd is None else fwd
    dg = bpy.context.evaluated_depsgraph_get(); worst = 0.0
    for b in bodies:
        be = b.evaluated_get(dg); bw = b.matrix_world; bwi = bw.inverted()
        d_l = (bwi.to_3x3() @ (mw.to_3x3() @ fwd)).normalized()
        hair = HAIR.get(b.name, set())
        for v in GV:
            p = Mgun @ v; o = bwi @ (mw @ (p - fwd * 0.5)); left = 0.5
            while left > 0:
                hit, loc, nor, idx = be.ray_cast(o, d_l, distance=left)
                if not hit: break
                if idx in hair:   # long hair lies over the slung gun, arms move past it: look through them
                    step = (loc - o).length + 1e-4; o = loc + d_l * 1e-4; left -= step; continue
                worst = max(worst, (p - mwi @ (bw @ loc)).dot(fwd)); break
    return worst

HEAD_GROUPS = {'mixamorig:Head', 'mixamorig:HeadTop_End', 'mixamorig:Neck'}
HAIR = {}
for b in bodies:   # faces skinned mostly to the head / neck (long hair) or the arms (they pass the gun when grabbing it)
    names = {g.index: g.name for g in b.vertex_groups}
    dom = [names.get(max(v.groups, key=lambda x: x.weight).group) if v.groups else None for v in b.data.vertices]
    ARMISH = lambda n: n is not None and any(t in n for t in ('Arm', 'Hand'))   # upper/fore arm, hand, fingers
    HAIR[b.name] = {p.index for p in b.data.polygons if sum(dom[i] in HEAD_GROUPS or ARMISH(dom[i]) for i in p.vertices) * 2 > len(p.vertices)}
    print('ignored hair/head/arm faces on %s: %d of %d' % (b.name, len(HAIR[b.name]), len(b.data.polygons)))

# ---- per clip analysis
def clip_info(name, grip_local):
    act = bpy.data.actions[name]; arm.animation_data.action = act
    s, e = map(int, act.frame_range); best = None; rl = {}
    for f in range(s, e + 1):
        sc.frame_set(f)
        d = (pbs[SPINE].matrix.inverted() @ palm_a('Right') - grip_local).length
        if best is None or d < best[0]: best = (d, f)
        rl[f] = (palm_a('Right') - palm_a('Left')).length
    return act, s, e, best[1], best[0], rl

# depth: smallest with no body penetration on mounted frames (pull: start..grab, put: closest..end)
def mount_local(depth): return sp0.inverted() @ mount_world(depth)
probe_local = mount_local(0.1) @ G
_, ps, pe, pg, _, _ = clip_info(PULL, probe_local)
_, qs, qe, qh, _, _ = clip_info(PUT, probe_local)
check = [(PULL, f) for f in range(ps, pg + 1, 4)] + [(PUT, f) for f in range(qh, qe + 1, 4)]
def worst_at(depth):
    w = 0.0; ML = mount_local(depth)
    for name, f in check:
        arm.animation_data.action = bpy.data.actions[name]; sc.frame_set(f)
        w = max(w, inside_depth(pbs[SPINE].matrix @ ML))
    return w
lo, hi = -0.05, 0.30
for _ in range(12):
    mid = (lo + hi) / 2
    if worst_at(mid) > 0: lo = mid
    else: hi = mid
DEPTH = hi + MARGIN
MOUNT = mount_local(DEPTH)            # gun -> Spine2 space
GRIP_L = MOUNT @ G
print('MOUNT depth behind Spine2 %.3f (%.0f mm real), tilt %.0f deg' % (DEPTH, DEPTH / k * 1000, math.degrees(TILT)))

# ---- IK (from attach_weapon.solve, without the support slide search)
def chain(side): return [f'mixamorig:{side}Arm', f'mixamorig:{side}ForeArm', f'mixamorig:{side}Hand']
rel = {n: (bones[n].parent.matrix_local.inverted() @ bones[n].matrix_local) for sd in ('Left', 'Right') for n in chain(sd)}
LAST_POLE = {}
def solve(side, goal_palm):
    names = chain(side)
    A = {n: pbs[n].matrix.copy() for n in names}; sh = pbs[f'mixamorig:{side}Shoulder'].matrix.copy()
    la, lf = bones[names[0]].length, bones[names[1]].length
    p_sh, p_el, p_wr = A[names[0]].to_translation(), A[names[1]].to_translation(), A[names[2]].to_translation()
    w = goal_palm - (palm_a(side) - p_wr); d_vec = w - p_sh
    d = min(max(d_vec.length, abs(la - lf) + 1e-4), (la + lf) * 0.97)
    miss = max(0.0, d_vec.length - (la + lf) * 0.97); dirn = d_vec.normalized()
    cos_a = max(-1, min(1, (la * la + d * d - lf * lf) / (2 * la * d)))
    pole = (p_el - p_sh); pole = pole - pole.dot(dirn) * dirn
    if side == 'Right':
        ax0 = (p_wr - p_sh).normalized(); off0 = (p_el - p_sh) - (p_el - p_sh).dot(ax0) * ax0
        dn0 = -up_a - (-up_a).dot(ax0) * ax0; dnN = -up_a - (-up_a).dot(dirn) * dirn
        if off0.length > 1e-6 and dn0.length > 1e-6 and dnN.length > 1e-6:
            off0.normalize(); dn0.normalize(); dnN.normalize()
            phi = math.atan2(ax0.dot(dn0.cross(off0)), dn0.dot(off0))
            pole = Matrix.Rotation(phi, 3, dirn) @ dnN
    lp = LAST_POLE.get(side)
    if lp is not None:
        lp = lp - lp.dot(dirn) * dirn
        if lp.length > 1e-6:
            lp.normalize()
            if pole.length < 0.25 * la or pole.normalized().dot(lp) < 0.2: pole = lp.copy()
            else: pole = pole.normalized() + lp
    if pole.length < 1e-6: pole = -up_a - (-up_a).dot(dirn) * dirn
    pole.normalize(); LAST_POLE[side] = pole.copy()
    new_el = p_sh + dirn * (la * cos_a) + pole * (la * math.sqrt(max(0, 1 - cos_a * cos_a))); new_wr = p_sh + dirn * d
    def rot_to(Mold, nd):
        old = (Mold.to_3x3() @ Vector((0, 1, 0))).normalized()
        return old.rotation_difference(nd.normalized()).to_matrix() @ Mold.to_3x3()
    R_arm = rot_to(A[names[0]], new_el - p_sh); R_fore = rot_to(A[names[1]], new_wr - new_el); R_hand = A[names[2]].to_3x3()
    b_arm = rel[names[0]].to_3x3().inverted() @ sh.to_3x3().inverted() @ R_arm
    b_fore = rel[names[1]].to_3x3().inverted() @ R_arm.inverted() @ R_fore
    b_hand = rel[names[2]].to_3x3().inverted() @ R_fore.inverted() @ R_hand
    return {n: b.to_quaternion().normalized() for n, b in zip(names, (b_arm, b_fore, b_hand))}, miss

def smooth(t): t = max(0.0, min(1.0, t)); return t * t * (3 - 2 * t)
def blend_m(A, B, t):
    la, ra, _ = A.decompose(); lb, rb, _ = B.decompose()
    if ra.dot(rb) < 0: rb = -rb
    return Matrix.LocRotScale(la.lerp(lb, t), ra.slerp(rb, t), None)
def support_goal(M):
    """left palm goal on the support socket, slid toward the grip when the arm cannot reach (as attach_weapon)"""
    a_, b_ = M @ S, M @ G; p_sh = pbs['mixamorig:LeftArm'].head
    reach = (bones['mixamorig:LeftArm'].length + bones['mixamorig:LeftForeArm'].length) * 0.93
    off = palm_a('Left') - pbs['mixamorig:LeftHand'].head
    if (a_ - off - p_sh).length <= reach: return a_
    t_max = max(0.0, 1 - MIN_SUPPORT * k / max((a_ - b_).length, 1e-6)); lo, hi = 0.0, t_max
    for _ in range(30):
        mid = (lo + hi) / 2
        if (a_ + (b_ - a_) * mid - off - p_sh).length > reach: lo = mid
        else: hi = mid
    return a_ + (b_ - a_) * hi

W_REL = bones['mixamorig:Hips'].matrix_local.inverted() @ bones['weapon'].matrix_local
def build(name, draw):
    act, s, e, gk, gdist, rl = clip_info(name, GRIP_L)
    if draw:   # hands meet at the ready after the grab
        r = next((f for f in range(gk + 1, e + 1) if rl[f] <= 0.13), e)
        a = max(s, gk - REACH); w_in, w_out = (a, gk), (gk, r)
    else:      # hands part before the gun goes to the back
        r = next((f for f in range(gk - 1, s - 1, -1) if rl[f] <= 0.13), s)
        a = min(e, gk + RETURN); w_in, w_out = (r, gk), (gk, a)
    LAST_POLE.clear(); plan = {}; stats = {'miss': 0.0, 'drift': 0.0}
    if STYLE == 'vanish':
        # the hand-carried gun points down through the leg while the clip's hand is low: appear from the frame on which
        # the muzzle stays above PITCH_MIN (draw), vanish at the first frame it drops below it (holster)
        pitch = {}
        for f in range(s, e + 1):
            sc.frame_set(f); M = pbs[HAND].matrix @ OFFSET
            pitch[f] = math.degrees(math.asin(max(-1.0, min(1.0, M.to_3x3().col[0].normalized().dot(up_a)))))
        if draw: gk = next(f for f in range(s, e + 1) if all(pitch[x] >= PITCH_MIN for x in range(f, e + 1)))
        else: gk = next((f for f in range(s, e + 1) if pitch[f] < PITCH_MIN), e + 1)
        # the left hand takes the support only while the gun is shown
        r = max(r, gk + LEFT_IN) if draw else min(r, gk - LEFT_OUT)
    sc.frame_set(gk); D_g = pbs[SPINE].matrix @ GRIP_L - palm_a('Right')
    for f in range(s, e + 1):
        sc.frame_set(f)
        ready = pbs[HAND].matrix @ OFFSET; mount = pbs[SPINE].matrix @ MOUNT
        # 0 = on the back, 1 = in the hands (ready carry); hand offset bump peaks at the grab / release frame
        if draw:
            hold = 0.0 if f <= gk else smooth((f - gk) / max(1, r - gk))
            bump = smooth((f - a) / max(1, gk - a)) if f <= gk else 1 - smooth((f - gk) / max(1, r - gk))
            left_w = smooth((f - (r - LEFT_IN)) / LEFT_IN)
        else:
            hold = 0.0 if f >= gk else smooth((gk - f) / max(1, gk - r))
            bump = smooth((f - r) / max(1, gk - r)) if f <= gk else 1 - smooth((f - gk) / max(1, a - gk))
            left_w = 1 - smooth((f - r) / LEFT_OUT)
        if STYLE == 'vanish':
            # the gun rides on the clip's right hand (ready carry) and is only shown from the grab frame on (draw) /
            # until the release frame (holster); the right arm keeps the clip's motion
            visible = f >= gk if draw else f < gk
            plan[f] = (ready, None, left_w, 1.0 if visible else 0.0, visible); continue
        palm_goal = palm_a('Right') + D_g * bump
        if hold <= 0: M = mount
        else:
            # orientation turns from the back to the ready carry; the grip rides on the (offset) hand
            Mr = blend_m(mount, ready, hold)
            M = Matrix.Translation(palm_goal - Mr @ G) @ Mr if hold < 1 else ready
        plan[f] = (M, palm_goal if (bump > 1e-4 or hold > 0) else None, left_w, hold, True)
    keys = {}
    for f in range(s, e + 1):
        sc.frame_set(f); M, rgoal, lw, _, _ = plan[f]; ks = {}
        if rgoal is not None:
            q, miss = solve('Right', rgoal); ks.update(q); stats['miss'] = max(stats['miss'], miss)
        else: LAST_POLE.pop('Right', None)
        if lw > 1e-4:
            goal = palm_a('Left').lerp(support_goal(M), lw)
            q, miss = solve('Left', goal); ks.update(q)
        else: LAST_POLE.pop('Left', None)
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
        prev = None
        for i in range(len(fcs[0].keyframe_points)):
            q = Quaternion([fcs[j].keyframe_points[i].co[1] for j in range(4)])
            if prev is not None and prev.dot(q) < 0:
                for j in range(4): fcs[j].keyframe_points[i].co[1] = -fcs[j].keyframe_points[i].co[1]
                q = -q
            prev = q
        for c_ in fcs: c_.update()
    prevq = None; gr = []; pen = []
    for f in range(s, e + 1):
        sc.frame_set(f); M = plan[f][0]
        B = W_REL.inverted() @ pbs['mixamorig:Hips'].matrix.inverted() @ M
        loc, rot, _ = B.decompose()
        if prevq is not None and prevq.dot(rot) < 0: rot = -rot
        prevq = rot
        wpb.location = loc; wpb.rotation_quaternion = rot
        wpb.keyframe_insert('location', frame=f); wpb.keyframe_insert('rotation_quaternion', frame=f)
        wpb.scale = (1, 1, 1) if plan[f][4] else (0, 0, 0); wpb.keyframe_insert('scale', frame=f)
        if plan[f][3] > 0: gr.append((palm_a("Right") - M @ G).length)
        if STYLE == 'back' and f % 3 == 0 and plan[f][1] is None: pen.append((inside_depth(M), f))
    for fc in fcurves(act):
        if fc.data_path == 'pose.bones["weapon"].scale':
            for kp in fc.keyframe_points: kp.interpolation = 'CONSTANT'
    worst = max(pen) if pen else (0.0, 0)
    if STYLE == 'vanish':
        shown = [f for f in range(s, e + 1) if plan[f][4]]
        print('CLIP %-15s frames %d-%d gun %s at frame %d (muzzle %+.0f deg), shown frames %d-%d, left hand on the support %s' % (
            name, s, e, 'appears' if draw else 'vanishes', gk, pitch[min(gk, e)], shown[0], shown[-1], ('from %d' % r) if draw else ('until %d' % (r + LEFT_OUT))))
        return
    print('CLIP %-15s frames %d-%d grab/release %d (clip palm %.0f mm from the mounted grip) ready %d  right palm-grip max %.1f mm  '
          'IK miss %.1f mm  mounted gun in front of the back surface max %.0f mm (frame %d)' % (name, s, e, gk, gdist / k * 1000, r,
          max(gr) / k * 1000 if gr else 0, stats['miss'] / k * 1000, worst[0] / k * 1000, worst[1]))

build(PULL, True); build(PUT, False)
for a_ in list(bpy.data.actions):
    if a_.name not in (PULL, PUT): bpy.data.actions.remove(a_)
if arm.animation_data:
    for t in list(arm.animation_data.nla_tracks):
        if not t.strips or t.strips[0].action is None or t.strips[0].action.name not in (PULL, PUT): arm.animation_data.nla_tracks.remove(t)
    arm.animation_data.action = None
for a_ in bpy.data.actions: a_.use_fake_user = True
bpy.ops.object.select_all(action='DESELECT'); arm.select_set(True); gun.select_set(True)
for b in bodies: b.select_set(True)
bpy.ops.export_scene.gltf(filepath=out_path, use_selection=True, export_animations=True, export_animation_mode='ACTIONS')
print('SAVED', out_path)
