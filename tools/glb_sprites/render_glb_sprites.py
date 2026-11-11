"""Render GLB clips as exact right-side 2D sprite sheets in Blender (headless).

Usage:
  blender -b --python tools/glb_sprites/render_glb_sprites.py -- --model clone_01 --out <dir> [--clips walk,run] [--bounds]

Camera: orthographic, exactly on the -X axis looking +X (Blender Z up). Both GLBs face -Y after import,
so the character's right side is seen and it faces screen right.

Game-size output (user-approved optimisation, 2026-11-11):
- one scale for every model (--ppm, default 200 px per metre; 100 = small set), so the human and the monster match;
- rendered at SS x and area-averaged down (linear light, premultiplied alpha) for clean edges;
- 12 fps: every 2nd 24 fps frame (one-shot clips keep their final frame);
- each clip is cropped to the union box of its frames (+1 px); manifest 'crop' says where the frame sits in
  the model's fixed logical canvas, with 'groundY'/'originX' anchors, so every clip still lines up;
- names carry the scale so several resolutions live side by side: spritesheet_<ppm>.webp (lossless WebP,
  8-column grid), frames_<ppm>/0001.png… (the same cropped frames), manifest_<ppm>.json.

'explode' (mob only) is not a GLB clip: it re-creates the preview tab's 폭사 effect (game/glb-model-lab.js
stepExplode + game/glb-burst-fx.js) frame by frame — last hit splash, big backward flip, mid-air green burst,
model fade, smoke — with a fixed random seed so reruns give the same frames.
"""
import argparse, json, math, os, random, struct, sys, zlib
import bpy, numpy as np
from mathutils import Matrix, Vector

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
MODELS = {
    'clone_01': {
        'glb': 'art/characters/clone_01/motion/glb_model_001/source/version04.glb',
        'ref_bone': 'mixamorig:Hips', 'view': 1.28, 'center': (-0.01, 0.52),  # metres shown
        # in-place: hold the ref bone's forward (Y) position at its rest value, like the GLB tab's ‘제자리’.
        'clips': {
            'walk': {'action': 'walk.001', 'title': '걷기', 'loop': True, 'inplace': 'rest', 'all_frames': True},
            'run': {'action': 'run.001', 'title': '달리기', 'loop': True, 'inplace': 'rest', 'all_frames': True},
            'dive': {'action': 'dive.001', 'title': '다이브', 'loop': True, 'inplace': 'rest', 'all_frames': True},
            'scared': {'action': 'scared_01.001', 'title': '겁먹음', 'loop': True, 'inplace': 'rest', 'all_frames': True},
            'idle': {'action': 'idle.001', 'title': '대기 1', 'loop': True, 'inplace': 'rest', 'all_frames': True},
            'wait': {'action': 'wait.001', 'title': '대기 2', 'loop': True, 'inplace': 'rest', 'all_frames': True},
        },
    },
    'iren': {
        # 사용자 리깅 shoot/iren_rig.glb (정수리 뼈 보정본) 사본
        'glb': 'art/characters/iren/motion/glb_model_001/source/iren_rig.glb',
        'ref_bone': 'mixamorig:Hips', 'view': 1.28, 'center': (-0.01, 0.52),  # metres shown
        'clips': {
            'walk': {'action': 'walk.001', 'title': '걷기', 'loop': True, 'inplace': 'rest', 'all_frames': True},
            'run': {'action': 'run.001', 'title': '달리기', 'loop': True, 'inplace': 'rest', 'all_frames': True},
            'dive': {'action': 'dive.001', 'title': '다이브', 'loop': True, 'inplace': 'rest', 'all_frames': True},
            'afraid': {'action': 'afraid.001', 'title': '겁먹음', 'loop': True, 'inplace': 'rest', 'all_frames': True},
            'idle': {'action': 'idle.001', 'title': '대기 1', 'loop': True, 'inplace': 'rest', 'all_frames': True},
            'wait': {'action': 'wait.001', 'title': '대기 2', 'loop': True, 'inplace': 'rest', 'all_frames': True},
        },
    },
    'moa': {
        # 사용자 리깅 shoot/moa_rig.glb에서 정수리 뼈·가슴 가중치를 고친 moa_rig_fixed.glb 사본
        'glb': 'art/characters/moa/motion/glb_model_001/source/moa_rig.glb',
        'ref_bone': 'mixamorig:Hips', 'view': 1.28, 'center': (-0.01, 0.52),  # metres shown
        'clips': {
            'walk': {'action': 'walk.001', 'title': '걷기', 'loop': True, 'inplace': 'rest', 'all_frames': True},
            'run': {'action': 'run.001', 'title': '달리기', 'loop': True, 'inplace': 'rest', 'all_frames': True},
            'dive': {'action': 'dive.001', 'title': '다이브', 'loop': True, 'inplace': 'rest', 'all_frames': True},
            'afraid': {'action': 'afraid.001', 'title': '겁먹음', 'loop': True, 'inplace': 'rest', 'all_frames': True},
            'idle': {'action': 'idle.001', 'title': '대기 1', 'loop': True, 'inplace': 'rest', 'all_frames': True},
            'wait': {'action': 'wait.001', 'title': '대기 2', 'loop': True, 'inplace': 'rest', 'all_frames': True},
        },
    },
    'yuna': {
        # 사용자 리깅 shoot/yuna_rig.glb에서 정수리 뼈·양쪽 엉덩이 장비(총·홀스터·파우치) 가중치를 고친 yuna_rig_fixed.glb 사본
        'glb': 'art/characters/yuna/motion/glb_model_001/source/yuna_rig.glb',
        'ref_bone': 'mixamorig:Hips', 'view': 1.28, 'center': (-0.01, 0.52),  # metres shown
        'clips': {
            'walk': {'action': 'walk.001', 'title': '걷기', 'loop': True, 'inplace': 'rest', 'all_frames': True},
            'run': {'action': 'run.001', 'title': '달리기', 'loop': True, 'inplace': 'rest', 'all_frames': True},
            'dive': {'action': 'dive.001', 'title': '다이브', 'loop': True, 'inplace': 'rest', 'all_frames': True},
            'afraid': {'action': 'afraid.001', 'title': '겁먹음', 'loop': True, 'inplace': 'rest', 'all_frames': True},
            'idle': {'action': 'idle.001', 'title': '대기 1', 'loop': True, 'inplace': 'rest', 'all_frames': True},
            'wait': {'action': 'wait.001', 'title': '대기 2', 'loop': True, 'inplace': 'rest', 'all_frames': True},
        },
    },
    'sena': {
        # 사용자 리깅 shoot/sena_rig.glb → 정수리 뼈 보정(sena_rig_fixed) → 사용자가 Blender에서 앞머리·뺨을 덧칠한 sena_rig_painted.glb 사본
        'glb': 'art/characters/sena/motion/glb_model_001/source/sena_rig.glb',
        'ref_bone': 'mixamorig:Hips', 'view': 1.28, 'center': (-0.03, 0.52),  # dive reaches 0.648 m forward
        'clips': {
            'walk': {'action': 'walk.001', 'title': '걷기', 'loop': True, 'inplace': 'rest', 'all_frames': True},
            'run': {'action': 'run.001', 'title': '달리기', 'loop': True, 'inplace': 'rest', 'all_frames': True},
            'dive': {'action': 'dive.001', 'title': '다이브', 'loop': True, 'inplace': 'rest', 'all_frames': True},
            'afraid': {'action': 'afraid.001', 'title': '겁먹음', 'loop': True, 'inplace': 'rest', 'all_frames': True},
            'idle': {'action': 'idle.001', 'title': '대기 1', 'loop': True, 'inplace': 'rest', 'all_frames': True},
            'wait': {'action': 'wait.001', 'title': '대기 2', 'loop': True, 'inplace': 'rest', 'all_frames': True},
        },
    },
    'vesper_colony_insect': {
        'glb': 'art/enemies/vesper_colony_insect/motion/glb_model_001/source/mob.glb',
        'ref_bone': 'tripo::Root', 'view': 1.72, 'center': (0.08, 0.72),  # metres shown
        'clips': {
            'walk': {'action': 'walk', 'title': '걷기', 'loop': True},
            'walk_fast': {'action': 'walk_fast', 'title': '빠른 걷기', 'loop': True},
            # 사용자 지시: 덮치기는 제자리 (root travel removed relative to frame 0, body lunge kept)
            'pounce': {'action': 'pounce', 'title': '덮치기', 'loop': False, 'inplace': 'first'},
            'pounce_fast': {'action': 'pounce_fast', 'title': '빠른 덮치기', 'loop': False, 'inplace': 'first'},
            'death': {'action': 'death', 'title': '사망', 'loop': False},
            # own wider canvas (same 100 px/m) so the burst smoke is not clipped; anchors keep it aligned
            'explode': {'action': 'walk', 'title': '폭사', 'loop': False, 'explode': True, 'view': 3.0, 'center': (0.05, 0.72)},
        },
    },
}
FPS = 24          # GLB / simulation rate
STEP = 2          # keep every 2nd frame -> 12 fps
PPM = 200         # output pixels per metre (all models); --ppm overrides
SS = 4            # supersampling factor for the render
GLTF_TO_BLENDER = Matrix(((1, 0, 0, 0), (0, 0, -1, 0), (0, 1, 0, 0), (0, 0, 0, 1)))  # (x,y,z)gltf -> (x,-z,y)


