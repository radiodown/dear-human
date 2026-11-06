// Four outfit attachments share their source coordinates and border vertices.
// The breastplate stays rigid; its surrounding cloth follows the plate's edge.
import { FIRING_FORM } from './firing-form.js';
export const WAIST=Object.freeze({aboveHip:34,upper:.485,lower:.56,pivotU:.46,pivotV:.88});
export const BUST=Object.freeze({pivotU:(650-194)/637,pivotV:(490-78)/1315});
const clamp=t=>Math.max(0,Math.min(1,t));
const transform=(p,t)=>({x:t.x+Math.cos(t.a)*p.x-Math.sin(t.a)*p.y,y:t.y+Math.sin(t.a)*p.x+Math.cos(t.a)*p.y});
const hermite=(a,b,ma,mb,t)=>(2*t*t*t-3*t*t+1)*a+(t*t*t-2*t*t+t)*ma+(-2*t*t*t+3*t*t)*b+(t*t*t-t*t)*mb;
export function waistFrame(pelvis,angle){return {...transform({x:0,y:-WAIST.aboveHip},pelvis),a:angle};}
export function upperPoint(p,width,height,u,v){
  const point={x:(u-WAIST.pivotU)*width,y:(v-WAIST.pivotV)*height+WAIST.aboveHip},lower=transform(point,p.waist);
  if(!p.chest)return lower;
  const upper=transform({x:point.x,y:point.y+FIRING_FORM.chestAboveWaist},p.chest);
  const t=clamp((v-FIRING_FORM.upperRigidEnd)/(FIRING_FORM.lowerTorsoStart-FIRING_FORM.upperRigidEnd)),weight=t*t*(3-2*t);
  return {x:upper.x+(lower.x-upper.x)*weight,y:upper.y+(lower.y-upper.y)*weight};
}
export function bustFrame(p,width,height,pitch=0){
  return {...upperPoint(p,width,height,BUST.pivotU,BUST.pivotV),a:(p.chest??p.waist).a+pitch};
}
export function bustPoint(p,width,height,u,v){
  return transform({x:(u-BUST.pivotU)*width,y:(v-BUST.pivotV)*height},p.bust);
}
export function torsoPoint(p,width,height,u,v,bustWeight=0){
  const a=upperPoint(p,width,height,u,v);
  if(!bustWeight)return a;
  const b=bustPoint(p,width,height,u,v);
  return {x:a.x+(b.x-a.x)*bustWeight,y:a.y+(b.y-a.y)*bustWeight};
}
export function outfitPoint(p,width,height,u,v){
  const x=(u-WAIST.pivotU)*width,y=(v-WAIST.pivotV)*height;
  if(v<=WAIST.upper)return upperPoint(p,width,height,u,v);
  if(v>=WAIST.lower){
    let point={x,y};
    // Include the visible lower fabric instead of only its last few pixels.
    // The pelvis, belt and upper pouches remain pinned to the leg roots.
    const hemStart=.88;
    if(v>hemStart){const k=clamp((v-hemStart)/(1-hemStart)),angle=p.outfit.hem*k*k*(3-2*k),dy=(v-hemStart)*height;
      point={x:Math.cos(angle)*x-Math.sin(angle)*dy,y:y+Math.sin(angle)*x+(Math.cos(angle)-1)*dy};}
    return transform(point,p.pelvis);
  }
  const t=(v-WAIST.upper)/(WAIST.lower-WAIST.upper),span=(WAIST.lower-WAIST.upper)*height;
  const a=transform({x,y:(WAIST.upper-WAIST.pivotV)*height+WAIST.aboveHip},p.waist);
  const b=transform({x,y:(WAIST.lower-WAIST.pivotV)*height},p.pelvis);
  // Matching endpoint tangents joins both borders without a paper hinge or gap.
  const ma={x:-Math.sin(p.waist.a)*span,y:Math.cos(p.waist.a)*span};
  const mb={x:-Math.sin(p.pelvis.a)*span,y:Math.cos(p.pelvis.a)*span};
  // The old waist spring never reached this renderer. A small interior fold
  // now uses it, with zero displacement and slope at both attachment borders.
  const fold=Math.sin(Math.PI*t)**2,flutter=(p.outfit.waist??0)*height*fold;
  return {x:hermite(a.x,b.x,ma.x,mb.x,t)+Math.cos(p.pelvis.a)*flutter,
    y:hermite(a.y,b.y,ma.y,mb.y,t)+Math.sin(p.pelvis.a)*flutter};
}
export function waistStrain(p,width,height){
  const sample=u=>{
    const a=outfitPoint(p,width,height,u,WAIST.upper),b=outfitPoint(p,width,height,u,WAIST.lower);
    return Math.hypot(b.x-a.x,b.y-a.y)/((WAIST.lower-WAIST.upper)*height);
  };
  // Sample the actual waist fabric, inside the transparent texture margins.
  return {back:sample(.28),front:sample(.70)};
}
