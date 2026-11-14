"""Measure Lian's muzzle anchors and firing frames on the js-prototype sprites (Blender headless, read-only).

Usage:
  blender -b --python tools/glb_sprites/measure_muzzle_anchors.py -- [--out art/characters/clone_01/motion/glb_model_001/stage_measure_001]
                                                                     [--compare art/characters/clone_01/motion/glb_model_001/loadout_030/clone_01_ar12_hp14t.glb]

Each clip is measured on the GLB its sprite folder was rendered from (sprite_004 <- loadout_023, sprite_005 <- 027,
sprite_006 <- 029, sprite_007 <- 030) with the exact sampling of render_glb_sprites.py --fps 30: same import, all top
objects under an empty 'sprite_root', action + slot 0, 0.8-frame sub-frame steps over the real key span, the same
loop / closed / one-shot end rule (float accumulation included) and the same in-place Hips correction.

Muzzle: the GLB has no socket. Like game/glb-gun-fx.js, the weapon mesh's own vertices (no reload magazine / bolt
children) give the barrel axis (longest local bbox axis, sign = the end pointing forward in the first frame of
rifle_aim_idle / dual_idle); the bbox centre of the vertices within 1.8 % of the length from that end, with the axis
value set to the end itself, is the local muzzle point, moved by the evaluated matrix_world every sample.

Screen convention (sprite, facing right): x = forward = -Y_world, y = up = Z_world, in model units (200 px / unit),
relative to the manifest anchors (originX = Y 0, groundY = Z 0).  Nothing in the project is written except --out.
"""
import argparse, json, math, os, sys
import bpy, numpy as np
from mathutils import Vector

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
BASE = 'art/characters/clone_01/motion/glb_model_001'
SPRITE_GLB = {'sprite_004': 'loadout_023', 'sprite_005': 'loadout_027', 'sprite_006': 'loadout_029', 'sprite_007': 'loadout_030'}
# clip -> (sprite folder used by game/js-prototype/move/move.js, loop, closed) — loop/closed copied from
# render_glb_sprites.py MODELS['clone_01_armed']
CLIPS = {
    'gunplay': ('sprite_004', False, False), 'gunplay_auto': ('sprite_004', True, False),
    'rifle_full_auto': ('sprite_004', True, True), 'rifle_aim_idle': ('sprite_004', True, False),
    'shoot_rifle': ('sprite_004', True, False), 'rifle_idle': ('sprite_004', True, False),
    'rifle_walk': ('sprite_006', True, False), 'rifle_run': ('sprite_006', True, False),
    'rifle_down_to_aim': ('sprite_005', False, False), 'rifle_aim_to_down': ('sprite_005', False, False),
    'dual_fire': ('sprite_004', True, True), 'dual_idle': ('sprite_004', True, True),
    'dual_idle_high': ('sprite_007', True, True), 'dual_walk': ('sprite_004', True, True),
    'dual_walk_basic': ('sprite_006', True, True), 'dual_run': ('sprite_004', True, True),
    'dual_ready_to_aim': ('sprite_007', False, False), 'dual_aim_to_ready': ('sprite_007', False, False),
}
GUNS = {'rifle': 'weapon_rifle_mesh', 'pistol_r': 'weapon_pistol_r_mesh', 'pistol_l': 'weapon_pistol_l_mesh'}
REF_CLIP = {'rifle': 'rifle_aim_idle', 'pistol_r': 'dual_idle', 'pistol_l': 'dual_idle'}
SINGLE_CUES = {'gunplay': [3 / 24], 'gunplay_auto': [2 / 24], 'shoot_rifle': [5 / 24]}   # game/glb-gun-fx.js
FPS, OUT_FPS, PPM, REF_BONE = 24, 30, 200, 'mixamorig:Hips'
FIRE_KICK, AIM_PITCH = 1.5, 25.0    # tools/glb_retarget/attach_weapon.py level_moments
SOFT_KICK = 0.5                     # deg/frame: same rule, lower threshold (gunplay's kick rises only 1.43 deg/frame)