def g2b(v):
    return Vector((v[0], -v[2], v[1]))


def srgb_to_linear(c):
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def hex_linear(h):
    return tuple(srgb_to_linear(((h >> s) & 255) / 255) for s in (16, 8, 0))


# ---------------------------------------------------------------- scene
def view(model, clip):
    return round(clip.get('view', model['view']) * PPM), clip.get('center', model['center'])


def setup(model, clip=None):
    canvas, center = view(model, clip or {})
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=os.path.join(ROOT, model['glb']))
    sc = bpy.context.scene
    arm = next(o for o in bpy.data.objects if o.type == 'ARMATURE')
    meshes = [o for o in bpy.data.objects if o.type == 'MESH' and o.parent == arm]
    for o in bpy.data.objects:  # stray helper meshes in the GLB (e.g. Icosphere)
        if o.type == 'MESH' and o.parent != arm:
            o.hide_render = True
    root = bpy.data.objects.new('sprite_root', None); sc.collection.objects.link(root)
    for o in bpy.data.objects:
        if o.parent is None and o is not root:
            o.parent = root
    cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam')); sc.collection.objects.link(cam)
    cam.data.type = 'ORTHO'; cam.data.ortho_scale = canvas / PPM
    cam.data.clip_start = 0.01; cam.data.clip_end = 20
    cam.location = (-6, center[0], center[1]); cam.rotation_euler = (math.pi / 2, 0, -math.pi / 2)
    sc.camera = cam
    # Lights mirror the GLB tab: hemisphere-ish world + key light from the camera side + rim from behind.
    for name, pos_g, energy in (('key', (-2, 3, 1.5), 2.6), ('rim', (2, 2, -2), 0.9)):
        light = bpy.data.objects.new(name, bpy.data.lights.new(name, 'SUN')); sc.collection.objects.link(light)
        light.data.energy = energy
        light.rotation_euler = (-g2b(pos_g)).to_track_quat('-Z', 'Y').to_euler()
    sc.world = bpy.data.worlds.new('w'); sc.world.use_nodes = True
    bg = sc.world.node_tree.nodes['Background']; bg.inputs[0].default_value = (0.42, 0.43, 0.44, 1); bg.inputs[1].default_value = 1.0
    sc.render.engine = 'BLENDER_EEVEE'
    sc.render.film_transparent = True
    sc.render.resolution_x = sc.render.resolution_y = canvas * SS; sc.render.resolution_percentage = 100
    sc.render.image_settings.file_format = 'PNG'; sc.render.image_settings.color_mode = 'RGBA'; sc.render.image_settings.color_depth = '8'
    sc.render.image_settings.compression = 100
    sc.view_settings.view_transform = 'Standard'; sc.view_settings.look = 'None'
    sc.eevee.taa_render_samples = 32
    sc.render.fps = FPS
    return sc, arm, meshes, root


