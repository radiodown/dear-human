#pragma once

#include "Scene.hpp"
#include <filesystem>

namespace dh {
// Receives a complete, read-only frame. No native window or GPU handles cross
// this boundary and rendering cannot advance the simulation.
class IRenderer {
public:
    virtual ~IRenderer() = default;
    virtual bool draw(const RenderFrame& frame, const std::filesystem::path& capture = {}) = 0;
    virtual const char* backend() const = 0;
};
} // namespace dh
