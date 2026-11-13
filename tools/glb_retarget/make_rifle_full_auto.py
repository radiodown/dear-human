"""Retarget the original full-body recoil rhythm to a separate 750 RPM loop.

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

from make_rifle_reload import GLB, axis_rotation, matrix, quaternion, rotation, slerp, swing, unit

NAME = 'rifle_full_auto'
PERIOD = .08
DURATION = 1.6
SHOT_OFFSET = .02
FPS = 200
AIM_ROTATION_GAIN = .12


def smooth(t, a, b):
    u = float(np.clip((t-a)/(b-a), 0, 1))
    return u*u*u*(10+u*(-15+6*u))


def stance(t):
    # One small loss of balance near the middle of the sustained burst. The rear
    # boot lifts before retreating, plants, then makes a separate recovery step.
    brace = smooth(t, .54, .74)*(1-smooth(t, 1.06, 1.46))
    buckle = smooth(t, .56, .69)*(1-smooth(t, .78, 1.03))
    retreat = smooth(t, .66, .88)*(1-smooth(t, 1.14, 1.40))
    def lift(a, b, height):
        u = float(np.clip((t-a)/(b-a), 0, 1))
        return height*math.sin(math.pi*u)**2
    return (np.array([0., -.014*brace-.006*buckle, -.018*brace]),
            np.array([0., lift(.66, .88, .012)+lift(1.14, 1.40, .009), -.040*retreat]),
            brace)


def build(source, output):
    started = time.perf_counter()
    g = GLB(source)
    # Keep the previous file intact, and replace only its full-auto definition.
    original_animations = copy.deepcopy([a for a in g.j['animations'] if a['name'] != NAME])
    g.j['animations'] = copy.deepcopy(original_animations)
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
    aim0 = unit(gun0[:3, 0])
    gun_rotation0 = quaternion(gun0[:3, :3])
    shoulder = by_name['mixamorig:RightShoulder']
    # Pick a point on the rear stock pad nearest the initial shoulder joint.
    # Store that contact in the clavicle frame, before solving either arm.
    vertices = np.vstack([g.read(p['attributes']['POSITION'])
                          for p in g.j['meshes'][nodes[gun_mesh]['mesh']]['primitives']])
    rear_x = float(vertices[:, 0].min())
    pad = vertices[vertices[:, 0] < rear_x+.008]
    shoulder_in_gun = np.linalg.inv(gun0) @ np.r_[world0[by_name['mixamorig:RightArm']][:3, 3], 1]
    stock_local = np.array([rear_x, np.clip(shoulder_in_gun[1], pad[:, 1].min(), pad[:, 1].max()),
                           np.clip(shoulder_in_gun[2], pad[:, 2].min(), pad[:, 2].max())])
    pocket_local = (np.linalg.inv(world0[shoulder]) @ gun0 @ np.r_[stock_local, 1])[:3]
    shoulder_anchor = {'node': nodes[shoulder]['name'], 'stock_local': stock_local.tolist(),
                       'pocket_local': pocket_local.tolist(), 'recoil_direction': aim0.tolist()}
    max_miss = 0.
    max_contact = 0.
    max_leg_miss = 0.
    feet = {side: by_name['mixamorig:'+side+'Foot'] for side in ('Left', 'Right')}
    rear = min(feet, key=lambda side: world0[feet[side]][2, 3])

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
        # Follow this frame's source elbow plane, including its outward/inward
        # response, rather than freezing the elbow to the very first pose.
        ref = e-a
        ref_axis = unit(h-a)
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

    def leg(trs, side, goal):
        nonlocal max_leg_miss
        ids = [by_name['mixamorig:'+side+p] for p in ('UpLeg', 'Leg', 'Foot')]
        world = g.world(trs)
        a, knee, foot = [world[i][:3, 3] for i in ids]
        la, lb = np.linalg.norm(knee-a), np.linalg.norm(foot-knee)
        distance = np.linalg.norm(goal[:3, 3]-a)
        d = float(np.clip(distance, abs(la-lb)+1e-6, (la+lb)*.999))
        max_leg_miss = max(max_leg_miss, abs(distance-d))
        direction = unit(goal[:3, 3]-a)
        # Carry the source knee plane through the balance correction while the
        # foot target stays planted (or follows the explicit recovery step).
        ref = knee-a
        ref_axis = unit(foot-a)
        pole = swing(ref_axis, direction) @ unit(ref-ref_axis*np.dot(ref, ref_axis))
        cosine = float(np.clip((la*la+d*d-lb*lb)/(2*la*d), -1, 1))
        target_knee = a+direction*la*cosine+pole*la*math.sqrt(1-cosine*cosine)
        target_foot = a+direction*d
        set_world(trs, ids[0], matrix(a, quaternion(swing(knee-a, target_knee-a) @ world[ids[0]][:3, :3])))
        world = g.world(trs)
        shin = world[ids[1]].copy()
        shin[:3, :3] = swing(world[ids[2]][:3, 3]-shin[:3, 3], target_foot-target_knee) @ shin[:3, :3]
        set_world(trs, ids[1], shin)
        reached = goal.copy()
        reached[:3, 3] = target_foot
        set_world(trs, ids[2], reached)
        # Fixed boot orientation also fixes the toe during the planted intervals.
        toe = by_name['mixamorig:'+side+'ToeBase']
        trs[toe] = copy.deepcopy(base[toe])

    times = np.linspace(0, DURATION, round(DURATION*FPS)+1)
    frames = []
    for t in times:
        phase = round(float(t % PERIOD), 9)
        if phase >= PERIOD-1e-8:
            phase = 0.
        # Keep the original anticipation, impact and recovery order. The original
        # flash at 2/24 sec maps exactly to the existing full-auto 20 ms cue.
        source_cue, source_duration = 2/24, .25
        source_time = (phase/SHOT_OFFSET*source_cue if phase <= SHOT_OFFSET else
                       source_cue+(phase-SHOT_OFFSET)/(PERIOD-SHOT_OFFSET)*(source_duration-source_cue))
        trs = g.sample('gunplay_auto', source_time)
        # The old weapon/arm tracks have different endpoints. Close only their
        # final recovery segment rather than snapping them on every fast shot.
        blend = np.clip((phase-.065)/.015, 0, 1)
        blend = blend*blend*(3-2*blend)
        for i in range(len(trs)):
            trs[i][0] = trs[i][0]*(1-blend)+base[i][0]*blend
            trs[i][1] = slerp(trs[i][1], base[i][1], blend)
            trs[i][2] = trs[i][2]*(1-blend)+base[i][2]*blend
        # Hips, every spine segment, neck, head, shoulders and leg response come
        # from the original clip, including their relative delays and directions.
        gun = g.world(trs)[gun_mesh].copy()
        body_offset, rear_offset, brace = stance(t)
        hips = by_name['mixamorig:Hips']
        pelvis = g.world(trs)[hips].copy()
        pelvis[:3, 3] += body_offset
        set_world(trs, hips, pelvis)
        spine = by_name['mixamorig:Spine1']
        torso = g.world(trs)[spine].copy()
        torso[:3, :3] = axis_rotation([1, 0, 0], -.9*brace) @ torso[:3, :3]
        set_world(trs, spine, torso)
        for side, index in feet.items():
            target = world0[index].copy()
            if side == rear:
                target[:3, 3] += rear_offset
            leg(trs, side, target)
        # Stabilize the barrel angle, but never freeze the gun in world space.
        # The stock follows the live shoulder pocket through the entire brace,
        # dip and recovery; only the short axial recoil compresses this contact.
        gun[:3, :3] = rotation(slerp(gun_rotation0, quaternion(gun[:3, :3]), AIM_ROTATION_GAIN))
        kick = smooth(phase, SHOT_OFFSET, .030)*(1-smooth(phase, .030, .075))
        pocket = (g.world(trs)[shoulder] @ np.r_[pocket_local, 1])[:3]
        gun[:3, 3] = pocket-aim0*(.0035*kick)-gun[:3, :3] @ stock_local
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
        'sample_rate': FPS, 'source_motion': 'gunplay_auto full body @ 0..0.25',
        'recovery_seam_blend': [.065, .08], 'loop': True,
        'aim_rotation_gain': AIM_ROTATION_GAIN, 'axial_recoil': .0035,
        'shoulder_anchor': shoulder_anchor,
        'limb_planes': 'per-frame source elbow and knee planes',
        'stance': {'rear_foot': rear, 'brace': [.54, .74, 1.06, 1.46],
                   'retreat_step': [.66, .88], 'recover_step': [1.14, 1.40], 'retreat_distance': .04}}}
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
    assert max_leg_miss < 1e-6, max_leg_miss
    g.save(output)
    digest = lambda p: hashlib.sha256(Path(p).read_bytes()).hexdigest()
    report = {'recipe_key': 'ar12_full_auto_shoulder_follow_005', 'source': str(source), 'source_sha256': digest(source),
              'output': str(output), 'output_sha256': digest(output), 'clip': NAME,
              'duration': DURATION, 'fps': FPS, 'frames': len(frames), 'rpm': 750,
              'shot_times': animation['extras']['shot_times'], 'preserved_clips': [a['name'] for a in original_animations],
              'original_binary_preserved': True, 'max_ik_reach_miss': max_miss, 'max_hand_contact_error': max_contact,
              'max_leg_reach_miss': max_leg_miss, 'stance': animation['extras']['stance'],
              'aim_rotation_gain': AIM_ROTATION_GAIN, 'axial_recoil': .0035,
              'shoulder_anchor': shoulder_anchor,
              'elapsed_seconds': time.perf_counter()-started, 'paid_api_calls': 0, 'art_status': 'awaiting_user_review'}
    Path(output).with_suffix('.json').write_text(json.dumps(report, ensure_ascii=False, indent=2)+'\n', encoding='utf8')
    print(json.dumps(report, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    build(Path(sys.argv[1]), Path(sys.argv[2]))
