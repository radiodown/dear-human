#include "CloneModelData.hpp"
#include "HairModel.hpp"
#include "HeadModel.hpp"
#include <functional>

namespace dh::model {
namespace {
Binding rigid(Joint joint) { return {joint,joint,0}; }
Binding spine(float y) {
    if(y<1.08f) return {Pelvis,Waist,std::clamp((y-.96f)/.12f,0.0f,1.0f)};
    return {Waist,Chest,std::clamp((y-1.08f)/.25f,0.0f,1.0f)};
}
struct Builder {
    Model model;
    Skeleton bind;
    Builder() {
        model.materials={{{"cool pale skin",{.88f,.82f,.83f},0,.62f},
            {"muted lips",{.49f,.30f,.32f},0,.58f}, {"eye sclera",{.65f,.64f,.61f},0,.38f},
            {"dark eyes",{.065f,.055f,.06f},0,.23f}, {"black hair",{.055f,.06f,.075f},.05f,.40f},
            {"hair strand highlight",{.09f,.095f,.115f},.08f,.42f},
            {"black technical fabric",{.075f,.085f,.10f},0,.93f},
            {"gunmetal armor",{.20f,.225f,.26f},.72f,.38f},
            {"armor bevels",{.29f,.31f,.34f},.78f,.32f},
            {"light gray chest inset",{.55f,.57f,.59f},.45f,.44f},
            {"muted gold",{.61f,.49f,.29f},.78f,.36f},
            {"black straps and gloves",{.09f,.095f,.105f},.05f,.65f},
            {"charcoal stockings",{.15f,.14f,.16f},0,.91f},
            {"black cape",{.085f,.09f,.11f},0,.96f},
            {"burgundy cape lining",{.085f,.065f,.075f},0,.97f},
            {"hair cards coverage atlas",{.09f,.092f,.10f},0,.46f}}};
        for(std::size_t i=0;i<JointCount;++i) {
            model.bindWorld[i]=bind.world(static_cast<Joint>(i));
            model.inverseBind[i]=inverseRigid(model.bindWorld[i]);
        }
    }
    std::uint32_t vertex(Vec3 p,MaterialId material,Binding binding) {
        const auto& mat=model.materials[material];
        const auto index=static_cast<std::uint32_t>(model.vertices.size());
        model.vertices.push_back({{p,{},mat.color,{mat.metallic,mat.roughness,0}},
            {static_cast<std::uint16_t>(binding.blend<1?binding.a:Pelvis),static_cast<std::uint16_t>(binding.blend>0?binding.b:Pelvis),0,0},
            {1-binding.blend,binding.blend,0,0},material});
        return index;
    }
    void tri(std::uint32_t a,std::uint32_t b,std::uint32_t c) {
        model.indices.insert(model.indices.end(),{a,b,c});
        const Vec3 normal=cross(model.vertices[b].vertex.position-model.vertices[a].vertex.position,
                                model.vertices[c].vertex.position-model.vertices[a].vertex.position);
        for(const auto i:{a,b,c}) model.vertices[i].vertex.normal=model.vertices[i].vertex.normal+normal;
    }
    void face(Vec3 a,Vec3 b,Vec3 c,Vec3 d,MaterialId material,Binding binding) {
        const auto first=vertex(a,material,binding);
        vertex(b,material,binding); vertex(c,material,binding); vertex(d,material,binding);
        tri(first,first+1,first+2); tri(first,first+2,first+3);
    }
    template<class Sample,class Bind>
    void surface(int rows,int sides,Sample sample,MaterialId material,Bind binding) {
        const auto first=static_cast<std::uint32_t>(model.vertices.size());
        for(int r=0;r<=rows;++r) for(int s=0;s<=sides;++s) {
            const float v=static_cast<float>(r)/rows,u=static_cast<float>(s)/sides;
            const Vec3 p=sample(u,v);
            vertex(p,material,binding(p,v));
        }
        for(int r=0;r<rows;++r) for(int s=0;s<sides;++s) {
            const auto a=first+r*(sides+1)+s,b=a+sides+1;
            tri(a,b,b+1); tri(a,b+1,a+1);
        }
    }
    void ellipsoid(const Mat4& frame,Vec3 radii,MaterialId material,Binding binding,int rings=12,int sides=20) {
        surface(rings,sides,[=](float u,float v) {
            const float t=(v-.5f)*pi, a=u*2*pi;
            return frame.point({radii.x*std::cos(t)*std::cos(a),radii.y*std::sin(t),radii.z*std::cos(t)*std::sin(a)});
        },material,[=](Vec3,float){return binding;});
    }
    void oval(Vec3 p,Vec3 radii,MaterialId material,Joint joint,int rings=12,int sides=20) {
        ellipsoid(Mat4::translation(p),radii,material,rigid(joint),rings,sides);
    }
    void box(const Mat4& frame,Vec3 size,MaterialId material,Binding binding) {
        const Mat4 m=frame*Mat4::scale(size);
        const auto f=[&](Vec3 a,Vec3 b,Vec3 c,Vec3 d) {face(m.point(a),m.point(b),m.point(c),m.point(d),material,binding);};
        f({-.5f,-.5f,.5f},{.5f,-.5f,.5f},{.5f,.5f,.5f},{-.5f,.5f,.5f});
        f({.5f,-.5f,-.5f},{-.5f,-.5f,-.5f},{-.5f,.5f,-.5f},{.5f,.5f,-.5f});
        f({.5f,-.5f,.5f},{.5f,-.5f,-.5f},{.5f,.5f,-.5f},{.5f,.5f,.5f});
        f({-.5f,-.5f,-.5f},{-.5f,-.5f,.5f},{-.5f,.5f,.5f},{-.5f,.5f,-.5f});
        f({-.5f,.5f,.5f},{.5f,.5f,.5f},{.5f,.5f,-.5f},{-.5f,.5f,-.5f});
        f({-.5f,-.5f,-.5f},{.5f,-.5f,-.5f},{.5f,-.5f,.5f},{-.5f,-.5f,.5f});
    }
    // Beveled, tapered armor plate. X is its outward depth, Y height, Z width.
    void plate(const Mat4& frame,Vec3 size,MaterialId material,Joint joint) {
        constexpr std::array<std::array<float,2>,8> outline{{{-.5f,-.32f},{-.34f,-.5f},{.34f,-.5f},{.5f,-.30f},
            {.5f,.31f},{.32f,.5f},{-.32f,.5f},{-.5f,.30f}}};
        for(int ring=0;ring<3;++ring) for(int s=0;s<8;++s) {
            const int n=(s+1)%8;
            const float xa=ring==0?-.5f:(ring==1?.25f:.5f),xb=ring==0?.25f:(ring==1?.5f:.52f);
            const float sa=ring==0?1.0f:(ring==1?1.0f:.86f),sb=ring==0?1.0f:(ring==1?.86f:.84f);
            const auto p=[&](float x,int side,float scale) { return frame.point({x*size.x,outline[side][0]*size.y*scale,outline[side][1]*size.z*scale}); };
            face(p(xa,s,sa),p(xa,n,sa),p(xb,n,sb),p(xb,s,sb),ring==1?ArmorEdge:material,rigid(joint));
        }
        const auto center=vertex(frame.point({.52f*size.x,0,0}),material,rigid(joint));
        for(int s=0;s<8;++s) {
            const auto a=vertex(frame.point({.52f*size.x,outline[s][0]*size.y*.84f,outline[s][1]*size.z*.84f}),material,rigid(joint));
            const int n=(s+1)%8;
            const auto b=vertex(frame.point({.52f*size.x,outline[n][0]*size.y*.84f,outline[n][1]*size.z*.84f}),material,rigid(joint));
            tri(center,a,b);
        }
    }
    void tube(const std::vector<Vec3>& points,float radius,MaterialId material,Joint joint,int sides=8,float taper=1) {
        surface(static_cast<int>(points.size())-1,sides,[=](float u,float v) {
            const float f=v*(points.size()-1);
            const auto i=std::min(static_cast<std::size_t>(f),points.size()-2);
            const Vec3 center=points[i]*(1-(f-i))+points[i+1]*(f-i);
            const Vec3 y=normalized(points[i+1]-points[i]);
            const Vec3 x=normalized(cross(y,std::abs(y.z)<.9f?Vec3{0,0,1}:Vec3{1,0,0}));
            const Vec3 z=cross(x,y);
            const float r=radius*(1-v*(1-taper));
            return center+x*(std::cos(u*2*pi)*r)+z*(std::sin(u*2*pi)*r);
        },material,[=](Vec3,float){return rigid(joint);});
    }
    Vec3 p(Joint joint,Vec3 local={}) const {return bind.world(joint).point(local);}
    Mat4 at(Joint joint,Vec3 local={}) const {return bind.world(joint)*Mat4::translation(local);}