def firing_cues(name, duration):   # port of glb-gun-fx.js firingCues (seconds, side)
    if name == 'rifle_full_auto':
        return [(.02 + i * .08, 'right') for i in range(max(0, math.ceil((duration - .02 - 1e-6) / .08)))]
    if name in ('dual_fire', 'dual_kneel_fire'):
        return [(i / 4, 'left' if i % 2 else 'right') for i in range(math.ceil((duration - .001) * 4))]
    return [(t, 'right') for t in SINGLE_CUES.get(name, [])]


def setup(glb):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=os.path.join(ROOT, glb))
    sc = bpy.context.scene; sc.render.fps = FPS
    arm = next(o for o in bpy.data.objects if o.type == 'ARMATURE')
    rendered = [o for o in bpy.data.objects if o.type == 'MESH' and o.parent == arm]   # what render_glb_sprites shows
    root = bpy.data.objects.new('sprite_root', None); sc.collection.objects.link(root)
    for o in bpy.data.objects:
        if o.parent is None and o is not root:
            o.parent = root
    return sc, arm, rendered, root


def ref_y(arm):
    return (arm.matrix_world @ arm.pose.bones[REF_BONE].head).y


def rest_y(arm, root):
    # render_glb_sprites.py measures the rest Hips with sprite_root at 0 (fresh scene per clip): reset it first
    root.location = (0, 0, 0); arm.data.pose_position = 'REST'; bpy.context.view_layer.update()
    rest = ref_y(arm); arm.data.pose_position = 'POSE'; bpy.context.view_layer.update()
    return rest


def set_clip(arm, name):
    action = bpy.data.actions[name]; arm.animation_data.action = action
    if action.slots: arm.animation_data.action_slot = action.slots[0]
    return action


def key_span(action):
    fcs = [fc for l in action.layers for st in l.strips for cb in st.channelbags for fc in cb.fcurves if len(fc.keyframe_points) > 1]
    return min(fc.keyframe_points[0].co[0] for fc in fcs), max(fc.keyframe_points[-1].co[0] for fc in fcs)


def samples(start, end, loop, all_frames):   # identical loop to render_clip (--fps 30)
    step, keep, t = FPS / OUT_FPS, [], float(start)
    period_end = (end + 1 if all_frames else end) if loop else end
    while (t < period_end - 1e-6) if loop else (t <= end + 1e-6):
        keep.append(t); t += step
    if not loop and abs(keep[-1] - end) > 1e-6:
        keep.append(float(end))
    return keep


def pose_at(sc, arm, root, f, rest):
    root.location = (0, 0, 0); sc.frame_set(int(math.floor(f)), subframe=f - math.floor(f))
    root.location = (0, rest - ref_y(arm), 0)
    bpy.context.view_layer.update()


def local_muzzles(sc, arm, root):
    """Per gun: (local muzzle point, local barrel unit axis) from the mesh's own vertices."""
    out = {}
    for gun, obj_name in GUNS.items():
        ob = bpy.data.objects[obj_name]
        co = np.empty(len(ob.data.vertices) * 3, np.float64); ob.data.vertices.foreach_get('co', co); co = co.reshape(-1, 3)
        lo, hi = co.min(0), co.max(0); axis = int(np.argmax(hi - lo)); length = float(hi[axis] - lo[axis])
        action = set_clip(arm, REF_CLIP[gun]); start, end = key_span(action); rest = rest_y(arm, root)
        pose_at(sc, arm, root, start, rest)
        mw = ob.evaluated_get(bpy.context.evaluated_depsgraph_get()).matrix_world
        e = Vector((0, 0, 0)); e[axis] = 1
        sign = 1 if (mw.to_3x3() @ e).dot(Vector((0, -1, 0))) > 0 else -1
        vals = co[:, axis] * sign; tipv = vals.max()
        tip = co[vals > tipv - length * .018]
        p = (tip.min(0) + tip.max(0)) / 2; p[axis] = tipv * sign
        d = Vector((0, 0, 0)); d[axis] = sign
        out[gun] = dict(point=Vector(p.tolist()), axis=d, axisName='+-'[sign < 0] + 'XYZ'[axis], length=length, tipCount=int(len(tip)))
    return out


def muzzle_world(dg, gun, lm):
    mw = bpy.data.objects[GUNS[gun]].evaluated_get(dg).matrix_world
    m3 = mw.to_3x3()
    if max(c.length for c in m3.col) < 1e-5:
        return None   # hidden weapon (scale 0 key)
    p = mw @ lm['point']; d = (m3 @ lm['axis']).normalized()
    return dict(x=-p.y, y=p.z, depth=p.x, pitch=math.degrees(math.asin(max(-1, min(1, d.z)))),
                screenPitch=math.degrees(math.atan2(d.z, -d.y)), scale=m3.col[0].length)


