"""Plan E: pose the Plan D clone_01 GLB in headless Blender and bake pixel sprites.

Run (from the project root):
  /Applications/Blender.app/Contents/MacOS/Blender -b --factory-startup \
    --python tools/plan_e/render_sprites.py -- \
    --glb art/characters/clone_01/motion/plan_d/hair_006/source/clone_01.glb \
    --out art/characters/clone_01/motion/plan_e/sprite_001

The script is deterministic: the same GLB and parameters give the same PNGs.
World units are meters. The character faces +X, the camera looks along +Y.
"""
import argparse
import hashlib
import json
import math
import os
import sys
import time

import bpy
import numpy as np
from mathutils import Euler, Matrix, Quaternion, Vector

# ----------------------------------------------------------------------------
# Arguments

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
parser = argparse.ArgumentParser()
parser.add_argument('--glb', required=True, help='rigged model: .glb (Plan D) or .blend (build_hull_model.py)')
parser.add_argument('--exposure', type=float, default=0.6, help='0 keeps painted (emission) models at their painted values')
parser.add_argument('--twist', type=float, default=1.0, help='scale of the chest yaw toward the camera')
parser.add_argument('--stance', type=float, default=1.0, help='foot spread of the shooting stance, 0 = rest pose')
parser.add_argument('--out', required=True)
parser.add_argument('--clips', default='reload,turnaround')
parser.add_argument('--ppm', type=float, default=64.0, help='output pixels per meter')
parser.add_argument('--supersample', type=int, default=4)
parser.add_argument('--colors', type=int, default=24)
parser.add_argument('--pitch', type=float, default=8.0, help='camera downward pitch in degrees')
parser.add_argument('--raw', action='store_true', help='also keep the full-resolution renders')
args = parser.parse_args(argv)

OUT = os.path.abspath(args.out)
STARTED = time.time()

# The rig names its -Y limbs left_*. That side faces the camera, so it holds the
# pistol grip (near arm, as in the Plan A side rig); the +Y arm supports.
TRIGGER = 'left'
SUPPORT = 'right'

# ----------------------------------------------------------------------------
# Scene

bpy.ops.wm.read_factory_settings(use_empty=True)
if args.glb.lower().endswith('.blend'):
    with bpy.data.libraries.load(os.path.abspath(args.glb), link=False) as (src, dst):
        dst.objects = list(src.objects)
    for obj in dst.objects:
        bpy.context.scene.collection.objects.link(obj)
    base = os.path.dirname(os.path.abspath(args.glb))
    for img in bpy.data.images:          # '//' paths were relative to the source .blend
        if img.filepath.startswith('//'):
            img.filepath = os.path.normpath(os.path.join(base, img.filepath[2:]))
            img.reload()
else:
    bpy.ops.import_scene.gltf(filepath=os.path.abspath(args.glb))
for obj in list(bpy.data.objects):
    if obj.type == 'MESH' and obj.name.startswith('Icosphere'):
        bpy.data.objects.remove(obj, do_unlink=True)
arm = next(o for o in bpy.data.objects if o.type == 'ARMATURE')
scene = bpy.context.scene

# Hair cards read as gray at sprite size: keep their sheen low so the hair stays black.
for mat in bpy.data.materials:
    if 'hair' in mat.name.lower() and mat.use_nodes:
        bsdf = mat.node_tree.nodes.get('Principled BSDF')
        if bsdf:
            bsdf.inputs['Roughness'].default_value = 0.8
            if 'Specular IOR Level' in bsdf.inputs:
                bsdf.inputs['Specular IOR Level'].default_value = 0.15
            if 'Coat Weight' in bsdf.inputs:
                bsdf.inputs['Coat Weight'].default_value = 0.0

root = bpy.data.objects.new('plan_e_root', None)
scene.collection.objects.link(root)
arm.parent = root
arm.matrix_parent_inverse = Matrix.Identity(4)
ARM_BASIS = arm.matrix_basis.copy()
ARM_BASIS_INV = ARM_BASIS.inverted()

# ----------------------------------------------------------------------------
# Secondary-motion chains. The GLB skins the whole cape to `chest` and the long
# hair to `head`, so they cannot sway. Add bone chains along their centerlines
# and move those vertices onto the chains (the GLB file itself is unchanged).

body_mesh = next(o for o in bpy.data.objects if o.type == 'MESH' and o.parent == arm)
_mats = [m.name for m in body_mesh.data.materials]
_vert_mats = {}
for poly in body_mesh.data.polygons:
    for v in poly.vertices:
        _vert_mats.setdefault(v, set()).add(_mats[poly.material_index])
_world = body_mesh.matrix_world


def _verts(materials, test=lambda co: True):
    out = []
    for v in body_mesh.data.vertices:
        co = _world @ v.co
        if _vert_mats.get(v.index, set()) & materials and test(co):
            out.append((v.index, co))
    return out


def _centerline(verts, zs, x_pick=lambda xs: sum(xs) / len(xs)):
    knots = []
    for z in zs:
        xs = [co.x for _, co in verts if abs(co.z - z) < 0.06]
        knots.append(Vector((x_pick(xs) if xs else 0.0, 0.0, z)))
    return knots


