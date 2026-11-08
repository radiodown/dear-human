#include "HairDynamics.hpp"
#include <limits>

namespace dh {
Vec3 collisionCorrection(Vec3 p,const HairCollider& c,float margin) {
    if(c.shape==ColliderShape::Box) {
        const Vec3 d=p-c.center,e=c.extent+Vec3{margin,margin,margin};
        if(std::abs(d.x)>=e.x || std::abs(d.y)>=e.y || std::abs(d.z)>=e.z) return {};
        const Vec3 gap{e.x-std::abs(d.x),e.y-std::abs(d.y),e.z-std::abs(d.z)};
        if(gap.x<=gap.y && gap.x<=gap.z) return {(d.x<0?-1:1)*gap.x,0,0};
        if(gap.y<=gap.z) return {0,(d.y<0?-1:1)*gap.y,0};
        return {0,0,(d.z<0?-1:1)*gap.z};
    }
    if(c.shape==ColliderShape::Ellipsoid) {
        const Vec3 e=c.extent+Vec3{margin,margin,margin},d=p-c.center;
        const float l=length({d.x/e.x,d.y/e.y,d.z/e.z});
        if(l>=1) return {};
        return l>1e-6f?d*(1/l-1):Vec3{e.x,0,0};
    }
    Vec3 center=c.center;
    if(c.shape==ColliderShape::Capsule) {
        const Vec3 axis=c.end-c.center;
        center=center+axis*std::clamp(dot(p-center,axis)/std::max(dot(axis,axis),1e-8f),0.0f,1.0f);
    }
    const Vec3 d=p-center;const float l=length(d),r=c.radius+margin;
    return l<r?(l>1e-6f?d*((r-l)/l):Vec3{r,0,0}):Vec3{};
}

void HairDynamics::bind(const MeshData& mesh,const Mat4& head) {
    bottomY_=rootY_-.03f;
    for(const auto& v:mesh.vertices) bottomY_=std::min(bottomY_,v.position.y);
    // Geometry-derived radial guides; roots stay attached to the existing Head joint.
    for(int s=0;s<sectors;++s) for(int r=0;r<rows;++r) {
        const float angle=2*pi*s/sectors,y=rootY_+(bottomY_-rootY_)*r/(rows-1);
        Vec3 sum{};float total=0;
        for(const auto& v:mesh.vertices) {
            if(v.position.y>rootY_+.035f) continue;
            const float a=std::remainder(std::atan2(v.position.z,v.position.x)-angle,2*pi);
            const float dy=(v.position.y-y)*5;
            const float w=1/std::pow(.025f+a*a+dy*dy,2.0f);
            sum=sum+v.position*w;total+=w;
        }
        particles_[s*rows+r].rest=total>0?Vec3{sum.x/total,y,sum.z/total}:Vec3{.1f*std::cos(angle),y,.1f*std::sin(angle)};
    }
    bindings_.clear();bindings_.reserve(mesh.vertices.size());
    for(const auto& v:mesh.vertices) {
        float a=std::atan2(v.position.z,v.position.x)*sectors/(2*pi);if(a<0)a+=sectors;
        const int s=static_cast<int>(a)%sectors,next=(s+1)%sectors;
        const float h=std::clamp((rootY_-v.position.y)/(rootY_-bottomY_)*(rows-1),0.0f,static_cast<float>(rows-1));
        const int row=std::min(rows-2,static_cast<int>(h));const float u=a-std::floor(a),t=h-row;
        bindings_.push_back({{s*rows+row,s*rows+row+1,next*rows+row,next*rows+row+1},
            {(1-u)*(1-t),(1-u)*t,u*(1-t),u*t}});
    }
    bound_=true;reset(head);
}
void HairDynamics::reset(const Mat4& head) {
    for(auto& p:particles_) p.position=p.previous=head.point(p.rest);
    lastHead_=head;contacts_=0;
}
void HairDynamics::step(const Mat4& head,float dt,float time,bool wind,bool collisions,std::span<const HairCollider> colliders) {
    if(!bound_) return;
    if(length(head.point()-lastHead_.point())>.6f || dot(head.direction({1,0,0}),lastHead_.direction({1,0,0}))<.5f) reset(head);
    contacts_=0;
    const float damping=std::exp(-4.5f*dt);
    const Vec3 breeze=wind?Vec3{1.8f+.9f*std::sin(time*1.7f),.3f*std::sin(time*2.1f),1.5f*std::sin(time*1.2f)}:Vec3{};
    for(int s=0;s<sectors;++s) for(int r=0;r<rows;++r) {
        auto& p=particles_[s*rows+r];const Vec3 goal=head.point(p.rest);
        if(r==0) {p.position=p.previous=goal;continue;}
        const Vec3 velocity=(p.position-p.previous)*damping,old=p.position;
        const Vec3 acceleration=Vec3{0,-2,0}+breeze+(goal-p.position)*32;
        p.position=p.position+velocity+acceleration*(dt*dt);p.previous=old;
    }
    for(int iteration=0;iteration<12;++iteration) {
        for(int s=0;s<sectors;++s) for(int r=1;r<rows;++r) {
            auto& a=particles_[s*rows+r-1];auto& b=particles_[s*rows+r];
            const float restLength=length(b.rest-a.rest);const Vec3 delta=b.position-a.position;
            const Vec3 correction=normalized(delta)*(length(delta)-restLength);
            if(r==1) b.position=b.position-correction;
            else {a.position=a.position+correction*.5f;b.position=b.position-correction*.5f;}
            // Mild rest-shape stiffness prevents limp guide collapse while allowing inertial lag.
            const Vec3 desired=head.direction(b.rest-a.rest);
            b.position=b.position+(a.position+desired-b.position)*.018f;
        }
        if(collisions) for(int s=0;s<sectors;++s) for(int r=1;r<rows;++r) {
            auto& p=particles_[s*rows+r];
            for(const auto& c:colliders) {
                const Vec3 correction=collisionCorrection(p.position,c,.009f);
                if(length(correction)>1e-7f) {
                    p.position=p.position+correction;
                    // Remove inward normal velocity and retain damped sliding, no added bounce.
                    const Vec3 n=normalized(correction),velocity=p.position-p.previous;
                    const Vec3 slide=(velocity-n*dot(velocity,n))*.85f;
                    p.previous=p.position-slide;
                    if(iteration==11) ++contacts_;
                }
            }
        }
    }
    lastHead_=head;
}
MeshData HairDynamics::deform(const MeshData& rest,const Mat4& head,bool enabled) const {
    MeshData mesh=rest;
    for(std::size_t i=0;i<mesh.vertices.size();++i) {
        auto& v=mesh.vertices[i];v.position=head.point(v.position);v.normal=normalized(head.direction(v.normal));v.flow=normalized(head.direction(v.flow));
        if(enabled && bound_) {
            const auto& b=bindings_[i];
            for(int j=0;j<4;++j) {
                const auto& p=particles_[b.indices[j]];
                v.position=v.position+(p.position-head.point(p.rest))*b.weights[j];
            }
        }
    }
    if(enabled && bound_) {
        std::vector<Vec3> normals(mesh.vertices.size());
        for(std::size_t i=0;i<mesh.indices.size();i+=3) {
            const auto a=mesh.indices[i],b=mesh.indices[i+1],c=mesh.indices[i+2];
            Vec3 n=cross(mesh.vertices[b].position-mesh.vertices[a].position,mesh.vertices[c].position-mesh.vertices[a].position);
            // Preserve source normal hemisphere, including two-sided cards.
            if(dot(n,mesh.vertices[a].normal)<0)n=n*-1;
            for(auto j:{a,b,c}) normals[j]=normals[j]+n;
        }
        for(std::size_t i=0;i<mesh.vertices.size();++i) {
            if(length(normals[i])>1e-8f) mesh.vertices[i].normal=normalized(normals[i]);
            auto& v=mesh.vertices[i];Vec3 t=v.flow-v.normal*dot(v.flow,v.normal);
            if(length(t)>.001f)v.flow=normalized(t);
        }
    }
    return mesh;
}
float HairDynamics::maximumOffset(const Mat4& head) const {
    float result=0;for(const auto& p:particles_)result=std::max(result,length(p.position-head.point(p.rest)));return result;
}
float HairDynamics::maximumPenetration(std::span<const HairCollider> colliders) const {
    float result=0;for(int s=0;s<sectors;++s)for(int r=1;r<rows;++r)for(const auto& c:colliders)
        result=std::max(result,length(collisionCorrection(particles_[s*rows+r].position,c,.009f)));
    return result;
}
}
