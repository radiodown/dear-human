"""Append a planted, two-hand AR-12 full-auto loop; preserve the input GLB.

python tools/glb_retarget/make_rifle_full_auto.py INPUT.glb OUTPUT.glb
Uses the existing numpy GLB/transform helpers; no Blender or paid generation.
"""
import copy
import hashlib
import json
import math
from pathlib import Path
import sys
import time

import numpy as np

from make_rifle_reload import GLB, axis_rotation, matrix, quaternion, swing, unit

NAME = 'rifle_full_auto'
PERIOD = .08
DURATION = 1.6
SHOT_OFFSET = .02
FPS = 200


def pulse(t):
    """10 ms kick, 60 ms recovery, 10 ms settled; periodic with zero seam slope."""
    age = (t - SHOT_OFFSET) % PERIOD
    if age < .01:
        u = age / .01
        return u*u*(3-2*u)
    u = min(1., (age-.01)/.06)
    return 1-u*u*(3-2*u)


def build(source, output):
    started = time.perf_counter()
    g = GLB(source)
    assert not any(a['name'] == NAME for a in g.j['animations'])
    original_animations = copy.deepcopy(g.j['animations'])
    original_binary = bytes(g.bin)
    nodes = g.j['nodes']
    by_name = {n.get('name'): i for i, n in enumerate(nodes)}
    parents = {c: i for i, n in enumerate(nodes) for c in n.get('children', [])}
    gun_bone = by_name['weapon']
    gun_mesh = next(c for c in nodes[gun_bone]['children'] if 'mesh' in nodes[c])
    base = g.sample('gunplay_auto', 0)
    world0 = g.world(base)
    gun0 = world0[gun_mesh]
    mesh_local_inv = np.linalg.inv(matrix(*base[gun_mesh]))
    hands = {side: by_name['mixamorig:'+side+'Hand'] for side in ('Left', 'Right')}
    offsets = {side: np.linalg.inv(gun0) @ world0[i] for side, i in hands.items()}
    pivot = world0[by_name['mixamorig:RightArm']][:3, 3]
    max_miss = 0.
    max_contact = 0.

    def set_world(trs, index, desired):
        world = g.world(trs)
        local = np.linalg.inv(world[parents[index]]) @ desired if index in parents else desired
        scale = np.linalg.norm(local[:3, :3], axis=0)
        trs[index] = [local[:3, 3].copy(), quaternion(local[:3, :3]/scale), scale]

    def arm(trs, side, goal):
        nonlocal max_miss
        ids = [by_name['mixamorig:'+side+p] for p in ('Arm', 'ForeArm', 'Hand')]
        world = g.world(trs)
        a, e, h = [world[i][:3, 3] for i in ids]
        la, lf = np.linalg.norm(e-a), np.linalg.norm(h-e)
        delta = goal[:3, 3]-a
        distance = np.linalg.norm(delta)
        d = np.clip(distance, abs(la-lf)+1e-6, (la+lf)*.999)
        max_miss = max(max_miss, float(abs(distance-d)))
        direction = unit(delta)
        ref = world0[ids[1]][:3, 3]-world0[ids[0]][:3, 3]
        ref_axis = unit(world0[ids[2]][:3, 3]-world0[ids[0]][:3, 3])
        pole = swing(ref_axis, direction) @ unit(ref-ref_axis*np.dot(ref, ref_axis))
        cosine = np.clip((la*la+d*d-lf*lf)/(2*la*d), -1, 1)
        elbow = a+direction*la*cosine+pole*la*math.sqrt(1-cosine*cosine)
        wrist = a+direction*d
        set_world(trs, ids[0], matrix(a, quaternion(swing(e-a, elbow-a) @ world[ids[0]][:3, :3])))
        world = g.world(trs)
        fore = world[ids[1]].copy()
        fore[:3, :3] = swing(world[ids[2]][:3, 3]-fore[:3, 3], wrist-elbow) @ fore[:3, :3]
        set_world(trs, ids[1], fore)
        reached = goal.copy()
        reached[:3, 3] = wrist
        set_world(trs, ids[2], reached)

    times = np.linspace(0, DURATION, round(DURATION*FPS)+1)
    frames = []
    for t in times:
        trs = copy.deepcopy(base)
        # Small delayed upper-body absorption, with pelvis/legs kept planted.
        for name, delay, degrees in [('Spine1', .015, .32), ('Head', .03, .20)]:
            i = by_name['mixamorig:'+name]
            w = g.world(trs)[i].copy()
            w[:3, :3] = axis_rotation([1, 0, 0], -degrees*pulse(t-delay)) @ w[:3, :3]
            set_world(trs, i, w)
        kick = pulse(t)
        variation = 1+.10*math.sin(2*math.pi*t/DURATION)
        turn = axis_rotation([1, 0, 0], -1.7*kick*variation)
        gun = gun0.copy()
        gun[:3, :3] = turn @ gun0[:3, :3]
        gun[:3, 3] = pivot+turn @ (gun0[:3, 3]-pivot)+np.array([0, 0, -.0045*kick])
        set_world(trs, gun_bone, gun @ mesh_local_inv)
        for side in hands:
            arm(trs, side, gun @ offsets[side])
        world = g.world(trs)
        for side, hand in hands.items():
            max_contact = max(max_contact, float(np.linalg.norm(world[hand][:3, 3]-(gun @ offsets[side])[:3, 3])))
        frames.append(trs)
    # Identical first/last keys for a seamless steady automatic loop.
    frames[-1] = copy.deepcopy(frames[0])
    animation = {'name': NAME, 'channels': [], 'samplers': [], 'extras': {
        'rpm': 750, 'shot_interval': PERIOD, 'shot_times': [round(SHOT_OFFSET+i*PERIOD, 6) for i in range(20)],
        'sample_rate': FPS, 'source_pose': 'gunplay_auto @ 0', 'loop': True}}
    time_accessor = g.append(times.reshape(-1, 1), 'SCALAR')
    for i, node in enumerate(nodes):
        if 'matrix' in node:
            continue
        for component, path, kind in [(0, 'translation', 'VEC3'), (1, 'rotation', 'VEC4'), (2, 'scale', 'VEC3')]:
            values = np.array([f[i][component] for f in frames])
            if component == 1:
                for k in range(1, len(values)):
                    if np.dot(values[k-1], values[k]) < 0:
                        values[k] *= -1
            # Constant tracks need only two keys; include them to restore reload state.
            constant = np.max(np.abs(values-values[0])) < 1e-9
            input_id = g.append([[0], [DURATION]], 'SCALAR') if constant else time_accessor
            values = values[[0, -1]] if constant else values
            sampler = len(animation['samplers'])
            animation['samplers'].append({'input': input_id, 'output': g.append(values, kind), 'interpolation': 'LINEAR'})
            animation['channels'].append({'sampler': sampler, 'target': {'node': i, 'path': path}})
    g.j['animations'].append(animation)
    assert g.j['animations'][:-1] == original_animations
    assert bytes(g.bin[:len(original_binary)]) == original_binary
    assert max_miss < 1e-6 and max_contact < 1e-6, (max_miss, max_contact)
    g.save(output)
    digest = lambda p: hashlib.sha256(Path(p).read_bytes()).hexdigest()
    report = {'recipe_key': 'ar12_full_auto_001', 'source': str(source), 'source_sha256': digest(source),
              'output': str(output), 'output_sha256': digest(output), 'clip': NAME,
              'duration': DURATION, 'fps': FPS, 'frames': len(frames), 'rpm': 750,
              'shot_times': animation['extras']['shot_times'], 'preserved_clips': [a['name'] for a in original_animations],
              'original_binary_preserved': True, 'max_ik_reach_miss': max_miss, 'max_hand_contact_error': max_contact,
              'elapsed_seconds': time.perf_counter()-started, 'paid_api_calls': 0, 'art_status': 'awaiting_user_review'}
    Path(output).with_suffix('.json').write_text(json.dumps(report, ensure_ascii=False, indent=2)+'\n', encoding='utf8')
    print(json.dumps(report, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    build(Path(sys.argv[1]), Path(sys.argv[2]))
