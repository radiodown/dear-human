#pragma once

#include "Input.hpp"
#include "Scene.hpp"

namespace dh {
struct UpdateResult { bool captureRequested{}; };

// Standard C++ only. Rendering frequency and operating-system APIs do not
// determine the locomotion step or modify the character's simulation state.
class Simulation {
public:
    explicit Simulation(ViewState initial = {});
    UpdateResult advance(const InputFrame& input, double elapsedSeconds);
    RenderFrame renderFrame(int pixelWidth, int pixelHeight) const;
    const ViewState& state() const { return state_; }
private:
    static constexpr double fixedStep = 1.0 / 120.0;
    ViewState state_;
    Skeleton skeleton_;
    double accumulated_{};
    void updateMovement(float axis);
};
} // namespace dh