def mesh_bounds(dg, meshes):
    lo, hi = [9e9, 9e9], [-9e9, -9e9]
    for m in meshes:
        ev = m.evaluated_get(dg); mw = ev.matrix_world
        if max(c.length for c in mw.to_3x3().col) < 1e-5: continue
        co = np.empty(len(ev.data.vertices) * 3, np.float64); ev.data.vertices.foreach_get('co', co); co = co.reshape(-1, 3)
        w = (np.c_[co, np.ones(len(co))] @ np.array(mw).T)[:, :3]
        lo = [min(lo[0], w[:, 1].min()), min(lo[1], w[:, 2].min())]; hi = [max(hi[0], w[:, 1].max()), max(hi[1], w[:, 2].max())]
    return lo, hi


def r4(v): return None if v is None else round(v, 4)


def measure_glb(glb, clips, with_bounds):
    sc, arm, rendered, root = setup(glb)
    lms = local_muzzles(sc, arm, root)
    res = {}
    for name in clips:
        folder, loop, closed = CLIPS[name]
        action = set_clip(arm, name); rest = rest_y(arm, root)
        start, end = key_span(action)
        keep = samples(start, end, loop, not closed)
        per = {g: [] for g in GUNS}; bx = [9e9, 9e9, -9e9, -9e9]
        for f in keep:
            pose_at(sc, arm, root, f, rest); dg = bpy.context.evaluated_depsgraph_get()
            for g, lm in lms.items():
                per[g].append(muzzle_world(dg, g, lm))
            if with_bounds:
                lo, hi = mesh_bounds(dg, rendered)
                bx = [min(bx[0], lo[0]), min(bx[1], lo[1]), max(bx[2], hi[0]), max(bx[3], hi[1])]
        # integer source frames for the FIRE_KICK rule
        ints = list(range(int(math.ceil(start - 1e-6)), int(math.floor(end + 1e-6)) + 1))
        pitch_int = {g: {} for g in GUNS}
        for f in ints:
            pose_at(sc, arm, root, f, rest); dg = bpy.context.evaluated_depsgraph_get()
            for g, lm in lms.items():
                m = muzzle_world(dg, g, lm)
                if m: pitch_int[g][f] = m['pitch']
        kicks, soft = {}, {}
        for g, pit in pitch_int.items():
            if len(pit) < 2: continue
            fs = sorted(pit)
            for out_k, thr in ((kicks, FIRE_KICK), (soft, SOFT_KICK)):
                out_k[g] = [f for f in fs[:-1] if f + 1 in pit and pit[f + 1] - pit[f] >= thr
                            and (f == fs[0] or f - 1 not in pit or pit[f] - pit[f - 1] < thr) and abs(pit[f]) <= AIM_PITCH]
        # fine kick onsets (0.04 frame) for the 750 RPM loop, whose shots fall between source frames
        fine = {}
        if name == 'rifle_full_auto':
            d = .04; ts = np.arange(start, end + 1e-9, d); pit = []
            for f in ts:
                pose_at(sc, arm, root, float(f), rest); pit.append(muzzle_world(bpy.context.evaluated_depsgraph_get(), 'rifle', lms['rifle'])['pitch'])
            pit = np.array(pit); rate = np.diff(pit) / d   # deg per source frame
            on = [i for i in range(1, len(rate)) if rate[i] >= FIRE_KICK and rate[i - 1] < FIRE_KICK]
            fine['rifle'] = [round(float(ts[i]), 3) for i in on]
            fine['rifle_peaks'] = [round(float(ts[i]), 3) for i in range(1, len(pit) - 1) if pit[i] >= pit[i - 1] and pit[i] > pit[i + 1]]
        # cues
        cues = []
        n = len(keep); dur_viewer = end / FPS   # three.js clip duration = last glTF key time (= end frame / 24)
        for i, (t, side) in enumerate(firing_cues(name, dur_viewer)):
            g = 'rifle' if not name.startswith('dual') else ('pistol_r' if side == 'right' else 'pistol_l')
            entry = dict(index=i, time=round(t, 5), side=side, gun=g)
            # startRelative: cue seconds counted from the first real key (= sprite time, frame = t * 30).
            # viewerAbsolute: three.js AnimationAction time = glTF time (Blender frame / 24); before the first key the
            # pose holds that key, so clips whose keys start at frame 1 see the cue 1/24 s earlier than startRelative.
            for conv, frame in (('startRelative', start + t * FPS), ('viewerAbsolute', max(start, t * FPS))):
                u = (frame - start) / (FPS / OUT_FPS)
                if loop:
                    u = u % n
                else:
                    u = min(max(u, 0.0), n - 1)
                f_eval = start + u * FPS / OUT_FPS
                pose_at(sc, arm, root, f_eval, rest); m = muzzle_world(bpy.context.evaluated_depsgraph_get(), g, lms[g])
                entry[conv] = dict(sourceFrame=round(f_eval, 4), spriteU=round(u, 4), frameBefore=int(math.floor(u + 1e-6)) % n if loop else int(math.floor(u + 1e-6)),
                                   frameAfter=int(math.ceil(u - 1e-6)) % n if loop else min(n - 1, int(math.ceil(u - 1e-6))),
                                   x=r4(m['x']), y=r4(m['y']), pitch=round(m['pitch'], 2))
            cues.append(entry)
        res[name] = dict(folder=folder, loop=loop, closed=closed, keyStart=start, keyEnd=round(end, 4), samples=keep, frames=per,
                         intPitch={g: {str(k): round(v, 3) for k, v in p.items()} for g, p in pitch_int.items() if p},
                         kicks=kicks, softKicks=soft, fineKicks=fine, cues=cues, bounds=bx if with_bounds else None)
        print('MEASURED', glb, name, len(keep), 'kicks', kicks, 'soft', soft, fine.get('rifle', ''))
    root.location = (0, 0, 0)
    return res, {g: dict(point=[round(v, 5) for v in lm['point']], axis=lm['axisName'], length=round(lm['length'], 5), tipVertices=lm['tipCount'])
                 for g, lm in lms.items()}


