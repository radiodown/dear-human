#pragma once

#include "CloneModel.hpp"
#include <array>
#include <string_view>

namespace dh::model {
enum MaterialId : std::uint16_t { Skin, Lip, EyeWhite, Iris, Hair, HairHighlight, Fabric,
    Armor, ArmorEdge, GrayInset, Gold, Leather, Stocking, Cape, CapeInner, MaterialCount };
struct Material { std::string_view name; Color color; float metallic{}, roughness{.7f}; };
struct Binding {
    Joint a{Pelvis}, b{Pelvis}; float blend{};
};
struct BoundVertex {
    Vertex vertex;
    std::array<std::uint16_t,4> joints{};
    std::array<float,4> weights{1,0,0,0};
    MaterialId material{Fabric};
};
struct Model {
    std::vector<BoundVertex> vertices;
    std::vector<std::uint32_t> indices;
    std::array<Material,MaterialCount> materials;
    std::array<Mat4,JointCount> inverseBind;
    std::array<Mat4,JointCount> bindWorld;
};
const Model& cloneModel();
} // namespace dh::model
