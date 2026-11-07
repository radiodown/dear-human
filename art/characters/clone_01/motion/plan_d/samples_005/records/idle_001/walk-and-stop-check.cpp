#include "Simulation.hpp"
#include "CloneModelData.hpp"
#include <cstdio>
#include <stdexcept>
dh::MeshData localHair(dh::Simulation& sim) {
 dh::Skeleton skeleton;auto s=sim.state();skeleton.pose(s.phase,s.walkAmount,s.facing,s.worldX);
 dh::MeshData mesh;sim.samples().appendHair(mesh,skeleton,s);
 auto inv=dh::inverseRigid(skeleton.world(dh::Head)*dh::model::cloneModel().inverseBind[dh::Head]);
 for(auto& v:mesh.vertices)v.position=inv.point(v.position);
 return mesh;
}
float difference(const dh::MeshData& a,const dh::MeshData& b) {
 float max=0;for(size_t i=0;i<a.vertices.size();++i)max=std::max(max,dh::length(a.vertices[i].position-b.vertices[i].position));return max;
}
int main() {
 const auto assets=dh::loadSampleLibrary("native/plan-d/build/bin/assets/samples");dh::Simulation sim({},assets);
 for(int i=0;i<240;++i)sim.advance({},1.0/120);
 auto rest=localHair(sim);dh::InputFrame toggle;toggle.actions={dh::Action::Walk};sim.advance(toggle,0);
 auto prev=rest;float sway=0;
 for(int i=0;i<360;++i) {
  sim.advance({},1.0/120);
  if(i%12==11) {auto current=localHair(sim);sway=std::max(sway,difference(current,rest));prev=std::move(current);}
 }
 std::printf("walk-in-place maximum hair change relative to head: %.6f m\n",sway);
 if(sway<.001f || sway>.15f)throw std::runtime_error("walk response missing or excessive");
 sim.advance(toggle,0);
 for(int i=0;i<360;++i)sim.advance({},1.0/120);
 auto settled=localHair(sim);
 for(int i=0;i<120;++i)sim.advance({},1.0/120);
 float idle=difference(localHair(sim),settled);std::printf("after stop, change over one second: %.6f m\n",idle);
 if(idle>.0002f)throw std::runtime_error("continued idle jitter");
 dh::InputFrame move;move.moveAxis=-1;
 for(int i=0;i<120;++i)sim.advance(move,1.0/120);
 for(int i=0;i<360;++i)sim.advance({},1.0/120);
 settled=localHair(sim);for(int i=0;i<120;++i)sim.advance({},1.0/120);
 idle=difference(localHair(sim),settled);std::printf("after movement and turn, idle change: %.6f m\n",idle);
 if(idle>.0002f)throw std::runtime_error("movement did not settle");
 dh::ViewState contact;contact.hairSample=0;contact.probeMoving=true;
 dh::Simulation on(contact,assets);contact.collisions=false;dh::Simulation off(contact,assets);
 for(int i=0;i<210;++i){on.advance({},1.0/120);off.advance({},1.0/120);}
 std::printf("sphere guide penetration on/off: %.6f / %.6f m\n",on.samples().probePenetration(),off.samples().probePenetration());
 if(off.samples().probePenetration()<on.samples().probePenetration()+.005f)throw std::runtime_error("sphere contact lost");
 dh::InputFrame shape;shape.actions={dh::Action::ProbeShape};on.advance(shape,0);off.advance(shape,0);
 for(int i=0;i<30;++i){on.advance({},1.0/120);off.advance({},1.0/120);}
 std::printf("box guide penetration on/off: %.6f / %.6f m\n",on.samples().probePenetration(),off.samples().probePenetration());
 if(off.samples().probePenetration()<on.samples().probePenetration()+.005f)throw std::runtime_error("box contact lost");

}