CAPE_MATS = {'black cape', 'burgundy cape lining'}
HAIR_MATS = {'hair cards coverage atlas'}
CAPE_TOP, CAPE_BOTTOM = 1.47, 0.15
HAIR_TOP, HAIR_BOTTOM = 1.64, 1.24
# The cape's gold edge trim shares 'muted gold' with the armor; take only the
# trim strands that sit behind the back, below the shoulders.
cape_verts = _verts(CAPE_MATS) + _verts({'muted gold'}, lambda co: co.x < -0.12 and co.z < CAPE_TOP)
hair_verts = _verts(HAIR_MATS, lambda co: co.z < HAIR_TOP + 0.02 and co.x < -0.03)
CHAINS = {
    'cape': dict(parent='chest', bones=['cape_0', 'cape_1', 'cape_2'],
                 knots=_centerline(cape_verts, [CAPE_TOP, 1.03, 0.59, CAPE_BOTTOM]),
                 verts=cape_verts, top=CAPE_TOP, bottom=CAPE_BOTTOM, split=[0.05, 0.36, 0.69],
                 stiffness=30.0, damping=4.0, forward_slack=0.015),
    'hair': dict(parent='head', bones=['hair_0', 'hair_1'],
                 knots=_centerline(hair_verts, [HAIR_TOP, 1.44, HAIR_BOTTOM]),
                 verts=hair_verts, top=HAIR_TOP, bottom=HAIR_BOTTOM, split=[0.08, 0.52],
                 stiffness=45.0, damping=5.0, forward_slack=0.01),
}

bpy.context.view_layer.objects.active = arm
bpy.ops.object.mode_set(mode='EDIT')
for chain in CHAINS.values():
    parent = arm.data.edit_bones[chain['parent']]
    for name, head, tail in zip(chain['bones'], chain['knots'], chain['knots'][1:]):
        bone = arm.data.edit_bones.new(name)
        bone.head, bone.tail = ARM_BASIS_INV @ head, ARM_BASIS_INV @ tail
        bone.parent = parent
        parent = bone
bpy.ops.object.mode_set(mode='OBJECT')


def _chain_weights(s, split, owners, blend=0.06):
    for j, k in enumerate(split):
        if abs(s - k) < blend:
            t = (s - k + blend) / (2 * blend)
            return {owners[j]: 1 - t, owners[j + 1]: t}
    return {owners[sum(1 for k in split if s >= k)]: 1.0}


for chain in CHAINS.values():
    owners = [chain['parent'], *chain['bones']]
    groups = {name: body_mesh.vertex_groups.get(name) or body_mesh.vertex_groups.new(name=name) for name in owners}
    ids = [i for i, _ in chain['verts']]
    groups[chain['parent']].remove(ids)
    for i, co in chain['verts']:
        s = max(0.0, min(1.0, (chain['top'] - co.z) / (chain['top'] - chain['bottom'])))
        for name, w in _chain_weights(s, chain['split'], owners).items():
            groups[name].add([i], w, 'REPLACE')

REST = {b.name: (ARM_BASIS @ b.head_local).copy() for b in arm.data.bones}
REST_TAIL = {b.name: (ARM_BASIS @ b.tail_local).copy() for b in arm.data.bones}


def joint(name):
    """Current posed joint position in root space."""
    return ARM_BASIS @ arm.pose.bones[name].head


def set_abs(name, rot, head=None):
    """Give a bone an absolute root-space rotation relative to its rest pose."""
    pb = arm.pose.bones[name]
    rest = pb.bone.matrix_local
    basis_rot = ARM_BASIS.to_quaternion()
    arm_rot = basis_rot.inverted() @ rot @ basis_rot
    h = pb.head.copy() if head is None else ARM_BASIS_INV @ head
    pb.matrix = Matrix.Translation(h) @ arm_rot.to_matrix().to_4x4() @ rest.to_3x3().to_4x4()
    bpy.context.view_layer.update()


def rest_dir(a, b):
    return (REST[b] - REST[a])


def aim(a, b, target_vec):
    return rest_dir(a, b).normalized().rotation_difference(target_vec.normalized())


def two_bone(start, target, l1, l2, pole):
    d = target - start
    dist = max(1e-4, min(d.length, (l1 + l2) * 0.995))
    dn = d.normalized()
    a = (l1 * l1 + dist * dist - l2 * l2) / (2 * dist)
    h = math.sqrt(max(l1 * l1 - a * a, 0.0))
    side = pole - dn * pole.dot(dn)
    side = side.normalized() if side.length > 1e-6 else Vector((0, 0, -1))
    return start + dn * a + side * h, start + dn * dist


def pose_arm(side, wrist_target, hand_dir, pole):
    s, e, w, h = f'{side}_shoulder', f'{side}_elbow', f'{side}_wrist', f'{side}_hand'
    l1, l2 = rest_dir(s, e).length, rest_dir(e, w).length
    elbow, wrist = two_bone(joint(s), wrist_target, l1, l2, pole)
    set_abs(s, aim(s, e, elbow - joint(s)))
    set_abs(e, aim(e, w, wrist - joint(e)))
    q = aim(w, h, hand_dir)
    set_abs(w, q)
    set_abs(h, q)


