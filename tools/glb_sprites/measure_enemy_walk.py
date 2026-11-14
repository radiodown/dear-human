"""Measure enemy (mob.glb) walk ground speed. Read-only; writes JSON.
blender -b --python tools/glb_sprites/measure_enemy_walk.py -- <out.json>
Forward = -Y (Blender, after glTF import). Units: Blender metres; sprite px = metres*200.
"""
import bpy, os, sys, json, statistics
from mathutils import Vector
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
out = sys.argv[sys.argv.index('--') + 1]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=os.path.join(ROOT, 'art/enemies/vesper_colony_insect/motion/glb_model_001/source/mob.glb'))
arm = next(o for o in bpy.data.objects if o.type == 'ARMATURE')
sc = bpy.context.scene
legs = sorted(b.name for b in arm.pose.bones if b.name.startswith('leg_'))
print('BONES', [b.name for b in arm.pose.bones])
ends = {}  # leg id -> last bone name
for n in legs:
    _, order, idx, side = n.split('_')
    if order not in ends.setdefault(f'{order}_{side}', {}) and False: pass
    ends[f'{order}_{side}'][int(idx)] = n
res = {}
for clip in ('walk', 'walk_fast'):
    act = bpy.data.actions[clip]; arm.animation_data.action = act
    if act.slots: arm.animation_data.action_slot = act.slots[0]
    s, e = int(act.frame_range[0]), int(act.frame_range[1])
    period_s = (e - s) / 24.0
    def sample(frames):
        tr = {k: [] for k in ends}; root = []; ts = []
        for f in frames:
            sc.frame_set(f); bpy.context.view_layer.update()
            ts.append((f - s) / 24.0)
            root.append((arm.matrix_world @ arm.pose.bones['tripo::Root'].head).copy())
            for k, d in ends.items():
                b = arm.pose.bones[d[max(d)]]
                tr[k].append((arm.matrix_world @ b.tail).copy())
        return ts, tr, root
    def analyse(frames, label):
        ts, tr, root = sample(frames)
        T = ts[-1] - ts[0]
        rv = [(-(root[-1].y - root[0].y)) / T, (root[-1].x - root[0].x) / T]
        legres = {}
        for k, pts in tr.items():
            zs = [p.z for p in pts]; zmin = min(zs); zmax = max(zs)
            thr = zmin + 0.25 * (zmax - zmin)
            # stance run: consecutive frames below thr, forward = -y ; speed from fit slope (backward = positive)
            idx = [i for i in range(len(pts) - 1) if zs[i] <= thr and zs[i + 1] <= thr]
            sp = [-((-(pts[i + 1].y - pts[i].y))) / (ts[i + 1] - ts[i]) for i in idx]  # backward speed = +dy/dt... forward=-y -> backward = +dy
            sp = [(pts[i + 1].y - pts[i].y) / (ts[i + 1] - ts[i]) for i in idx]
            legres[k] = dict(stride=max(-p.y for p in pts) - min(-p.y for p in pts), lift=zmax - zmin, stance_n=len(idx),
                             stance_speed_mean=statistics.mean(sp) if sp else None)
        allv = [v['stance_speed_mean'] for v in legres.values() if v['stance_speed_mean'] is not None]
        return dict(label=label, period_s=T, root_forward_speed=rv[0], root_lateral_speed=rv[1], legs=legres,
                    foot_mean=statistics.mean(allv), foot_median=statistics.median(allv), foot_min=min(allv), foot_max=max(allv))
    # renderer sampling: every 2nd frame, loop excludes final key (copy of first)
    r12 = analyse(list(range(s, e, 2)) + [e], '12fps-keys(+closing key)')
    r24 = analyse(list(range(s, e + 1)), '24fps')
    res[clip] = dict(frames=[s, e], period_clip_s=period_s, sampled12=r12, sampled24=r24)
json.dump(res, open(out, 'w'), indent=1)