def ref_y(arm, bone):
    return (arm.matrix_world @ arm.pose.bones[bone].head).y


# ---------------------------------------------------------------- burst FX (port of game/glb-burst-fx.js)
ICHOR = [0x9be34a, 0x6fc72e, 0x4f9e1f]
SMOKE = [0x7f9a6a, 0x5f7a52, 0x93a985]


def gradient_image(name, stops):
    n = 64; yy, xx = np.mgrid[0:n, 0:n]
    r = np.clip(np.hypot(xx + .5 - 32, yy + .5 - 32) / 32, 0, 1)
    at = [s[0] for s in stops]; alpha = np.interp(r, at, [s[1] for s in stops]).astype(np.float32)
    px = np.ones((n, n, 4), np.float32); px[..., 3] = alpha
    img = bpy.data.images.new(name, n, n, alpha=True); img.pixels.foreach_set(px.ravel()); img.pack()
    return img


class BurstFx:
    def __init__(self, rng):
        self.rng = rng; self.parts = []; self.count = 0
        self.textures = {
            'soft': gradient_image('fx_soft', [(0, 1), (.45, .55), (1, 0)]),
            'drop': gradient_image('fx_drop', [(0, 1), (.55, .9), (.75, .25), (1, 0)]),
        }

    def rand(self, a, b): return a + self.rng.random() * (b - a)
    def pick(self, items): return items[int(self.rng.random() * len(items))]

    def spawn(self, pos, vel, color, size, life, grow=0, gravity=0, drag=0, alpha=1, fade_in=0, texture='drop', ground=False, rise=0, order=2):
        self.count += 1
        mat = bpy.data.materials.new(f'fx_{self.count}'); mat.use_nodes = True
        mat.surface_render_method = 'BLENDED'
        nt = mat.node_tree; nt.nodes.clear()
        out = nt.nodes.new('ShaderNodeOutputMaterial'); tex = nt.nodes.new('ShaderNodeTexImage'); tex.image = self.textures[texture]
        tex.interpolation = 'Linear'; tex.extension = 'CLIP'
        emit = nt.nodes.new('ShaderNodeEmission'); emit.inputs['Color'].default_value = (*hex_linear(color), 1)
        trans = nt.nodes.new('ShaderNodeBsdfTransparent'); mix = nt.nodes.new('ShaderNodeMixShader')
        mul = nt.nodes.new('ShaderNodeMath'); mul.operation = 'MULTIPLY'; mul.inputs[1].default_value = 0
        nt.links.new(tex.outputs['Alpha'], mul.inputs[0]); nt.links.new(mul.outputs[0], mix.inputs[0])
        nt.links.new(trans.outputs[0], mix.inputs[1]); nt.links.new(emit.outputs[0], mix.inputs[2]); nt.links.new(mix.outputs[0], out.inputs['Surface'])
        bpy.ops.mesh.primitive_plane_add(size=1); ob = bpy.context.object; ob.name = f'fx_{self.count}'
        ob.data.materials.append(mat); ob.rotation_euler = (0, math.pi / 2, 0)  # face the -X camera
        ob.hide_render = False
        self.parts.append(dict(ob=ob, opacity=mul.inputs[1], pos=Vector(pos), vel=Vector(vel), size=size, grow=grow, life=life, age=0.0,
                               gravity=gravity, drag=drag, alpha=alpha, fade_in=fade_in, ground=ground, rise=rise, landed=False))

    def hit(self, point, toward):
        V = Vector
        self.spawn(point, V(), 0xfff2b0, .12, .08, grow=.5, texture='soft')
        for _ in range(6):
            self.spawn(point, V((toward.x * self.rand(.6, 1.6), self.rand(-.2, 1.2), self.rand(-1, 1))), 0xffe38a, .012, self.rand(.08, .16), drag=4)
        for _ in range(18):
            self.spawn(point, V((toward.x * self.rand(.3, 1.1), self.rand(.1, 1.1), self.rand(-.7, .7))), self.pick(ICHOR), self.rand(.022, .045),
                       self.rand(.5, .9), gravity=3.2, drag=.6, ground=True)
        self.spawn(point, V((toward.x * .1, .08, 0)), self.pick(ICHOR), .08, .3, grow=1.4, alpha=.7, texture='soft')

    def burst(self, center):
        V = Vector
        self.spawn(center, V(), 0xd8ff9a, .35, .16, grow=2.2, texture='soft')
        for _ in range(70):
            d = V((self.rand(-1, 1), self.rand(-.2, 1), self.rand(-1, 1))).normalized()
            self.spawn(center + d * .05, d * self.rand(.8, 2.4), self.pick(ICHOR), self.rand(.025, .06), self.rand(.6, 1.2), gravity=3.2, drag=.5, ground=True)
        for _ in range(28):
            off = V((self.rand(-.25, .25), self.rand(-.08, .12), self.rand(-.45, .4)))
            self.spawn(center + off, off * self.rand(.6, 1.4) + V((0, self.rand(.05, .2), 0)), self.pick(SMOKE), self.rand(.12, .22), self.rand(1.2, 2.0),
                       grow=self.rand(1.2, 2.2), alpha=self.rand(.55, .8), fade_in=.12, drag=1.6, rise=.12, texture='soft')

    @property
    def busy(self): return bool(self.parts)

    def update(self, dt):
        for p in self.parts:
            p['age'] += dt; t = p['age'] / p['life']
            if not p['landed']:
                p['vel'].y += (p['rise'] - p['gravity']) * dt
                p['vel'] *= max(0, 1 - p['drag'] * dt)
                p['pos'] += p['vel'] * dt
                if p['ground'] and p['pos'].y <= .004:
                    p['pos'].y = .004; p['landed'] = True; p['life'] = p['age'] + 1.4
            s = p['size'] * (1 + p['grow'] * min(t, 1)) * (1.3 if p['landed'] else 1)
            fade_in = min(1, p['age'] / p['fade_in']) if p['fade_in'] else 1
            p['opacity'].default_value = p['alpha'] * fade_in * max(0, 1 - max(0, (p['age'] / p['life'] - .55) / .45))
            p['ob'].location = g2b(p['pos']); p['ob'].scale = (s, s, 1)
        for p in [p for p in self.parts if p['age'] >= p['life']]:
            p['ob'].hide_render = True
        self.parts = [p for p in self.parts if p['age'] < p['life']]


