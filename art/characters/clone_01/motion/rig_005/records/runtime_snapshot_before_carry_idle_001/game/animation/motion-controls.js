// The same editable fields for every parts-rig action. Waist values describe
// the nominal pose; breathing, stride and recoil remain additive.
export const MOTION_CONTROL_FIELDS=Object.freeze({
  waist:{min:0,max:45,step:.5},bend:{min:0,max:45,step:.5},bust:{min:-5,max:5,step:.5},
  weaponDrop:{min:0,max:18,step:1},energy:{min:0,max:150,step:5},lightStrength:{min:0,max:200,step:10}
});
export const MOTION_REACTIONS=Object.freeze(['recoil','head','hair','cloth','cape']);
const base={bend:0,bust:0,weaponDrop:0,energy:100,lightStrength:100,light:true,
  recoil:true,head:true,hair:true,cloth:true,cape:true};
export const MOTION_CONTROL_DEFAULTS=Object.freeze(Object.fromEntries(Object.entries({
  idle:{waist:4},walk:{waist:6},fire:{waist:12},walk_fire:{waist:12.5},
  run:{waist:15,weaponDrop:6},run_fire:{waist:15,weaponDrop:6},kneel:{waist:6.5},kneel_fire:{waist:9}
}).map(([mode,values])=>[mode,Object.freeze({...base,...values})])));
export function normalizeMotionControls(mode,input={}){
  const defaults=MOTION_CONTROL_DEFAULTS[mode];
  if(!defaults)throw new Error(`Unknown motion controls: ${mode}`);
  const result={...defaults};
  if(!input||typeof input!=='object')return result;
  for(const [key,{min,max,step}]of Object.entries(MOTION_CONTROL_FIELDS)){
    if(Number.isFinite(input[key]))result[key]=Math.max(min,Math.min(max,Math.round(input[key]/step)*step));
  }
  for(const key of [...MOTION_REACTIONS,'light'])if(typeof input[key]==='boolean')result[key]=input[key];
  return result;
}
export function defaultMotionProfiles(){return Object.fromEntries(Object.keys(MOTION_CONTROL_DEFAULTS).map(mode=>[mode,normalizeMotionControls(mode)]));}
