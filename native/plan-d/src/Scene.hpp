#pragma once

#include "Skeleton.hpp"
#include <cstdint>
#include <optional>
#include <vector>

namespace dh {
struct Color { float r, g, b, a{1}; };
struct Vertex { Vec3 position; Vec3 normal; Color color; };
struct MeshData {
    std::vector<Vertex> vertices;
    std::vector<std::uint32_t> indices;
    void clear() { vertices.clear(); indices.clear(); }
};
enum class View { Skeleton, Solid, Overlay };
struct SceneGeometry { MeshData world; MeshData bones; MeshData hud; };
struct RenderFrame { SceneGeometry scene; Mat4 camera; };
struct ViewState {
    View view{View::Overlay};
    float worldX{}, facing{1}, phase{}, walkAmount{};
    float yaw{25}, pitch{12}, zoom{1};
    bool paused{}, walkInPlace{};
};
SceneGeometry makeScene(const Skeleton& skeleton, const ViewState& state,
                        int pixelWidth, int pixelHeight);
Mat4 cameraMatrix(const ViewState& state, float aspect);
const char* viewName(View view);
std::optional<View> viewTabAt(float x, float y, int windowWidth, int windowHeight);
} // namespace dh