# ---------------------------------------------------------------- explode (port of glb-model-lab.js stepExplode)
EXTRA = dict(center=(0, .3, .05), hitZ=(-.25, .4), hitY=(.24, .42), side=.17)


def model_fade_nodes(meshes):
    inputs = []
    for m in {slot.material for o in meshes for slot in o.material_slots if slot.material}:
        m.surface_render_method = 'BLENDED'
        nt = m.node_tree; out = next(n for n in nt.nodes if n.type == 'OUTPUT_MATERIAL')
        link = out.inputs['Surface'].links[0]; shader = link.from_socket
        trans = nt.nodes.new('ShaderNodeBsdfTransparent'); mix = nt.nodes.new('ShaderNodeMixShader')
        nt.links.remove(link); nt.links.new(trans.outputs[0], mix.inputs[1]); nt.links.new(shader, mix.inputs[2]); nt.links.new(mix.outputs[0], out.inputs['Surface'])
        mix.inputs[0].default_value = 1; inputs.append(mix.inputs[0])
    return inputs


def render_explode(sc, arm, meshes, root, clip, frames_dir):
    rng = random.Random(20261111)
    fx = BurstFx(rng); fade = model_fade_nodes(meshes)
    action = bpy.data.actions[clip['action']]; arm.animation_data.action = action
    start, end = int(action.frame_range[0]), int(action.frame_range[1]); span = end - start
    center = Vector(EXTRA['center']); facing = 1; dt = 1 / FPS
    ease = lambda u: (lambda v: v * v * (3 - 2 * v))(min(max(u, 0), 1))
    ease_out = lambda u: 1 - (1 - min(max(u, 0), 1)) ** 2
    st = dict(phase='flip', t=0.0, flinch=1.0)

    def place(pitch, lift, back, scale):
        f = st['flinch'] ** 2
        rot = Matrix.Rotation(pitch, 4, 'X') @ Matrix.Rotation(-.07 * f * facing, 4, 'Z')  # three.js Euler XYZ = Rx·Ry·Rz
        turned = (rot @ (center * scale).to_4d()).to_3d()
        pos = center - turned + Vector((.02 * f * facing, lift, -back))
        mg = Matrix.Translation(pos) @ rot @ Matrix.Scale(scale, 4)
        return mg

    # the killing (5th) shot: hit splash on the camera-side body surface, then the flip starts
    r = lambda a, b: a + rng.random() * (b - a)
    fx.hit(Vector((-EXTRA['side'] * facing, r(*EXTRA['hitY']), r(*EXTRA['hitZ']))), Vector((-facing, 0, 0)))
    mg = Matrix.Identity(4); visible = True; k = 0; names = []
    while k < 160:
        # one preview tick: base clip, stepExplode(dt), fx.update(dt)
        sc.frame_set(start + (k + 1) % span)
        st['t'] += dt; st['flinch'] = max(0, st['flinch'] - dt / .18)
        if st['phase'] == 'flip':
            u = st['t'] / .42
            mg = place(-math.pi * .85 * ease_out(u), .3 * math.sin(math.pi / 2 * min(u, 1)), .14 * u, 1 + .14 * ease(u) ** 2)
            mg = Matrix.Translation(((rng.random() - .5) * .01 * ease(u), 0, 0)) @ mg
            if st['t'] >= .42:
                st['phase'] = 'fade'; st['t'] = 0
                fx.burst((mg @ center.to_4d()).to_3d())
        elif st['phase'] == 'fade':
            u = st['t'] / .35
            mg = place(-math.pi * (.85 + .25 * u), .3 - .06 * u * u, .14 + .05 * u, 1.14 + .22 * ease(u))
            for socket in fade: socket.default_value = 1 - ease(u)
            if st['t'] >= .35:
                visible = False; st['phase'] = 'gone'; st['t'] = 0
        fx.update(dt)
        root.matrix_world = GLTF_TO_BLENDER @ mg @ GLTF_TO_BLENDER.transposed()
        for o in meshes: o.hide_render = not visible
        last = st['phase'] == 'gone' and not fx.busy
        if k % STEP == 0 or last:
            names.append(render_frame(sc, frames_dir, len(names)))
        k += 1
        if last:
            break
    return names


