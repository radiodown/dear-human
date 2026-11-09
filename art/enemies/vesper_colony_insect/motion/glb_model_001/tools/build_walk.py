import bpy, sys, math, json
from mathutils import Vector, Matrix, Quaternion
src, out_glb, out_blend, out_json = sys.argv[-4:]
FPS=24
# clip name -> (frames per cycle, stride, lift, duty). walk_fast: same gait at twice the cadence (0.5 s cycle).
CLIPS={'walk':(24,0.13,0.055,0.62),'walk_fast':(12,0.13,0.055,0.62)}
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=src)
sc=bpy.context.scene; sc.render.fps=FPS
arm=[o for o in bpy.data.objects if o.type=='ARMATURE'][0]
me=[o for o in bpy.data.objects if o.type=='MESH' and o.parent==arm][0]
print('ARM world', [round(c,3) for c in arm.matrix_world.to_quaternion()])
bpy.context.view_layer.objects.active=arm
LEGS=['first','second','third','last']
GROUP_A={('first','L'),('second','R'),('third','L'),('last','R')}
deform=[b.name for b in arm.data.bones]
# foot tips (armature space)
def foot_of(leg,side):
    if leg=='last':
        gi=me.vertex_groups[f'leg_last_03_{side}'].index
        pts=[v.co for v in me.data.vertices for g in v.groups if g.group==gi and g.weight>0.5]
        return min(pts,key=lambda p:p.z).copy()
    return arm.data.bones[f'leg_{leg}_04_{side}'].tail_local.copy()
feet={(l,s):foot_of(l,s) for l in LEGS for s in 'LR'}
# helper bones
bpy.ops.object.mode_set(mode='EDIT'); eb=arm.data.edit_bones
for (l,s),f in feet.items():
    t=eb.new(f'ik_{l}_{s}'); t.head=f; t.tail=f+Vector((0,0,0.04)); t.use_deform=False
    if l=='last':
        tip=eb.new(f'tip_last_{s}'); tip.head=eb[f'leg_last_03_{s}'].tail.copy(); tip.tail=f; tip.parent=eb[f'leg_last_03_{s}']; tip.use_deform=False
bpy.ops.object.mode_set(mode='POSE')
P=arm.pose.bones
for l in LEGS:
    for s in 'LR':
        end=P[f'tip_last_{s}'] if l=='last' else P[f'leg_{l}_04_{s}']
        c=end.constraints.new('IK'); c.target=arm; c.subtarget=f'ik_{l}_{s}'; c.chain_count=3; c.use_tail=True; c.iterations=500
        if l=='last': end.lock_ik_x=end.lock_ik_y=end.lock_ik_z=True
        P[f'leg_{l}_01_{s}'].lock_ik_x=P[f'leg_{l}_01_{s}'].lock_ik_y=P[f'leg_{l}_01_{s}'].lock_ik_z=True
for pb in P: pb.rotation_mode='QUATERNION'
bpy.context.view_layer.update()
rest={pb.name:pb.matrix.copy() for pb in P}
def smooth(q): return q*q*(3-2*q)
def foot_offset(leg,side,t,STRIDE,LIFT,DUTY):
    p=(t+(0.0 if (leg,side) in GROUP_A else 0.5))%1.0
    if p<DUTY: return Vector((STRIDE/2-STRIDE*(p/DUTY),0,0))
    q=(p-DUTY)/(1-DUTY)
    return Vector((-STRIDE/2+STRIDE*smooth(q),0,LIFT*math.sin(math.pi*q)))
def set_world(pb, R, T=Vector()):
    h=rest[pb.name].translation
    pb.matrix=Matrix.Translation(T)@Matrix.Translation(h)@R@Matrix.Translation(-h)@rest[pb.name]
    bpy.context.view_layer.update()
