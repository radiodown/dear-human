// Discrete, saved poses only. This player never advances a CharacterRig or
// interpolates between frames/clips; every pose remains held until its tick.
export const PARTS_FRAME_MOTIONS=Object.freeze({
  idle:'견착 대기',relaxed:'완전 대기',walk:'걷기',fire:'서서쏴',walk_fire:'걸으며쏴',
  run:'달리기',run_fire:'뛰며쏴',kneel:'앉기',kneel_fire:'앉아쏴'
});
export class PartsFramePlayer {
  constructor(){this.index=0;this.elapsed=0;this.paused=false;this.loop=true;this.fpsOverride=null;this.clip=null;this.finished=false;}
  get fps(){return this.fpsOverride??this.clip?.fps??12;}
  get frame(){return this.clip?.frames[this.index]??null;}
  load(clip,index=0){
    if(!clip?.frames?.length||!Number.isFinite(clip.fps)||clip.fps<=0)throw new Error('프레임 동작을 읽지 못했습니다.');
    this.clip=clip;this.seek(index);
  }
  seek(index){
    this.index=Math.max(0,Math.min((this.clip?.frames.length??1)-1,Math.trunc(index)||0));
    this.elapsed=0;this.finished=false;
  }
  step(direction=1){
    const count=this.clip?.frames.length??1,next=this.index+direction;
    this.paused=true;this.seek(this.loop?(next%count+count)%count:next);
  }
  advance(milliseconds){
    if(this.paused||!this.clip||!Number.isFinite(milliseconds)||milliseconds<=0)return false;
    const duration=1000/this.fps;
    this.elapsed+=milliseconds;
    const steps=Math.floor((this.elapsed+1e-7)/duration);
    if(!steps)return false;
    this.elapsed=Math.max(0,this.elapsed-steps*duration);
    const next=this.index+steps,count=this.clip.frames.length;
    if(!this.loop&&next>=count){this.index=count-1;this.paused=true;this.finished=true;this.elapsed=0;}
    else this.index=this.loop?next%count:next;
    return true;
  }
}
