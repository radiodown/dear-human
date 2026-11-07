#include "Application.hpp"
#include "Simulation.hpp"
#include "CloneModel.hpp"
#include <chrono>
#include <cstdio>
#include <cstdlib>
#include <exception>
#include <memory>
#include <stdexcept>
#include <string>

namespace {
struct Options {
    dh::ViewState state;
    std::filesystem::path capture;
    std::filesystem::path exportModel;
    int frames{};
};
Options parse(int argc,char** argv) {
    Options options;
    const auto value=[&](int& i) -> std::string {
        if(++i>=argc) throw std::runtime_error(std::string("Missing value after ")+argv[i-1]);
        return argv[i];
    };
    for(int i=1;i<argc;++i) {
        const std::string argument=argv[i];
        if(argument=="--view") {
            const auto mode=value(i);
            if(mode=="bones") options.state.view=dh::View::Skeleton;
            else if(mode=="solid") options.state.view=dh::View::Solid;
            else if(mode=="overlay") options.state.view=dh::View::Overlay;
            else throw std::runtime_error("--view expects bones, solid or overlay");
        } else if(argument=="--capture") options.capture=value(i);
        else if(argument=="--export-model") options.exportModel=value(i);
        else if(argument=="--model") {
            const auto name=value(i);
            if(name=="clone") options.state.appearance=dh::Appearance::Clone01;
            else if(name=="mannequin") options.state.appearance=dh::Appearance::Mannequin;
            else throw std::runtime_error("--model expects clone or mannequin");
        }
        else if(argument=="--frames") {
            options.frames=std::stoi(value(i));
            if(options.frames<1) throw std::runtime_error("--frames must be positive");
        } else if(argument=="--phase") options.state.phase=std::stof(value(i));
        else if(argument=="--yaw") options.state.yaw=std::remainder(std::stof(value(i)),360.0f);
        else if(argument=="--pitch") options.state.pitch=std::clamp(std::stof(value(i)),0.0f,35.0f);
        else if(argument=="--walk") { options.state.walkInPlace=true; options.state.walkAmount=1; }
        else if(argument=="--paused") options.state.paused=true;
        else if(argument=="--face") options.state.inspectFace=true;
        else if(argument=="--help") {
            std::puts("Dear Human Plan D: clone_01 3D modeling study\n"
                "1 bones | 2 solid | 3 overlay | arrows move | W walk in place\n"
                "Space pause | Q/E 360 orbit | V side | F face | M mannequin comparison\n"
                "Mouse wheel zoom | R reset | Escape quit\n"
                "Options: --view bones|solid|overlay --walk --paused --phase radians\n"
                "         --yaw degrees --pitch degrees --capture file.png --frames N\n"
                "         --model clone|mannequin --face --export-model file.glb");
            std::exit(0);
        } else throw std::runtime_error("Unknown option: "+argument);
    }
    if(!options.capture.empty() && options.frames==0) options.frames=3;
    return options;
}
}
int dh::runApplication(int argc,char** argv,RuntimeFactory createRuntime) {
    try {
        const Options options=parse(argc,argv);
        if(!options.exportModel.empty()) { exportCloneModel(options.exportModel); return 0; }
        auto runtime=createRuntime();
        if(!runtime.platform || !runtime.renderer) throw std::runtime_error("Incomplete platform/renderer runtime");
        Simulation simulation(options.state);
        bool running=true;
        int rendered=0;
        std::puts("Plan D ready. 1 bones / 2 solid / 3 overlay. Space pause. Escape quit.");
        while(running) {
            const auto frame=runtime.platform->pollFrame();
            if(frame.quit) break;
            const auto update=simulation.advance(frame.input,frame.elapsedSeconds);
            if(!frame.drawable) { runtime.platform->idle(); continue; }
            const auto renderFrame=simulation.renderFrame(frame.pixelWidth,frame.pixelHeight);
            const bool finalFrame=options.frames>0 && rendered+1>=options.frames;
            std::filesystem::path capture;
            if(finalFrame) capture=options.capture;
            if(update.captureRequested) {
                const auto stamp=std::chrono::duration_cast<std::chrono::nanoseconds>(std::chrono::system_clock::now().time_since_epoch()).count();
                if(capture.empty()) capture=std::filesystem::current_path()/"captures"/("plan-d-"+std::to_string(stamp)+".png");
            }
            if(runtime.renderer->draw(renderFrame,capture)) ++rendered;
            else runtime.platform->idle();
            const auto& state=simulation.state();
            char title[192];
            std::snprintf(title,sizeof(title),"Dear Human / Plan D / %s / %s / %s",
                runtime.renderer->backend(),dh::viewName(state.view),state.paused?"Paused":"Playing");
            runtime.platform->setTitle(title);
            if(options.frames>0 && rendered>=options.frames) running=false;
        }
        return 0;
    } catch(const std::exception& error) {
        std::fprintf(stderr,"Plan D: %s\n",error.what());
        return 1;
    }
}
