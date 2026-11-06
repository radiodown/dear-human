#include "backends/sdl/GpuBackendConfig.hpp"

namespace dh {
GpuBackendConfig gpuBackendConfig() {
    return {"metal", SDL_GPU_SHADERFORMAT_MSL, "basic.metal", "basic.metal"};
}
} // namespace dh
