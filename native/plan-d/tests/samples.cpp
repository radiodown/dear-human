// Focused sample/physics smoke check. No renderer, network or OS APIs.
#include "Simulation.hpp"
#include <cstdio>
#include <stdexcept>

void require(bool value,const char* message) {if(!value)throw std::runtime_error(message);}
int main(int argc,char** argv) {
    try {
        if(argc!=2)throw std::runtime_error("Pass the runtime sample directory");
        const auto assets=dh::loadSampleLibrary(argv[1]);
        require(assets->hair.size()==6,"Missing samples");
        std::puts("sample,vertices,triangles,wind_offset_m,contact_steps,max_proxy_penetration_m");
        for(int index=0;index<6;++index) {
            dh::ViewState state;state.hairSample=index;state.walkInPlace=true;
            dh::Simulation sim(state,assets);
            unsigned contacts=0;float offset=0,penetration=0;
            for(int frame=0;frame<480;++frame) {
                sim.advance({},1.0/120);
                contacts+=sim.samples().contacts()>0;
                offset=std::max(offset,sim.hairOffset());
                penetration=std::max(penetration,sim.samples().maximumPenetration());
            }
            const auto rendered=sim.renderFrame(1280,800);
            for(const auto& v:rendered.scene.world.vertices)
                require(std::isfinite(v.position.x)&&std::isfinite(v.position.y)&&std::isfinite(v.position.z),"Nonfinite geometry");
            require(offset<.6f && (assets->hair[index].flexible?offset>.001f:offset==0),"Missing or unstable hair response");
            const auto& hair=assets->hair[index].mesh;
            std::printf("%d,%zu,%zu,%.6f,%u,%.6f\n",index,hair.vertices.size(),hair.indices.size()/3,offset,contacts,penetration);
            dh::InputFrame pause;pause.actions={dh::Action::Pause};sim.advance(pause,0);
            const float frozen=sim.hairOffset();sim.advance({},1);sim.renderFrame(800,600);
            require(sim.hairOffset()==frozen,"Paused/render-only call advanced hair");
        }
        // Body-only contacts remain active after removal of all scenery probes.
        dh::ViewState state;state.hairSample=0;state.wind=false;state.walkInPlace=true;
        dh::Simulation on(state,assets);state.collisions=false;dh::Simulation off(state,assets);
        for(int i=0;i<210;++i) {on.advance({},1.0/120);off.advance({},1.0/120);}
        require(off.samples().maximumPenetration()>on.samples().maximumPenetration()+.005f,"Collision toggle has no effect");
        std::printf("collision penetration on %.6f / off %.6f\n",on.samples().maximumPenetration(),off.samples().maximumPenetration());
        std::puts("PASS: sample loading, finite sway, body collision difference, pause/read-only render");
        return 0;
    } catch(const std::exception& e) {std::fprintf(stderr,"FAIL: %s\n",e.what());return 1;}
}
