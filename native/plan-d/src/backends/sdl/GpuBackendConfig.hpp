#pragma once

#include <SDL3/SDL.h>

namespace dh {
struct GpuBackendConfig {
    const char* driver;
    SDL_GPUShaderFormat shaderFormat;
    const char* vertexFile;
    const char* fragmentFile;
};
// CMake links exactly one platform profile. The draw loop stays shared.
GpuBackendConfig gpuBackendConfig();
} // namespace dh