# ---------------------------------------------------------------- render + pack
def render_frame(sc, frames_dir, k):
    name = f'{k + 1:04d}.png'; sc.render.filepath = os.path.join(frames_dir, name)
    bpy.ops.render.render(write_still=True)
    return name


def clear_dir(path):
    os.makedirs(path, exist_ok=True)
    for f in os.listdir(path):
        os.remove(os.path.join(path, f))


def render_clip(sc, arm, meshes, root, model, clip_id, clip, out_dir):
    frames_dir = os.path.join(out_dir, '_render', clip_id); clear_dir(frames_dir)  # full-size renders, removed after packing
    if clip.get('explode'):
        names = render_explode(sc, arm, meshes, root, clip, frames_dir)
    else:
        action = bpy.data.actions[clip['action']]; arm.animation_data.action = action
        start, end = int(action.frame_range[0]), int(action.frame_range[1])
        # mob loops end on a copy of the first key; the human Mixamo loops do not, so they keep every frame
        last = end - 1 if clip['loop'] and not clip.get('all_frames') else end
        arm.data.pose_position = 'REST'; bpy.context.view_layer.update()
        rest = ref_y(arm, model['ref_bone']); arm.data.pose_position = 'POSE'
        sc.frame_set(start); first = ref_y(arm, model['ref_bone'])
        keep = list(range(start, last + 1, STEP))
        if not clip['loop'] and keep[-1] != last:
            keep.append(last)  # one-shot clips end on their real final pose
        names = []
        for k, f in enumerate(keep):
            root.location = (0, 0, 0); sc.frame_set(f)
            mode = clip.get('inplace')
            if mode:
                target = rest if mode == 'rest' else first
                root.location = (0, target - ref_y(arm, model['ref_bone']), 0)
            names.append(render_frame(sc, frames_dir, k))
        root.location = (0, 0, 0)
    pack(out_dir, clip_id, clip, model, names, frames_dir)
    clear_dir(frames_dir); os.rmdir(frames_dir)
    if not os.listdir(os.path.join(out_dir, '_render')):
        os.rmdir(os.path.join(out_dir, '_render'))


