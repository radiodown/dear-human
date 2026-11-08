#pragma once
#include "SampleAssets.hpp"
#include "HairDynamics.hpp"

namespace dh {
class SampleWorld {
public:
    explicit SampleWorld(std::shared_ptr<const SampleLibrary> library={}) : library_(std::move(library)) {}
    bool available() const { return library_ && !library_->hair.empty(); }
    int hairCount() const { return available()?static_cast<int>(library_->hair.size()):1; }
    const char* hairName() const;
    bool dynamicHair() const { return available() && selected_>=0 && library_->hair[selected_].flexible; }
    void sync(const Skeleton& skeleton,const ViewState& state,bool reset=false);
    void step(const Skeleton& skeleton,const ViewState& state,float dt);
    void appendHair(MeshData& target,const Skeleton& skeleton,const ViewState& state) const;
    const std::vector<HairCollider>& colliders() const { return colliders_; }
    unsigned contacts() const { return dynamics_.contacts(); }
    float maximumOffset(const Skeleton& skeleton) const;
    float maximumPenetration() const { return dynamics_.maximumPenetration(colliders_); }
private:
    std::shared_ptr<const SampleLibrary> library_;
    HairDynamics dynamics_;
    std::vector<HairCollider> colliders_;
    int selected_{-1};
    float time_{};
    bool physics_{true};
    static Mat4 headTransform(const Skeleton& skeleton);
    void updateColliders(const Skeleton& skeleton);
};
}
