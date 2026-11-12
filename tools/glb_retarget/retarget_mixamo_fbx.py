"""Retarget Mixamo FBX clips (any 'mixamorigNN:' prefix, cm units, any fps) onto a character GLB.
Per bone (matched by the name after ':'), the target's posed rotation follows the source bone's WORLD direction:
    T_b = S_b @ Rs_b^-1 @ A_b @ Rt_b      (world-space rotations; A_b = shortest rotation target rest dir -> source rest dir)
Hips travel = source hips world offset from rest x (target hip height / source hip height).
Clips are resampled to 24 fps. Each clip's median lowest point is lifted to the source's median lowest point
(scaled by the hip ratio) so feet do not sink. With FOOT_IK the target legs are re-solved so each foot's lowest skin
point is as high above the ground as the source foot's (planted feet stay planted) and no whole-body lift is applied. Existing target clips are untouched.
args: out.glb target.glb name=path.fbx [name=path.fbx ...]"""
import bpy, sys, os, math, numpy as np
from mathutils import Matrix, Vector
argv = sys.argv[sys.argv.index('--') + 1:]
out_path, tgt_path = argv[0], argv[1]
clips = [a.split('=', 1) for a in argv[2:]]
FPS = 24
FOOT_IK = True   # leg IK so the ankle height follows the source (see the clip loop)
sc = bpy.context.scene

def short(n): return n.split(':')[-1]

# ---------- sample every source clip in world space
samples = {}; src_rest = None; src_hips_z = None; src_low = {}; src_feet = {}
for name, path in clips:
    bpy.ops.wm.read_factory_settings(use_empty=True); sc = bpy.context.scene
    bpy.ops.import_scene.fbx(filepath=path)
    a = next(o for o in bpy.data.objects if o.type == 'ARMATURE')
    mw = a.matrix_world
    rest = {short(b.name): (mw @ b.matrix_local) for b in a.data.bones}
    if src_rest is None: src_rest = rest; src_hips_z = rest['Hips'].to_translation().z
    act = a.animation_data.action; s, e = act.frame_range
    src_fps = sc.render.fps / sc.render.fps_base
    n = int(round((e - s) / src_fps * FPS)) + 1
    fr = []; lows = []; feet = []
    src_meshes = [o for o in bpy.data.objects if o.type == 'MESH']
    foot_sel = {'Left': [], 'Right': []}
    for o in src_meshes:
        nm = {g.index: g.name for g in o.vertex_groups}
        for v in o.data.vertices:
            if not v.groups: continue
            g = short(nm.get(max(v.groups, key=lambda g: g.weight).group, ''))
            for sd in foot_sel:
                if g in (sd + 'Foot', sd + 'ToeBase', sd + 'Toe_End'): foot_sel[sd].append((o, v.index))
    for k in range(n):
        t = s + k / FPS * src_fps; fi = int(t); sc.frame_set(fi, subframe=t - fi)
        fr.append({short(pb.name): (mw @ pb.matrix) for pb in a.pose.bones})
        if FOOT_IK and all(foot_sel.values()):
            dg = bpy.context.evaluated_depsgraph_get(); ev = {o: o.evaluated_get(dg).to_mesh() for o in src_meshes}
            feet.append({sd: min((o.matrix_world @ ev[o].vertices[i].co).z for o, i in foot_sel[sd]) for sd in foot_sel})
            for o in src_meshes: o.evaluated_get(dg).to_mesh_clear()
        # lowest joint height (toe ends) as the ground reference for a mesh-less source
        lows.append(min((mw @ pb.tail).z for pb in a.pose.bones if 'Toe' in pb.name or 'Foot' in pb.name))
    samples[name] = fr; src_low[name] = float(np.median(lows)); src_feet[name] = feet
    print('SRC', name, os.path.basename(path), 'frames', n, 'src_fps', src_fps, 'hips_z', round(rest['Hips'].to_translation().z, 3), 'toe low', round(src_low[name], 3))

# ---------- target
bpy.ops.wm.read_factory_settings(use_empty=True); sc = bpy.context.scene
bpy.ops.import_scene.gltf(filepath=tgt_path)
arm = next(o for o in bpy.data.objects if o.type == 'ARMATURE')
mesh = next(o for o in bpy.data.objects if o.type == 'MESH' and o.parent == arm)
bones = arm.data.bones; amw = arm.matrix_world
rest_t = {b.name: amw @ b.matrix_local for b in bones}
key = {b.name: short(b.name) for b in bones}
missing = [b.name for b in bones if key[b.name] not in src_rest]
print('MISSING_BONES', missing)
ratio = rest_t['mixamorig:Hips'].to_translation().z / src_hips_z
print('HIP_RATIO', round(ratio, 4))
align = {}
for b in bones:
    k = key[b.name]
    if k not in src_rest: continue
    dt = (rest_t[b.name].to_3x3() @ Vector((0, 1, 0))).normalized(); ds = (src_rest[k].to_3x3() @ Vector((0, 1, 0))).normalized()
    align[b.name] = dt.rotation_difference(ds).to_matrix()
