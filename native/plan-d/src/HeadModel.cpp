#include "HeadModel.hpp"
#include <functional>

namespace dh::model {
namespace {
float gaussian(float x,float center,float width) {return std::exp(-std::pow((x-center)/width,2));}
float smooth(float a,float b,float x) {x=std::clamp((x-a)/(b-a),0.0f,1.0f);return x*x*(3-2*x);}
struct HeadBuilder {
    Model& model;
    Vec3 center;
    using Sample=std::function<Vec3(float,float)>;
    void patch(int rows,int cols,const Sample& sample,MaterialId material,Color color,float roughness,bool closed=false) {
        const auto base=static_cast<std::uint32_t>(model.vertices.size());
        for(int r=0;r<=rows;++r)for(int c=0;c<=cols;++c) {
            const float u=float(c)/cols,v=float(r)/rows,e=.0002f;
            const Vec3 p=sample(u,v);
            const Vec3 du=sample(closed?u+e:std::min(1.0f,u+e),v)-sample(closed?u-e:std::max(0.0f,u-e),v);
            const Vec3 dv=sample(u,std::min(1.0f,v+e))-sample(u,std::max(0.0f,v-e));
            Vec3 normal=normalized(cross(normalized(dv),normalized(du)));
            const Vec3 outward=closed?p-center:Vec3{1,0,0};
            if(length(normal)<.5f)normal=normalized(outward);
            if(dot(normal,outward)<0)normal=normal*-1;
            BoundVertex vertex;vertex.vertex={p,normal,color,{0,roughness,0}};
            vertex.joints={Head,0,0,0};vertex.material=material;vertex.part=Part::Head;
            model.vertices.push_back(vertex);
        }
        for(int r=0;r<rows;++r)for(int c=0;c<cols;++c) {
            const auto a=base+r*(cols+1)+c,b=a+cols+1;
            for(auto tri: {std::array<std::uint32_t,3>{a,b,b+1},std::array<std::uint32_t,3>{a,b+1,a+1}}) {
                const auto& p=model.vertices[tri[0]].vertex;
                if(dot(cross(model.vertices[tri[1]].vertex.position-p.position,model.vertices[tri[2]].vertex.position-p.position),p.normal)<0)
                    std::swap(tri[1],tri[2]);
                model.indices.insert(model.indices.end(),tri.begin(),tri.end());
            }
        }
    }
    // Continuous skull/face section shared by the head surface and attached features.
    static float width(float y) {
        const float t=y/(y>=0?.137f:.118f);
        return .090f*std::sqrt(std::max(0.0f,1-t*t))*(1-.17f*smooth(.02f,.115f,-y));
    }
    static float depth(float y) {
        const float t=y/(y>=0?.137f:.118f);
        return .080f*std::sqrt(std::max(0.0f,1-t*t));
    }
    static float features(float y,float z) {
        return .003f*gaussian(y,.065f,.045f)
            +.006f*gaussian(y,-.008f,.031f)*gaussian(std::abs(z),.048f,.024f)
            -.004f*gaussian(y,.026f,.014f)*gaussian(std::abs(z),.034f,.019f)
            +.010f*gaussian(y,.010f,.030f)*gaussian(z,0,.012f)
            +.017f*gaussian(y,-.023f,.012f)*gaussian(z,0,.013f)
            +.003f*gaussian(y,-.029f,.008f)*gaussian(std::abs(z),.011f,.006f)
            +.006f*gaussian(y,-.055f,.021f)*gaussian(z,0,.028f)
            +.008f*gaussian(y,-.087f,.023f)*gaussian(z,0,.028f);
    }
    static float faceX(float y,float z) {
        const float f=std::sqrt(std::max(0.0f,1-std::pow(z/std::max(width(y),.00001f),2.0f)));
        return depth(y)*f+features(y,z)*f*f;
    }
    Vec3 front(float y,float z,float lift=0) const {return center+Vec3{faceX(y,z)+lift,y,z};}
    void oval(Vec3 p,Vec3 radii,MaterialId material,Color color,float roughness,int rows=16,int cols=24) {
        patch(rows,cols,[=](float u,float v){const float t=(v-.5f)*pi,a=u*2*pi;
            return p+Vec3{radii.x*std::cos(t)*std::cos(a),radii.y*std::sin(t),radii.z*std::cos(t)*std::sin(a)};
        },material,color,roughness,true);
    }
    void build() {
        constexpr Color skin{.91f,.85f,.86f},lid{.83f,.72f,.74f},dark{.055f,.042f,.047f};
        const auto start=model.vertices.size();
        patch(96,144,[=,this](float u,float v) {
            const float s=std::sin((v-.5f)*pi),y=(s>=0?.137f:.118f)*s,a=u*2*pi;
            const float z=width(y)*std::sin(a),f=std::max(0.0f,std::cos(a));
            return center+Vec3{depth(y)*std::cos(a)+features(y,z)*f*f,y,z};
        },Skin,skin,.55f,true);
        for(auto i=start;i<model.vertices.size();++i) {
            auto& v=model.vertices[i].vertex;const Vec3 p=v.position-center;
            const float blush=.11f*gaussian(p.y,-.015f,.025f)*gaussian(std::abs(p.z),.052f,.020f)*smooth(0,.06f,p.x);
            v.color={skin.r,skin.g-blush*.35f,skin.b-blush*.24f,1};
        }
        for(float side:{-1.0f,1.0f}) {
            oval(center+Vec3{-.006f,-.008f,side*.086f},{.012f,.022f,.010f},Skin,skin,.57f);
            oval(center+Vec3{.004f,-.009f,side*.090f},{.0025f,.012f,.005f},Skin,lid,.65f);
            oval(center+Vec3{.004f,-.024f,side*.090f},{.002f,.0034f,.002f},Gold,{.55f,.43f,.26f},.4f);
            const auto eyeY=[](float u,float upper) {
                return .024f+.0025f*u+upper*std::sin(pi*u);
            };
            const auto eyePoint=[=,this](float u,float v) {
                const float y=eyeY(u,0)+std::sin(pi*u)*(-.0050f+.0115f*v);
                const float z=side*(.014f+.038f*u);
                return front(y,z,.001f+.0015f*std::sin(pi*u)*std::sin(pi*v));
            };
            patch(14,40,eyePoint,EyeWhite,{.79f,.78f,.77f},.33f);
            // Clipped iris disc, dark limbal ring and small pupil; no protruding eyeball sphere.
            const float eyeCenterY=eyeY(.49f,0)+.0005f,eyeCenterZ=side*(.014f+.038f*.49f);
            const auto disc=[&](float radius,Color color,float lift) {
                patch(10,40,[=,this](float u,float v){
                    const float a=u*2*pi,z=eyeCenterZ+radius*v*std::cos(a);
                    const float ex=(side*z-.014f)/.038f;
                    float y=eyeCenterY+radius*v*std::sin(a);
                    y=std::clamp(y,eyeY(ex,-.0050f)+.0002f,eyeY(ex,.0065f)-.0002f);
                    return front(y,z,lift);
                },Iris,color,.27f);
            };
            disc(.0064f,{.075f,.060f,.065f},.0028f);
            disc(.0053f,{.17f,.125f,.12f},.0030f);
            disc(.0027f,{.025f,.021f,.027f},.0032f);
            oval(front(eyeCenterY+.0021f,eyeCenterZ-side*.0018f,.0036f),{.00045f,.00065f,.00065f},EyeWhite,{.94f,.94f,.95f},.2f,8,12);
            // Soft lower rim and tapered upper lash line follow the same eye opening.
            for(bool upper:{false,true}) {
                patch(3,40,[=,this](float u,float v){
                    const float y=eyeY(u,upper?.0065f:-.0050f)+(v-.5f)*(upper?.0015f:.0010f)*std::sin(pi*u);
                    return front(y,side*(.014f+.038f*u),.0018f);
                },upper?Hair:Skin,upper?dark:lid,upper?.65f:.6f);
            }
            patch(3,32,[=,this](float u,float v){
                const float y=.048f+.004f*std::sin(pi*u)-.002f*u+(v-.5f)*(.003f*(1-u)+.0005f);
                return front(y,side*(.017f+.039f*u),.0011f);
            },Hair,{.13f,.10f,.11f},.8f);
            oval(front(-.031f,side*.0085f,.0005f),{.0006f,.0010f,.0020f},Lip,{.35f,.25f,.26f},.75f,8,16);
        }
        // Two small curved lip surfaces, sharing a subtle closed mouth line.
        const auto seam=[](float u){return -.054f+.0013f*u*u;};
        for(bool upper:{true,false}) {
            patch(10,48,[=,this](float u,float v){
                const float q=u*2-1,z=q*.018f,profile=std::pow(std::max(0.0f,1-q*q),.8f);
                const float height=profile*(upper?(.0030f+.0018f*gaussian(std::abs(q),.32f,.22f)):.0050f);
                const float y=seam(q)+(upper?1:-1)*height*v;
                return front(y,z,.0006f+profile*(.0020f*std::sin(pi*v)+.0012f*(1-v)));
            },Lip,upper?Color{.57f,.34f,.38f}:Color{.65f,.42f,.45f},upper?.53f:.45f);
        }
        patch(2,48,[=,this](float u,float v){const float q=u*2-1;
            return front(seam(q)+(v-.5f)*.00065f*std::max(0.0f,1-q*q),q*.0178f,.0020f);
        },Lip,{.32f,.20f,.23f},.75f);
    }
};
}
void buildHead(Model& model) {HeadBuilder{model,model.bindWorld[Head].point({0,.035f,0})}.build();}
}
