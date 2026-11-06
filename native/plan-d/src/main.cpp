#include "Application.hpp"
#include "backends/sdl/Backend.hpp"
#include <SDL3/SDL_main.h>

// Thin platform entry point; all update and frame orchestration is shared.
int main(int argc, char** argv) {
    return dh::runApplication(argc, argv, dh::createSdlRuntime);
}
