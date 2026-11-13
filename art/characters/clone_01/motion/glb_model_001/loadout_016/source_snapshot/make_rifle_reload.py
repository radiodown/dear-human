"""Append Lian's AR-12 magazine-change clip without re-exporting existing clips.

Python + numpy; glTF coordinates (+Y up, character forward +Z).
Usage: python tools/glb_retarget/make_rifle_reload.py INPUT.glb OUTPUT.glb [FULL_AUTO_SOURCE.glb]
"""
import copy
import hashlib
import json
import math
from pathlib import Path
import struct
import sys
import time

import numpy as np


def unit(v):
    return np.asarray(v, dtype=float) / max(np.linalg.norm(v), 1e-12)


def rotation(q):
    x, y, z, w = unit(q)
    return np.array([[1-2*(y*y+z*z), 2*(x*y-z*w), 2*(x*z+y*w)],
                     [2*(x*y+z*w), 1-2*(x*x+z*z), 2*(y*z-x*w)],
                     [2*(x*z-y*w), 2*(y*z+x*w), 1-2*(x*x+y*y)]])


def quaternion(m):
    # Symmetric eigenproblem is stable even for rotations close to 180 degrees.
    xx, xy, xz = m[0]; yx, yy, yz = m[1]; zx, zy, zz = m[2]
    k = np.array([[xx-yy-zz, xy+yx, xz+zx, zy-yz],
                  [xy+yx, yy-xx-zz, yz+zy, xz-zx],
                  [xz+zx, yz+zy, zz-xx-yy, yx-xy],
                  [zy-yz, xz-zx, yx-xy, xx+yy+zz]]) / 3
    _, v = np.linalg.eigh(k)
    q = v[:, -1]
    return q if q[3] >= 0 else -q


def axis_rotation(axis, degrees):
    a = math.radians(degrees) / 2
    return rotation(np.r_[unit(axis) * math.sin(a), math.cos(a)])


def swing(a, b):
    a, b = unit(a), unit(b)
    c = float(np.dot(a, b))
    if c < -.999999:
        return axis_rotation(np.cross(a, [1, 0, 0] if abs(a[0]) < .8 else [0, 1, 0]), 180)
    return rotation(np.r_[np.cross(a, b), 1+c])


def slerp(a, b, t):
    a, b = unit(a), unit(b)
    if np.dot(a, b) < 0: b = -b
    c = np.clip(np.dot(a, b), -1, 1)
    if c > .9995: return unit(a*(1-t)+b*t)
    angle = math.acos(c)
    return (a*math.sin((1-t)*angle)+b*math.sin(t*angle))/math.sin(angle)


def matrix(t=(0, 0, 0), q=(0, 0, 0, 1), s=(1, 1, 1)):
    m = np.eye(4); m[:3, :3] = rotation(q) @ np.diag(s); m[:3, 3] = t
    return m


def pose_mix(a, b, t):
    return matrix(a[:3, 3]*(1-t)+b[:3, 3]*t, slerp(quaternion(a[:3, :3]), quaternion(b[:3, :3]), t))


