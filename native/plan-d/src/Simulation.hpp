#pragma once

#include "Input.hpp"
#include "Scene.hpp"
#include "SampleWorld.hpp"

namespace dh {
struct UpdateResult { bool captureRequested{}; };

// Standard C++ only. Rendering frequency and operating-system APIs do not
// determine the locomotion step or modify the character's simulation state.
class Simulation {
public:
    explicit Simulation(ViewState initial = {},std::shared_ptr<const SampleLibrary> samples={});
    UpdateResult advance(const InputFrame& input, double elapsedSeconds);
    RenderFrame renderFrame(int pixelWidth, int pixelHeight) const;
    const ViewState& state() const { return state_; }
    const SampleWorld& samples() const { return samples_; }
    float hairOffset() const { return samples_.maximumOffset(skeleton_); }
private:
    static constexpr double fixedStep = 1.0 / 120.0;
    ViewState state_;
    Skeleton skeleton_;
    SampleWorld samples_;
    double accumulated_{};
    void updateMovement(float axis);
};
} // namespace dh