def load_png_alpha(path):
    img = bpy.data.images.load(path); w, h = img.size
    px = np.empty(w * h * 4, np.float32); img.pixels.foreach_get(px); bpy.data.images.remove(img)
    return px.reshape(h, w, 4)[::-1, :, 3]   # rows top-down


def pixel_check(man, folder_dir, frames):
    """For each frame: distance (px) from the projected muzzle to the farthest opaque pixel along the barrel."""
    out = []
    cx, cy = man['crop']['x'], man['crop']['y']
    for k, m in enumerate(frames):
        if m is None: continue
        a = load_png_alpha(os.path.join(folder_dir, man['framesDir'], man['sourceFrames'][k]))
        px = man['originX'] - cx + m['x'] * PPM; py = man['groundY'] - cy - m['y'] * PPM
        dx, dy = math.cos(math.radians(m['screenPitch'])), -math.sin(math.radians(m['screenPitch']))
        last = None
        for s10 in range(-60, 61):   # -6..+6 px along the barrel, 0.1 px steps
            s = s10 / 10; xi, yi = int(round(px + dx * s - .5)), int(round(py + dy * s - .5))
            if 0 <= yi < a.shape[0] and 0 <= xi < a.shape[1] and a[yi, xi] >= .5: last = s
        out.append(last)
    return out


