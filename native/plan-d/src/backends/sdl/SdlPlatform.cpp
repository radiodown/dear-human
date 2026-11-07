#include "SdlPlatform.hpp"
#include <stdexcept>
#include <string>

namespace dh {
SdlPlatform::SdlPlatform() {
    if (!SDL_Init(SDL_INIT_VIDEO)) throw std::runtime_error(SDL_GetError());
    window_ = SDL_CreateWindow("Dear Human / Plan D", 1280, 800,
                              SDL_WINDOW_RESIZABLE | SDL_WINDOW_HIGH_PIXEL_DENSITY);
    if (!window_) {
        const std::string error = SDL_GetError();
        SDL_Quit();
        throw std::runtime_error(error);
    }
    SDL_SetWindowMinimumSize(window_, 800, 560);
}
SdlPlatform::~SdlPlatform() {
    SDL_DestroyWindow(window_);
    SDL_Quit();
}
PlatformFrame SdlPlatform::pollFrame() {
    PlatformFrame frame;
    SDL_Event event;
    while (SDL_PollEvent(&event)) {
        if (event.type == SDL_EVENT_QUIT) frame.quit = true;
        if (event.type == SDL_EVENT_KEY_DOWN && !event.key.repeat) {
            switch (event.key.scancode) {
            case SDL_SCANCODE_ESCAPE: frame.quit = true; break;
            case SDL_SCANCODE_1: frame.input.actions.push_back(Action::Bones); break;
            case SDL_SCANCODE_2: frame.input.actions.push_back(Action::Solid); break;
            case SDL_SCANCODE_3: frame.input.actions.push_back(Action::Overlay); break;
            case SDL_SCANCODE_SPACE: frame.input.actions.push_back(Action::Pause); break;
            case SDL_SCANCODE_W: frame.input.actions.push_back(Action::Walk); break;
            case SDL_SCANCODE_V: frame.input.actions.push_back(Action::SideView); break;
            case SDL_SCANCODE_R: frame.input.actions.push_back(Action::Reset); break;
            case SDL_SCANCODE_F12: frame.input.actions.push_back(Action::Capture); break;
            case SDL_SCANCODE_M: frame.input.actions.push_back(Action::Appearance); break;
            case SDL_SCANCODE_H: frame.input.actions.push_back(Action::Hair); break;
            case SDL_SCANCODE_F: frame.input.actions.push_back(Action::Face); break;
            case SDL_SCANCODE_N: frame.input.actions.push_back(event.key.mod&SDL_KMOD_SHIFT?Action::PreviousHair:Action::NextHair); break;
            case SDL_SCANCODE_P: frame.input.actions.push_back(Action::Physics); break;
            case SDL_SCANCODE_U: frame.input.actions.push_back(Action::Wind); break;
            case SDL_SCANCODE_C: frame.input.actions.push_back(Action::Collisions); break;
            case SDL_SCANCODE_G: frame.input.actions.push_back(Action::Colliders); break;
            default: break;
            }
        }
        if (event.type == SDL_EVENT_MOUSE_WHEEL) frame.input.zoomSteps += event.wheel.y;
        if (event.type == SDL_EVENT_MOUSE_BUTTON_DOWN && event.button.button == SDL_BUTTON_LEFT) {
            int width = 0, height = 0;
            SDL_GetWindowSize(window_, &width, &height);
            frame.input.pointer = PointerPress{event.button.x, event.button.y, width, height};
        }
    }
    const bool focused = (SDL_GetWindowFlags(window_) & SDL_WINDOW_INPUT_FOCUS) != 0;
    const bool* keys = SDL_GetKeyboardState(nullptr);
    if (focused) {
        frame.input.moveAxis = static_cast<float>(keys[SDL_SCANCODE_RIGHT]) - static_cast<float>(keys[SDL_SCANCODE_LEFT]);
        frame.input.orbitAxis = static_cast<float>(keys[SDL_SCANCODE_E]) - static_cast<float>(keys[SDL_SCANCODE_Q]);
        frame.input.pitchAxis = static_cast<float>(keys[SDL_SCANCODE_UP]) - static_cast<float>(keys[SDL_SCANCODE_DOWN]);
    }
    const double now = static_cast<double>(SDL_GetTicksNS()) / 1e9;
    frame.elapsedSeconds = previousSeconds_ < 0 ? 0 : now - previousSeconds_;
    previousSeconds_ = now;
    SDL_GetWindowSizeInPixels(window_, &frame.pixelWidth, &frame.pixelHeight);
    frame.drawable = frame.pixelWidth > 0 && frame.pixelHeight > 0 &&
                     !(SDL_GetWindowFlags(window_) & SDL_WINDOW_MINIMIZED);
    return frame;
}
void SdlPlatform::setTitle(std::string_view title) {
    const std::string terminated(title);
    SDL_SetWindowTitle(window_, terminated.c_str());
}
void SdlPlatform::idle() { SDL_Delay(16); }
} // namespace dh