def compute(N,STRIDE,LIFT,DUTY):
  poses=[]; err=[]
  for f in range(N+1):
      t=f/N; w=2*math.pi*t
      for pb in P: pb.matrix_basis=Matrix()
      bpy.context.view_layer.update()
      # body: bob twice per cycle, small roll / yaw / pitch
      R=(Matrix.Rotation(math.radians(1.2)*math.sin(w),4,'X')@Matrix.Rotation(math.radians(1.0)*math.sin(w+0.6),4,'Z')
         @Matrix.Rotation(math.radians(0.8)*math.sin(2*w),4,'Y'))
      set_world(P['tripo::Root'], R, Vector((0,0,0.006*math.sin(2*w-0.5))))
      # feet (targets live in armature space -> stay planted)
      for (l,s),base in feet.items():
          P[f'ik_{l}_{s}'].matrix=Matrix.Translation(base+foot_offset(l,s,t,STRIDE,LIFT,DUTY))
      bpy.context.view_layer.update()
      # abdomen follow-through sway (lagging wave)
      for i in range(1,5):
          pb=P[f'abdomen_0{i}']
          r=Matrix.Rotation(math.radians(2.2)*math.sin(w-0.45*i),4,'Z')@Matrix.Rotation(math.radians(1.2)*math.sin(2*w-0.5*i),4,'Y')
          m=pb.matrix; h=m.translation.copy()
          pb.matrix=Matrix.Translation(h)@r@Matrix.Translation(-h)@m
          bpy.context.view_layer.update()
      # mandibles: small chewing
      for n,sg in (('bone_30',1),('tripo::Spine_2',-1)):
          pb=P[n]; m=pb.matrix; h=m.translation.copy()
          pb.matrix=Matrix.Translation(h)@Matrix.Rotation(sg*math.radians(4)*max(0,math.sin(2*w)),4,'Z')@Matrix.Translation(-h)@m
          bpy.context.view_layer.update()
      for (l,s) in feet:
          end=P[f'tip_last_{s}'] if l=='last' else P[f'leg_{l}_04_{s}']
          err.append((end.tail-P[f'ik_{l}_{s}'].head).length)
      poses.append({n:P[n].matrix.copy() for n in deform})
  return poses,err

# ---------------- pounce: raise front legs, leap 0.5 m forward, slam down (root motion kept) ----------------
PN=34; PDIST=0.5
# key tables below are authored in 24fps frames of the 1.42 s clip; pounce_fast samples every other one (0.71 s).
POUNCES={'pounce':1,'pounce_fast':2}
def ease(u): u=min(max(u,0.0),1.0); return u*u*(3-2*u)
def track(keys,f):
    if f<=keys[0][0]: return keys[0][1]
    for (f0,v0),(f1,v1) in zip(keys,keys[1:]):
        if f<=f1: return v0+(v1-v0)*ease((f-f0)/(f1-f0))
    return keys[-1][1]
BODY_X=[(0,0),(8,-0.03),(11,-0.035),(14,0.06),(20,0.40),(23,PDIST),(34,PDIST)]
BODY_Z=[(0,0),(8,-0.06),(11,-0.065),(14,0.04),(17,0.17),(20,0.06),(22,-0.05),(26,-0.015),(34,0)]
PITCH=[(0,0),(8,-16),(11,-18),(14,-10),(18,4),(21,11),(23,5),(34,0)]          # deg, negative = nose up
JAW=[(0,0),(8,10),(18,18),(21,-2),(24,4),(34,0)]                              # mandibles open
TAIL=[(0,0),(8,10),(11,11),(14,4),(18,-6),(22,3),(26,-2),(34,0)]               # abdomen raise, deg per segment
pivot=arm.data.bones['tripo::Root'].head_local.copy()
def body_matrix(f):
    R=Matrix.Rotation(math.radians(track(PITCH,f)),4,'Y')
    T=Vector((track(BODY_X,f),0,track(BODY_Z,f)))
    return Matrix.Translation(T)@Matrix.Translation(pivot)@R@Matrix.Translation(-pivot), R, T
def blend(a,b,u): u=ease(u); return a.lerp(b,u)
def foot_target(l,s,f,Mb):
    base=feet[(l,s)]; land=base+Vector((PDIST,0,0)); side=1 if s=='L' else -1
    rel=lambda off: Mb@(base+off)
    if l=='first':
        lift=rel(Vector((-0.14,0.14*side,0.42))); reach=rel(Vector((0.16,0.02*side,0.06))); slam=base+Vector((PDIST+0.08,0,0))
        if f<=8: return blend(base,lift,(f-2)/6)
        if f<=14: return lift
        if f<=19: return blend(lift,reach,(f-14)/5)
        if f<=21: return blend(reach,slam,(f-19)/2)
        return blend(slam,land,(f-21)/9)
    off={'second':13.0,'third':13.5,'last':14.0}[l]; touch={'second':21.0,'third':21.5,'last':22.0}[l]
    tuck=Mb@Vector((base.x,base.y*0.88,base.z+0.07))
    if f<=off: return base
    if f<=touch-2: return blend(base,tuck,(f-off)/3)
    return blend(tuck,land,(f-(touch-2))/2)