rel = {b.name: (b.parent.matrix_local.inverted() @ b.matrix_local) if b.parent else b.matrix_local.copy() for b in bones}
inv_amw3 = amw.to_3x3().inverted()
toe_rest_t = min((amw @ b.tail_local).z for b in bones if 'Toe' in b.name or 'Foot' in b.name)
toe_rest_s = min(src_rest[k].to_translation().z for k in src_rest if 'Toe' in k or 'Foot' in k)

# skin vertices of the feet (dominant group = a foot / toe bone): with FOOT_IK the ground is set from the feet, so a
# knee or chest that touches the ground in kneel / prone clips does not lift the whole body off its planted foot
_names = {g.index: g.name for g in mesh.vertex_groups}
FOOT_VERTS = np.array([v.index for v in mesh.data.vertices if v.groups and
                       _names.get(max(v.groups, key=lambda g: g.weight).group, '').endswith(('Foot', 'ToeBase', 'Toe_End'))], dtype=int)

FOOT_LOCAL = {'Left': [], 'Right': []}   # foot skin samples: [(bone, weight, rest position in that bone's frame)]
_rng = np.random.default_rng(3)
for sd in FOOT_LOCAL:
    idx = [v.index for v in mesh.data.vertices if v.groups and
           _names.get(max(v.groups, key=lambda g: g.weight).group, '') in tuple(f'mixamorig:{sd}{x}' for x in ('Foot', 'ToeBase', 'Toe_End'))]
    if len(idx) > 400: idx = list(_rng.choice(idx, 400, replace=False))
    for i in idx:
        v = mesh.data.vertices[i]; tot = sum(g.weight for g in v.groups if _names.get(g.group) in bones)
        infl = [(_names[g.group], g.weight / tot, bones[_names[g.group]].matrix_local.inverted() @ v.co)
                for g in v.groups if _names.get(g.group) in bones and g.weight > 0]
        if infl: FOOT_LOCAL[sd].append(infl)

def foot_low(P, side):   # lowest foot skin point (world z) for the armature-space pose P, linear-blend skinned
    return min((amw @ sum((P[bn] @ c * w for bn, w, c in infl), Vector())).z for infl in FOOT_LOCAL[side])

def lowest_mesh(act, step=4, feet=False):
    arm.animation_data.action = act; s_, e_ = map(int, act.frame_range); vals = []
    for f in range(s_, e_ + 1, step):
        sc.frame_set(f); ev = mesh.evaluated_get(bpy.context.evaluated_depsgraph_get())
        c = np.empty(len(ev.data.vertices) * 3); ev.data.vertices.foreach_get('co', c); c = c.reshape(-1, 3)
        if feet and len(FOOT_VERTS): c = c[FOOT_VERTS]
        vals.append(float(c[:, 2].min()))
    return float(np.median(vals))

