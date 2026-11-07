// Right-facing sagittal gait. World Y points down; the floor is Y=0.
import { HUMAN } from './proportions.js';
import { FIRING_FORM } from './firing-form.js';
import { KNEEL_ART } from './kneeling-pose.js';
export const GAIT = Object.freeze({ period:1.40, speed:108, stance:.68, lift:6.5,
  thigh:76, shin:76, bootWidth:32*247/228, bootHeight:32, ankleU:.35, ankleV:.28 });
// A compact armed run: shorter recovery, quieter pelvis and a 15-degree waist.
// Contact travel and cadence remain coupled through gaitProfile.
export const RUN = Object.freeze({period:.84,speed:245,stance:.45,lift:32,
  contactDrop:8.5,compression:4,lean:15*Math.PI/180,sway:1.1,roll:.008});
// An additive performance layer; zero retains the previous gait and cadence.
export const MOTION_ENERGY=Object.freeze({min:0,max:1.5,default:1});
// Reference kneel: rear knee pad + tucked rear toes + flat forward sole.
// The knee center sits one pad radius above the floor; bones retain their length.
export const KNEEL = KNEEL_ART;
const TAU=Math.PI*2;
const lerp=(a,b,t)=>a+(b-a)*t;
const smooth=t=>t*t*(3-2*t);
const clamp=t=>Math.max(0,Math.min(1,t));
export const kneelWeight=amount=>smooth(clamp(amount/KNEEL.fireReady));
export function kneelHipY(x){
  const dx=KNEEL.rearKnee.x-(x+KNEEL.rearRootX);
  return KNEEL.rearKnee.y-Math.sqrt(Math.max(0,GAIT.thigh**2-dx**2));
}
export function gaitProfile(running){
  const r=clamp(running),period=lerp(GAIT.period,RUN.period,r),stance=lerp(GAIT.stance,RUN.stance,r);
  // Interpolating speed and period independently inflates the intermediate
  // stride beyond either endpoint. Interpolate contact travel and derive speed.
  const travel=lerp(GAIT.speed*GAIT.period*GAIT.stance,RUN.speed*RUN.period*RUN.stance,r);
  const speed=r===0?GAIT.speed:r===1?RUN.speed:travel/(period*stance);
  return {period,speed,stance,lift:lerp(GAIT.lift,RUN.lift,r)};
}
export const cycle=p=>((p%1)+1)%1;
export function curve(keys,t){
  t=clamp(t);
  for(let i=1;i<keys.length;i++)if(t<=keys[i][0]){const [a,x]=keys[i-1],[b,y]=keys[i];return lerp(x,y,smooth((t-a)/(b-a)));}
  return keys.at(-1)[1];
}
function hermite(a,b,ma,mb,t){const t2=t*t,t3=t2*t;return(2*t3-3*t2+1)*a+(t3-2*t2+t)*ma+(-2*t3+3*t2)*b+(t3-t2)*mb;}
function tangentCurve(keys,t){
  t=clamp(t);
  for(let i=1;i<keys.length;i++)if(t<=keys[i][0]){
    const [a,x,ma]=keys[i-1],[b,y,mb]=keys[i],span=b-a;
    return hermite(x,y,ma*span,mb*span,(t-a)/span);
  }
  return keys.at(-1)[1];
}
function runSwingTrack(front,back,m,t){
  // One continuous recovery rather than several eased key segments. Only the
  // rear/forward extrema pause; contact velocity is m at both ends and contact
  // acceleration is zero, matching the planted track's linear retreat.
  const q=t*t*t*(10+t*(-15+6*t));
  return back+m*t+(front-back-m)*q;
}
export function runPelvisOffset(phase,running=1){
  const p=cycle(phase/Math.PI),support=Math.min(.98,2*gaitProfile(running).stance);
  if(p<support)return RUN.contactDrop+RUN.compression*Math.sin(Math.PI*p/support);
  const flight=1-support,u=(p-support)/flight;
  // Y points down: compress during support, rise through toe-off, then descend
  // into the next landing. The flight parabola matches both endpoint velocities.
  return RUN.contactDrop-Math.PI*RUN.compression*flight/support*u*(1-u);
}
export const BOOT = Object.freeze({
  heel:{x:(.08-GAIT.ankleU)*GAIT.bootWidth,y:(1-GAIT.ankleV)*GAIT.bootHeight},
  toe:{x:(.90-GAIT.ankleU)*GAIT.bootWidth,y:(1-GAIT.ankleV)*GAIT.bootHeight}
});
export function footPose(trackX,clearance,angle){
  // Rotate around the planted heel/toe, rather than rotating a boot into the floor.
  const q=angle>0?BOOT.toe:BOOT.heel,c=Math.cos(angle),s=Math.sin(angle);
  const ankle={x:trackX+q.x-(c*q.x-s*q.y),y:-clearance-(s*q.x+c*q.y)};
  const point=p=>({x:ankle.x+c*p.x-s*p.y,y:ankle.y+s*p.x+c*p.y});
  return {...ankle,a:angle,heel:point(BOOT.heel),toe:point(BOOT.toe),trackX,clearance,
    contact:angle>0?'toe':'heel',pivot:point(q)};
}
export function energeticFoot(foot,amount,running,kneeling,energy){
  if(energy===0||foot.stance||foot.phase<foot.support)return foot;
  const u=(foot.phase-foot.support)/(1-foot.support);
  const weight=amount*(1-kneelWeight(kneeling))*energy;
  // Recover the heel higher without changing planted tracks, stride, bone
  // lengths or touchdown. Rebuild the boot around its heel/toe pivot.
  const bell=(u/.4)**2*((1-u)/.6)**3;
  return {...foot,...footPose(foot.trackX,foot.clearance+lerp(4.5,12,running)*bell*weight,
    foot.a+lerp(.035,.10,running)*Math.sin(Math.PI*u)**2*weight)};
}
function landingLoad(phase,running){
  const p=cycle(phase/Math.PI),support=Math.min(1,2*gaitProfile(running).stance);
  // Walking has overlapping support, so only a running profile has flight.
  // Grow its amplitude with the flight window during walk/run transitions.
  if(p>=support)return -2.5*Math.min(1,(1-support)/.10)*Math.sin(Math.PI*(p-support)/(1-support))**2;
  const u=p/support;
  // A quick compression after landing, followed by a longer push-off. Both
  // ends have zero velocity so the accent joins smoothly between contacts.
  return lerp(2.6,3.5,running)*(u/.26)**2*((1-u)/.74)**(2*.74/.26);
}
export function kneelRearFoot(){
  // Solve the ankle from the knee and toe contact, rather than hoping that
  // two independently authored foot/hip positions happen to ground the knee.
  const probe=footPose(0,0,KNEEL.rearFootAngle),dy=probe.y-KNEEL.rearKnee.y;
  const ankleX=KNEEL.rearKnee.x-Math.sqrt(Math.max(0,GAIT.shin**2-dy**2));
  return footPose(ankleX-probe.x,0,KNEEL.rearFootAngle);
}
export function gaitFoot(phase,layer,amount,running=0,kneeling=0,maxStance=1){
  const profile=gaitProfile(running),p=cycle(phase/TAU+(layer===0?.5:0)),stride=profile.speed*profile.period;
  const front=stride*profile.stance*.5,back=-front,stance=Math.min(profile.stance,maxStance);
  let x,angle,lift=0;
  if(p<stance){
    const u=p/stance;
    // Nominal retreat cancels world speed; RunFootContacts supplies the actual
    // planted track when a profile change shortens this contact.
    x=lerp(front,back,u);
    angle=lerp(curve([[0,-.12],[.16,0],[.72,0],[1,.25]],u),
      curve([[0,-.035],[.12,0],[.65,0],[.82,.08],[1,.28]],u),running);
  }else{
    const u=(p-stance)/(1-stance),m=-stride*(1-stance);
    x=lerp(hermite(back,front,m,m,u),runSwingTrack(front,back,m,u),running);
    // Early heel recovery bends the knee before the foot advances. Preserve
    // the same two rigid bone lengths; do not stretch the shin to fake reach.
    // A single asymmetric bell peaks at 40% of recovery, with zero vertical
    // velocity at toe-off/touchdown and no intermediate flat spots.
    lift=profile.lift*lerp(Math.sin(Math.PI*u)**1.4,(u/.4)**2*((1-u)/.6)**3,running);
    angle=lerp(curve([[0,.25],[.25,.13],[.55,-.07],[.84,-.14],[1,-.12]],u),
      tangentCurve([[0,.28,0],[.22,.45,0],[.65,-.04,-.1],[1,-.035,0]],u),running);
  }
  // The resting stance keeps a small stagger and soft knees while shouldered.
  const standingTrack=FIRING_FORM.standingFeet[layer],targetTrack=layer===0?KNEEL.frontTrack:kneelRearFoot().trackX;
  const k=kneelWeight(kneeling),transitionLift=(layer===0?3:7)*Math.sin(Math.PI*k)**2;
  const foot=footPose(lerp(lerp(standingTrack,x,amount),targetTrack,k),lift*amount*(1-k)+transitionLift,
    lerp(angle*amount,layer===0?0:KNEEL.rearFootAngle,k));
  return {...foot,phase:p,support:stance,stance:k>.999||((p<stance||amount<.001)&&transitionLift<.01)};
}