def pose_leg(side, ankle_target):
    hip, knee, ankle, toe = f'{side}_hip', f'{side}_knee', f'{side}_ankle', f'{side}_toe'
    l1, l2 = rest_dir(hip, knee).length, rest_dir(knee, ankle).length
    k, a = two_bone(joint(hip), ankle_target, l1, l2, Vector((1, 0, 0.15)))
    set_abs(hip, aim(hip, knee, k - joint(hip)))
    set_abs(knee, aim(knee, ankle, a - joint(knee)))
    set_abs(ankle, Quaternion())
    set_abs(toe, Quaternion())


def rot_ypz(yaw=0.0, pitch=0.0, roll=0.0):
    """Degrees. yaw about Z, pitch about Y (positive = muzzle down), roll about X."""
    return (Euler((0, 0, math.radians(yaw))).to_quaternion()
            @ Euler((0, math.radians(pitch), 0)).to_quaternion()
            @ Euler((math.radians(roll), 0, 0)).to_quaternion())


def deform_matrix(name):
    """Root-space matrix that moves a bone's rest geometry to its current pose."""
    pb = arm.pose.bones[name]
    return ARM_BASIS @ pb.matrix @ pb.bone.matrix_local.inverted() @ ARM_BASIS_INV


class ChainSim:
    """Spring chain that follows its rest shape hung from the parent, with lag.

    Targets keep the rest offsets in a frame that turns with the parent's yaw
    only, so the chain hangs with gravity instead of tilting rigidly with the
    torso; inertia and damping give the delay and sway.
    """

    def __init__(self, cfg):
        self.cfg = cfg
        self.rest = [REST[b] for b in cfg['bones']] + [REST_TAIL[cfg['bones'][-1]]]
        self.lengths = [(b - a).length for a, b in zip(self.rest, self.rest[1:])]
        self.p = None

    def frame(self):
        m = deform_matrix(self.cfg['parent'])
        root = m @ self.rest[0]
        forward = m.to_3x3() @ Vector((1, 0, 0))
        yaw = Euler((0, 0, math.atan2(forward.y, forward.x))).to_quaternion()
        return root, yaw

    def targets(self):
        root, yaw = self.frame()
        return [root + yaw @ (r - self.rest[0]) for r in self.rest], root, yaw

    def step(self, dt, substeps=8):
        targets, root, yaw = self.targets()
        if self.p is None:
            self.p = [t.copy() for t in targets]
            self.v = [Vector() for _ in targets]
        self.yaw = yaw
        k, c, h = self.cfg['stiffness'], self.cfg['damping'], dt / substeps
        inv = yaw.inverted()
        for _ in range(substeps):
            prev = [p.copy() for p in self.p]
            self.p[0] = targets[0].copy()
            for i in range(1, len(self.p)):
                self.v[i] += (k * (targets[i] - self.p[i]) - c * self.v[i]) * h
                self.p[i] += self.v[i] * h
            for i in range(1, len(self.p)):
                d = self.p[i] - self.p[i - 1]
                self.p[i] = self.p[i - 1] + d.normalized() * self.lengths[i - 1]
                # Stay behind the body: no knot moves forward of its rest offset.
                local = inv @ (self.p[i] - root)
                limit = (self.rest[i] - self.rest[0]).x + self.cfg['forward_slack']
                if local.x > limit:
                    local.x = limit
                    self.p[i] = root + yaw @ local
            for i in range(1, len(self.p)):
                self.v[i] = (self.p[i] - prev[i]) / h

    def settle(self, steps=40, dt=1 / 30):
        self.p = None
        for _ in range(steps):
            self.step(dt)
        self.apply()

    def apply(self):
        for i, name in enumerate(self.cfg['bones']):
            # Turn the sheet with the body's yaw first, then swing it to the simulated knot.
            turned = self.yaw @ (self.rest[i + 1] - self.rest[i])
            swing = turned.normalized().rotation_difference((self.p[i + 1] - self.p[i]).normalized())
            set_abs(name, swing @ self.yaw)


SIMS = {name: ChainSim(cfg) for name, cfg in CHAINS.items()}


def reset_chains():
    for sim in SIMS.values():
        sim.p = None


def advance_chains(dt):
    for sim in SIMS.values():
        sim.step(dt)
        sim.apply()


def settle_chains():
    for sim in SIMS.values():
        sim.settle()

# ----------------------------------------------------------------------------
# M16 built from boxes (gun frame: +X muzzle, +Z top, origin above the grip)


def material(name, rgb, rough=0.55, metal=0.4):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    bsdf = m.node_tree.nodes['Principled BSDF']
    bsdf.inputs['Base Color'].default_value = (*rgb, 1)
    bsdf.inputs['Roughness'].default_value = rough
    bsdf.inputs['Metallic'].default_value = metal
    return m


# Low metallic keeps the rifle near-black instead of mirroring the gray sky.
GUN_MAT = material('plan_e_m16_black', (0.028, 0.029, 0.032), rough=0.6, metal=0.2)
GUN_EDGE = material('plan_e_m16_edge', (0.10, 0.104, 0.112), rough=0.45, metal=0.45)