    void torso() {
        struct Row {float y,depth,width;};
        constexpr std::array<Row,10> rows{{{.91f,.10f,.16f},{.98f,.115f,.185f},{1.05f,.10f,.15f},{1.10f,.091f,.135f},
            {1.17f,.11f,.16f},{1.25f,.145f,.195f},{1.33f,.14f,.205f},{1.41f,.11f,.20f},{1.48f,.075f,.145f},{1.52f,.057f,.07f}}};
        surface(36,48,[&](float u,float v) {
            const float index=v*(rows.size()-1); const auto i=std::min(static_cast<std::size_t>(index),rows.size()-2);
            const float t=index-i;
            const auto a=rows[i],b=rows[i+1];
            return Vec3{(a.depth*(1-t)+b.depth*t)*std::cos(2*pi*u),a.y*(1-t)+b.y*t,(a.width*(1-t)+b.width*t)*std::sin(2*pi*u)};
        },Fabric,[](Vec3 p,float){return spine(p.y);});
        // A continuous curved breastplate narrows into the waist. The gray
        // insets share its curvature instead of floating on a rectangular box.
        const auto breastplate=[](float angle,float y) {
            const float v=(y-1.16f)/.33f;
            const float width=.138f+.061f*std::sin(pi*v*.90f);
            const float depth=.104f+.045f*std::sin(pi*v);
            const float z=width*std::sin(angle);
            const float shaping=.013f*std::exp(-std::pow((y-1.31f)*13,2))*std::exp(-std::pow((std::abs(z)-.09f)*15,2));
            return Vec3{.008f+depth*std::cos(angle)+shaping*std::cos(angle),y,z};
        };
        surface(24,40,[=](float u,float v){return breastplate((u-.5f)*pi,1.16f+.33f*v);},Armor,[](Vec3,float){return rigid(Chest);});
        for(const float side:{-1.0f,1.0f}) {
            surface(18,10,[=](float u,float v) {
                const float angle=(side>0?.42f:-1.01f)+u*.59f;
                return breastplate(angle,1.20f+.235f*v)+Vec3{.0025f,0,0};
            },GrayInset,[](Vec3,float){return rigid(Chest);});
            for(const float edge:{.42f,1.01f}) {
                std::vector<Vec3> border;
                for(int j=0;j<=12;++j)border.push_back(breastplate(side*edge,1.20f+.235f*j/12)+Vec3{.005f,0,0});
                tube(border,.0023f,Gold,Chest);
            }
            // Harness follows the chest and carries small metal fastening points.
            box(at(Chest,{.094f,.005f,side*.17f}),{.018f,.30f,.020f},Leather,rigid(Chest));
            plate(at(Chest,{.107f,.075f,side*.17f}),{.014f,.035f,.028f},ArmorEdge,Chest);
            // Waist seams and a small chest wing motif, without assigning rank.
            tube({{.111f,1.05f,side*.072f},{.117f,1.15f,side*.087f}},.0022f,Gold,Waist);
            for(int feather=0;feather<3;++feather) {
                const float z=side*(.016f+feather*.016f);
                tube({p(Chest,{.16f,.108f,z}),p(Chest,{.16f,.125f+feather*.006f,z+side*.022f})},.0035f,Gold,Chest,6,.3f);
            }
        }
        for(const float y:{1.075f,1.15f}) {
            surface(2,48,[=](float u,float v) {return Vec3{.113f*std::cos(u*2*pi),y+(v-.5f)*.038f,.16f*std::sin(u*2*pi)};},Leather,[=](Vec3,float){return rigid(Waist);});
            plate(Mat4::translation({.122f,y,0}),{.018f,.048f,.054f},ArmorEdge,Waist);
        }
        // High collar with a small open front; the face and neck stay separate.
        surface(4,40,[=](float u,float v) {
            const float a=.20f+(2*pi-.40f)*u;
            return Vec3{.062f*std::cos(a),1.48f+.11f*v,.078f*std::sin(a)};
        },Armor,[](Vec3,float){return rigid(Chest);});
        for(const float side:{-1.0f,1.0f})
            tube({{.062f,1.50f,side*.015f},{.065f,1.58f,side*.016f},{.02f,1.59f,side*.076f}},.0023f,Gold,Chest);
        oval({0,1.59f,0},{.045f,.075f,.052f},Skin,Neck);
    }
    void skirtAndBelt() {
        for(int panel=0;panel<12;++panel) {
            const float center=(panel+.5f)*2*pi/12;
            surface(5,4,[=](float u,float v) {
                const float a=center+(u-.5f)*(2*pi/12-.025f);
                const float flare=.95f+.26f*v;
                return Vec3{(.13f+.018f*v)*std::cos(a),.987f-.20f*v,.185f*flare*std::sin(a)};
            },panel%3==0?Armor:Fabric,[](Vec3,float){return rigid(Pelvis);});
        }
        surface(2,48,[](float u,float v) {return Vec3{.137f*std::cos(u*2*pi),.995f+(v-.5f)*.046f,.194f*std::sin(u*2*pi)};},Leather,[](Vec3,float){return rigid(Pelvis);});
        plate(Mat4::translation({.149f,.995f,0}),{.025f,.054f,.075f},ArmorEdge,Pelvis);
        for(const float side:{-1.0f,1.0f}) {
            for(int i=0;i<3;++i) {
                const float z=side*(.09f+i*.046f);
                const float x=.128f-(i*.016f);
                box(Mat4::translation({x,.938f,z}),{.06f,.105f,.041f},Fabric,rigid(Pelvis));
                plate(Mat4::translation({x+.034f,.944f,z}),{.014f,.085f,.039f},Armor,Pelvis);
                box(Mat4::translation({x+.043f,.96f,z}),{.008f,.012f,.026f},Gold,rigid(Pelvis));
            }
            plate(Mat4::translation({.145f,.844f,side*.135f}),{.045f,.095f,.079f},Armor,Pelvis);
        }
    }
    void limb(Joint start,Joint middle,Joint end,float upperRadius,float lowerRadius,bool leg) {
        const Vec3 a=p(start),b=p(middle),c=p(end);
        // One continuous sleeve/stocking surface across each bending joint.
        surface(20,20,[=](float u,float v) {
            Vec3 center,tangent;
            float radius;
            if(v<.5f) {const float t=v*2;center=a*(1-t)+b*t;tangent=normalized(b-a);radius=upperRadius*(1-.28f*t)+.006f*std::sin(pi*t);}
            else {const float t=(v-.5f)*2;center=b*(1-t)+c*t;tangent=normalized(c-b);radius=lowerRadius*(1-.30f*t)+.009f*std::sin(pi*t);}
            const Vec3 x=normalized(cross(tangent,{0,0,1})),z=cross(x,tangent);
            return center+x*(std::cos(u*2*pi)*radius)+z*(std::sin(u*2*pi)*radius);
        },leg?Stocking:Fabric,[=](Vec3,float v) {
            if(v<.5f) return Binding{start,middle,std::clamp((v-.34f)/.16f,0.0f,1.0f)};
            return Binding{middle,end,std::clamp((v-.87f)/.13f,0.0f,1.0f)};
        });
        if(leg) {
            // Bare upper-thigh band, stockings and two adjustable straps.
            ellipsoid(at(start,{0,-.12f,0}),{upperRadius+.013f,.13f,upperRadius+.013f},Skin,rigid(start));
            for(const float y:{-.235f,-.29f}) {
                surface(2,24,[=,this](float u,float v) {return p(start,{(upperRadius+.009f)*std::cos(u*2*pi),y+(v-.5f)*.025f,(upperRadius+.009f)*std::sin(u*2*pi)});},Leather,[=](Vec3,float){return rigid(start);});
                plate(at(start,{upperRadius+.001f,y,0}),{.014f,.036f,.025f},Gold,start);
            }
            box(at(start,{upperRadius+.006f,-.20f,0}),{.015f,.17f,.016f},Leather,rigid(start));
            plate(at(middle,{.067f,.005f,0}),{.057f,.155f,.142f},Armor,middle);
            plate(at(end,{.066f,.19f,0}),{.055f,.335f,.131f},Armor,middle);
            for(const float side:{-1.0f,1.0f})
                tube({p(end,{.098f,.05f,side*.036f}),p(end,{.10f,.29f,side*.047f})},.0024f,Gold,middle);
            ellipsoid(at(end,{.078f,-.015f,0}),{.158f,.065f,.083f},Leather,rigid(end));
            box(at(end,{.068f,-.054f,0}),{.29f,.040f,.17f},Leather,rigid(end));
            plate(at(end,{.095f,.016f,0}),{.07f,.065f,.14f},Armor,end);
            for(int strap=0;strap<3;++strap)
                box(at(end,{.105f,.014f+strap*.033f,0}),{.025f,.012f,.13f},ArmorEdge,rigid(end));
        } else {
            ellipsoid(at(start,{0,-.020f,start==LeftShoulder?-.012f:.012f}),{.077f,.080f,.075f},Armor,rigid(start));
            plate(at(start,{.054f,-.08f,0}),{.04f,.16f,.15f},Armor,start);
            tube({p(start,{.078f,-.01f,-.07f}),p(start,{.084f,-.075f,-.07f}),p(start,{.073f,-.13f,-.04f})},.0025f,Gold,start);
            plate(at(middle,{.045f,-.135f,0}),{.046f,.20f,.092f},Armor,middle);
            const Joint hand=start==LeftShoulder?LeftHand:RightHand;
            ellipsoid(at(hand,{0,-.012f,0}),{.033f,.047f,.042f},Leather,rigid(hand));
            plate(at(hand,{.024f,-.005f,0}),{.02f,.047f,.068f},Armor,hand);
            for(int finger=0;finger<4;++finger) {
                const float z=(finger-1.5f)*.018f;
                tube({p(hand,{.007f,-.032f,z}),p(hand,{.012f,-.063f,z}),p(hand,{.027f,-.075f,z})},.008f,Leather,hand,8,.75f);
            }
            tube({p(hand,{.028f,.015f,.035f}),p(hand,{.05f,-.008f,.044f}),p(hand,{.052f,-.032f,.03f})},.011f,Leather,hand,8,.8f);
        }
    }
    void headAndHair() { buildHead(model); }
    Vec3 capePoint(float u,float v) const {
        const float side=u*2-1;
        return {-.105f-.18f*v-.065f*(1-side*side)+.013f*std::sin(u*14*pi)*(v+.2f),
            1.49f-1.32f*v-.04f*side*side,
            side*(.235f+.20f*v)};
    }
    void cape() {
        surface(24,48,[this](float u,float v){return capePoint(u,1-v);},Cape,[](Vec3,float){return rigid(Chest);});
        surface(24,48,[this](float u,float v){return capePoint(1-u,1-v)+Vec3{.003f,0,0};},CapeInner,[](Vec3,float){return rigid(Chest);});
        for(const float edge:{0.0f,1.0f}) {
            std::vector<Vec3> path;
            for(int j=0;j<=16;++j) path.push_back(capePoint(edge,j/16.0f));
            tube(path,.0045f,Gold,Chest,6);
        }
        std::vector<Vec3> hem;
        for(int j=0;j<=32;++j) hem.push_back(capePoint(j/32.0f,1));
        tube(hem,.007f,Gold,Chest,6);
        for(const float side:{-1.0f,1.0f}) {
            // Small stylized wing motif in geometry near each lower side.
            const float u=side<0?.13f:.87f;
            const Vec3 center=capePoint(u,.81f)+Vec3{.007f,0,0};
            for(int feather=0;feather<4;++feather)
                tube({center+Vec3{0,-.025f+feather*.017f,0},center+Vec3{0,.025f+feather*.019f,side*(.025f+feather*.012f)}},.0035f,Gold,Chest,6,.35f);
        }
    }
    Model finish() {
        cape(); torso(); skirtAndBelt();
        limb(LeftHip,LeftKnee,LeftAnkle,.073f,.058f,true);
        limb(RightHip,RightKnee,RightAnkle,.073f,.058f,true);
        limb(LeftShoulder,LeftElbow,LeftWrist,.047f,.038f,false);
        limb(RightShoulder,RightElbow,RightWrist,.047f,.038f,false);
        const auto headStart=model.vertices.size();
        headAndHair();
        for(auto i=headStart;i<model.vertices.size();++i) model.vertices[i].part=Part::Head;
        buildHair(model);
        for(auto& v:model.vertices) {
            v.vertex.normal=normalized(v.vertex.normal);
            if(length(v.vertex.normal)<.5f) v.vertex.normal={0,1,0};
        }
        return std::move(model);
    }
};
} // namespace

const Model& cloneModel() {
    static const Model model=Builder{}.finish();
    return model;
}
} // namespace dh::model

