// Shared clock for ammunition, hand keyframes, magazine attachment and sound cues.
export const MAG_SIZE=30;
export const RELOAD={normal:2.2,empty:2.8,grab:.40,out:.48,stow:.90,fresh:1.04,insert:1.42,tap:1.60,boltStart:2.08,boltPull:2.20,boltRelease:2.25,boltEnd:2.31};
export function ease(value){const t=Math.max(0,Math.min(1,value));return t*t*t*(t*(t*6-15)+10);}
export function reloadWeight(reload){return reload?Math.min(ease(reload.elapsed/.28),1-ease((reload.elapsed-(reload.duration-.36))/.36)):0;}
export function boltPull(reload){
  if(!reload?.empty)return 0;
  const t=reload.elapsed;
  return ease((t-RELOAD.boltStart)/(RELOAD.boltPull-RELOAD.boltStart))*(1-ease((t-RELOAD.boltRelease)/(RELOAD.boltEnd-RELOAD.boltRelease)));
}
export function requestReload(state){
  if(state.reload||state.reloadRequested)return false;
  // This motion lab permits a manual preview even with a full magazine.
  state.reloadRequested=true;return true;
}
export function advanceReload(state,fire,dt){
  state.reloadEvents=[];
  if(!state.reload&&(state.reloadRequested||(fire&&state.ammo===0))){
    const empty=state.ammo===0;
    state.reload={elapsed:0,duration:empty?RELOAD.empty:RELOAD.normal,empty};
    state.reloadEvents.push('start');state.flash=0;
  }
  state.reloadRequested=false;
  const reload=state.reload;
  if(!reload)return false;
  const before=reload.elapsed;
  reload.elapsed=Math.min(reload.duration,before+dt);
  const cues=[['magout',RELOAD.out],['magin',RELOAD.insert],['tap',RELOAD.tap]];
  if(reload.empty)cues.push(['bolt',RELOAD.boltRelease]);
  for(const [name,time] of cues)if(before<time&&reload.elapsed>=time)state.reloadEvents.push(name);
  if(reload.elapsed>=reload.duration){state.ammo=MAG_SIZE;state.reload=null;state.reloadEvents.push('done');}
  // Completion occupies this tick; firing resumes on the next simulation tick.
  return true;
}
export function reloadLabel(reload){
  const t=reload.elapsed;
  if(t<.22)return '총 내리기';
  if(t<RELOAD.out)return '탄창 잡기';
  if(t<RELOAD.stow)return '탄창 분리';
  if(t<RELOAD.fresh)return '탄창 교체';
  if(t<RELOAD.insert)return '탄창 삽입';
  if(t<1.72)return '삽입 확인';
  if(reload.empty&&t<2.40)return '노리쇠 조작';
  return '사격 자세 복귀';
}
