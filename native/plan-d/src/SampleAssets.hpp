#pragma once
#include "Scene.hpp"
#include <filesystem>
#include <memory>
#include <string>

namespace dh {
struct SampleAsset { std::string name; MeshData mesh; bool flexible{true}; };
struct SampleLibrary {
    std::vector<SampleAsset> hair;
};
// Static glTF scenes only. Node transforms and palette/base-colour UVs are preserved.
// Skins, morph targets and compressed geometry require a separate importer path.
std::shared_ptr<const SampleLibrary> loadSampleLibrary(const std::filesystem::path& directory);
void appendMesh(MeshData& target, const MeshData& source, const Mat4& transform);
}
