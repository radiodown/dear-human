// Offline authoring command, never run by page visits. Store independent
// fixed-pose clips using the currently shared rig/artwork as the first draft.
import {CharacterRig,STEP} from '../../../../../../../game/animation/rig-core.js';
import {PARTS_FRAME_MOTIONS} from '../../../../../../../game/animation/parts-frame-player.js';
import {GAIT,RUN} from '../../../../../../../game/animation/gait.js';
import {BODY_MOTION} from '../../../../../../../game/animation/secondary-motion.js';
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const root='art/characters/clone_01/motion/parts_v2/frame_clips_001',output=root+'/clips';
mkdirSync(output,{recursive:true});
const hash=path=>({path,sha256:createHash('sha256').update(readFileSync(path)).digest('hex')});
const sourceDefinition='art/characters/clone_01/motion/rig_005/rig/parts.json';
writeFileSync(output+'/parts.json',readFileSync(sourceDefinition));
const manifest={schema_version:1,revision_id:'parts_v2_frame_clips_001',
  method:'Saved independent poses sampled offline from the existing parts rig; discrete holds, no in-between or cross-clip interpolation.',
  definition:'parts.json',art_direction_status:'awaiting_user_review',clips:[]};
const inputs=['rig-core.js','gait.js','proportions.js','firing-form.js','secondary-motion.js','kneeling-pose.js','cape.js','waist.js','motion-controls.js','weapon-profiles.js','reload-pose.js'].map(name=>'game/animation/'+name);
manifest.sources=[...inputs,sourceDefinition].map(hash);
for(const [mode,label]of Object.entries(PARTS_FRAME_MOTIONS)){
  const walking=['walk','walk_fire','run','run_fire'].includes(mode),running=mode.startsWith('run'),firing=mode.endsWith('fire'),kneeling=mode.startsWith('kneel');
  const duration=walking?(running?RUN.period:GAIT.period):firing?.4:BODY_MOTION.breathPeriod;
  const count=walking?(running?10:14):firing?8:24;
  const rig=new CharacterRig();rig.setMotionControls(mode,{},true);rig.setWalking(walking);rig.setRunning(running);rig.setKneeling(kneeling);rig.setRelaxed(mode==='relaxed');
  // Settle this clip on its own. There is no preceding or following action.
  if(firing)rig.aimHold=100;
  for(let i=0;i<480;i++)rig.step();
  const start=rig.time,frames=[];
  for(let i=0;i<count;i++){
    const target=start+i*duration/count;
    while(rig.time+STEP/2<target)rig.step();
    const shot=firing&&(i===0||(walking&&i===Math.floor(count/2)));
    if(shot){if(!rig.requestFire())throw new Error('Unprepared clip shot: '+mode);rig.step();rig.step();}
    const pose=rig.pose();
    if(pose.gripError>1e-4||pose.legs.some(leg=>leg.error>1e-4))throw new Error('Unreachable saved pose: '+mode+':'+i);
    frames.push({index:i,label:shot?'발사':`${i+1}프레임`,sourceSeconds:rig.time,pose,
      render:{flash:rig.flash,shots:rig.shots,weapon:rig.weapon}});
  }
  const clip={schema_version:1,id:mode,label,fps:count/duration,durationSeconds:duration,frames};
  const path=output+'/'+mode+'.json';
  const compact=JSON.stringify(clip,(_key,value)=>typeof value==='number'?Math.round(value*1e6)/1e6:value);
  writeFileSync(path,compact+'\n');
  manifest.clips.push({id:mode,label,frameCount:count,fps:clip.fps,path:mode+'.json',sha256:hash(path).sha256});
}
writeFileSync(output+'/manifest.json',JSON.stringify(manifest,null,2)+'\n');
console.log(JSON.stringify({clips:manifest.clips.length,frames:manifest.clips.reduce((sum,clip)=>sum+clip.frameCount,0),new_rasters:0}));