PNG_SIG = bytes([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A])


def write_png(path, rgba):
    """8-bit RGBA PNG, zlib level 9; keeps the smaller of the Sub/Up whole-image filters (Blender's own save compresses weakly)."""
    h, w, _ = rgba.shape; a = rgba.astype(np.int16)
    sub = a.copy(); sub[:, 1:] -= a[:, :-1]
    up = a.copy(); up[1:] -= a[:-1]
    best = None
    for kind, data in ((1, sub), (2, up)):
        raw = np.concatenate([np.full((h, 1), kind, np.uint8), (data & 255).astype(np.uint8).reshape(h, w * 4)], axis=1)
        z = zlib.compress(raw.tobytes(), 9)
        if best is None or len(z) < len(best): best = z
    chunk = lambda kind, body: struct.pack('>I', len(body)) + kind + body + struct.pack('>I', zlib.crc32(kind + body))
    with open(path, 'wb') as f:
        f.write(PNG_SIG + chunk(b'IHDR', struct.pack('>IIBBBBB', w, h, 8, 6, 0, 0, 0)) + chunk(b'IDAT', best) + chunk(b'IEND', b''))


def srgb_to_lin(c):
    return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)


def lin_to_srgb(c):
    return np.where(c <= 0.0031308, c * 12.92, 1.055 * np.power(np.maximum(c, 0), 1 / 2.4) - 0.055)


