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
results={k:compute(*v) for k,v in CLIPS.items()}
for k,(poses,err) in results.items():
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
json.dump({'clips':{k:{'frames':v[0],'fps':FPS,'seconds':v[0]/FPS,'stride':v[1],'lift':v[2],'duty':v[3],'ik_max_foot_error':max(results[k][1])} for k,v in CLIPS.items()},
           'gait':'alternating tetrapod (A: L1 R2 L3 R4 / B: R1 L2 R3 L4)','in_place':True,'source':src}, open(out_json,'w'), indent=2)
print('SAVED')