def build(name, lift=0.0):
    """retarget one clip into a new muted-NLA action; `lift` raises the hips (world m) before the leg IK"""
    fr = samples[name]; fl = list(range(1, len(fr) + 1))
    keys = {b.name: {'loc': [], 'rot': []} for b in bones}
    leg_err = []
    for f, S in zip(fl, fr):
        P = {}; RA = {}  # armature-space pose matrices / rotations of the target
        for b in bones:
            n = b.name; k = key[n]
            if k in S:
                Rw = S[k].to_3x3() @ src_rest[k].to_3x3().inverted() @ align[n] @ rest_t[n].to_3x3()
                Ra = inv_amw3 @ Rw                                   # world -> armature space
            else:
                Ra = (P[b.parent.name].to_3x3() @ rel[n].to_3x3()) if b.parent else b.matrix_local.to_3x3()
            RA[n] = Ra
            if b.parent:
                P[n] = Matrix.Translation(P[b.parent.name] @ rel[n].to_translation()) @ Ra.to_4x4()
            else:
                off_w = (S[k].to_translation() - src_rest[k].to_translation()) * ratio + Vector((0, 0, lift))
                P[n] = Matrix.Translation(b.matrix_local.to_translation() + inv_amw3 @ off_w) @ Ra.to_4x4()
        if FOOT_IK:
            # Matching bone directions alone puts the feet wherever the target's own thigh/shin lengths take them
            # (a planted foot floats or sinks). Two-bone leg IK: the foot's lowest skin point is put at the height of
            # the source foot's lowest skin point (from the FBX's own mesh, scaled by the hip ratio); the ankle's
            # horizontal position, the foot / toe world orientation and the knee's side stay as retargeted.
            for side in ('Left', 'Right'):
                u, l, ft = (f'mixamorig:{side}{x}' for x in ('UpLeg', 'Leg', 'Foot'))
                if not all(x in P for x in (u, l, ft)) or f'{side}Foot' not in S: continue
                hip, knee, ank = (amw @ P[x].to_translation() for x in (u, l, ft))
                # contact: the foot's lowest skin point sits at the height the source foot's lowest skin point has
                # above its ground (scaled by the hip ratio): planted feet stay on the ground, a raised foot stays raised
                if not src_feet[name]: continue
                want = src_feet[name][f - 1][side] * ratio
                tz = ank.z + (want - foot_low(P, side))
                T = Vector((ank.x, ank.y, tz))
                a, bl = (knee - hip).length, (ank - knee).length
                v = T - hip; d = min(max(v.length, abs(a - bl) + 1e-5), (a + bl) * 0.9999); dn = v.normalized()
                pole = (knee - hip) - (knee - hip).dot(dn) * dn
                if pole.length < 1e-6: continue
                pole.normalize()
                ca = max(-1.0, min(1.0, (a * a + d * d - bl * bl) / (2 * a * d)))
                nk = hip + dn * (a * ca) + pole * (a * math.sqrt(max(0.0, 1 - ca * ca))); nT = hip + dn * d
                amw3 = amw.to_3x3()
                Rw_u = (knee - hip).normalized().rotation_difference((nk - hip).normalized()).to_matrix() @ (amw3 @ RA[u])
                Rw_l = (ank - knee).normalized().rotation_difference((nT - nk).normalized()).to_matrix() @ (amw3 @ RA[l])
                RA[u] = inv_amw3 @ Rw_u; RA[l] = inv_amw3 @ Rw_l
                # forward kinematics again for the leg subtree (the foot and toes keep their world rotation)
                stack = [bones[u]]
                while stack:
                    bb = stack.pop(); n = bb.name
                    P[n] = Matrix.Translation(P[bb.parent.name] @ rel[n].to_translation()) @ RA[n].to_4x4()
                    stack.extend(bb.children)
                leg_err.append(abs(foot_low(P, side) - want))
        for b in bones:
            n = b.name
            if b.parent:
                basis_r = rel[n].to_3x3().inverted() @ P[b.parent.name].to_3x3().inverted() @ RA[n]; l = Vector((0, 0, 0))
            else:
                basis = rel[n].inverted() @ P[n]; l = basis.to_translation(); basis_r = basis.to_3x3()
            q = basis_r.to_quaternion().normalized()
            prev = keys[n]['rot'][-1] if keys[n]['rot'] else None
            if prev is not None and prev.dot(q) < 0: q = -q
            keys[n]['loc'].append(l); keys[n]['rot'].append(q)
    act = bpy.data.actions.new(name)
    slot = act.slots.new(id_type='OBJECT', name=arm.name)
    layer = act.layers.new('Layer'); strip = layer.strips.new(type='KEYFRAME'); cb = strip.channelbag(slot, ensure=True)
    for b in bones:
        n = b.name
        for prop, kk, size in (('location', 'loc', 3), ('rotation_quaternion', 'rot', 4), ('scale', None, 3)):
            for i in range(size):
                fc = cb.fcurves.new(f'pose.bones["{n}"].{prop}', index=i, group_name=n)
                vals = [1.0] * len(fl) if kk is None else [v[i] for v in keys[n][kk]]
                fc.keyframe_points.add(len(fl)); fc.keyframe_points.foreach_set('co', [x for f, v in zip(fl, vals) for x in (f, v)])
                for kp in fc.keyframe_points: kp.interpolation = 'LINEAR'
                fc.update()
    act.use_fake_user = True
    track = arm.animation_data.nla_tracks.new(); track.name = name; track.mute = True; track.strips.new(name, 1, act)
    return act, cb, fl, leg_err

for name, _ in clips:
    act, cb, fl, leg_err = build(name)
    body_lift = 0.0
    if FOOT_IK:
        # feet are placed explicitly; if the body itself then sinks below the ground (a thicker chest in a prone clip),
        # raise the hips by that much and solve the legs again so the feet still land where the source's do
        low = lowest_mesh(act, step=2)
        if low < -0.003:
            arm.animation_data.nla_tracks.remove(next(t for t in arm.animation_data.nla_tracks if t.name == name))
            bpy.data.actions.remove(act); body_lift = -low
            act, cb, fl, leg_err = build(name, body_lift)
    # ground: the clip's median lowest mesh point (feet only with FOOT_IK) sits on z = 0 (the mesh-less source cannot give sole thickness)
    dz = 0.0 if FOOT_IK else -lowest_mesh(act, step=2)
    lift_local = rel['mixamorig:Hips'].to_3x3().inverted() @ (inv_amw3 @ Vector((0, 0, dz)))
    for fc in cb.fcurves:
        if fc.data_path == 'pose.bones["mixamorig:Hips"].location':
            for kp in fc.keyframe_points: kp.co[1] += lift_local[fc.array_index]
            fc.update()
    print('CLIP', name, len(fl), 'frames @24', 'ground lift mm', round((dz + body_lift) * 1000, 1), 'mesh lowest median mm', round(lowest_mesh(act) * 1000, 1), 'ankle height miss max mm', round(max(leg_err) * 1000, 1) if leg_err else '-')
arm.animation_data.action = None
print('ACTIONS', sorted(a.name for a in bpy.data.actions))
bpy.ops.object.select_all(action='DESELECT'); arm.select_set(True); mesh.select_set(True)
bpy.ops.export_scene.gltf(filepath=out_path, use_selection=True, export_animations=True, export_animation_mode='ACTIONS')
print('SAVED', out_path)
