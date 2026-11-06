#include "Backend.hpp"
#include "SdlGpuRenderer.hpp"
#include "SdlPlatform.hpp"
#include <utility>

namespace dh {
Runtime createSdlRuntime() {
    auto platform = std::make_unique<SdlPlatform>();
    auto renderer = std::make_unique<SdlGpuRenderer>();
    renderer->initialize(platform->window());
    return {std::move(platform), std::move(renderer)};
}
} // namespace dh
