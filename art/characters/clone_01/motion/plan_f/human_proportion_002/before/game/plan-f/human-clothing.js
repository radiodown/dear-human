import {group,box,panel,tube,oval} from './geometry.js';

// Rigid trim belongs to its equipment frame; the flexible skirt panels articulate.
export function buildClothingDetail(rig,m){
  const {hips,torso,arms,legs,head}=rig,skirts=[];
  for(const side of [-1,1]){
    // High-collar stitching and restrained gold branch embroidery.
    for(let j=0;j<4;j++){
      const y=.415+j*.012;
      tube(torso,[[side*.043,y,.059],[side*.053,y+.007,.053],[side*.058,y+.012,.048]],.00085,m.gold,8);
    }
    tube(torso,[[side*.032,.411,.061],[side*.042,.438,.061],[side*.048,.467,.052]],.0011,m.gold,16);
    for(let j=0;j<3;j++){
      const buckle=group(torso,side*.119,.16+j*.086,.137);
      box(buckle,.019,.021,.003,m.gold);box(buckle,.012,.014,.004,m.black,0,0,.002);
      box(buckle,.002,.019,.005,m.gold,0,0,.005);
    }
    // Side/rear skirt fabric under the existing front armor plates.
    for(let j=0;j<3;j++){
      const g=group(hips,side*(.09+j*.025),-.018,-.085+j*.017);
      g.rotation.y=side*(.15+j*.38);
      panel(g,[[-.028,0],[.028,0],[.037,-.17],[-.038,-.18]],.004,m.cloth);
      tube(g,[[-.026,-.008,.004],[-.034,-.165,.004],[.032,-.157,.004]],.0008,m.edge,18);
      skirts.push({group:g,side,phase:j});
    }
    // Paired braid-like edge strands and small retainers without changing hair color.
    for(let j=0;j<4;j++){
      const x=side*(.073+j*.006),y=.116-j*.024,z=.052-j*.009;
      oval(head,.0022,.0048,.002,m.gold,x,y,z);
    }
  }
  for(const arm of arms){
    const s=arm.sign;
    for(const x of [-.029,.029])tube(arm.upper.group,[[x,-.045,.028],[x,-.14,.040],[x*.8,-.24,.027]],.0012,m.edge,18);
    for(const y of [-.045,-.13,-.22]){
      box(arm.lower.group,.069,.014,.044,m.leather,0,y,0,.004);
      box(arm.lower.group,.016,.019,.005,m.gold,s*.027,y,.034,.002);
    }
    tube(arm.lower.group,[[s*.025,-.025,.035],[s*.031,-.11,.037],[s*.021,-.25,.027]],.0014,m.edge,20);
  }
  for(const leg of legs){
    const s=leg.sign;
    // Garter straps terminate at actual thigh equipment, never at an adjacent leg.
    box(leg.thigh.group,.015,.14,.008,m.leather,s*.048,-.055,.065,.002);
    for(const y of [-.035,-.09]){
      box(leg.thigh.group,.020,.021,.005,m.gold,s*.048,y,.071,.002);
      box(leg.thigh.group,.011,.013,.006,m.black,s*.048,y,.075,.001);
    }
    const holster=group(leg.thigh.group,s*.075,-.15,.005);
    box(holster,.038,.13,.065,m.leather,0,0,0,.008);
    box(holster,.041,.028,.069,m.armor,0,.046,0,.004);
    tube(holster,[[s*.021,.050,.025],[s*.021,-.054,.025],[s*.021,-.060,-.018]],.001,m.edge,16);
    for(const x of [-.035,.035])tube(leg.shin.group,[[x,-.045,.034],[x*.82,-.17,.045],[x*.62,-.33,.029]],.0012,m.edge,22);
    for(const y of [-.1,-.25])box(leg.shin.group,.078,.023,.068,m.leather,0,y,-.003,.004);
  }
  function pose(state){
    const moving=Math.min(1,state.speed/1.3),crouch=state.crouch||0;
    for(const s of skirts){
      s.group.rotation.x=-.18-crouch*.55+Math.sin(state.phase+s.side*.8+s.phase*.3)*moving*.065;
      s.group.rotation.z=-s.side*(.04+crouch*.10);
    }
  }
  return {pose};
}
