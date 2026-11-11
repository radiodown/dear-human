"""Export weapon models as GLB for the weapon 3D tab (and later for attaching to the character rigs).

Usage: blender -b --python tools/weapons/build_weapon_glb.py -- <out.glb>

M16A1 geometry is copied from tools/plan_e/render_sprites.py (sprite_007: real M16A1 dimensions, 0.99 m from the
butt plate at x=-0.345 to the muzzle at x=+0.645, four finishes, 1.6 mm edge bevels). Gun frame: +X muzzle, +Z top,
-Y = the rifle's left side. glTF turns +Z up into +Y up. Sockets are empty nodes named socket_* used to attach the
gun to a hand bone (grip), place the support hand (support), touch the shoulder (stock), spawn the muzzle flash
(muzzle) and seat the magazine (mag)."""
import sys, math
import bpy
from mathutils import Euler, Matrix, Vector
out = sys.argv[sys.argv.index('--') + 1]
bpy.ops.wm.read_factory_settings(use_empty=True)

def material(name, rgb, rough=0.55, metal=0.4):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    bsdf = m.node_tree.nodes['Principled BSDF']
    bsdf.inputs['Base Color'].default_value = (*rgb, 1)
    bsdf.inputs['Roughness'].default_value = rough
    bsdf.inputs['Metallic'].default_value = metal
    return m


# M16A1 in four finishes so the parts separate in value even at sprite size.
# Low metallic on the large parts keeps the rifle near-black instead of mirroring the sky.
GUN_MATS = [
    material('m16_receiver', (0.050, 0.052, 0.058), rough=0.45, metal=0.35),   # 0 anodized aluminium
    material('m16_polymer', (0.020, 0.020, 0.022), rough=0.75, metal=0.0),     # 1 stock, grip, handguard
    material('m16_steel', (0.07, 0.072, 0.078), rough=0.33, metal=0.5),        # 2 barrel, sights
    material('m16_bright', (0.36, 0.37, 0.39), rough=0.4, metal=0.3),          # 3 pins, levers, sight posts: 1 px glints
]
RECV, POLY, STEEL, BRIGHT = range(4)


def shape_object(name, parts):
    """parts: ('box', center, size, rot_deg, mat) | ('cyl', x0, x1, r0, r1, (y, z), mat)
    | ('cyl', x, width, r0, r1, (y, z), mat, 'y') for a cylinder across the gun
    | ('hexa', eight corner points, mat). Built in the gun frame (+X muzzle, +Z top)."""
    import bmesh
    mesh = bpy.data.meshes.new(name)
    bm = bmesh.new()
    smooth_faces = set()
    for part in parts:
        kind = part[0]
        if kind == 'box':
            _, center, size, rot, mat_index = part
            verts = bmesh.ops.create_cube(bm, size=1.0)['verts']
            m = (Matrix.Translation(Vector(center))
                 @ Euler([math.radians(v) for v in rot]).to_matrix().to_4x4()
                 @ Matrix.Diagonal((*size, 1)))
        elif kind == 'cyl':
            _, x0, x1, r0, r1, (y, z), mat_index, *axis = part
            across = bool(axis) and axis[0] == 'y'           # pins, drums: x1 is the width
            verts = bmesh.ops.create_cone(bm, cap_ends=True, segments=20, radius1=r0, radius2=r1,
                                          depth=x1 if across else x1 - x0)['verts']
            if across:
                m = (Matrix.Translation(Vector((x0, y, z)))
                     @ Euler((math.radians(90), 0, 0)).to_matrix().to_4x4())
            else:
                m = (Matrix.Translation(Vector(((x0 + x1) / 2, y, z)))
                     @ Euler((0, math.radians(90), 0)).to_matrix().to_4x4())
        else:
            _, corners, mat_index = part
            verts = [bm.verts.new(c) for c in corners]
            for face in ((0, 1, 2, 3), (4, 7, 6, 5), (0, 4, 5, 1), (1, 5, 6, 2), (2, 6, 7, 3), (3, 7, 4, 0)):
                bm.faces.new([verts[i] for i in face])
            m = Matrix.Identity(4)
        bmesh.ops.transform(bm, matrix=m, verts=verts)
        faces = {f for v in verts for f in v.link_faces}
        for f in faces:
            f.material_index = mat_index
        if kind == 'cyl':
            smooth_faces |= {f for f in faces if len(f.verts) == 4}
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    for f in smooth_faces:
        f.smooth = True
    bm.to_mesh(mesh)
    bm.free()
    for mat in GUN_MATS:
        mesh.materials.append(mat)
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.scene.collection.objects.link(obj)
    # Tiny bevels catch the key light along every edge: that edge light is what
    # separates the parts once the rifle is a few pixels tall.
    bev = obj.modifiers.new('edges', 'BEVEL')
    bev.width, bev.segments, bev.limit_method, bev.angle_limit = 0.0016, 2, 'ANGLE', math.radians(40)
    bev.harden_normals = True
    return obj


