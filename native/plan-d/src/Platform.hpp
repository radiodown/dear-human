#pragma once

#include "Input.hpp"
#include <string_view>

namespace dh {
struct PlatformFrame {
    InputFrame input;
    double elapsedSeconds{};
    int pixelWidth{}, pixelHeight{};
    bool drawable{}, quit{};
};
class IPlatform {
public:
    virtual ~IPlatform() = default;
    virtual PlatformFrame pollFrame() = 0;
    virtual void setTitle(std::string_view title) = 0;
    virtual void idle() = 0;
};
} // namespace dh
