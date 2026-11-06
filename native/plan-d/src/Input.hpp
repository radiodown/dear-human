#pragma once

#include <optional>
#include <vector>

namespace dh {
// Logical commands, never OS key codes or SDL events. A gamepad, replay file
// or another window library can supply the same input to the shared core.
enum class Action { Bones, Solid, Overlay, Pause, Walk, SideView, Reset, Capture };
struct PointerPress {
    float x{}, y{};
    int windowWidth{}, windowHeight{};
};
struct InputFrame {
    std::vector<Action> actions;
    float moveAxis{}, orbitAxis{}, pitchAxis{}, zoomSteps{};
    std::optional<PointerPress> pointer;
};
} // namespace dh