def main():
    argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    ap = argparse.ArgumentParser()
    ap.add_argument('--out', default=f'{BASE}/stage_measure_001')
    ap.add_argument('--compare', default=f'{BASE}/loadout_030/clone_01_ar12_hp14t.glb')
    ap.add_argument('--clips'); ap.add_argument('--no-pixels', action='store_true')
    args = ap.parse_args(argv)
    clips = args.clips.split(',') if args.clips else list(CLIPS)
    by_glb = {}
    for c in clips:
        by_glb.setdefault(f"{BASE}/{SPRITE_GLB[CLIPS[c][0]]}/clone_01_ar12_hp14t.glb", []).append(c)
    data, local = {}, {}
    for glb, cs in by_glb.items():
        res, lm = measure_glb(glb, cs, True); local[glb] = lm
        for c, v in res.items(): v['glb'] = glb; data[c] = v
    cmp_res, cmp_lm = measure_glb(args.compare, clips, False)

    clips_out, checks = {}, {}
    for c in clips:
        d = data[c]; folder_dir = os.path.join(ROOT, BASE, d['folder'], c)
        with open(os.path.join(folder_dir, 'manifest_200.json'), encoding='utf-8') as f:
            man = json.load(f)
        n = len(d['samples'])
        # sampling identity: frame count + mesh bounds vs the crop box (crop = alpha union + 1 px)
        lo_y, lo_z, hi_y, hi_z = d['bounds']
        bx = dict(left=man['originX'] - hi_y * PPM, right=man['originX'] - lo_y * PPM, top=man['groundY'] - hi_z * PPM, bottom=man['groundY'] - lo_z * PPM)
        cr = man['crop']
        crop_diff = dict(left=round(cr['x'] - bx['left'], 2), right=round(cr['x'] + cr['width'] - bx['right'], 2),
                         top=round(cr['y'] - bx['top'], 2), bottom=round(cr['y'] + cr['height'] - bx['bottom'], 2))
        cmp_max = 0.0
        for g in GUNS:
            for a, b in zip(d['frames'][g], cmp_res[c]['frames'][g]):
                if a and b: cmp_max = max(cmp_max, abs(a['x'] - b['x']), abs(a['y'] - b['y']))
        pix = {}
        if not args.no_pixels:
            for g in GUNS:
                if any(d['frames'][g]):
                    allv = pixel_check(man, folder_dir, d['frames'][g])
                    v = [s for s in allv if s is not None]
                    pix[g] = dict(frames=len(v), noOpaque=len(allv) - len(v), within1_5px=sum(1 for x in v if abs(x) <= 1.5),
                                  median=sorted(v)[len(v) // 2] if v else None, min=min(v) if v else None, max=max(v) if v else None)
        checks[c] = dict(frameCount=man['frameCount'], sampled=n, match=man['frameCount'] == n, cropMinusMeshBoxPx=crop_diff,
                         maxDiffVsLoadout030=round(cmp_max, 6), opaqueBeyondMuzzlePx=pix)
        frames = {}
        for g in GUNS:
            if not any(d['frames'][g]): continue
            frames[g] = [None if m is None else [r4(m['x']), r4(m['y']), round(m['pitch'], 2), round(m['screenPitch'], 2)] for m in d['frames'][g]]
        clips_out[c] = dict(spriteFolder=f"{BASE}/{d['folder']}/{c}", sourceGlb=d['glb'], frameCount=man['frameCount'], fps=man['fps'],
                            loop=d['loop'], closed=d['closed'], originX=man['originX'], groundY=man['groundY'], crop=man['crop'],
                            keyStartFrame=d['keyStart'], keyEndFrame=d['keyEnd'], sampleSourceFrames=[round(s, 4) for s in d['samples']],
                            frames=frames, cues=d['cues'], detectedKicks=dict(sourceFrames=d['kicks'], softSourceFrames=d['softKicks'], fineSourceFrames=d['fineKicks'],
                            intPitch=d['intPitch']))
    out = dict(schema=1, generator='tools/glb_sprites/measure_muzzle_anchors.py',
               units='model units (= Blender units = sprite 200 px/unit; character height ~1.0 = ~1.65 m)',
               axes='x = forward (facing direction, = -Y_world), y = up (= Z_world), from the foot anchor (manifest originX, groundY); '
                    'frame entries are [x, y, pitch3d_deg, screenPitch_deg], pitch + = muzzle up; null = weapon hidden (scale 0)',
               pixelFormula='px_in_frame = originX - crop.x + x*200 ; py_in_frame = groundY - crop.y - y*200 (facing right; mirrored: x_world = foot - x)',
               localMuzzle=local, compareGlb=args.compare, compareLocalMuzzle=cmp_lm, checks=checks, clips=clips_out)
    os.makedirs(os.path.join(ROOT, args.out), exist_ok=True)
    with open(os.path.join(ROOT, args.out, 'muzzle_anchors.json'), 'w', encoding='utf-8') as f:
        json.dump(out, f, ensure_ascii=False, separators=(',', ':'))
    for c, ch in checks.items(): print('CHECK', c, json.dumps(ch, ensure_ascii=False))


main()
