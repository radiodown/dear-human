#pragma once
#include "Scene.hpp"
#include <span>

namespace dh {
enum class ColliderShape { Sphere, Capsule, Box, Ellipsoid };
struct HairCollider {
    ColliderShape shape{ColliderShape::Sphere};
    Vec3 center{},end{},extent{};
    float radius{};
};
// Returns displacement, shared by guide constraints and contact diagnostics.
Vec3 collisionCorrection(Vec3 point,const HairCollider& collider,float margin);
class HairDynamics {
public:
    void bind(const MeshData& rest,const Mat4& head);
    void reset(const Mat4& head);
    void step(const Mat4& head,float dt,float time,bool wind,bool collisions,std::span<const HairCollider> colliders);
    MeshData deform(const MeshData& rest,const Mat4& head,bool enabled) const;
    unsigned contacts() const { return contacts_; }
    float maximumOffset(const Mat4& head) const;
    float maximumPenetration(std::span<const HairCollider> colliders) const;
private:
    static constexpr int sectors=16,rows=10;
    struct Particle { Vec3 rest,position,previous; };
    struct Binding { std::array<int,4> indices{};std::array<float,4> weights{}; };
    std::array<Particle,sectors*rows> particles_{};
    std::vector<Binding> bindings_;
    Mat4 lastHead_{Mat4::identity()};
    unsigned contacts_{};
    float rootY_{1.78f},bottomY_{1.2f};
    bool bound_{};
};
}
