import {RELOAD,boltPull,ease} from './reload.js';
import {RIFLE} from './weapon-definition.js';

// Pure pose evaluation: repeated render/paused calls cannot advance mechanical time.
export function poseWeaponMechanics(state,rig){
  const {bolt,trigger,round,heldRound,flash,lamp,arms}=rig;
  const age=state.time-state.lastShot;
  const cycle=age>=0&&age<.072?Math.sin(Math.PI*age/.072):0;
  const released=state.reload?.empty&&state.reload.elapsed>=RELOAD.boltRelease;
  const locked=state.ammo===0&&!released;
  bolt.position.z=-RIFLE.boltTravel*Math.max(cycle,locked?.86:0,boltPull(state.reload));
  const finger=state.reload?0:(state.firing||age<.075?1:1-ease((age-.075)/.11));
  trigger.rotation.x=-finger*.22;
  for(const arm of arms)if(arm.indexFinger)arm.indexFinger.rotation.x=-finger*.25;
  // Reload inventory is still replenished only on completion; this is the visible prop.
  round.visible=state.reload?(!state.reload.empty||state.reload.elapsed>=RELOAD.insert):state.ammo>0;
  heldRound.visible=state.reload?(!state.reload.empty||state.reload.elapsed>=RELOAD.fresh):state.ammo>0;
  flash.visible=state.flash>0;
  const seed=Math.sin(state.shots*127.1)*.5+.5;
  flash.rotation.z=seed*Math.PI*2;
  flash.scale.set(.75+seed*.45,.75+seed*.45,.8+seed*.6);
  for(const part of flash.children)part.material.opacity=.85*Math.sqrt(Math.max(0,state.flash/.045));
  lamp.intensity=state.flash>0?4*Math.sqrt(state.flash/.045):0;
}
