#include "HairModel.hpp"
#include <functional>

namespace dh::model {
namespace {
float smooth(float a,float b,float t) { t=std::clamp((t-a)/(b-a),0.0f,1.0f); return t*t*(3-2*t); }
Vec3 bezier(const std::array<Vec3,4>& p,float t) {
    const float s=1-t; return p[0]*(s*s*s)+p[1]*(3*s*s*t)+p[2]*(3*s*t*t)+p[3]*(t*t*t);
}
struct HairBuilder {
    Model& m;
    Vec3 center;
    using Sample=std::function<Vec3(float,float)>;
    // Numerical surface derivatives give smooth normals even at clump seams.
    // Periodic U is used only on closed sections; V endpoints use one-sided differences.
    void surface(int rows,int cols,Part part,Sample sample,Sample outward,bool periodic=false,float seed=0,int tile=-1) {
        const auto base=static_cast<std::uint32_t>(m.vertices.size());
        for(int r=0;r<=rows;++r) for(int s=0;s<=cols;++s) {
            const float u=float(s)/cols,v=float(r)/rows,e=.0002f;
            const Vec3 p=sample(u,v);
            const Vec3 du=sample(periodic?u+e:std::min(1.0f,u+e),v)-sample(periodic?u-e:std::max(0.0f,u-e),v);
            const Vec3 dv=sample(u,std::min(1.0f,v+e))-sample(u,std::max(0.0f,v-e));
            Vec3 n=normalized(cross(dv,du));
            if(dot(n,outward(u,v))<0)n=n*-1;
            if(length(n)<.5f)n=normalized(outward(u,v));
            const float variation=.94f+.06f*std::sin(seed*7+u*173)+.035f*std::sin(u*367+seed);
            const Color color{.071f*variation,.073f*variation,.082f*variation};
            BoundVertex vertex;
            vertex.vertex={p,n,color,{u*cols*.70f+seed*11,.46f,1},normalized(dv)};
            vertex.joints={static_cast<std::uint16_t>(Joint::Head),0,0,0};
            vertex.material=tile>=0?HairCards:Hair;vertex.part=part;
            if(tile>=0) {
                vertex.vertex.color={.095f,.096f,.105f};
                vertex.vertex.material={seed,.46f,2};
                vertex.vertex.uv={(tile*128+6+u*116)/1024,(5+v*1014)/1024};
            }
            m.vertices.push_back(vertex);
        }
        for(int r=0;r<rows;++r)for(int s=0;s<cols;++s) {
            const auto a=base+r*(cols+1)+s,b=a+cols+1;
            // Choose winding to match the explicit outward normals (also for GLB).
            const auto& va=m.vertices[a].vertex;
            if(dot(cross(m.vertices[b].vertex.position-va.position,m.vertices[b+1].vertex.position-va.position),va.normal)>=0)
                m.indices.insert(m.indices.end(),{a,b,b+1,a,b+1,a+1});
            else m.indices.insert(m.indices.end(),{a,b+1,b,a,a+1,b+1});
        }
    }
    // Guide -> curved card. Fine strands and separate tips live in coverage,
    // not hundreds of circumferential vertices. No camera-facing billboarding.
    void lock(const std::array<Vec3,4>& path,float width,float depth,Vec3 across,Part part,float seed,int =24,int =4) {
        auto frame=[=,this](float v) {
            const Vec3 tangent=normalized(bezier(path,std::min(1.0f,v+.001f))-bezier(path,std::max(0.0f,v-.001f)));
            const Vec3 side=normalized(across-tangent*dot(across,tangent));
            Vec3 normal=normalized(cross(tangent,side));
            if(dot(normal,bezier(path,v)-center)<0)normal=normal*-1;
            return std::array<Vec3,3>{bezier(path,v),side,normal};
        };
        auto sample=[=](float u,float v) {
            const auto f=frame(v);
            const float root=.06f+.94f*smooth(0,.19f,v);
            return f[0]+f[1]*((u*2-1)*width*root)+f[2]*(std::sin(pi*u)*depth);
        };
        const int tile=part==Part::Wisps?6+int(seed)%2:(part==Part::Fringe?int(seed)%4:4+int(seed)%2);
        surface(24,3,part,sample,[=](float,float v){return frame(v)[2];},false,seed,tile);
    }
    void crown() {
        auto sample=[=,this](float u,float v) {
            const float a=u*2*pi,front=std::max(0.0f,std::cos(a));
            const float end=1.91f-.99f*front+.74f*std::max(0.0f,-std::cos(a));
            const float theta=.002f+(end-.002f)*v;
            const float rib=.00020f*std::sin(a*123+v*.7f)*std::sin(theta);
            // Slight off-centre part, with a shallow valley rather than a hole.
            const float part=.0020f*std::exp(-std::pow(std::sin(a)*std::sin(theta)/.052f,2));
            return center+Vec3{(.091f+rib)*std::sin(theta)*std::cos(a),(.144f-part)*std::cos(theta),(.106f+rib)*std::sin(theta)*std::sin(a)};
        };
        surface(20,64,Part::Crown,sample,[=,this](float u,float v){return sample(u,v)-center;},true);
    }
    Vec3 curtain(float u,float v,float offset=0) const {
        const float a=(.43f+u*1.14f)*pi,c=std::cos(a),s=std::sin(a);
        const float hem=.012f*std::sin(u*17+.4f)+.006f*std::sin(u*41);
        Vec3 p;
        if(v<.32f) {
            const float theta=.12f+1.13f*v/.32f;
            p=center+Vec3{.092f*std::sin(theta)*c,.145f*std::cos(theta),.108f*std::sin(theta)*s};
        } else {
            constexpr float theta=1.25f;
            const Vec3 root=center+Vec3{.092f*std::sin(theta)*c,.145f*std::cos(theta),.108f*std::sin(theta)*s};
            const Vec3 derivative{.092f*std::cos(theta)*c,-.145f*std::sin(theta),.108f*std::cos(theta)*s};
            const std::array<Vec3,4> path{{root,root+derivative*.80f,
                {-.15f+.08f*c,1.37f,.158f*s},{-.16f+.095f*c,1.25f+hem+.02f*std::abs(s),.158f*s}}};
            p=bezier(path,(v-.32f)/.68f);
        }
        const Vec3 n=normalized(Vec3{c,std::max(0.0f,1-v/.32f),s});
        const float rib=.00018f*std::sin(u*2*pi*127+v*.8f)+.00065f*std::sin(u*2*pi*23+v*.3f);
        return p+n*(offset+rib*smooth(0,.15f,v));
    }
    void back() {
        const auto normal=[](float u,float v){const float a=(.43f+u*1.14f)*pi;return normalized(Vec3{std::cos(a),std::max(0.0f,1-v/.32f),std::sin(a)});};
        // Staggered layers carry volume and coverage; the outer layer is sparse.
        // Every layer starts on the crown and follows the same smooth guide field.
        for(int layer=0;layer<3;++layer)for(int i=0;i<38;++i) {
            const float mid=(i+.25f+.23f*layer)/38;
            auto sample=[=,this](float u,float v) {
                const float angleU=mid+(u-.5f)*.043f*smooth(0,.09f,v);
                const Vec3 n=normal(angleU,v);
                const float lift=(.001f+layer*.0035f+.0016f*std::sin(pi*u))*smooth(0,.15f,v);
                return curtain(angleU,v)+n*lift
                    +Vec3{0,-(.008f+.010f*std::sin(i*2.1f+layer))*smooth(.78f,1,v),0};
            };
            surface(32,2,Part::Back,sample,[=](float,float v){return normal(mid,v);},false,float(i+layer*38),layer==2?4+i%2:i%4);
        }
    }
    void fringe() {
        // Asymmetric overlapping broad locks sweep from the part toward the brows.
        for(int i=0;i<13;++i) {
            const float z=(i-6)*.0127f,side=z<0?-1.0f:1.0f;
            const float outer=std::abs(z)/.077f;
            const float endY=.043f-.007f*std::sin(i*1.8f)-.013f*outer*outer;
            const float tipZ=z+side*(.004f+.004f*outer);
            const std::array<Vec3,4> path{{center+Vec3{-.002f,.142f-.018f*outer*outer,z*.20f},
                center+Vec3{.065f,.143f,z*.65f},center+Vec3{.101f,.082f,z*.96f},
                center+Vec3{.088f-.022f*outer*outer,endY,tipZ}}};
            lock(path,.012f+(1-outer)*.0015f,.0016f,{0,0,1},Part::Fringe,float(i)+40,54,24);
            // A few finer tips break up each lock without serrating the whole fringe.
            if(i%2==0) for(int j=0;j<2;++j) {
                auto fine=path; fine[0]=bezier(path,.47f);fine[1]=bezier(path,.68f);
                fine[2]=bezier(path,.92f)+Vec3{.001f,0,(j-.5f)*.005f};
                fine[3]=path[3]+Vec3{.0005f,-.006f,(j-.5f)*.005f};
                lock(fine,.00065f,.00025f,{0,0,1},Part::Wisps,float(i+j),26,8);
            }
        }
    }
    void temples() {
        for(float side:{-1.0f,1.0f}) {
            for(int i=0;i<5;++i) {
                const float k=float(i);
                const std::array<Vec3,4> path{{center+Vec3{.009f-k*.010f,.144f*std::sqrt(1.0f-std::pow((.052f+k*.007f)/.106f,2.0f))-.008f,side*(.052f+k*.007f)},
                    center+Vec3{.025f-k*.010f,.030f,side*(.110f+k*.004f)},
                    {-.025f-k*.017f,1.55f,side*(.116f+k*.009f)},
                    {-.058f-k*.020f,1.44f-.024f*k,side*(.126f+k*.008f)}}};
                lock(path,.009f,.0022f,{0,0,side},Part::Temple,60+k,68,20);
            }
            // Fine face-framing strands fall beside the cheek, not across the eyes.
            for(int i=0;i<3;++i) {
                const float k=float(i);
                const std::array<Vec3,4> path{{center+Vec3{.047f,.084f,side*.079f},center+Vec3{.062f,.025f,side*(.093f+k*.002f)},
                    center+Vec3{.048f,-.052f,side*(.097f+k*.002f)},center+Vec3{.025f,-.115f-k*.018f,side*(.089f+k*.003f)}}};
                lock(path,.0028f,.0006f,{0,0,side},Part::Temple,80+k,44,12);
            }
            // Three interwoven fine bundles, replacing the former disconnected beads.
            for(int strand=0;strand<3;++strand) {
                const auto guide=[=,this](float v) {
                    const std::array<Vec3,4> p{{center+Vec3{-.003f,.131f,side*.052f},center+Vec3{.032f,.092f,side*.107f},
                        center+Vec3{.012f,-.025f,side*.115f},center+Vec3{-.025f,-.11f,side*.111f}}};
                    const float a=v*2*pi*8+strand*2*pi/3;
                    return bezier(p,v)+Vec3{.0033f*std::cos(a),0,side*.0033f*std::sin(a)};
                };
                const auto sample=[=](float u,float v) {const float a=u*2*pi;return guide(v)+Vec3{std::cos(a)*.0022f,0,std::sin(a)*.0022f};};
                surface(96,6,Part::Braid,sample,[=](float u,float v){return sample(u,v)-guide(v);},true,float(strand));
            }
        }
    }
    void build() { crown();back();fringe();temples(); }
};
}
void buildHair(Model& model) {
    HairBuilder{model,model.bindWorld[Joint::Head].point({0,.035f,0})}.build();
}
}