def downscale(px, factor):
    """(H,W,4) sRGB straight alpha -> area average in linear light with premultiplied alpha."""
    h, w = px.shape[0] // factor, px.shape[1] // factor
    a = px[..., 3:]; rgb = srgb_to_lin(px[..., :3]) * a
    rgb = rgb.reshape(h, factor, w, factor, 3).mean((1, 3)); a = a.reshape(h, factor, w, factor, 1).mean((1, 3))
    rgb = np.where(a > 1e-6, rgb / np.maximum(a, 1e-6), 0)
    return np.concatenate([lin_to_srgb(np.clip(rgb, 0, 1)), a], axis=2)


def save_webp(path, rgba_u8):
    """Lossless WebP through Blender's writer (quality 100 = lossless). rgba_u8 rows top-down."""
    h, w, _ = rgba_u8.shape
    img = bpy.data.images.new('webp_out', w, h, alpha=True); img.alpha_mode = 'STRAIGHT'
    img.pixels.foreach_set((rgba_u8[::-1].astype(np.float32) / 255).ravel())
    img.filepath_raw = path; img.file_format = 'WEBP'; img.save(quality=100)
    bpy.data.images.remove(img)


def pack(out_dir, clip_id, clip, model, names, render_dir):
    (canvas, (cy, cz)), cols = view(model, clip), 8
    full = canvas * SS
    small = []
    for name in names:
        img = bpy.data.images.load(os.path.join(render_dir, name))
        px = np.empty(full * full * 4, np.float32); img.pixels.foreach_get(px); bpy.data.images.remove(img)
        small.append(downscale(px.reshape(full, full, 4)[::-1], SS))  # rows top-down from here
    u8 = [np.rint(np.clip(f, 0, 1) * 255).astype(np.uint8) for f in small]
    alpha = np.max([f[..., 3] for f in u8], axis=0)
    ys, xs = np.nonzero(alpha)
    x0, x1 = max(0, xs.min() - 1), min(canvas, xs.max() + 2); y0, y1 = max(0, ys.min() - 1), min(canvas, ys.max() + 2)
    fw, fh = x1 - x0, y1 - y0
    frames_dir = os.path.join(out_dir, clip_id, f'frames_{PPM}'); clear_dir(frames_dir)
    rows = math.ceil(len(u8) / cols)
    sheet = np.zeros((rows * fh, cols * fw, 4), np.uint8)
    for i, f in enumerate(u8):
        crop = f[y0:y1, x0:x1]
        write_png(os.path.join(frames_dir, f'{i + 1:04d}.png'), crop)
        r, c = divmod(i, cols); sheet[r * fh:(r + 1) * fh, c * fw:(c + 1) * fw] = crop
    for old in ('spritesheet.png',):
        if os.path.exists(os.path.join(out_dir, clip_id, old)):
            os.remove(os.path.join(out_dir, clip_id, old))
    save_webp(os.path.join(out_dir, clip_id, f'spritesheet_{PPM}.webp'), sheet)
    manifest = {
        'schema_version': 2,
        'source': f"{os.path.basename(model['glb'])} · tools/glb_sprites/render_glb_sprites.py (Blender 헤드리스, 정사영 완전 우측면, {SS}배 렌더 후 축소)",
        'clip': clip_id, 'glbAnimation': None if clip.get('explode') else clip['action'],
        'title': clip['title'], 'frameCount': len(u8), 'fps': FPS // STEP, 'loop': clip['loop'],
        'inPlace': bool(clip.get('inplace')) or bool(clip.get('explode')),
        'pixelsPerMeter': PPM, 'modelCanvas': round(model['view'] * PPM),
        'canvas': {'width': canvas, 'height': canvas},
        'crop': {'x': int(x0), 'y': int(y0), 'width': int(fw), 'height': int(fh)},
        # anchors in canvas pixels: ground line (z = 0) and the model origin's screen x (y = 0)
        'groundY': round(canvas / 2 + cz * PPM, 2), 'originX': round(canvas / 2 + cy * PPM, 2),
        'layout': 'grid', 'columns': cols, 'frame': {'width': int(fw), 'height': int(fh)},
        'camera': {'type': 'orthographic', 'view': 'right side (-X looking +X)', 'orthoScale': canvas / PPM, 'centerYZ': [cy, cz]},
        'spritesheet': f'spritesheet_{PPM}.webp', 'framesDir': f'frames_{PPM}', 'sourceFrames': [f'{i + 1:04d}.png' for i in range(len(u8))],
    }
    with open(os.path.join(out_dir, clip_id, f'manifest_{PPM}.json'), 'w', encoding='utf-8') as f:
        json.dump(manifest, f, ensure_ascii=False, indent=2)
    print('CLIP', clip_id, len(u8), f'{fw}x{fh}', 'sheet', sheet.shape[1], 'x', sheet.shape[0])


