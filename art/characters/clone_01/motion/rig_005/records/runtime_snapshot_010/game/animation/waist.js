// One anatomical waist axis. Chest and skirt are rigid attachments; the cloth
// between their borders is the only stretched connection. No raster is edited.
export const WAIST=Object.freeze({aboveHip:34,upper:.485,lower:.56,pivotU:.46,pivotV:.88});
const clamp=t=>Math.max(0,Math.min(1,t));
const transform=(p,t)=>({x:t.x+Math.cos(t.a)*p.x-Math.sin(t.a)*p.y,y:t.y+Math.sin(t.a)*p.x+Math.cos(t.a)*p.y});
const hermite=(a,b,ma,mb,t)=>(2*t*t*t-3*t*t+1)*a+(t*t*t-2*t*t+t)*ma+(-2*t*t*t+3*t*t)*b+(t*t*t-t*t)*mb;
export function waistFrame(pelvis,angle){return {...transform({x:0,y:-WAIST.aboveHip},pelvis),a:angle};}
export function outfitPoint(p,width,height,u,v){
  const x=(u-WAIST.pivotU)*width,y=(v-WAIST.pivotV)*height;
  if(v<=WAIST.upper)return transform({x,y:y+WAIST.aboveHip},p.waist);
  if(v>=WAIST.lower){
    let point={x,y};
    if(v>.92){const k=clamp((v-.92)/.08),angle=p.outfit.hem*k*k*(3-2*k),dy=(v-.92)*height;
      point={x:Math.cos(angle)*x-Math.sin(angle)*dy,y:y+Math.sin(angle)*x+(Math.cos(angle)-1)*dy};}
    return transform(point,p.pelvis);
  }
  const t=(v-WAIST.upper)/(WAIST.lower-WAIST.upper),span=(WAIST.lower-WAIST.upper)*height;
  const a=transform({x,y:(WAIST.upper-WAIST.pivotV)*height+WAIST.aboveHip},p.waist);
  const b=transform({x,y:(WAIST.lower-WAIST.pivotV)*height},p.pelvis);
  // Matching endpoint tangents joins both borders without a paper hinge or gap.
  const ma={x:-Math.sin(p.waist.a)*span,y:Math.cos(p.waist.a)*span};
  const mb={x:-Math.sin(p.pelvis.a)*span,y:Math.cos(p.pelvis.a)*span};
  return {x:hermite(a.x,b.x,ma.x,mb.x,t),y:hermite(a.y,b.y,ma.y,mb.y,t)};
}
export function waistStrain(p,width,height){
  const sample=u=>{
    const a=outfitPoint(p,width,height,u,WAIST.upper),b=outfitPoint(p,width,height,u,WAIST.lower);
    return Math.hypot(b.x-a.x,b.y-a.y)/((WAIST.lower-WAIST.upper)*height);
  };
  // Sample the actual waist fabric, inside the transparent texture margins.
  return {back:sample(.28),front:sample(.70)};
}
