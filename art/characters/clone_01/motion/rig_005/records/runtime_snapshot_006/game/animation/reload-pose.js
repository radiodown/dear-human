// Continuous contact poses for the shared rig; hand artwork is a separate slot.
const clamp=v=>Math.max(0,Math.min(1,v));
const ease=v=>{const t=clamp(v);return t*t*(3-2*t);};
const mix=(a,b,t)=>a+(b-a)*t;
function sample(keys,t){
  const after=keys.findIndex(k=>k.t>t);
  if(after===0)return keys[0];
  if(after<0)return keys.at(-1);
  const a=keys[after-1],b=keys[after],v=ease((t-a.t)/(b.t-a.t));
  return {x:mix(a.x,b.x,v),y:mix(a.y,b.y,v),angle:mix(a.angle,b.angle,v)};
}
export const HAND_ART_STATUS=Object.freeze({
  support:'existing',trigger:'existing',release:'missing',magazine_grip:'missing',bolt_press:'missing'
});
export function reloadPose(reload,{support,mag,bolt,pouch,angle}){
  const contact={x:-Math.sin(angle)*15,y:Math.cos(angle)*15};
  const grip={x:mag.x+contact.x,y:mag.y+contact.y,angle:angle-.95};
  const hold={...support,angle:angle-.30};
  const down={x:grip.x-6,y:grip.y+21,angle:angle-1.1};
  const belt={...pouch,angle:angle-.85};
  const atBolt={...bolt,angle:angle-.15};
  const keys=[{t:0,...hold},{t:.28,...grip},{t:.40,...grip},{t:.64,...down},
    {t:.84,...belt},{t:.96,...belt},{t:1.18,...down},{t:1.40,...grip},{t:1.46,...grip}];
  if(reload.empty)keys.push({t:1.72,...atBolt},{t:1.92,...atBolt},{t:2.12,...grip},{t:2.46,...hold});
  else keys.push({t:1.98,...hold});
  const hand=sample(keys,reload.t),t=reload.t;
  const carrying=(t>=.40&&t<.79)||(t>=.98&&t<1.40);
  const visible=t<.79||t>=.98;
  const magazine=carrying?{x:hand.x-contact.x,y:hand.y-contact.y}:mag;
  const phase=t<.28?'release':t<.79?'extract':t<.98?'fetch':t<1.40?'insert':
    reload.empty&&t>=1.46&&t<2.12?'bolt':t<1.46?'seat':'return';
  const requestedHand=phase==='bolt'?'bolt_press':['extract','fetch','insert','seat'].includes(phase)?'magazine_grip':phase==='release'?'release':'support';
  return {hand,magazine,magazineVisible:visible,carrying,phase,requestedHand,
    handArtwork:HAND_ART_STATUS[requestedHand],renderedHand:'support_hand'};
}
