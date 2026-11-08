#pragma once

#include "Platform.hpp"
#include <SDL3/SDL.h>

namespace dh {
class SdlPlatform final : public IPlatform {
public:
    SdlPlatform();
    ~SdlPlatform() override;
    SdlPlatform(const SdlPlatform&) = delete;
    SdlPlatform& operator=(const SdlPlatform&) = delete;
    PlatformFrame pollFrame() override;
    void setTitle(std::string_view title) override;
    void idle() override;
    // This native handle is visible only within the SDL backend.
    SDL_Window* window() const { return window_; }
private:
    SDL_Window* window_{};
    double previousSeconds_{-1};
};
} // namespace dh
