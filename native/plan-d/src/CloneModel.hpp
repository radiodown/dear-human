#pragma once

#include "Scene.hpp"
#include <filesystem>

namespace dh {
void appendCloneModel(MeshData& target, const Skeleton& posedSkeleton);
// Exports the same bound vertices, weights and materials used by the viewer.
// No image planes or reference-image texture are used in this model.
void exportCloneModel(const std::filesystem::path& destination);
} // namespace dh