def hexa(x0, x1, y_half, z0_bottom, z0_top, z1_bottom, z1_top, y1_half=None):
    """A side-profile slab from x0 to x1 whose top and bottom edges may slope."""
    y1 = y_half if y1_half is None else y1_half
    return [(x0, -y_half, z0_bottom), (x1, -y1, z1_bottom), (x1, y1, z1_bottom), (x0, y_half, z0_bottom),
            (x0, -y_half, z0_top), (x1, -y1, z1_top), (x1, y1, z1_top), (x0, y_half, z0_top)]


def slanted(p0, p1, thick, half_y, mat):
    """A bar from p0 to p1 (x, z) in the side profile."""
    (x0, z0), (x1, z1) = p0, p1
    dx, dz = x1 - x0, z1 - z0
    n = math.hypot(dx, dz)
    ox, oz = -dz / n * thick / 2, dx / n * thick / 2
    return ('hexa', [(x0 - ox, -half_y, z0 - oz), (x1 - ox, -half_y, z1 - oz), (x1 - ox, half_y, z1 - oz), (x0 - ox, half_y, z0 - oz),
                     (x0 + ox, -half_y, z0 + oz), (x1 + ox, -half_y, z1 + oz), (x1 + ox, half_y, z1 + oz), (x0 + ox, half_y, z0 + oz)], mat)


# M16A1, measured from the real rifle: 0.99 m from butt plate (-0.345) to muzzle
# (+0.645), 0.33 m length of pull, 20-inch barrel. The -Y side (the rifle's left,
# with bolt catch, selector and pins) faces the sprite camera.
HANDGUARD_RIBS = [0.225 + 0.03 * k for k in range(7)]
gun = shape_object('m16a1_body', [
    # receivers
    ('hexa', hexa(-0.11, 0.19, 0.023, 0.0, 0.064, 0.0, 0.064), RECV),                 # upper receiver
    ('hexa', hexa(-0.075, 0.165, 0.021, -0.036, 0.0, -0.036, 0.0), RECV),             # lower receiver
    ('hexa', hexa(0.085, 0.165, 0.025, -0.064, -0.02, -0.06, -0.02, 0.023), RECV),    # flared magazine well
    ('box', (0.005, 0, 0.078), (0.026, 0.02, 0.028), (0, 0, 0), RECV),                # carry handle rear post
    ('box', (0.14, 0, 0.078), (0.018, 0.02, 0.028), (0, 0, 0), RECV),                 # carry handle front post
    ('box', (0.073, 0, 0.1), (0.15, 0.018, 0.013), (0, 0, 0), RECV),                  # carry handle bar (open below)
    ('box', (0.006, 0, 0.116), (0.02, 0.014, 0.022), (0, 0, 0), RECV),                # rear sight housing
    ('cyl', 0.006, 0.008, 0.011, 0.011, (-0.016, 0.1), BRIGHT, 'y'),                  # windage drum (left side)
    ('box', (0.004, 0, 0.13), (0.008, 0.008, 0.012), (0, 0, 0), STEEL),               # rear aperture
    ('box', (-0.103, 0, 0.066), (0.016, 0.034, 0.008), (0, 0, 0), BRIGHT),            # charging handle T
    ('box', (0.097, -0.024, -0.008), (0.022, 0.004, 0.01), (0, 0, 0), BRIGHT),        # bolt catch
    ('box', (-0.03, -0.022, -0.006), (0.016, 0.004, 0.006), (0, 25, 0), BRIGHT),      # selector lever
    ('cyl', -0.064, 0.004, 0.0045, 0.0045, (-0.022, -0.012), BRIGHT, 'y'),           # takedown pin
    ('cyl', 0.152, 0.004, 0.0045, 0.0045, (-0.022, -0.008), BRIGHT, 'y'),             # pivot pin
    ('box', (0.13, -0.02, 0.03), (0.06, 0.004, 0.022), (0, 0, 0), STEEL),             # ejection port cover line
    # fire control
    ('box', (0.043, 0, -0.058), (0.066, 0.012, 0.006), (0, 0, 0), RECV),              # trigger guard bottom
    ('box', (0.076, 0, -0.047), (0.007, 0.012, 0.024), (0, 0, 0), RECV),              # trigger guard front post
    slanted((0.03, -0.012), (0.036, -0.044), 0.006, 0.004, STEEL),                    # trigger
    ('hexa', [(-0.064, -0.015, -0.125), (-0.018, -0.015, -0.118), (-0.018, 0.015, -0.118), (-0.064, 0.015, -0.125),
              (-0.034, -0.015, -0.036), (0.012, -0.015, -0.036), (0.012, 0.015, -0.036), (-0.034, 0.015, -0.036)], POLY),  # pistol grip
    # stock (A1 fixed), butt plate, rear sling swivel
    ('hexa', hexa(-0.345, -0.11, 0.022, -0.083, 0.046, -0.018, 0.058, 0.02), POLY),
    ('box', (-0.348, 0, -0.018), (0.008, 0.024, 0.132), (0, 0, 0), STEEL),            # butt plate
    ('box', (-0.29, 0, -0.088), (0.03, 0.006, 0.004), (0, -8, 0), STEEL),              # sling swivel
    # barrel group
    ('cyl', 0.19, 0.206, 0.041, 0.041, (0, 0.034), RECV),                             # delta ring
    ('cyl', 0.206, 0.44, 0.034, 0.03, (0, 0.034), POLY),                              # handguard
    *[('cyl', x, x + 0.011, 0.0365 - 0.016 * (x - 0.206), 0.0365 - 0.016 * (x - 0.195), (0, 0.034), RECV)
      for x in HANDGUARD_RIBS],                                                       # handguard ribs (lighter bands)
    ('cyl', 0.44, 0.452, 0.023, 0.023, (0, 0.034), STEEL),                            # handguard cap
    ('cyl', 0.452, 0.60, 0.0092, 0.0084, (0, 0.034), STEEL),                          # barrel
    ('cyl', 0.455, 0.486, 0.015, 0.015, (0, 0.034), STEEL),                           # front sight base collar
    slanted((0.458, 0.04), (0.469, 0.128), 0.007, 0.008, STEEL),                      # A-frame rear leg
    slanted((0.486, 0.04), (0.474, 0.128), 0.007, 0.008, STEEL),                      # A-frame front leg
    ('box', (0.4715, 0, 0.133), (0.016, 0.012, 0.006), (0, 0, 0), STEEL),             # sight ears
    ('box', (0.4715, 0, 0.142), (0.004, 0.004, 0.014), (0, 0, 0), BRIGHT),            # front sight post
    ('box', (0.472, 0, 0.016), (0.014, 0.008, 0.01), (0, 0, 0), STEEL),               # bayonet lug
    ('box', (0.462, 0, 0.006), (0.004, 0.012, 0.016), (0, 0, 0), STEEL),              # front sling swivel
    ('cyl', 0.60, 0.645, 0.0115, 0.0112, (0, 0.034), STEEL),                          # birdcage flash hider
    *[('cyl', x, x + 0.004, 0.0098, 0.0098, (0, 0.034), RECV) for x in (0.612, 0.622, 0.632)],  # hider slots
])
gun.name = 'm16a1_body'

