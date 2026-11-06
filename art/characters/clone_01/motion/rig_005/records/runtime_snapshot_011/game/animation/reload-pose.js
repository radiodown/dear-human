// Continuous contact poses for the shared rig; hand artwork is a separate slot.
const clamp=v=>Math.max(0,Math.min(1,v));
const ease=v=>{const t=clamp(v);return t*t*(3-2*t);};
const mix=(a,b,t)=>a+(b-a)*t;
function sample(keys,t){
  const after=keys.findIndex(k=>k.t>t);
  if(after===0)return keys[0];
  if(after<0)return keys.at(-1);
  const a=keys[after-1],b=keys[after],v=ease((t-a.t)/(b.t-a.t));
  return {x:mix(a.x,b.x,v),y:mix(a.y,b.y,v),angle:mix(a.angle,b.angle,v),magazineAngle:mix(a.magazineAngle,b.magazineAngle,v)};
}
export const HAND_ART_STATUS=Object.freeze({
  support:'existing',trigger:'existing',release:'missing',magazine_grip:'missing',bolt_press:'missing'
});
export function reloadPose(reload,{support,mag,bolt,pouch,angle,magazineAngle=angle}){
  const contact={x:-Math.sin(magazineAngle)*15,y:Math.cos(magazineAngle)*15};
  const grip={x:mag.x+contact.x,y:mag.y+contact.y,angle:magazineAngle-.55,magazineAngle};
  const hold={...support,angle:angle-.30,magazineAngle};
  const down={x:grip.x-Math.sin(magazineAngle)*16,y:grip.y+Math.cos(magazineAngle)*16,angle:magazineAngle-.55,magazineAngle};
  const belt={...pouch,angle:angle-.65,magazineAngle:magazineAngle+.25};
  const atBolt={...bolt,angle:angle-.15,magazineAngle};
  const keys=[{t:0,...hold},{t:.28,...grip},{t:.42,...grip},{t:.64,...down},
    {t:.92,...belt},{t:.98,...belt},{t:1.20,...down},{t:1.44,...grip},{t:1.54,...grip}];
  if(reload.empty)keys.push({t:1.78,...atBolt},{t:1.96,...atBolt},{t:2.14,...grip},{t:2.46,...hold});
  else keys.push({t:1.98,...hold});
  const hand=sample(keys,reload.t),t=reload.t;
  const carrying=(t>=.42&&t<.82)||(t>=.98&&t<1.44);
  const visible=t<.82||t>=.98;
  const offset={x:-Math.sin(hand.magazineAngle)*15,y:Math.cos(hand.magazineAngle)*15};
  const magazine=carrying?{x:hand.x-offset.x,y:hand.y-offset.y,a:hand.magazineAngle}:{...mag,a:magazineAngle};
  const phase=t<.28?'release':t<.82?'extract':t<.98?'fetch':t<1.44?'insert':
    reload.empty&&t>=1.54&&t<2.14?'bolt':t<1.54?'seat':'return';
  const requestedHand=phase==='bolt'?'bolt_press':['extract','fetch','insert','seat'].includes(phase)?'magazine_grip':phase==='release'?'release':'support';
  const start=reload.empty?2.14:1.54,end=reload.empty?2.46:1.98;
  const viewAmount=ease((t-.32)/.28)*(1-ease((t-start)/(end-start)));
  return {hand,magazine,magazineVisible:visible,carrying,phase,requestedHand,
    viewAmount,
    handArtwork:HAND_ART_STATUS[requestedHand],renderedHand:'support_hand'};
}
