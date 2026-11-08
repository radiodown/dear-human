#pragma once
#include "CloneModelData.hpp"

namespace dh::model {
// Each component has its own geometric construction and part tag. All hair
// binds to Head for now; this module does not simulate strands or collisions.
void buildHair(Model& model);
}