MAG_WELL = Vector((0.122, 0, -0.04))          # magazine top in gun frame
MAG_HOLD = Vector((0.0, 0.045, 0.13))         # magazine top relative to the support wrist (mag frame)


def make_mag(name):
    # 30-round curved magazine: three slabs bending forward, side ribs, base plate.
    return shape_object(name, [
        ('hexa', hexa(-0.032, 0.032, 0.012, -0.08, 0.0, -0.08, 0.0), RECV),
        ('hexa', [(-0.026, -0.012, -0.16), (0.04, -0.012, -0.152), (0.04, 0.012, -0.152), (-0.026, 0.012, -0.16),
                  (-0.032, -0.012, -0.08), (0.032, -0.012, -0.08), (0.032, 0.012, -0.08), (-0.032, 0.012, -0.08)], RECV),
        ('box', (0.0, -0.0125, -0.07), (0.05, 0.002, 0.07), (0, 4, 0), STEEL),            # side rib
        ('hexa', [(-0.02, -0.014, -0.172), (0.048, -0.014, -0.162), (0.048, 0.014, -0.162), (-0.02, 0.014, -0.172),
                  (-0.026, -0.014, -0.158), (0.04, -0.014, -0.15), (0.04, 0.014, -0.15), (-0.026, 0.014, -0.158)], STEEL),
    ])



mag = make_mag('m16a1_magazine')
mag.location = MAG_WELL
SOCKETS = {
    'socket_grip': Vector((-0.022, 0.0, -0.075)),      # pistol grip, where the trigger hand's palm sits
    'socket_support': Vector((0.31, 0.0, 0.004)),      # under the handguard, support hand
    'socket_stock': Vector((-0.348, 0.0, -0.01)),      # butt plate centre, shoulder pocket
    'socket_muzzle': Vector((0.645, 0.0, 0.034)),      # bore axis at the flash hider
    'socket_mag': MAG_WELL.copy(),                     # magazine top in the well
}
for name, p in SOCKETS.items():
    e = bpy.data.objects.new(name, None); e.empty_display_type = 'PLAIN_AXES'; e.empty_display_size = 0.02
    e.location = p; bpy.context.scene.collection.objects.link(e)
bpy.ops.export_scene.gltf(filepath=out, export_apply=True, export_animations=False)
xs = [(gun.matrix_world @ v.co).x for v in gun.data.vertices]
print('SAVED', out, 'length_m', round(max(xs) - min(xs), 3), 'tris', sum(len(p.vertices) - 2 for o in (gun, mag) for p in o.data.polygons))