def compute_pounce(PSPEED):
    poses=[]; err=[]
    for fi in range(PN//PSPEED+1):
        f=fi*PSPEED
        for pb in P: pb.matrix_basis=Matrix()
        bpy.context.view_layer.update()
        Mb,R,T=body_matrix(f)
        set_world(P['tripo::Root'],R,T)
        for (l,s) in feet: P[f'ik_{l}_{s}'].matrix=Matrix.Translation(foot_target(l,s,f,Mb))
        bpy.context.view_layer.update()
        for i in range(1,5):
            pb=P[f'abdomen_0{i}']; m=pb.matrix; h=m.translation.copy()
            r=Matrix.Rotation(math.radians(track(TAIL,f-0.8*(i-1))),4,'Y')
            pb.matrix=Matrix.Translation(h)@r@Matrix.Translation(-h)@m
            bpy.context.view_layer.update()
        for n,sg in (('bone_30',1),('tripo::Spine_2',-1)):
            pb=P[n]; m=pb.matrix; h=m.translation.copy()
            pb.matrix=Matrix.Translation(h)@Matrix.Rotation(sg*math.radians(track(JAW,f)),4,'Z')@Matrix.Translation(-h)@m
            bpy.context.view_layer.update()
        for (l,s) in feet:
            end=P[f'tip_last_{s}'] if l=='last' else P[f'leg_{l}_04_{s}']
            err.append(((end.tail-P[f'ik_{l}_{s}'].head).length, f, l+'_'+s))
        poses.append({n:P[n].matrix.copy() for n in deform})
    return poses,err
results={k:compute(*v) for k,v in CLIPS.items()}
for pname,ps in POUNCES.items():
    pp,pe=compute_pounce(ps)
    worst=max(pe)
    print(pname,'IK max foot error', round(worst[0],4), 'at frame', worst[1], worst[2], 'frames>1cm', sum(1 for e in pe if e[0]>0.01))
    results[pname]=(pp,[e[0] for e in pe])
for k,(poses,err) in list(results.items())[:len(CLIPS)]:
  print(k,'IK max foot error', round(max(err),4))
  flips=sum(1 for fr in poses for l in LEGS for sd in 'LR' if fr[f'leg_{l}_03_{sd}'].translation.z < fr[f'leg_{l}_02_{sd}'].translation.z-0.02)
  print(k,'knee-below-hip frames', flips)
# remove constraints/helpers, write keyframes from stored pose matrices
for pb in P:
    for c in list(pb.constraints): pb.constraints.remove(c)
bpy.ops.object.mode_set(mode='EDIT')
for b in list(arm.data.edit_bones):
    if b.name.startswith(('ik_','tip_')): arm.data.edit_bones.remove(b)
bpy.ops.object.mode_set(mode='POSE')
P=arm.pose.bones; B=arm.data.bones
if not arm.animation_data: arm.animation_data_create()
for clip,(poses,err) in results.items():
  act=bpy.data.actions.new(clip); act.use_fake_user=True; arm.animation_data.action=act
  prevq={}
  for f,fr in enumerate(poses):
    for n in deform:
        b=B[n]
        if b.parent: basis=(b.parent.matrix_local.inverted()@b.matrix_local).inverted()@fr[b.parent.name].inverted()@fr[n]
        else: basis=b.matrix_local.inverted()@fr[n]
        loc,q,sca=basis.decompose()
        if n in prevq: q.make_compatible(prevq[n])
        prevq[n]=q
        pb=P[n]; pb.location=loc; pb.rotation_quaternion=q; pb.scale=Vector((1,1,1))
        pb.keyframe_insert('location',frame=f); pb.keyframe_insert('rotation_quaternion',frame=f)
  print('ACTION', clip, 'frames', len(poses))
arm.animation_data.action=bpy.data.actions['walk']
sc.frame_start=0; sc.frame_end=CLIPS['walk'][0]
bpy.ops.object.mode_set(mode='OBJECT')
bpy.ops.wm.save_as_mainfile(filepath=out_blend)
bpy.ops.export_scene.gltf(filepath=out_glb, export_format='GLB', export_def_bones=False, export_animations=True, export_force_sampling=True)
clips={k:{'frames':v[0],'fps':FPS,'seconds':v[0]/FPS,'stride':v[1],'lift':v[2],'duty':v[3],'ik_max_foot_error':max(results[k][1])} for k,v in CLIPS.items()}
for pname,ps in POUNCES.items():
    clips[pname]={'frames':PN//ps,'fps':FPS,'seconds':PN/ps/FPS,'speed':ps,'authored_frames':PN,'forward':PDIST,'root_motion':True,'body_x':BODY_X,'body_z':BODY_Z,'pitch_deg':PITCH,'jaw_deg':JAW,'tail_deg':TAIL,'ik_max_foot_error':max(results[pname][1])}
json.dump({'clips':clips,
           'walk_gait':'alternating tetrapod (A: L1 R2 L3 R4 / B: R1 L2 R3 L4), in place','source':src}, open(out_json,'w'), indent=2)
print('SAVED')
