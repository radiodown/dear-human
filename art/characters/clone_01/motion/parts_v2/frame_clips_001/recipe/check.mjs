// Short saved-clip and discrete timeline checks, without stepping live motion.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {PartsFramePlayer,PARTS_FRAME_MOTIONS} from '../../../../../../../game/animation/parts-frame-player.js';
const base='art/characters/clone_01/motion/parts_v2/frame_clips_001',root=base+'/clips/';
const manifest=JSON.parse(readFileSync(root+'manifest.json'));
assert.deepEqual(manifest.clips.map(clip=>clip.id),Object.keys(PARTS_FRAME_MOTIONS));
const report={scope:'Saved clip contacts and discrete clock/seek/cut/one-shot behavior only; no full suite or art approval.',clips:{},frames:0,maxGripError:0,maxLegError:0};
const player=new PartsFramePlayer();
for(const source of manifest.clips){
  const bytes=readFileSync(root+source.path),clip=JSON.parse(bytes);
  assert.equal(createHash('sha256').update(bytes).digest('hex'),source.sha256);
  assert.equal(clip.frames.length,source.frameCount);assert(clip.fps>0);
  clip.frames.forEach((frame,i)=>{
    assert.equal(frame.index,i);assert([frame.pose.headAngle,frame.pose.weapon.a,frame.pose.pelvis.y].every(Number.isFinite));
    report.maxGripError=Math.max(report.maxGripError,frame.pose.gripError);report.maxLegError=Math.max(report.maxLegError,...frame.pose.legs.map(leg=>leg.error));
    assert.equal(frame.render.weapon.id,'m16_basic');
  });
  player.load(clip);assert.equal(player.index,0);
  const duration=1000/player.fps,held=player.frame;
  assert.equal(player.advance(duration*.49),false);assert.strictEqual(player.frame,held);
  assert.equal(player.advance(duration*.51),true);assert.strictEqual(player.frame,clip.frames[1]);
  player.step(-1);assert(player.paused);assert.strictEqual(player.frame,held);
  player.seek(clip.frames.length-1);player.paused=false;player.advance(duration);assert.equal(player.index,0);
  player.loop=false;player.seek(clip.frames.length-1);player.advance(duration);assert(player.finished&&player.paused);assert.equal(player.index,clip.frames.length-1);
  player.loop=true;player.paused=false;player.seek(3);const previous=player.frame;
  player.load(clip);assert.equal(player.index,0);assert.notStrictEqual(player.frame,previous);
  player.seek(999999);assert.equal(player.index,clip.frames.length-1);player.seek(-1);assert.equal(player.index,0);
  report.clips[clip.id]={frames:clip.frames.length,fps:clip.fps};report.frames+=clip.frames.length;
}
assert(report.maxGripError<1e-4&&report.maxLegError<1e-4);
player.fpsOverride=12;player.seek(0);player.paused=false;player.advance(1000/12);assert.equal(player.index,1);
player.paused=true;const held=JSON.stringify(player.frame);player.advance(1000);assert.equal(JSON.stringify(player.frame),held);
report.status='passed';report.sources=['game/animation/parts-frame-player.js',root+'manifest.json'].map(path=>({path,sha256:createHash('sha256').update(readFileSync(path)).digest('hex')}));
mkdirSync(base+'/tests',{recursive:true});writeFileSync(base+'/tests/discrete-frames.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({status:'passed',clips:Object.keys(report.clips).length,frames:report.frames,maxGripError:report.maxGripError}));
