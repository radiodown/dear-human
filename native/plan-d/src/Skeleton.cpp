#include "Skeleton.hpp"

namespace dh {
Skeleton::Skeleton() : bones_{{
    {"pelvis", -1, {0, .96f, 0}},
    {"waist", Pelvis, {0, .12f, 0}},
    {"chest", Waist, {0, .26f, 0}},
    {"neck", Chest, {0, .24f, 0}},
    {"head", Neck, {0, .13f, 0}},
    {"left_shoulder", Chest, {0, .16f, .21f}},
    {"left_elbow", LeftShoulder, {0, -.29f, 0}},
    {"left_wrist", LeftElbow, {0, -.26f, 0}},
    {"left_hand", LeftWrist, {0, -.07f, 0}},
    {"right_shoulder", Chest, {0, .16f, -.21f}},
    {"right_elbow", RightShoulder, {0, -.29f, 0}},
    {"right_wrist", RightElbow, {0, -.26f, 0}},
    {"right_hand", RightWrist, {0, -.07f, 0}},
    {"left_hip", Pelvis, {0, -.03f, .13f}},
    {"left_knee", LeftHip, {0, -.43f, 0}},
    {"left_ankle", LeftKnee, {0, -.42f, 0}},
    {"left_toe", LeftAnkle, {.19f, -.055f, 0}},
    {"right_hip", Pelvis, {0, -.03f, -.13f}},
    {"right_knee", RightHip, {0, -.43f, 0}},
    {"right_ankle", RightKnee, {0, -.42f, 0}},
    {"right_toe", RightAnkle, {.19f, -.055f, 0}}
}} {
    pose(0, 0, 1, 0);
}

void Skeleton::pose(float phase, float walkAmount, float facing, float worldX) {
    std::array<float, JointCount> angles{};
    angles[LeftShoulder] = .10f - std::sin(phase) * .36f * walkAmount;
    angles[RightShoulder] = .10f + std::sin(phase) * .36f * walkAmount;
    angles[LeftElbow] = angles[RightElbow] = .16f;
    angles[LeftHip] = std::sin(phase) * .40f * walkAmount;
    angles[RightHip] = -std::sin(phase) * .40f * walkAmount;
    angles[LeftKnee] = -.035f - std::max(0.0f, -std::sin(phase)) * .68f * walkAmount;
    angles[RightKnee] = -.035f - std::max(0.0f, std::sin(phase)) * .68f * walkAmount;
    angles[LeftAnkle] = -(angles[LeftHip] + angles[LeftKnee]);
    angles[RightAnkle] = -(angles[RightHip] + angles[RightKnee]);
    const Mat4 root = Mat4::translation({worldX, 0, 0}) *
                      Mat4::rotateY(facing < 0 ? pi : 0.0f);
    for (std::size_t i = 0; i < JointCount; ++i) {
        const Mat4 local = Mat4::translation(bones_[i].offset) * Mat4::rotateZ(angles[i]);
        world_[i] = (bones_[i].parent < 0 ? root : world_[bones_[i].parent]) * local;
    }
    // Keep the lowest procedural foot on the ground. This is a simple posing
    // aid, not stance-foot locking, locomotion IK or a production walking clip.
    const float floorOffset = .025f - std::min(position(LeftToe).y, position(RightToe).y);
    for (Mat4& transform : world_) transform.m[13] += floorOffset;
}
} // namespace dh
