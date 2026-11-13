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


def add_charging_handle(g, gun_node):
    """A small visible receiver slider and side tab, animated as a separate node."""
    material = len(g.j['materials'])
    g.j['materials'].append({'name':'AR12_charging_handle_metal','pbrMetallicRoughness':{
        'baseColorFactor':[.15,.17,.18,1],'metallicFactor':.8,'roughnessFactor':.38}})
    positions, normals = [],[]
    for center,size in [((0,0,0),(.036,.012,.007)),((0,0,-.012),(.014,.013,.025))]:
        center,size = np.array(center),np.array(size)*.5
        for axis in range(3):
            u,v = (axis+1)%3,(axis+2)%3
            for sign in (-1,1):
                face=[]; normal=np.zeros(3); normal[axis]=sign
                for a,b in [(-1,-1),(1,-1),(1,1),(-1,1)]:
                    point=center.copy();point[axis]+=sign*size[axis];point[u]+=a*size[u];point[v]+=b*size[v];face.append(point)
                for i in ([0,1,2,0,2,3] if sign>0 else [0,2,1,0,3,2]):
                    positions.append(face[i]);normals.append(normal)
    mesh = len(g.j['meshes'])
    g.j['meshes'].append({'name':'AR12_charging_handle','primitives':[{'attributes':{
        'POSITION':g.append(positions,'VEC3'),'NORMAL':g.append(normals,'VEC3')},'material':material}]})
    node = len(g.j['nodes'])
    g.j['nodes'].append({'name':'ar12_reload_bolt','mesh':mesh,'translation':[-.040,.108,-.026]})
    g.j['nodes'][gun_node]['children'].append(node)
    return node


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
    old_mag, new_mag, dropped_mag = len(nodes),len(nodes)+1,len(nodes)+2
    nodes.extend([{'name':'reload_magazine_old','mesh':mag_mesh},
                  {'name':'reload_magazine_fresh','mesh':mag_mesh,'scale':[0,0,0]},
                  {'name':'reload_magazine_dropped','mesh':mag_mesh,'scale':[0,0,0]}])
    nodes[gun_node].setdefault('children',[]).extend([old_mag,new_mag])
    # A loose object belongs to the scene, not the animated gun. This also keeps
    # its landing exactly still between baked keys while the rifle keeps moving.
    j['scenes'][j.get('scene',0)]['nodes'].append(dropped_mag)
    bolt_node = add_charging_handle(g,gun_node)
    parents = {c:i for i,n in enumerate(nodes) for c in n.get('children',[])}
    base = g.sample('rifle_aim_idle',0)
    world0 = g.world(base); gun0 = world0[gun_node]
    hands = {s:by_name['mixamorig:'+s+'Hand'] for s in ('Left','Right')}
    hand_offset = {s:np.linalg.inv(gun0) @ world0[h] for s,h in hands.items()}
    right_pivot = world0[hands['Right']][:3,3]
    mag_center = np.array([-.027,.037,0])
    pouch = np.array([.065,.635,.075])
    # Grip the magazine's left side, with the thumb opposed to the fingers.
    # A partial roll is shared by the forearm; avoid the old palm-up carrying pose.
    mag_hand = hand_offset['Left'].copy()
    middle = by_name['mixamorig:LeftHandMiddle1']
    palm = (world0[hands['Left']][:3,3]+world0[middle][:3,3])*.5
    palm_local = (np.linalg.inv(world0[hands['Left']]) @ np.r_[palm,1])[:3]
    palm_contact = np.array([-.024,.047,-.026])
    # Fingers run across the side toward the front edge, not down below the floorplate.
    # Build the hand frame directly: local Y is knuckle direction, local -Z the palm.
    finger_direction = unit([1.,.10,.08])
    outward = unit(np.array([0.,0.,-1.])-finger_direction*np.dot([0.,0.,-1.],finger_direction))
    mag_hand[:3,:3] = np.column_stack([unit(np.cross(finger_direction,outward)),finger_direction,outward])
    mag_hand[:3,3] = palm_contact-mag_hand[:3,:3] @ palm_local
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
    clip_reports = []
    for empty_reload in (False,True):
        duration, fps = (3.45 if empty_reload else 2.65), 60
        clip_name = 'rifle_reload_empty' if empty_reload else 'rifle_reload'
        times = np.linspace(0,duration,round(duration*fps)+1)
        frames = []; max_miss = {'Left':0.,'Right':0.}; contact_errors = []
        drop_start = None; floor_pose = None; impact_time = None
        previous_roll = {}
        vertices = g.read(j['meshes'][mag_mesh]['primitives'][0]['attributes']['POSITION'])
        # Eight bounds corners suffice for a conservative floor contact during the spin.
        lo,hi = vertices.min(axis=0),vertices.max(axis=0)
        corners = np.array([[x,y,z] for x in (lo[0],hi[0]) for y in (lo[1],hi[1]) for z in (lo[2],hi[2])])

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
            if side == 'Left':
                # An elbow near the ribcage, slightly outboard and below the shoulder.
                # Transport alone rolls the elbow behind the torso when the hand lowers.
                preferred = np.array([1.,-.30,0.])
                anatomical = unit(preferred-direction*np.dot(preferred,direction))
                pole = unit(pole*(1-.55*amount)+anatomical*(.55*amount))
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
            if side in previous_roll: roll += 360*round((previous_roll[side]-roll)/360)
            previous_roll[side] = roll
            fore[:3,:3] = axis_rotation(fore_axis,roll*.65) @ fore[:3,:3]
            set_world(trs,ids[1],fore)
            reached = goal.copy(); reached[:3,3] = wrist
            set_world(trs,ids[2],reached)

        for sample_time in times:
            t = (min(sample_time,1.88) if sample_time <= 2.68 else sample_time-.8) if empty_reload else sample_time
            trs = copy.deepcopy(base)
            tilt = ease(t,.08,.38)*(1-ease(t,2.12,2.55))
            reach = ease(t,.16,.45)
            release = ease(t,1.88,2.23)
            grasp = reach*(1-release)
            seat_bump = math.exp(-((t-1.79)/.032)**2)
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
            clear = center-up*.065+np.array([.010,0,0])
            align = center-up*.052
            empty = gun.copy()
            empty[:3,3] += (clear-center)*ease(t,.47,.65)
            # Release the empty magazine in front of the body; its subsequent path is
            # captured in world space and is independent of the moving hand and weapon.
            if t >= .65-1e-8 and drop_start is None: drop_start = empty.copy()
            dropped = empty.copy()
            if drop_start is not None:
                age = max(0.,t-.65)
                origin = (drop_start @ np.r_[mag_center,1])[:3]
                drop_center = origin + np.array([.15,-.28,.10])*age + np.array([0,-2.45*age*age,0])
                dropped[:3,:3] = axis_rotation([1,0,.3],-210*age) @ drop_start[:3,:3]
                dropped[:3,3] = drop_center-dropped[:3,:3] @ mag_center
                bottom = np.min((corners @ dropped[:3,:3].T+dropped[:3,3])[:,1])
                if bottom <= .008 and floor_pose is None:
                    dropped[1,3] += .008-bottom; floor_pose = dropped.copy(); impact_time = float(t)
                if floor_pose is not None: dropped = floor_pose.copy()
            # New magazine is at the belt. The empty hand goes there separately,
            # closes around it, then the forearm lifts it into the well.
            at_pouch = gun0.copy()
            at_pouch[:3,:3] = axis_rotation([0,1,0],-10) @ gun0[:3,:3]
            at_pouch[:3,3] = pouch-at_pouch[:3,:3] @ mag_center
            fresh = pose_mix(at_pouch,gun,ease(t,1.12,1.64))
            fresh_center = travel(t,[(1.08,pouch),(1.29,pouch*.56+align*.44+np.array([.012,-.012,.014])),
                                    (1.55,align),(1.77,center)],{2:up*.30})
            fresh[:3,3] = fresh_center-fresh[:3,:3] @ mag_center
            if t >= 1.77: fresh = gun.copy()
            empty_grip = empty @ mag_hand
            if drop_start is not None: empty_grip = drop_start @ mag_hand
            pickup_grip = at_pouch @ mag_hand
            free_hand = pose_mix(empty_grip,pickup_grip,ease(t,.65,1.01))
            free_hand[:3,3] = travel(t,[(.65,empty_grip[:3,3]),
                                      (.83,empty_grip[:3,3]*.38+pickup_grip[:3,3]*.62+np.array([.008,-.010,-.008])),
                                      (1.01,pickup_grip[:3,3])])
            handling = empty @ mag_hand if t < .65 else (free_hand if t < 1.08 else fresh @ mag_hand)
            support = gun @ hand_offset['Left']
            left_goal = pose_mix(support,handling,grasp)
            orientation_grasp = ease(t,.19,.47)*(1-ease(t,1.88,2.23))
            left_goal[:3,:3] = pose_mix(support,handling,orientation_grasp)[:3,:3]
            approach_arc = 16*reach*reach*(1-reach)*(1-reach)
            return_arc = 16*release*release*(1-release)*(1-release)
            left_goal[:3,3] += np.array([.012,-.018,.010])*approach_arc + np.array([.018,-.020,.014])*return_arc
            if empty_reload:
                pull = ease(sample_time,2.22,2.42)*(1-ease(sample_time,2.50,2.58))
                trs[bolt_node][0] = base[bolt_node][0]+np.array([-.034*pull,0,0])
                # The hand pulls with the handle, then lets the slider spring forward.
                # Keep the releasing hand behind it instead of dragging it forward.
                hand_pull = ease(sample_time,2.22,2.42)*(1-ease(sample_time,2.58,3.05))
                bolt_hand = mag_hand.copy()
                bolt_hand[:3,3] = base[bolt_node][0]+np.array([-.034*hand_pull,0,-.020])-bolt_hand[:3,:3] @ palm_local
                bolt_weight = ease(sample_time,1.88,2.14)*(1-ease(sample_time,2.52,3.05))
                left_goal = pose_mix(left_goal,gun @ bolt_hand,bolt_weight)
            right_goal = gun @ hand_offset['Right']
            solve_arm(trs,'Right',right_goal,tilt)
            elbow_follow = ease(t,.12,.45)*(1-ease(t,2.05,2.50))
            solve_arm(trs,'Left',left_goal,elbow_follow)
            # Open before contact/release, then close fingers at slightly staggered times.
            for i,(finger,k,axis) in finger_axes.items():
                delay = ('Index','Middle','Ring','Pinky','Thumb').index(finger)*.012
                opening = (ease(t,.12,.25)*(1-ease(t,.32+delay,.43+delay))
                           + ease(t,.62+delay,.72+delay)*(1-ease(t,.94+delay,1.07+delay))
                           + ease(t,1.86+delay,1.98+delay)*(1-ease(t,2.12+delay,2.32+delay)))
                if empty_reload and 1.88 <= sample_time <= 3.05:
                    opening = (1-ease(sample_time,2.00+delay,2.14+delay))*.6 + ease(sample_time,2.49+delay,2.62+delay)*(1-ease(sample_time,2.88,3.05))
                angle = -(5 if finger == 'Thumb' else (10 if k == 0 else 14))*opening
                trs[i][1] = quaternion(rotation(base[i][1]) @ axis_rotation(axis,angle))
            # No sliding grip: the right wrist stays rigidly attached to the rifle for the entire clip.
            actual = g.world(trs)[hands['Right']]
            contact_errors.append(float(np.linalg.norm(actual[:3,3]-right_goal[:3,3])))
            # Empty-to-dropped handoff shares exactly the release transform. Move the
            # hidden receiver mesh only afterwards; do not retrieve the dropped one.
            old_storage = empty if t < .72 else pose_mix(drop_start,gun,ease(t,.72,.90))
            set_world(trs,old_mag,old_storage)
            set_world(trs,new_mag,fresh)
            set_world(trs,dropped_mag,dropped)
            dropped_at, pickup, seated_swap = 39/60,59/60,117/60
            trs[old_mag][2] = np.ones(3) if t < dropped_at-1e-8 or sample_time >= seated_swap-1e-8 else np.zeros(3)
            trs[new_mag][2] = np.ones(3) if pickup-1e-8 <= sample_time < seated_swap-1e-8 else np.zeros(3)
            trs[dropped_mag][2] = np.ones(3) if dropped_at-1e-8 <= sample_time < duration-1e-8 else np.zeros(3)
            # The identical meshes swap while seated; defaults make every pre-existing clip safe to switch to.
            if t == 0: trs = copy.deepcopy(base)
            if sample_time == times[-1]:
                # Reset the character but leave the now-hidden dropped mesh on the floor:
                # a last-key position reset would visibly interpolate it back into the gun.
                final_drop = trs[dropped_mag]
                trs = copy.deepcopy(base); trs[dropped_mag] = final_drop
            frames.append(trs)
        frames = np.asarray(frames, dtype=object)
        anim = {'name':clip_name,'channels':[],'samplers':[],
                'extras':{'duration_seconds':duration,'fps':fps,'style':'discard empty magazine, empty-hand belt pickup, side grip and anatomical elbow',
                          'palm_contact':palm_contact.tolist(),
                          'events':{'grasp':.47,'extract':.47,'drop':.65,'ground':impact_time,'new_visible':59/60,'pickup':1.01,'draw':1.08,
                                    'align':1.55,'insert':1.55,'seat':1.77,'seating_impact':1.79,
                                    'seated_mesh_swap':1.95,'release':1.88,'ready':2.55}}}
        ti = g.append(times,'SCALAR')
        for i in range(len(nodes)):
            for n,(path,kind) in enumerate([('translation','VEC3'),('rotation','VEC4'),('scale','VEC3')]):
                values = np.array([frame[i][n] for frame in frames],dtype=float)
                if path=='rotation':
                    for f in range(1,len(values)):
                        if np.dot(values[f-1],values[f]) < 0: values[f] *= -1
                sa = len(anim['samplers'])
                anim['samplers'].append({'input':ti,'output':g.append(values,kind),
                                         'interpolation':'STEP' if path=='scale' and i in (old_mag,new_mag,dropped_mag) else 'LINEAR'})
                anim['channels'].append({'sampler':sa,'target':{'node':i,'path':path}})
        if empty_reload:
            anim['extras']['events'].update(bolt_reach=2.14,bolt_pull=2.22,bolt_back=2.42,bolt_release=2.50,bolt_closed=2.58,ready=3.35)
        j['animations'].append(anim)
        clip_reports.append({'name':clip_name,'duration_seconds':duration,'samples':len(times),'events':anim['extras']['events'],
                             'max_hand_reach_error':max_miss.copy(),'max_right_wrist_contact_error':max(contact_errors)})
    assert j['animations'][:len(original_animations)] == original_animations
    carried_clips = []
    if full_auto_source:
        # Keep the concurrently authored firing clip when updating the reload.
        # Only compatible node layouts may share animation tracks.
        extra = GLB(full_auto_source)
        assert len(extra.j['nodes']) in (len(nodes)-2,len(nodes)-1)
        for i,n in enumerate(extra.j['nodes']):
            assert n.get('name') == nodes[i].get('name')
            assert [c for c in n.get('children',[]) if c not in (dropped_mag,bolt_node)] == [c for c in nodes[i].get('children',[]) if c not in (dropped_mag,bolt_node)]
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
    report = {'recipe':'ar12_two_reloads_007','source':str(source),'output':str(output),
              'source_sha256':hashlib.sha256(Path(source).read_bytes()).hexdigest(),
              'output_sha256':hashlib.sha256(Path(output).read_bytes()).hexdigest(),
              'existing_clips_preserved':[a['name'] for a in original_animations],
              'carried_clips':carried_clips,
              'new_clips':clip_reports,'fps':fps,'palm_contact':palm_contact.tolist(),
              'magazine_triangles':mag_triangles,'max_hand_reach_error':max_miss,
              'max_right_wrist_contact_error':max(contact_errors),
              'generation_seconds':round(time.perf_counter()-started,3),'paid_api_calls':0,
              'review_status':'pending'}
    Path(output).with_suffix('.json').write_text(json.dumps(report,indent=2),encoding='utf8',newline='\n')
    print(json.dumps(report,indent=2))


if __name__ == '__main__':
    build(*sys.argv[1:4])