class GLB:
    def __init__(self, path):
        raw = Path(path).read_bytes()
        size = struct.unpack_from('<I', raw, 12)[0]
        self.j = json.loads(raw[20:20+size])
        self.bin = bytearray(raw[28+size:])

    def read(self, index):
        a = self.j['accessors'][index]; v = self.j['bufferViews'][a['bufferView']]
        dt = np.dtype({5121:'u1',5123:'<u2',5125:'<u4',5126:'<f4'}[a['componentType']])
        width = {'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4,'MAT4':16}[a['type']]
        return np.ndarray((a['count'], width), dtype=dt, buffer=self.bin,
                          offset=v.get('byteOffset',0)+a.get('byteOffset',0),
                          strides=(v.get('byteStride',width*dt.itemsize),dt.itemsize)).copy()

    def append(self, values, kind, component=5126):
        values = np.asarray(values, dtype={5126:'<f4',5125:'<u4'}[component])
        self.bin.extend(b'\0' * (-len(self.bin) % 4))
        view = len(self.j['bufferViews'])
        self.j['bufferViews'].append({'buffer':0,'byteOffset':len(self.bin),'byteLength':values.nbytes})
        self.bin.extend(values.tobytes())
        a = {'bufferView':view,'componentType':component,'count':len(values),'type':kind}
        if kind == 'SCALAR': a.update(min=[float(values.min())],max=[float(values.max())])
        if kind == 'VEC3': a.update(min=values.min(axis=0).tolist(),max=values.max(axis=0).tolist())
        index = len(self.j['accessors']); self.j['accessors'].append(a)
        return index

    def save(self, path):
        self.bin.extend(b'\0' * (-len(self.bin) % 4))
        self.j['buffers'][0]['byteLength'] = len(self.bin)
        data = json.dumps(self.j, ensure_ascii=False, separators=(',',':')).encode('utf8')
        data += b' ' * (-len(data) % 4)
        raw = struct.pack('<III',0x46546C67,2,28+len(data)+len(self.bin))
        raw += struct.pack('<II',len(data),0x4E4F534A)+data
        raw += struct.pack('<II',len(self.bin),0x004E4942)+self.bin
        Path(path).parent.mkdir(parents=True, exist_ok=True); Path(path).write_bytes(raw)

    def sample(self, name, t):
        nodes = self.j['nodes']
        trs = [[np.array(n.get('translation',[0,0,0]),float),np.array(n.get('rotation',[0,0,0,1]),float),
                np.array(n.get('scale',[1,1,1]),float)] for n in nodes]
        anim = next(a for a in self.j['animations'] if a['name']==name)
        for ch in anim['channels']:
            sa = anim['samplers'][ch['sampler']]; ts = self.read(sa['input'])[:,0]; vs = self.read(sa['output'])
            i = min(max(int(np.searchsorted(ts,t,side='right'))-1,0),len(ts)-1); e = min(i+1,len(ts)-1)
            u = np.clip((t-ts[i])/(ts[e]-ts[i]),0,1) if e!=i else 0
            p = ch['target']['path']
            interpolation = sa.get('interpolation','LINEAR')
            if interpolation == 'STEP': val = vs[i]
            elif interpolation == 'LINEAR': val = slerp(vs[i],vs[e],u) if p=='rotation' else vs[i]*(1-u)+vs[e]*u
            else: raise ValueError('Unsupported interpolation: '+interpolation)
            trs[ch['target']['node']][{'translation':0,'rotation':1,'scale':2}[p]] = val
        return trs

    def world(self, trs):
        out = {}; parents = {c:i for i,n in enumerate(self.j['nodes']) for c in n.get('children',[])}
        def visit(i):
            if i not in out:
                n = self.j['nodes'][i]
                local = np.array(n['matrix']).reshape(4,4).T if 'matrix' in n else matrix(*trs[i])
                out[i] = visit(parents[i]) @ local if i in parents else local
            return out[i]
        for i in range(len(trs)): visit(i)
        return out


def ease(t, a, b):
    u = np.clip((t-a)/(b-a), 0, 1)
    return u*u*u*(10+u*(-15+6*u))


def travel(t, keys, velocities=None):
    """C1 Hermite path: pass through guide points without stopping at each one.

    Explicit end tangents keep extraction/insertion aligned with the magazine well.
    The intervening points shape clearance around the torso, not additional holds.
    """
    ts = np.array([k[0] for k in keys]); ps = np.array([k[1] for k in keys])
    if t <= ts[0]: return ps[0].copy()
    if t >= ts[-1]: return ps[-1].copy()
    slopes = np.zeros_like(ps)
    for i in range(1,len(ts)-1):
        slopes[i] = .8*(ps[i+1]-ps[i-1])/(ts[i+1]-ts[i-1])
    for i,v in (velocities or {}).items(): slopes[i] = v
    i = int(np.searchsorted(ts,t,side='right'))-1
    dt = ts[i+1]-ts[i]; u = (t-ts[i])/dt
    return ((2*u**3-3*u*u+1)*ps[i] + (u**3-2*u*u+u)*dt*slopes[i]
            + (-2*u**3+3*u*u)*ps[i+1] + (u**3-u*u)*dt*slopes[i+1])


def split_magazine(g, prim):
    """Clip triangles at the magazine well, interpolating UVs/normals at every new edge.

    Selecting whole triangles tears this low-poly scan into spikes: many magazine faces
    extend through the receiver. Exact clipping preserves the seated silhouette instead.
    """
    attrs = prim['attributes']
    data = np.column_stack([g.read(attrs[k]) for k in ('POSITION','NORMAL','TEXCOORD_0')])
    faces = g.read(prim['indices']).reshape(-1,3)
    body, mag, rim = [],[],[]

    def clip(poly, axis, limit, sign):
        inside, outside = [],[]
        for a,b in zip(poly,poly[1:]+poly[:1]):
            da,db = sign*(a[axis]-limit),sign*(b[axis]-limit)
            (inside if da<=0 else outside).append(a)
            if (da<0 and db>0) or (da>0 and db<0):
                point=a+(b-a)*(da/(da-db)); inside.append(point); outside.append(point)
                if axis==1: rim.append(point[:3])
        return inside,outside

    def triangles(poly, dest):
        for i in range(1,len(poly)-1): dest.extend([poly[0],poly[i],poly[i+1]])

    for f in faces:
        poly = list(data[f])
        for axis,limit,sign in [(0,-.061,-1),(0,.022,1),(1,.071,1)]:
            if len(poly)<3: break
            poly,outside=clip(poly,axis,limit,sign)
            triangles(outside,body)
        triangles(poly,mag)

    def primitive(rows, material):
        rows=np.asarray(rows)
        normals=rows[:,3:6]; normals/=np.maximum(np.linalg.norm(normals,axis=1)[:,None],1e-12)
        return {'attributes':{'POSITION':g.append(rows[:,:3],'VEC3'),
                              'NORMAL':g.append(normals,'VEC3'),
                              'TEXCOORD_0':g.append(rows[:,6:8],'VEC2')},'material':material}

    body_prim=primitive(body,prim['material']); mag_prim=primitive(mag,prim['material'])
    # Close the cut top and darken the exposed magazine well. Convex hull of the cut rim.
    points=sorted(set((round(float(p[0]),7),round(float(p[2]),7)) for p in rim))
    def cross(a,b,c): return (b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0])
    lo=[]; hi=[]
    for target,seq in [(lo,points),(hi,reversed(points))]:
        for point in seq:
            while len(target)>1 and cross(target[-2],target[-1],point)<=0: target.pop()
            target.append(point)
    hull=lo[:-1]+hi[:-1]
    material=len(g.j['materials'])
    g.j['materials'].append({'name':'AR12_magazine_cut_interior',
                            'pbrMetallicRoughness':{'baseColorFactor':[.055,.06,.065,1],
                                                  'metallicFactor':.35,'roughnessFactor':.65},'doubleSided':True})
    caps=[]
    for direction,offset in [(1,0),(-1,.0004)]:
        poly=[np.array([x,.071+offset,z,0,direction,0,0,0]) for x,z in hull]
        rows=[]; triangles(poly,rows); caps.append(primitive(rows,material))
    return [body_prim,caps[1]],[mag_prim,caps[0]],len(mag)//3