def shape_object(name, parts):
    """parts: ('box', center, size, rot_deg, mat) | ('cyl', x0, x1, r0, r1, (y, z), mat)
    | ('hexa', eight corner points, mat). Built in the gun frame."""
    import bmesh
    mesh = bpy.data.meshes.new(name)
    bm = bmesh.new()
    for part in parts:
        kind = part[0]
        if kind == 'box':
            _, center, size, rot, mat_index = part
            verts = bmesh.ops.create_cube(bm, size=1.0)['verts']
            m = (Matrix.Translation(Vector(center))
                 @ Euler([math.radians(v) for v in rot]).to_matrix().to_4x4()
                 @ Matrix.Diagonal((*size, 1)))
        elif kind == 'cyl':
            _, x0, x1, r0, r1, (y, z), mat_index = part
            verts = bmesh.ops.create_cone(bm, cap_ends=True, segments=14, radius1=r0, radius2=r1,
                                          depth=x1 - x0)['verts']
            m = (Matrix.Translation(Vector(((x0 + x1) / 2, y, z)))
                 @ Euler((0, math.radians(90), 0)).to_matrix().to_4x4())
        else:
            _, corners, mat_index = part
            verts = [bm.verts.new(c) for c in corners]
            for face in ((0, 1, 2, 3), (4, 7, 6, 5), (0, 4, 5, 1), (1, 5, 6, 2), (2, 6, 7, 3), (3, 7, 4, 0)):
                bm.faces.new([verts[i] for i in face])
            m = Matrix.Identity(4)
        bmesh.ops.transform(bm, matrix=m, verts=verts)
        for f in {f for v in verts for f in v.link_faces}:
            f.material_index = mat_index
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(mesh)
    bm.free()
    mesh.materials.append(GUN_MAT)
    mesh.materials.append(GUN_EDGE)
    obj = bpy.data.objects.new(name, mesh)
    scene.collection.objects.link(obj)
    obj.parent = root
    return obj


def hexa(x0, x1, y_half, z0_bottom, z0_top, z1_bottom, z1_top, y1_half=None):
    """A side-profile slab from x0 to x1 whose top and bottom edges may slope."""
    y1 = y_half if y1_half is None else y1_half
    return [(x0, -y_half, z0_bottom), (x1, -y1, z1_bottom), (x1, y1, z1_bottom), (x0, y_half, z0_bottom),
            (x0, -y_half, z0_top), (x1, -y1, z1_top), (x1, y1, z1_top), (x0, y_half, z0_top)]


# M16A1 proportions (meters): 0.99 m overall, 20-inch barrel, fixed A1 stock,
# triangular handguard, carry handle with rear sight, A-frame front sight.
gun = shape_object('plan_e_m16', [
    ('hexa', hexa(-0.10, 0.20, 0.024, 0.0, 0.07, 0.0, 0.07), 0),             # upper receiver
    ('hexa', hexa(-0.06, 0.16, 0.022, -0.035, 0.0, -0.035, 0.0), 0),         # lower receiver
    ('box', (0.075, 0, 0.115), (0.13, 0.016, 0.014), (0, 0, 0), 0),          # carry handle bar
    ('box', (0.015, 0, 0.088), (0.03, 0.02, 0.04), (0, 0, 0), 0),            # rear handle post
    ('box', (0.135, 0, 0.088), (0.018, 0.02, 0.04), (0, 0, 0), 0),           # front handle post
    ('box', (0.012, 0, 0.128), (0.012, 0.012, 0.016), (0, 0, 0), 1),         # rear sight aperture
    ('cyl', 0.195, 0.205, 0.041, 0.041, (0, 0.035), 1),                      # delta ring
    ('cyl', 0.205, 0.46, 0.036, 0.031, (0, 0.035), 0),                       # handguard
    ('cyl', 0.455, 0.47, 0.022, 0.022, (0, 0.035), 1),                       # handguard cap
    ('cyl', 0.47, 0.68, 0.0095, 0.0085, (0, 0.035), 1),                      # barrel
    ('hexa', hexa(0.475, 0.50, 0.01, 0.025, 0.05, 0.025, 0.13), 0),          # front sight base (sloped)
    ('box', (0.497, 0, 0.142), (0.006, 0.006, 0.026), (0, 0, 0), 1),         # front sight post
    ('cyl', 0.68, 0.735, 0.012, 0.011, (0, 0.035), 1),                       # flash hider
    ('hexa', hexa(-0.355, -0.10, 0.022, -0.075, 0.055, -0.01, 0.06, 0.02), 0),  # A1 stock
    ('box', (-0.36, 0, -0.01), (0.012, 0.024, 0.132), (0, 0, 0), 1),         # butt plate
    ('hexa', hexa(-0.03, 0.02, 0.015, -0.12, -0.035, -0.115, -0.035), 0),    # pistol grip (raked)
    ('box', (0.045, 0, -0.048), (0.07, 0.01, 0.006), (0, 0, 0), 1),          # trigger guard
    ('box', (0.04, 0, -0.04), (0.006, 0.006, 0.02), (0, 0, 0), 1),           # trigger
    ('hexa', hexa(0.085, 0.16, 0.026, -0.05, 0.0, -0.05, 0.0), 0),           # magazine well
    ('box', (-0.06, -0.014, 0.05), (0.03, 0.006, 0.012), (0, 0, 0), 1),      # charging handle side
])
gun.name = 'plan_e_m16'

MAG_WELL = Vector((0.122, 0, -0.04))          # magazine top in gun frame
MAG_HOLD = Vector((0.0, 0.045, 0.13))         # magazine top relative to the support wrist (mag frame)


