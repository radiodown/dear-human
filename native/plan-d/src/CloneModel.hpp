#pragma once

#include "Scene.hpp"
#include <filesystem>

namespace dh {
void appendCloneModel(MeshData& target, const Skeleton& posedSkeleton, bool hairStudy=false,bool includeHair=true);
// Exports the same bound vertices, weights and materials used by the viewer.
// Hair is made of curved 3D cards with an original strand-coverage atlas.
// The approved reference image is not used as a texture.
void exportCloneModel(const std::filesystem::path& destination,
                      const std::filesystem::path& hairAtlas, bool hairOnly=false);
} // namespace dh
