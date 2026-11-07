#pragma once

#include "Skeleton.hpp"
#include <cstdint>
#include <optional>
#include <vector>

namespace dh {
struct Color { float r, g, b, a{1}; };
// Material channels: metallic, roughness, reserved. Geometry and materials
// stay independent of Metal/D3D and are also used by the GLB model exporter.
struct Vertex { Vec3 position; Vec3 normal; Color color; Vec3 material{0,.75f,0}; };
struct MeshData {
    std::vector<Vertex> vertices;
    std::vector<std::uint32_t> indices;
    void clear() { vertices.clear(); indices.clear(); }
};
enum class View { Skeleton, Solid, Overlay };
enum class Appearance { Clone01, Mannequin };
struct SceneGeometry { MeshData world; MeshData bones; MeshData hud; };
struct RenderFrame { SceneGeometry scene; Mat4 camera; Vec3 eye; };
struct ViewState {
    View view{View::Solid};
    Appearance appearance{Appearance::Clone01};
    float worldX{}, facing{1}, phase{}, walkAmount{};
    float yaw{65}, pitch{8}, zoom{1};
    bool paused{}, walkInPlace{}, inspectFace{};
};
SceneGeometry makeScene(const Skeleton& skeleton, const ViewState& state,
                        int pixelWidth, int pixelHeight);
Mat4 cameraMatrix(const ViewState& state, float aspect);
Vec3 cameraPosition(const ViewState& state);
const char* viewName(View view);
std::optional<View> viewTabAt(float x, float y, int windowWidth, int windowHeight);
} // namespace dh
