#include "SampleWorld.hpp"
#include "CloneModelData.hpp"

namespace dh {
Mat4 SampleWorld::headTransform(const Skeleton& skeleton) {
    return skeleton.world(Head)*model::cloneModel().inverseBind[Head];
}
const char* SampleWorld::hairName() const {return available() && selected_>=0?library_->hair[selected_].name.c_str():"ORIGINAL 004";}
void SampleWorld::sync(const Skeleton& skeleton,const ViewState& state,bool reset) {
    if(!available()) return;
    const int selection=std::clamp(state.hairSample,0,hairCount()-1);
    if(selection!=selected_) {selected_=selection;dynamics_.bind(library_->hair[selected_].mesh,headTransform(skeleton));}
    if(reset || state.hairPhysics!=physics_) dynamics_.reset(headTransform(skeleton));
    if(reset) time_=0;
    physics_=state.hairPhysics;
    updateColliders(skeleton);
}
void SampleWorld::updateColliders(const Skeleton& skeleton) {
    colliders_.clear();
    // Kinematic body proxies follow the same skeleton, in world coordinates.
    colliders_.push_back({ColliderShape::Ellipsoid,skeleton.world(Head).point({0,.035f,0}),{},{.078f,.130f,.090f},0});
    colliders_.push_back({ColliderShape::Capsule,skeleton.position(Neck),skeleton.position(Head),{},.047f});
    colliders_.push_back({ColliderShape::Ellipsoid,skeleton.world(Chest).point({-.025f,-.015f,0}),{},{.125f,.185f,.19f},0});
    for(const auto joint:{LeftShoulder,RightShoulder}) {
        const auto elbow=joint==LeftShoulder?LeftElbow:RightElbow;
        const float side=joint==LeftShoulder?-1.0f:1.0f;
        colliders_.push_back({ColliderShape::Ellipsoid,skeleton.world(joint).point({0,-.020f,side*.012f}),{},{.080f,.083f,.078f},0});
        colliders_.push_back({ColliderShape::Capsule,skeleton.position(joint),skeleton.position(elbow),{},.062f});
    }
    // A thin torso/cape envelope, not triangle-level cloth contact.
    const auto cape=skeleton.world(Chest).point({-.135f,-.12f,0});
    colliders_.push_back({ColliderShape::Ellipsoid,cape,{},{.045f,.24f,.20f},0});

}
void SampleWorld::step(const Skeleton& skeleton,const ViewState& state,float dt) {
    if(!available()) return;
    time_+=dt;
    updateColliders(skeleton);
    if(state.hairPhysics && dynamicHair()) dynamics_.step(headTransform(skeleton),dt,time_,state.wind,state.collisions,colliders_);
    else dynamics_.reset(headTransform(skeleton));
}
void SampleWorld::appendHair(MeshData& target,const Skeleton& skeleton,const ViewState& state) const {
    if(!available() || selected_<0) return;
    const auto mesh=dynamics_.deform(library_->hair[selected_].mesh,headTransform(skeleton),state.hairPhysics && dynamicHair());
    appendMesh(target,mesh,Mat4::identity());
}
float SampleWorld::maximumOffset(const Skeleton& skeleton) const {return dynamics_.maximumOffset(headTransform(skeleton));}
}