def make_mag(name):
    # 30-round curved magazine: three slabs bending forward toward the bottom.
    return shape_object(name, [
        ('hexa', hexa(-0.032, 0.032, 0.012, -0.08, 0.0, -0.08, 0.0), 0),
        ('hexa', [(-0.026, -0.012, -0.16), (0.04, -0.012, -0.152), (0.04, 0.012, -0.152), (-0.026, 0.012, -0.16),
                  (-0.032, -0.012, -0.08), (0.032, -0.012, -0.08), (0.032, 0.012, -0.08), (-0.032, 0.012, -0.08)], 0),
        ('hexa', [(-0.018, -0.014, -0.172), (0.05, -0.014, -0.162), (0.05, 0.014, -0.162), (-0.018, 0.014, -0.172),
                  (-0.026, -0.014, -0.158), (0.04, -0.014, -0.15), (0.04, 0.014, -0.15), (-0.026, 0.014, -0.158)], 1),
    ])


mag_old = make_mag('plan_e_mag_old')
mag_new = make_mag('plan_e_mag_new')

# ----------------------------------------------------------------------------
# Pose model


def smooth(t):
    t = max(0.0, min(1.0, t))
    return t * t * (3 - 2 * t)


def lerp(a, b, t):
    return a + (b - a) * t


def pose_body(lean, twist, head_pitch, pelvis_drop):
    """lean: forward degrees spread on the spine; twist: chest yaw toward camera."""
    twist *= args.twist
    pelvis_head = REST['pelvis'] + Vector((0, 0, -pelvis_drop))
    set_abs('pelvis', rot_ypz(yaw=twist * 0.25, pitch=lean * 0.2), head=pelvis_head)
    set_abs('waist', rot_ypz(yaw=twist * 0.55, pitch=lean * 0.55))
    set_abs('chest', rot_ypz(yaw=twist, pitch=lean))
    set_abs('neck', rot_ypz(yaw=twist * 0.4, pitch=lean * 0.5 + head_pitch * 0.4))
    set_abs('head', rot_ypz(yaw=0, pitch=head_pitch))
    # Offsets from the rest ankles; with the Plan D rig stance=1 gives the original
    # targets (0.17, 0.14) and (-0.13, -0.15).
    pose_leg(SUPPORT, REST[f'{SUPPORT}_ankle'] + Vector((0.185, 0.01, 0.0)) * args.stance)
    pose_leg(TRIGGER, REST[f'{TRIGGER}_ankle'] + Vector((-0.115, -0.02, 0.0)) * args.stance)


def aim_gun_matrix():
    """Gun shouldered: butt in the trigger-side shoulder pocket, barrel level."""
    pocket = joint(f'{TRIGGER}_shoulder') + Vector((0.075, 0.07, -0.02))
    rot = rot_ypz()
    origin = pocket + rot @ Vector((0.335, 0, 0))
    return origin, rot


# Key poses. gun: 'aim' or (origin, yaw, pitch, roll). support: (space, point, hand_dir_in_space)
AIM_BODY = dict(lean=9.0, twist=-28.0, head_pitch=17.0, pelvis_drop=0.035)
RELOAD_BODY = dict(lean=13.0, twist=-22.0, head_pitch=30.0, pelvis_drop=0.05)
# Origin relative to the rest chest joint (Plan D chest = (0, 0, 1.34) -> (0.25, -0.07, 1.25)).
RELOAD_GUN = ((0.25, -0.07, -0.09), 6.0, -22.0, 32.0)
HANDGUARD = ('gun', Vector((0.31, 0.05, -0.03)), Vector((0.25, 0.15, 1.0)))
MAG_GRIP = ('gun', MAG_WELL + Vector((0.0, -0.045, -0.13)), Vector((0.15, 0.2, 1.0)))
MAG_OUT = ('gun', MAG_WELL + Vector((-0.02, -0.06, -0.34)), Vector((0.15, 0.2, 1.0)))
POUCH = ('world', Vector((0.12, 0.10, 0.98)), Vector((0.2, 0.0, 1.0)))
NEW_BELOW = ('gun', MAG_WELL + Vector((0.0, -0.05, -0.30)), Vector((0.15, 0.2, 1.0)))
SEATED = MAG_GRIP
SEAT_PUSH = ('gun', MAG_WELL + Vector((0.0, -0.045, -0.105)), Vector((0.15, 0.2, 1.0)))
BOLT_CATCH = ('gun', Vector((0.075, 0.05, 0.03)), Vector((0.0, -0.3, 1.0)))

