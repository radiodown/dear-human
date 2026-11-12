async () => {
  const T=await import('/vendor/three-0.187.0/build/three.module.js');
  const {createLian}=await import('/plan-f/model.js');
  const {newState,advance}=await import('/plan-f/simulation.js');
  const {requestReload}=await import('/plan-f/reload.js');
  const actor=createLian(),body=actor.root.getObjectByName('continuous_human_suit'),g=body.geometry;
  const results={vertices:g.attributes.position.count,triangles:g.index.count/3,poses:[]};
  let distalVertices=0,wrongChestWeight=0;
  for(let i=0;i<g.attributes.position.count;i++){
    if(Math.abs(g.attributes.position.getX(i))<.36||g.attributes.position.getY(i)>1.02)continue;
    distalVertices++;
    for(let j=0;j<4;j++)if(body.skeleton.bones[g.attributes.skinIndex.getComponent(i,j)].name==='human_chest')wrongChestWeight=Math.max(wrongChestWeight,g.attributes.skinWeight.getComponent(i,j));
  }
  results.distalForearm={vertices:distalVertices,maxChestWeight:wrongChestWeight};
  function sample(label,state,neutral=false){
    actor.pose(state,{neutral});actor.root.updateMatrixWorld(true);body.skeleton.update();
    const points=[],bounds=new T.Box3();let finite=true;
    for(let i=0;i<g.attributes.position.count;i++){
      const p=body.getVertexPosition(i,new T.Vector3());points.push(p);bounds.expandByPoint(p);finite=finite&&p.toArray().every(Number.isFinite);
    }
    let maxEdge=0;
    for(let i=0;i<g.index.count;i+=3){const a=points[g.index.getX(i)],b=points[g.index.getX(i+1)],c=points[g.index.getX(i+2)];maxEdge=Math.max(maxEdge,a.distanceTo(b),b.distanceTo(c),c.distanceTo(a));}
    const entry={label,finite,maxEdge,bounds:{min:bounds.min.toArray(),max:bounds.max.toArray()}};results.poses.push(entry);
    if(!finite||maxEdge>.14)throw Error('Body deformation failed: '+JSON.stringify(entry));
  }
  let state=newState();const before=JSON.stringify(state);sample('neutral',state,true);
  results.neutralStatePreserved=JSON.stringify(state)===before;sample('idle',state);
  for(let i=0;i<90;i++)advance(state,{left:false,right:true,fire:true});sample('moving-fire',state);
  state.crouched=true;for(let i=0;i<90;i++)advance(state,{left:true,right:false,fire:false});sample('crouch-left',state);
  state.ammo=0;requestReload(state);
  for(let i=0;i<170;i++){advance(state,{left:false,right:false,fire:false});if(i%20===0)sample('empty-reload-'+i,state);}
  results.reloadCompleted=state.reload===null&&state.ammo===30;
  const resume=JSON.stringify(state);actor.pose(state,{neutral:true});actor.pose(state);
  results.resumeStatePreserved=JSON.stringify(state)===resume;
  const head=actor.root.getObjectByName('head');
  results.headScale=head.scale.x;results.neutralHeadHeight=.300*head.scale.x;results.neutralCrownHeight=1.563+.165*head.scale.x;results.headsTall=results.neutralCrownHeight/results.neutralHeadHeight;
  if(!distalVertices||wrongChestWeight>.0001||!results.neutralStatePreserved||!results.resumeStatePreserved||!results.reloadCompleted)throw Error(JSON.stringify(results));
  return results;
}
