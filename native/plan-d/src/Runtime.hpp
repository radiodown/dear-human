#pragma once

#include "Platform.hpp"
#include "Renderer.hpp"
#include <memory>

namespace dh {
struct Runtime {
    // Declaration order guarantees that the renderer and GPU resources are
    // destroyed before their window and platform runtime.
    std::unique_ptr<IPlatform> platform;
    std::unique_ptr<IRenderer> renderer;
};
using RuntimeFactory = Runtime (*)();
} // namespace dh