# (frame, body, gun, support, label)
KEYS = [
    (0, AIM_BODY, 'aim', HANDGUARD, '조준'),
    (4, AIM_BODY, 'aim', HANDGUARD, ''),
    (10, RELOAD_BODY, RELOAD_GUN, HANDGUARD, '장전 자세'),
    (14, RELOAD_BODY, RELOAD_GUN, MAG_GRIP, '탄창 잡기'),
    (18, RELOAD_BODY, RELOAD_GUN, MAG_OUT, '탄창 분리'),
    (23, RELOAD_BODY, RELOAD_GUN, POUCH, '새 탄창'),
    (25, RELOAD_BODY, RELOAD_GUN, POUCH, ''),
    (30, RELOAD_BODY, RELOAD_GUN, NEW_BELOW, ''),
    (33, RELOAD_BODY, RELOAD_GUN, SEATED, '삽입'),
    (35, RELOAD_BODY, RELOAD_GUN, SEAT_PUSH, '밀어 넣기'),
    (39, RELOAD_BODY, RELOAD_GUN, BOLT_CATCH, '노리쇠 멈치'),
    (41, RELOAD_BODY, RELOAD_GUN, BOLT_CATCH, ''),
    (47, AIM_BODY, 'aim', HANDGUARD, ''),
    (53, AIM_BODY, 'aim', HANDGUARD, '조준 복귀'),
]
RELOAD_FRAMES = KEYS[-1][0] + 1
RELOAD_FPS = 15
MAG_GRAB, MAG_RELEASE = 14, 18      # old magazine follows the hand between these
NEW_GRAB, NEW_SEAT = 23, 33         # new magazine follows the hand between these


def key_span(f):
    for (fa, *a), (fb, *b) in zip(KEYS, KEYS[1:]):
        if fa <= f <= fb:
            return (fa, a), (fb, b), smooth((f - fa) / max(1, fb - fa))
    return (KEYS[-1][0], KEYS[-1][1:]), (KEYS[-1][0], KEYS[-1][1:]), 0.0


def gun_pose(spec):
    if spec == 'aim':
        return aim_gun_matrix()
    origin, yaw, pitch, roll = spec
    origin = REST['chest'] + Vector(origin)
    return origin, rot_ypz(yaw, pitch, roll)


def resolve(target, g_origin, g_rot):
    space, point, hand = target
    if space == 'gun':
        return g_origin + g_rot @ point, g_rot @ hand
    return point.copy(), hand.copy()


def matrix(origin, rot):
    return Matrix.Translation(origin) @ rot.to_matrix().to_4x4()


def pose_reload_frame(f, falling):
    (fa, a), (fb, b), t = key_span(f)
    body = {k: lerp(a[0][k], b[0][k], t) for k in a[0]}
    pose_body(**body)
    oa, ra = gun_pose(a[1])
    ob, rb = gun_pose(b[1])
    g_origin, g_rot = oa.lerp(ob, t), ra.slerp(rb, t)
    gun.matrix_basis = matrix(g_origin, g_rot)

    wa, ha = resolve(a[2], g_origin, g_rot)
    wb, hb = resolve(b[2], g_origin, g_rot)
    support_wrist, support_dir = wa.lerp(wb, t), ha.lerp(hb, t)

    trigger_wrist = g_origin + g_rot @ Vector((-0.045, -0.035, -0.075))
    pose_arm(TRIGGER, trigger_wrist, g_rot @ Vector((0.55, 0.15, 0.8)), Vector((-0.3, -0.9, -0.8)))
    pose_arm(SUPPORT, support_wrist, support_dir, Vector((0.1, 0.6, -1.0)))

    wrist = joint(f'{SUPPORT}_wrist')
    held = matrix(wrist, g_rot) @ Matrix.Translation(MAG_HOLD)
    seated = matrix(g_origin, g_rot) @ Matrix.Translation(MAG_WELL)

    # Old magazine: seated -> in hand -> falls out of the sprite (the game spawns debris).
    mag_old.hide_render = False
    if f < MAG_GRAB:
        mag_old.matrix_basis = seated
    elif f <= MAG_RELEASE:
        mag_old.matrix_basis = held
        falling['m'] = held.copy()
        falling['v'] = Vector((0.15, 0.0, -0.6))
    else:
        dt = 1.0 / RELOAD_FPS
        falling['v'].z -= 9.8 * dt
        m = falling['m']
        loc = m.translation + falling['v'] * dt
        rot = m.to_quaternion() @ Euler((0, math.radians(14), 0)).to_quaternion()
        falling['m'] = matrix(loc, rot)
        mag_old.matrix_basis = falling['m']
        mag_old.hide_render = loc.z < 0.12

    # New magazine: hidden in the pouch -> in hand -> seated.
    mag_new.hide_render = f < NEW_GRAB
    if f >= NEW_SEAT:
        mag_new.matrix_basis = seated
    else:
        mag_new.matrix_basis = held
    if f == 0:
        settle_chains()
    else:
        advance_chains(1.0 / RELOAD_FPS)
    return next((k[4] for k in KEYS if k[0] == f), '')


def pose_ready():
    pose_body(**AIM_BODY)
    g_origin, g_rot = aim_gun_matrix()
    gun.matrix_basis = matrix(g_origin, g_rot)
    trigger_wrist = g_origin + g_rot @ Vector((-0.045, -0.035, -0.075))
    pose_arm(TRIGGER, trigger_wrist, g_rot @ Vector((0.55, 0.15, 0.8)), Vector((-0.3, -0.9, -0.8)))
    w, h = resolve(HANDGUARD, g_origin, g_rot)
    pose_arm(SUPPORT, w, h, Vector((0.1, 0.6, -1.0)))
    mag_old.matrix_basis = matrix(g_origin, g_rot) @ Matrix.Translation(MAG_WELL)
    mag_old.hide_render = False
    mag_new.hide_render = True
    settle_chains()