namespace dh {
void appendCloneModel(MeshData& target,const Skeleton& skeleton,bool hairStudy,bool includeHair) {
    const auto& model=model::cloneModel();
    const auto base=static_cast<std::uint32_t>(target.vertices.size());
    std::array<Mat4,JointCount> skin;
    for(std::size_t i=0;i<JointCount;++i) skin[i]=skeleton.world(static_cast<Joint>(i))*model.inverseBind[i];
    target.vertices.reserve(target.vertices.size()+model.vertices.size());
    for(const auto& source:model.vertices) {
        Vertex output=source.vertex;
        output.position={}; output.normal={}; output.flow={};
        for(std::size_t j=0;j<4;++j) if(source.weights[j]>0) {
            output.position=output.position+skin[source.joints[j]].point(source.vertex.position)*source.weights[j];
            output.normal=output.normal+skin[source.joints[j]].direction(source.vertex.normal)*source.weights[j];
            output.flow=output.flow+skin[source.joints[j]].direction(source.vertex.flow)*source.weights[j];
        }
        output.normal=normalized(output.normal);
        target.vertices.push_back(output);
    }
    target.indices.reserve(target.indices.size()+model.indices.size());
    for(std::size_t i=0;i<model.indices.size();i+=3) {
        if(hairStudy && model.vertices[model.indices[i]].part==model::Part::Body) continue;
        if(!includeHair && model.vertices[model.indices[i]].part>=model::Part::Crown) continue;
        for(int j=0;j<3;++j) target.indices.push_back(base+model.indices[i+j]);
    }
}
} // namespace dh