// Stateful contact history is advanced only by the fixed simulation step.
// Rendering reads the resulting feet without moving anchors or changing phase.
export class RunFootContacts {
  constructor(state){this.active=false;this.feet=null;this.contacts=[];this.distance=0;this.step(state);}
  step({phase,amount,running,kneeling,distance}){
    const authored=[0,1].map(layer=>gaitFoot(phase,layer,amount,running,kneeling));
    const previous=this.feet,previousDistance=this.distance;
    if(previous&&!this.active&&running>.001){
      this.active=true;
      this.contacts=previous.map(foot=>({planted:foot.stance,anchor:foot.trackX+previousDistance,support:foot.support,swing:null}));
    }
    this.distance=distance;
    if(!this.active){this.feet=authored;return;}
    // Allow the authored rest/kneeling transition to take over as movement ends.
    const weight=smooth(clamp((amount-.25)/.60))*(1-kneelWeight(kneeling));
    this.feet=authored.map((candidate,i)=>{
      const node=this.contacts[i],old=previous[i];
      // Slowing to a walk must not prolong an existing run contact and pull
      // the planted foot behind the leg's reach. The next contact may lengthen.
      node.support=candidate.phase<old.phase?candidate.support:Math.min(node.support,candidate.support);
      const foot=gaitFoot(phase,i,amount,running,kneeling,node.support);
      const planted=foot.stance&&amount>.001&&kneeling<.001;
      let track=foot.trackX;
      if(planted){
        if(!node.planted||foot.phase<old.phase)node.anchor=track+distance;
        track=lerp(track,node.anchor-distance,weight);
        node.swing=null;
      }else{
        if(node.planted)node.swing={phase:foot.phase,offset:node.anchor-distance-track};
        if(node.swing){
          const u=clamp((foot.phase-node.swing.phase)/(1-node.swing.phase));
          track+=node.swing.offset*(1-smooth(u))*weight;
        }
      }
      node.planted=planted;
      return {...foot,...footPose(track,foot.clearance,foot.a)};
    });
    if((amount<.001&&running<.001)||kneelWeight(kneeling)>.999){this.active=false;this.contacts=[];}
  }
}
export function gaitBody(phase,amount,time,aim=0,running=0,kneeling=0,eyeAim=aim,recoilShift=0,energy=0){
  const p=cycle(phase/Math.PI),bob=curve([[0,.5],[.12,3],[.34,2],[.60,-.8],[.87,-.2],[1,.5]],p);
  // Stationary fire needs its own brace. Fade it out as the lower combat gait
  // takes over, keeping planted feet and the existing moving-fire posture.
  const standingBrace=aim*(1-amount);
  const rest=(1-aim)*(1-amount),breath=Math.sin(time*TAU/3.8);
  const run=running*amount,runOffset=runPelvisOffset(phase,running);
  // A low, longer combat step: absorb the landing instead of bobbing upwards.
  // Pelvis shift is modest; the torso leans ahead of it while the gun stays level.
  const accent=energy*amount*(1-.35*eyeAim);
  const x=Math.sin(phase*2-.8)*lerp(3.2,RUN.sway,running)*amount+standingBrace*FIRING_FORM.pelvisBack+rest*.8
    +Math.sin(phase*2-.65)*lerp(.6,1.7,running)*accent;
  const y=HUMAN.hipY+amount*(7+bob)+run*(runOffset-7-bob)+aim*(1.8+.8*amount)+standingBrace*FIRING_FORM.pelvisDrop+rest*2.6+breath*.22*(1-amount)
    +landingLoad(phase,running)*accent;
  const sightRest=(1-eyeAim)*(1-amount),sightBrace=eyeAim*(1-amount);
  const pelvisAngle=Math.sin(phase)*lerp(.020,RUN.roll,running)*amount+standingBrace*FIRING_FORM.pelvisTilt
    +Math.sin(phase-.12)*lerp(.010,.018,running)*accent;
  const angleMotion=pelvisAngle-standingBrace*FIRING_FORM.pelvisTilt;
  const ordinaryLean=sightRest*(.070+breath*.002)+eyeAim*.024+sightBrace*(FIRING_FORM.standingLean-.024)+amount*(.105+eyeAim*FIRING_FORM.walkingAimLean+Math.sin(phase*2)*.008);
  const lean=lerp(ordinaryLean,pelvisAngle+RUN.lean+Math.sin(phase*2)*.003,run);
  // Keep animated pitch separate from sustained pose lean. The head may
  // counter a running lean while still following the same current-step load.
  const leanMotion=lerp(sightRest*breath*.002+amount*Math.sin(phase*2)*.008,
    angleMotion+Math.sin(phase*2)*.003,run);
  const k=kneelWeight(kneeling),hipX=lerp(x,KNEEL.hipX+eyeAim*KNEEL.aimForward,k)+recoilShift;
  // Pelvis height follows the grounded thigh arc, including the small recoil
  // shift. Breathing stays in the upper body instead of lifting the knee pad.
  return {x:hipX,y:lerp(y,kneelHipY(hipX),k),
    a:pelvisAngle*(1-k),lean:lerp(lean,KNEEL.lean+eyeAim*KNEEL.aimLean+breath*.001,k),
    angleMotion:angleMotion*(1-k),leanMotion:lerp(leanMotion,breath*.001,k)};
}

// One small support step per standing burst, followed by a quiet recovery step.
// It is an authored reaction, not a full-body force simulation.
export class RearBrace {
  constructor(){this.reset();}
  reset(){this.mode='idle';this.t=0;this.x=0;this.lift=0;this.angle=0;}
  shot(walking){if(walking<.08&&this.mode==='idle'){this.mode='back';this.t=0;}}
  step(dt,{aim,walking,enabled=true}){
    if(!enabled||walking>.98){this.reset();return;}
    if(this.mode==='planted'&&aim<.12){this.mode='recover';this.t=0;}
    this.t+=dt;this.lift=0;this.angle=0;
    if(this.mode==='back'||this.mode==='recover'){
      const u=clamp(this.t/.34),s=smooth(u);
      this.x=this.mode==='back'?-4*s:-4*(1-s);
      this.lift=1.8*Math.sin(Math.PI*u)**2;
      this.angle=.055*Math.sin(Math.PI*u);
      if(u===1){this.mode=this.mode==='back'?'planted':'idle';this.lift=this.angle=0;}
    }
  }
  pose(amount=0){const weight=1-amount;return {x:this.x*weight,lift:this.lift*weight,angle:this.angle*weight,mode:this.mode};}
}