# ----------------------------------------------------------------------------
# Camera, light, render settings

scene.render.engine = 'BLENDER_EEVEE'
scene.render.film_transparent = True
scene.render.image_settings.file_format = 'PNG'
scene.render.image_settings.color_mode = 'RGBA'
scene.view_settings.view_transform = 'Standard'
scene.view_settings.exposure = args.exposure
scene.render.filter_size = 0.5

world = bpy.data.worlds.new('plan_e_world')
scene.world = world
world.use_nodes = True
world.node_tree.nodes['Background'].inputs['Color'].default_value = (0.55, 0.58, 0.66, 1)
world.node_tree.nodes['Background'].inputs['Strength'].default_value = 0.9


def sun(name, energy, rot, color=(1, 1, 1)):
    light = bpy.data.lights.new(name, 'SUN')
    light.energy = energy
    light.color = color
    obj = bpy.data.objects.new(name, light)
    obj.rotation_euler = [math.radians(v) for v in rot]
    scene.collection.objects.link(obj)


sun('key', 4.5, (55, 0, -35))                       # from upper front, camera side
sun('rim', 3.5, (60, 0, 150), (0.75, 0.85, 1.0))    # cool back rim
sun('fill', 1.2, (100, 0, 20), (1.0, 0.92, 0.85))

cam_data = bpy.data.cameras.new('plan_e_cam')
cam_data.type = 'ORTHO'
cam = bpy.data.objects.new('plan_e_cam', cam_data)
scene.collection.objects.link(cam)
scene.camera = cam


def frame_camera(x0, x1, z0, z1):
    """Fit an orthographic camera (looking +Y, pitched down) to a world box."""
    p = math.radians(args.pitch)
    width_m, height_m = x1 - x0, (z1 - z0)
    w = int(round(width_m * args.ppm))
    h = int(round(height_m * args.ppm))
    s = args.supersample
    scene.render.resolution_x, scene.render.resolution_y = w * s, h * s
    cam_data.ortho_scale = max(width_m, height_m)
    cx, cz = (x0 + x1) / 2, (z0 + z1) / 2
    cam.rotation_euler = (math.radians(90) - p, 0, 0)
    cam.location = (cx, -10 * math.cos(p), cz + 10 * math.sin(p))
    return w, h

# ----------------------------------------------------------------------------
# Pixel conversion


def render_rgba():
    path = os.path.join(OUT, '_tmp_render.png')
    scene.render.filepath = path
    bpy.ops.render.render(write_still=True)
    img = bpy.data.images.load(path)
    w, h = img.size
    px = np.array(img.pixels[:], dtype=np.float32).reshape(h, w, 4)[::-1]
    bpy.data.images.remove(img)
    os.remove(path)
    return px


def downsample(px, s):
    h, w = px.shape[0] // s, px.shape[1] // s
    blocks = px[:h * s, :w * s].reshape(h, s, w, s, 4)
    alpha = blocks[..., 3]
    a = alpha.mean(axis=(1, 3))
    rgb = (blocks[..., :3] * alpha[..., None]).sum(axis=(1, 3)) / np.maximum(alpha.sum(axis=(1, 3)), 1e-6)[..., None]
    return rgb, a


def kmeans(samples, k, iters=24):
    rng = np.random.default_rng(7)
    centers = samples[rng.choice(len(samples), size=k, replace=False)]
    for _ in range(iters):
        d = ((samples[:, None, :] - centers[None]) ** 2).sum(-1)
        lab = d.argmin(1)
        for i in range(k):
            sel = samples[lab == i]
            if len(sel):
                centers[i] = sel.mean(0)
    return centers


def quantize(rgb, a, palette, outline):
    h, w, _ = rgb.shape
    mask = a >= 0.5
    out = np.zeros((h, w, 4), dtype=np.uint8)
    flat = rgb[mask]
    if len(flat):
        idx = ((flat[:, None, :] - palette[None]) ** 2).sum(-1).argmin(1)
        out[mask, :3] = np.clip(palette[idx] * 255 + 0.5, 0, 255).astype(np.uint8)
        out[mask, 3] = 255
    if outline is not None:
        grown = np.zeros_like(mask)
        grown[1:] |= mask[:-1]; grown[:-1] |= mask[1:]
        grown[:, 1:] |= mask[:, :-1]; grown[:, :-1] |= mask[:, 1:]
        edge = grown & ~mask
        out[edge, :3] = outline
        out[edge, 3] = 255
    return out


def save_png(arr, path):
    h, w, _ = arr.shape
    img = bpy.data.images.new(os.path.basename(path), w, h, alpha=True)
    img.pixels = (arr[::-1].astype(np.float32) / 255).ravel()
    img.filepath_raw = path
    img.file_format = 'PNG'
    img.save()
    bpy.data.images.remove(img)

# ----------------------------------------------------------------------------
# Clips


def to_linear_safe(rgb):
    return np.clip(rgb, 0, 1)


def collect_reload():
    w, h = frame_camera(-0.75, 1.39, -0.04, 2.10)
    frames, falling = [], {}
    for f in range(RELOAD_FRAMES):
        label = pose_reload_frame(f, falling)
        bpy.context.view_layer.update()
        frames.append((render_rgba(), label))
    return dict(id='reload', title='장전', fps=RELOAD_FPS, loop=False, w=w, h=h, frames=frames)