def bounds(sc, arm, meshes, root, model):
    for clip_id, clip in model['clips'].items():
        if clip.get('explode'): continue
        action = bpy.data.actions[clip['action']]; arm.animation_data.action = action
        start, end = int(action.frame_range[0]), int(action.frame_range[1])
        arm.data.pose_position = 'REST'; bpy.context.view_layer.update(); rest = ref_y(arm, model['ref_bone']); arm.data.pose_position = 'POSE'
        sc.frame_set(start); first = ref_y(arm, model['ref_bone'])
        lo, hi = [9, 9], [-9, -9]
        for f in range(start, end + 1, 2):
            root.location = (0, 0, 0); sc.frame_set(f)
            if clip.get('inplace'):
                root.location = (0, (rest if clip['inplace'] == 'rest' else first) - ref_y(arm, model['ref_bone']), 0)
            dg = bpy.context.evaluated_depsgraph_get()
            for m in meshes:
                ev = m.evaluated_get(dg); mw = ev.matrix_world
                co = np.empty(len(ev.data.vertices) * 3, np.float32); ev.data.vertices.foreach_get('co', co); co = co.reshape(-1, 3)
                w = (np.c_[co, np.ones(len(co))] @ np.array(mw).T)[:, :3]
                lo = [min(lo[0], w[:, 1].min()), min(lo[1], w[:, 2].min())]; hi = [max(hi[0], w[:, 1].max()), max(hi[1], w[:, 2].max())]
        print('BOUNDS', clip_id, 'y', round(lo[0], 3), round(hi[0], 3), 'z', round(lo[1], 3), round(hi[1], 3))
        root.location = (0, 0, 0)


def main():
    global PPM
    argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    ap = argparse.ArgumentParser(); ap.add_argument('--model', required=True, choices=MODELS); ap.add_argument('--out')
    ap.add_argument('--clips'); ap.add_argument('--bounds', action='store_true'); ap.add_argument('--ppm', type=int, default=PPM)
    args = ap.parse_args(argv)
    PPM = args.ppm
    model = MODELS[args.model]
    if args.bounds:
        bounds(*setup(model), model); return
    clips = args.clips.split(',') if args.clips else list(model['clips'])
    for clip_id in clips:  # fresh import per clip: explode hides/fades the model and adds FX objects
        render_clip(*setup(model, model['clips'][clip_id]), model, clip_id, model['clips'][clip_id], os.path.abspath(args.out))


main()
