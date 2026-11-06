#pragma once

#include "Runtime.hpp"

namespace dh {
// Only the composition root chooses SDL. The application and simulation use
// the returned interfaces and contain no SDL, Metal or Direct3D API calls.
Runtime createSdlRuntime();
} // namespace dh
