#include "Simulation.hpp"
#include <stdexcept>

namespace dh {
Simulation::Simulation(ViewState initial) : state_(initial) {
    skeleton_.pose(state_.phase, state_.walkAmount, state_.facing, state_.worldX);
}

UpdateResult Simulation::advance(const InputFrame& input, double elapsedSeconds) {
    UpdateResult result;
    for (const Action action : input.actions) {
        switch (action) {
        case Action::Bones: state_.view = View::Skeleton; break;
        case Action::Solid: state_.view = View::Solid; break;
        case Action::Overlay: state_.view = View::Overlay; break;
        case Action::Pause: state_.paused = !state_.paused; break;
        case Action::Walk: state_.walkInPlace = !state_.walkInPlace; break;
        case Action::SideView:
            if (std::abs(state_.yaw) < .1f) { state_.yaw = 25; state_.pitch = 12; }
            else { state_.yaw = 0; state_.pitch = 0; }
            break;
        case Action::Reset: state_ = ViewState{}; accumulated_ = 0; break;
        case Action::Capture: result.captureRequested = true; break;
        case Action::Appearance: state_.appearance=state_.appearance==Appearance::Clone01?Appearance::Mannequin:Appearance::Clone01; break;
        case Action::Face: state_.inspectFace=!state_.inspectFace; break;
        }
    }
    if (input.pointer) {
        const auto& press = *input.pointer;
        if (const auto view = viewTabAt(press.x, press.y, press.windowWidth, press.windowHeight))
            state_.view = *view;
    }
    const float elapsed = static_cast<float>(std::clamp(elapsedSeconds, 0.0, .1));
    state_.zoom = std::clamp(state_.zoom + input.zoomSteps * .08f, .65f, 1.65f);
    // Camera inspection remains available when game time is paused.
    state_.yaw = std::remainder(state_.yaw + std::clamp(input.orbitAxis, -1.0f, 1.0f) * elapsed * 50, 360.0f);
    state_.pitch = std::clamp(state_.pitch + std::clamp(input.pitchAxis, -1.0f, 1.0f) * elapsed * 25, 0.0f, 35.0f);
    if (state_.paused) accumulated_ = 0;
    else accumulated_ += std::clamp(elapsedSeconds, 0.0, .1);
    while (accumulated_ + 1e-12 >= fixedStep) {
        updateMovement(std::clamp(input.moveAxis, -1.0f, 1.0f));
        accumulated_ = std::max(0.0, accumulated_ - fixedStep);
    }
    skeleton_.pose(state_.phase, state_.walkAmount, state_.facing, state_.worldX);
    return result;
}

void Simulation::updateMovement(float axis) {
    const float dt = static_cast<float>(fixedStep);
    const float target = (std::abs(axis) > .1f || state_.walkInPlace) ? 1.0f : 0.0f;
    state_.walkAmount += (target - state_.walkAmount) * std::min(1.0f, dt * 12);
    if (std::abs(axis) > .1f) state_.facing = axis;
    state_.worldX += axis * .9f * dt;
    if (state_.walkAmount > .001f)
        state_.phase = std::fmod(state_.phase + dt * 2 * pi * 1.15f, 2 * pi);
}

RenderFrame Simulation::renderFrame(int pixelWidth, int pixelHeight) const {
    if (pixelWidth <= 0 || pixelHeight <= 0)
        throw std::invalid_argument("Render dimensions must be positive");
    return {makeScene(skeleton_, state_, pixelWidth, pixelHeight),
            cameraMatrix(state_, static_cast<float>(pixelWidth) / pixelHeight),cameraPosition(state_)};
}
} // namespace dh
