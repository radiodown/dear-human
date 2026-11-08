#pragma once

#include "Math.hpp"
#include <array>
#include <string_view>

namespace dh {
enum Joint : std::size_t {
    Pelvis, Waist, Chest, Neck, Head,
    LeftShoulder, LeftElbow, LeftWrist, LeftHand,
    RightShoulder, RightElbow, RightWrist, RightHand,
    LeftHip, LeftKnee, LeftAnkle, LeftToe,
    RightHip, RightKnee, RightAnkle, RightToe, JointCount
};
struct Bone {
    std::string_view name;
    int parent;
    Vec3 offset;
};
class Skeleton {
public:
    Skeleton();
    void pose(float phase, float walkAmount, float facing, float worldX);
    const std::array<Bone, JointCount>& bones() const { return bones_; }
    const Mat4& world(Joint joint) const { return world_[joint]; }
    Vec3 position(Joint joint) const { return world_[joint].point(); }
private:
    std::array<Bone, JointCount> bones_;
    std::array<Mat4, JointCount> world_{};
};
} // namespace dh