TURN_YAWS = [0, 45, 90, 135, 180, 225, 270, 315]
TURN_LABELS = ['측면 · 오른쪽', '3/4 · 정면 쪽', '정면', '3/4 · 정면 왼쪽', '측면 · 왼쪽', '3/4 · 뒤 왼쪽', '후면', '3/4 · 뒤 오른쪽']


def collect_turnaround():
    w, h = frame_camera(-1.07, 1.07, -0.04, 2.10)
    pose_ready()
    frames = []
    for yaw, label in zip(TURN_YAWS, TURN_LABELS):
        root.rotation_euler = (0, 0, math.radians(-yaw))
        bpy.context.view_layer.update()
        frames.append((render_rgba(), label))
    root.rotation_euler = (0, 0, 0)
    return dict(id='turnaround', title='같은 자세 8방향', fps=4, loop=True, w=w, h=h, frames=frames)


def sha256(path):
    digest = hashlib.sha256()
    with open(path, 'rb') as fh:
        for chunk in iter(lambda: fh.read(1 << 20), b''):
            digest.update(chunk)
    return digest.hexdigest()


def main():
    os.makedirs(OUT, exist_ok=True)
    wanted = [c.strip() for c in args.clips.split(',') if c.strip()]
    builders = {'reload': collect_reload, 'turnaround': collect_turnaround}
    clips = [builders[c]() for c in wanted]

    # One palette for every clip, so the character keeps the same colors.
    s = args.supersample
    reduced = []
    for clip in clips:
        clip['reduced'] = [downsample(px, s) for px, _ in clip['frames']]
        for rgb, a in clip['reduced']:
            reduced.append(rgb[a >= 0.5])
    samples = np.concatenate(reduced)
    rng = np.random.default_rng(11)
    if len(samples) > 60000:
        samples = samples[rng.choice(len(samples), 60000, replace=False)]
    palette = kmeans(to_linear_safe(samples).astype(np.float64), args.colors)
    palette = palette[np.argsort(palette.sum(1))]
    outline = np.array([10, 10, 14], dtype=np.uint8)

    index = []
    for clip in clips:
        clip_dir = os.path.join(OUT, 'output', clip['id'])
        frame_dir = os.path.join(clip_dir, 'frames')
        os.makedirs(frame_dir, exist_ok=True)
        pixel_frames = [quantize(rgb, a, palette, outline) for rgb, a in clip['reduced']]
        w, h = clip['w'], clip['h']
        for i, arr in enumerate(pixel_frames):
            save_png(arr, os.path.join(frame_dir, f'{i:02d}.png'))
        sheet = np.concatenate(pixel_frames, axis=1)
        save_png(sheet, os.path.join(clip_dir, 'spritesheet.png'))
        if args.raw:
            raw_dir = os.path.join(OUT, 'raw', clip['id'])
            os.makedirs(raw_dir, exist_ok=True)
            for i, (px, _) in enumerate(clip['frames']):
                save_png(np.clip(px * 255 + 0.5, 0, 255).astype(np.uint8), os.path.join(raw_dir, f'{i:02d}.png'))
        manifest = {
            'schema_version': 1,
            'plan': 'Plan E',
            'clip': clip['id'],
            'title': clip['title'],
            'frameCount': len(pixel_frames),
            'fps': clip['fps'],
            'loop': clip['loop'],
            'canvas': {'width': w, 'height': h},
            'pixelsPerMeter': args.ppm,
            'spritesheet': 'spritesheet.png',
            'frames': [{'label': label} for _, label in clip['frames']],
        }
        with open(os.path.join(clip_dir, 'manifest.json'), 'w', encoding='utf-8') as fh:
            json.dump(manifest, fh, ensure_ascii=False, indent=2)
        index.append({'id': clip['id'], 'title': clip['title'], 'path': f"output/{clip['id']}/manifest.json"})

    with open(os.path.join(OUT, 'output', 'clips.json'), 'w', encoding='utf-8') as fh:
        json.dump({'schema_version': 1, 'plan': 'Plan E', 'clips': index}, fh, ensure_ascii=False, indent=2)

    records = os.path.join(OUT, 'records')
    os.makedirs(records, exist_ok=True)
    recipe = {
        'tool': 'Blender headless + tools/plan_e/render_sprites.py',
        'blender_version': bpy.app.version_string,
        'source_glb': os.path.relpath(os.path.abspath(args.glb)),
        'source_glb_sha256': sha256(args.glb),
        'script_sha256': sha256(os.path.abspath(__file__)) if '__file__' in globals() else None,
        'params': vars(args),
        'palette_rgb': [[int(round(c * 255)) for c in p] for p in palette],
        'outline_rgb': outline.tolist(),
        'render_engine': scene.render.engine,
        'elapsed_seconds': round(time.time() - STARTED, 1),
        'clips': [{'id': c['id'], 'frames': len(c['frames']), 'canvas': [c['w'], c['h']]} for c in clips],
    }
    with open(os.path.join(records, 'recipe.json'), 'w', encoding='utf-8') as fh:
        json.dump(recipe, fh, ensure_ascii=False, indent=2)
    print('PLAN_E_DONE', json.dumps(recipe['clips']), recipe['elapsed_seconds'])


main()
