#include "backends/sdl/GpuBackendConfig.hpp"

namespace dh {
GpuBackendConfig gpuBackendConfig() {
    return {"direct3d12", SDL_GPU_SHADERFORMAT_DXIL, "vertex.dxil", "fragment.dxil"};
}
} // namespace dh