def build(source, output, full_auto_source=None):
    started = time.perf_counter()
    g = GLB(source); j = g.j; nodes = j['nodes']
    original_animations = copy.deepcopy(j['animations'])
    by_name = {n.get('name'):i for i,n in enumerate(nodes)}
    gun_node = next(i for i,n in enumerate(nodes) if n.get('name')=='weapon' and 'mesh' in n)
    gun_bone = by_name['weapon']
    prim = j['meshes'][nodes[gun_node]['mesh']]['primitives'][0]
    if hashlib.sha256(Path(source).read_bytes()).hexdigest() != 'c996e43679e6f0930fb46e9d0f45bedf6aba8bca627ce1690cad0ca972f5f767':
        raise ValueError('This recipe requires the recorded Lian AR-12 loadout_007 input')
    body_prims,mag_prims,mag_triangles=split_magazine(g,prim)
    j['meshes'][nodes[gun_node]['mesh']]['primitives']=body_prims
    mag_mesh = len(j['meshes'])
    j['meshes'].append({'name':'AR12_detachable_magazine','primitives':mag_prims})
    old_mag, new_mag = len(nodes),len(nodes)+1
    nodes.extend([{'name':'reload_magazine_old','mesh':mag_mesh},
                  {'name':'reload_magazine_fresh','mesh':mag_mesh,'scale':[0,0,0]}])
    nodes[gun_node].setdefault('children',[]).extend([old_mag,new_mag])
    parents = {c:i for i,n in enumerate(nodes) for c in n.get('children',[])}
    base = g.sample('rifle_aim_idle',0)
    world0 = g.world(base); gun0 = world0[gun_node]
    hands = {s:by_name['mixamorig:'+s+'Hand'] for s in ('Left','Right')}
    hand_offset = {s:np.linalg.inv(gun0) @ world0[h] for s,h in hands.items()}
    right_pivot = world0[hands['Right']][:3,3]
    mag_center = np.array([-.027,.037,0])
    pouch = np.array([.065,.635,.075])
    # Cup the base of the magazine with the existing support-hand orientation.
    # Do not flip the wrist 180 degrees to force the fingers up its side.
    mag_hand = hand_offset['Left'].copy()
    middle = by_name['mixamorig:LeftHandMiddle1']
    palm = (world0[hands['Left']][:3,3]+world0[middle][:3,3])*.5
    palm_local = (np.linalg.inv(world0[hands['Left']]) @ np.r_[palm,1])[:3]
    mag_hand[:3,3] = np.array([-.025,-.008,-.006])-mag_hand[:3,:3] @ palm_local
    # Infer flexion axes from each finger's existing bend, keeping the authored grip.
    # Opening around the opposite direction avoids assuming a shared local bone axis.
    finger_axes = {}
    for finger in ('Index','Middle','Ring','Pinky','Thumb'):
        ids = [by_name['mixamorig:LeftHand'+finger+str(k)] for k in range(1,5)]
        directions = [unit(world0[b][:3,3]-world0[a][:3,3]) for a,b in zip(ids,ids[1:])]
        for k,i in enumerate(ids[:3]):
            a,b = directions[min(k,1)],directions[min(k+1,2)]
            axis = np.cross(a,b)
            if np.linalg.norm(axis) > 1e-5:
                finger_axes[i] = (finger,k,world0[i][:3,:3].T @ unit(axis))
    duration, fps = 2.65, 60
    times = np.linspace(0,duration,round(duration*fps)+1)
    frames = []; max_miss = {'Left':0.,'Right':0.}; contact_errors = []

    def set_world(trs, index, desired):
        world = g.world(trs)
        local = np.linalg.inv(world[parents[index]]) @ desired if index in parents else desired
        scale = np.linalg.norm(local[:3,:3],axis=0)
        trs[index] = [local[:3,3].copy(),quaternion(local[:3,:3]/scale),scale]

    def solve_arm(trs, side, goal, amount):
        ids = [by_name['mixamorig:'+side+p] for p in ('Arm','ForeArm','Hand')]
        world = g.world(trs); a,e,h = [world[i][:3,3] for i in ids]
        la,lf = np.linalg.norm(e-a),np.linalg.norm(h-e)
        delta = goal[:3,3]-a; distance = np.linalg.norm(delta)
        d = np.clip(distance,abs(la-lf)+1e-6,(la+lf)*.995); direction = unit(delta)
        max_miss[side] = max(max_miss[side],float(abs(distance-d)))
        ref_el = world0[ids[1]][:3,3]-world0[ids[0]][:3,3]
        ref_axis = unit(world0[ids[2]][:3,3]-world0[ids[0]][:3,3])
        ref_pole = unit(ref_el-ref_axis*np.dot(ref_el,ref_axis))
        # Transport the original elbow plane as the wrist moves. Projecting a fixed
        # downward pole becomes singular when the wrist passes below the shoulder.
        pole = swing(ref_axis,direction) @ ref_pole
        if side == 'Left': pole = axis_rotation(direction,amount) @ pole
        cos_a = np.clip((la*la+d*d-lf*lf)/(2*la*d),-1,1)
        elbow = a+direction*la*cos_a+pole*la*math.sqrt(1-cos_a*cos_a)
        wrist = a+direction*d
        ra = swing(e-a,elbow-a) @ world[ids[0]][:3,:3]
        upper = matrix(a,quaternion(ra)); set_world(trs,ids[0],upper)
        world = g.world(trs)
        fore = world[ids[1]].copy()
        ref_fore = world0[ids[2]][:3,3]-world0[ids[1]][:3,3]
        fore[:3,:3] = swing(ref_fore,wrist-elbow) @ world0[ids[1]][:3,:3]
        set_world(trs,ids[1],fore)
        # Share pronation with the forearm instead of putting the entire roll in the wrist.
        predicted = g.world(trs)[ids[2]][:3,:3]
        fore_axis = unit(wrist-elbow)
        # Use all three axes: any single axis can become parallel to the forearm,
        # making its projected angle unstable during insertion.
        pa = predicted-np.outer(fore_axis,fore_axis @ predicted)
        pb = goal[:3,:3]-np.outer(fore_axis,fore_axis @ goal[:3,:3])
        sine = sum(np.dot(fore_axis,np.cross(pa[:,k],pb[:,k])) for k in range(3))
        roll = math.degrees(math.atan2(sine,np.sum(pa*pb)))
        fore[:3,:3] = axis_rotation(fore_axis,roll*.65) @ fore[:3,:3]
        set_world(trs,ids[1],fore)
        reached = goal.copy(); reached[:3,3] = wrist
        set_world(trs,ids[2],reached)

    for t in times:
        trs = copy.deepcopy(base)
        tilt = ease(t,.08,.38)*(1-ease(t,2.12,2.55))
        reach = ease(t,.18,.51)
        release = ease(t,1.79,2.18)
        grasp = reach*(1-release)
        seat_bump = math.exp(-((t-1.71)/.035)**2)
        carry_weight = ease(t,.56,.94)*(1-ease(t,1.25,1.85))
        # The torso anticipates the reach; the head follows slightly later.
        for bone, yaw, pitch in [('Spine1',-3,1.5),('Head',-7,5)]:
            i = by_name['mixamorig:'+bone]; w = g.world(trs)[i].copy()
            follow = tilt if bone == 'Spine1' else ease(t,.16,.48)*(1-ease(t,2.03,2.46))
            w[:3,:3] = axis_rotation([0,1,0],yaw*follow-1.5*carry_weight) @ axis_rotation([1,0,0],pitch*follow) @ w[:3,:3]
            set_world(trs,i,w)
        shoulder = by_name['mixamorig:LeftShoulder']
        trs[shoulder][1] = quaternion(rotation(base[shoulder][1]) @ axis_rotation([0,0,1],2.5*carry_weight))
        cant = axis_rotation([1,0,0],35*tilt)
        pitch = axis_rotation([0,0,1],13*tilt+1.5*seat_bump-.8*carry_weight)
        gun = gun0.copy(); gun[:3,:3] = gun0[:3,:3] @ pitch @ cant
        pivot_local = (np.linalg.inv(gun0) @ np.r_[right_pivot,1])[:3]
        gun[:3,3] = (right_pivot + np.array([.032,-.018,.018])*tilt
                     + np.array([.002,-.003,.002])*carry_weight - gun[:3,:3] @ pivot_local)
        # Keep the mesh's existing bone attachment transform; animate the weapon bone.
        set_world(trs,gun_bone,gun @ np.linalg.inv(matrix(*base[gun_node])))
        center = (gun @ np.r_[mag_center,1])[:3]
        up = gun[:3,1]
        clear = center-up*.085
        align = center-up*.052
        # One shared continuous trajectory across the pouch exchange. Carry the
        # magazine around the torso rather than stopping at disconnected linear legs.
        keys = [(.53,center),(.69,clear),
                (.86,clear*.48+pouch*.52+np.array([.020,.005,.025])),
                (1.04,pouch+np.array([0,.003,0])),(1.10,pouch),
                (1.17,pouch+np.array([.006,.007,.007])),
                (1.34,pouch*.47+align*.53+np.array([.025,.002,.027])),
                (1.49,align),(1.69,center)]
        position = travel(t,keys,{1:-up*.40,3:np.array([0,-.05,0]),
                                  4:np.array([.035,.015,.025]),7:up*.34})
        turn = ease(t,.66,1.02)*(1-ease(t,1.19,1.64))
        carried = gun.copy()
        carried[:3,:3] = axis_rotation([0,1,0],-18*turn) @ gun[:3,:3] @ axis_rotation([1,0,0],7*turn)
        carried[:3,3] = position-carried[:3,:3] @ mag_center
        if t <= .53 or t >= 1.69: carried = gun.copy()
        # A small wrist adjustment around the palm contact, rather than translating
        # the palm off the magazine. The wrist arrives a little after the reach.
        grip = mag_hand.copy()
        wrist_roll = 6*ease(t,.62,.92)*(1-ease(t,1.22,1.63))
        grip[:3,:3] = mag_hand[:3,:3] @ axis_rotation([0,1,0],wrist_roll)
        grip[:3,3] = mag_hand[:3,3]+mag_hand[:3,:3] @ palm_local-grip[:3,:3] @ palm_local
        support = gun @ hand_offset['Left']
        left_goal = pose_mix(support,carried @ grip,grasp)
        orientation_grasp = ease(t,.24,.53)*(1-ease(t,1.75,2.14))
        left_goal[:3,:3] = pose_mix(support,carried @ grip,orientation_grasp)[:3,:3]
        approach_arc = 16*reach*reach*(1-reach)*(1-reach)
        return_arc = 16*release*release*(1-release)*(1-release)
        left_goal[:3,3] += np.array([.012,-.018,.010])*approach_arc + np.array([.018,-.020,.014])*return_arc
        right_goal = gun @ hand_offset['Right']
        solve_arm(trs,'Right',right_goal,tilt)
        elbow_follow = -7*ease(t,.42,.95)+11*ease(t,1.10,1.50)-4*ease(t,1.80,2.30)
        solve_arm(trs,'Left',left_goal,elbow_follow)
        # Open before contact/release, then close fingers at slightly staggered times.
        for i,(finger,k,axis) in finger_axes.items():
            delay = ('Index','Middle','Ring','Pinky','Thumb').index(finger)*.012
            opening = (ease(t,.13,.28)*(1-ease(t,.36+delay,.49+delay))
                       + ease(t,1.76+delay,1.88+delay)*(1-ease(t,2.06+delay,2.27+delay)))
            angle = -(5 if finger == 'Thumb' else (10 if k == 0 else 14))*opening
            trs[i][1] = quaternion(rotation(base[i][1]) @ axis_rotation(axis,angle))
        # No sliding grip: the right wrist stays rigidly attached to the rifle for the entire clip.
        actual = g.world(trs)[hands['Right']]
        contact_errors.append(float(np.linalg.norm(actual[:3,3]-right_goal[:3,3])))
        # Never move a visible magazine back to the gun on the same key that hides it:
        # LINEAR translation would make it fly toward the gun during the preceding frame,
        # while STEP visibility would still be on. Both nodes follow the same pouch
        # curve across the exchange; only then return the hidden old mesh to the receiver.
        old_storage = carried if t < 1.20 else pose_mix(carried,gun,ease(t,1.20,1.50))
        set_world(trs,old_mag,old_storage)
        set_world(trs,new_mag,carried)
        # Frame-aligned, complementary masks: exactly one full-size magazine, with no empty frame.
        exchange, seated_swap = 66/60,114/60
        trs[old_mag][2] = np.ones(3) if t < exchange-1e-8 or t >= seated_swap-1e-8 else np.zeros(3)
        trs[new_mag][2] = np.ones(3) if exchange-1e-8 <= t < seated_swap-1e-8 else np.zeros(3)
        # The identical meshes swap while seated; defaults make every pre-existing clip safe to switch to.
        if t == 0 or t == times[-1]: trs = copy.deepcopy(base)
        frames.append(trs)
    frames = np.asarray(frames, dtype=object)
    anim = {'name':'rifle_reload','channels':[],'samplers':[],
            'extras':{'duration_seconds':duration,'fps':fps,'style':'curved human reach with overlapping elbow, wrist and finger motion',
                      'events':{'grasp':.53,'extract':.53,'clear':.69,'stow':1.04,'exchange':1.10,'draw':1.17,
                                'align':1.49,'insert':1.49,'seat':1.69,'seating_impact':1.71,
                                'seated_mesh_swap':1.90,'release':1.79,'ready':2.55}}}
    ti = g.append(times,'SCALAR')
    for i in range(len(nodes)):
        for n,(path,kind) in enumerate([('translation','VEC3'),('rotation','VEC4'),('scale','VEC3')]):
            values = np.array([frame[i][n] for frame in frames],dtype=float)
            if path=='rotation':
                for f in range(1,len(values)):
                    if np.dot(values[f-1],values[f]) < 0: values[f] *= -1
            sa = len(anim['samplers'])
            anim['samplers'].append({'input':ti,'output':g.append(values,kind),
                                     'interpolation':'STEP' if path=='scale' and i in (old_mag,new_mag) else 'LINEAR'})
            anim['channels'].append({'sampler':sa,'target':{'node':i,'path':path}})
    j['animations'].append(anim)
    assert j['animations'][:-1] == original_animations
    carried_clips = []
    if full_auto_source:
        # Keep the concurrently authored firing clip when updating the reload.
        # Only compatible node layouts may share animation tracks.
        extra = GLB(full_auto_source)
        assert [(n.get('name'),n.get('children',[])) for n in extra.j['nodes']] == [(n.get('name'),n.get('children',[])) for n in nodes]
        clip = copy.deepcopy(next(a for a in extra.j['animations'] if a['name']=='rifle_full_auto'))
        remap = {}
        for sampler in clip['samplers']:
            for field in ('input','output'):
                old_id = sampler[field]
                if old_id not in remap:
                    accessor = extra.j['accessors'][old_id]
                    remap[old_id] = g.append(extra.read(old_id),accessor['type'],accessor['componentType'])
                    assert np.array_equal(g.read(remap[old_id]),extra.read(old_id))
                sampler[field] = remap[old_id]
        j['animations'].append(clip)
        carried_clips.append({'name':clip['name'],'source':str(full_auto_source),
                              'source_sha256':hashlib.sha256(Path(full_auto_source).read_bytes()).hexdigest(),
                              'track_values_preserved':True})
    if max(max_miss.values()) > .002:
        raise ValueError('Hand goal unreachable: '+str(max_miss))
    g.save(output)
    report = {'recipe':'ar12_tilt_reload_005','source':str(source),'output':str(output),
              'source_sha256':hashlib.sha256(Path(source).read_bytes()).hexdigest(),
              'output_sha256':hashlib.sha256(Path(output).read_bytes()).hexdigest(),
              'existing_clips_preserved':[a['name'] for a in original_animations],
              'carried_clips':carried_clips,
              'new_clip':'rifle_reload','duration_seconds':duration,'fps':fps,'samples':len(times),'events':anim['extras']['events'],
              'magazine_triangles':mag_triangles,'max_hand_reach_error':max_miss,
              'max_right_wrist_contact_error':max(contact_errors),
              'generation_seconds':round(time.perf_counter()-started,3),'paid_api_calls':0,
              'review_status':'pending'}
    Path(output).with_suffix('.json').write_text(json.dumps(report,indent=2),encoding='utf8',newline='\n')
    print(json.dumps(report,indent=2))


if __name__ == '__main__':
    build(*sys.argv[1:4])
