#include "Simulation.hpp"
#include <cmath>
#include <cstdio>
#include <stdexcept>

namespace {
void require(bool condition, const char* message) {
    if (!condition) throw std::runtime_error(message);
}
dh::ViewState moveForOneSecond(int frames) {
    dh::Simulation simulation;
    dh::InputFrame input;
    input.moveAxis = 1;
    for (int i = 0; i < frames; ++i) simulation.advance(input, 1.0 / frames);
    return simulation.state();
}
}
int main() {
    try {
        // Different display rates must not change a second of movement/pose.
        const auto slow = moveForOneSecond(30), fast = moveForOneSecond(144);
        require(std::abs(slow.worldX - fast.worldX) < 1e-6f &&
                std::abs(slow.worldX - .9f) < 1e-5f &&
                std::abs(slow.phase - fast.phase) < 1e-6f,
                "Display rate changed locomotion or pose timing");

        dh::Simulation simulation(slow);
        dh::InputFrame paused;
        paused.actions = {dh::Action::Pause};
        paused.moveAxis = 1; paused.orbitAxis = 1;
        simulation.advance(paused, .05);
        const auto stopped = simulation.state();
        require(stopped.worldX == slow.worldX && stopped.phase == slow.phase &&
                stopped.yaw > slow.yaw,
                "Pause must freeze movement while permitting camera inspection");

        // Producing a render frame cannot advance game time or alter the pose.
        const auto frame = simulation.renderFrame(1280, 800);
        require(!frame.scene.world.vertices.empty() &&
                simulation.state().worldX == stopped.worldX &&
                simulation.state().phase == stopped.phase,
                "Frame generation mutated the simulation");
        std::puts("PASS: display-rate independence, pause/camera separation, read-only render frame (no SDL/GPU)");
        return 0;
    } catch (const std::exception& error) {
        std::fprintf(stderr, "FAIL: %s\n", error.what());
        return 1;
    }
}
