#include "Scene.hpp"
#include <array>
#include <cstdio>
#include <string_view>

namespace dh {
namespace {
constexpr Color leftColor{.26f, .77f, .72f};
constexpr Color rightColor{.93f, .57f, .39f};
constexpr Color spineColor{.96f, .81f, .47f};
constexpr Color bodyColor{.45f, .53f, .61f};

void triangle(MeshData& mesh, Vec3 a, Vec3 b, Vec3 c, Color color) {
    const auto first = static_cast<std::uint32_t>(mesh.vertices.size());
    const Vec3 normal = normalized(cross(b-a, c-a));
    mesh.vertices.insert(mesh.vertices.end(), {{a, normal, color}, {b, normal, color}, {c, normal, color}});
    mesh.indices.insert(mesh.indices.end(), {first, first+1, first+2});
}
void quad(MeshData& mesh, const Mat4& model, Vec3 a, Vec3 b, Vec3 c, Vec3 d, Color color) {
    triangle(mesh, model.point(a), model.point(b), model.point(c), color);
    triangle(mesh, model.point(a), model.point(c), model.point(d), color);
}
void box(MeshData& mesh, const Mat4& model, Color color) {
    quad(mesh, model, {-.5f,-.5f,.5f}, {.5f,-.5f,.5f}, {.5f,.5f,.5f}, {-.5f,.5f,.5f}, color);
    quad(mesh, model, {.5f,-.5f,-.5f}, {-.5f,-.5f,-.5f}, {-.5f,.5f,-.5f}, {.5f,.5f,-.5f}, color);
    quad(mesh, model, {.5f,-.5f,.5f}, {.5f,-.5f,-.5f}, {.5f,.5f,-.5f}, {.5f,.5f,.5f}, color);
    quad(mesh, model, {-.5f,-.5f,-.5f}, {-.5f,-.5f,.5f}, {-.5f,.5f,.5f}, {-.5f,.5f,-.5f}, color);
    quad(mesh, model, {-.5f,.5f,.5f}, {.5f,.5f,.5f}, {.5f,.5f,-.5f}, {-.5f,.5f,-.5f}, color);
    quad(mesh, model, {-.5f,-.5f,-.5f}, {.5f,-.5f,-.5f}, {.5f,-.5f,.5f}, {-.5f,-.5f,.5f}, color);
}
void ellipsoid(MeshData& mesh, const Mat4& model, Color color) {
    constexpr int rings = 8, segments = 12;
    const auto point = [](int ring, int side) {
        const float a = pi * static_cast<float>(ring) / rings;
        const float b = 2*pi * static_cast<float>(side) / segments;
        return Vec3{std::sin(a)*std::cos(b), std::cos(a), std::sin(a)*std::sin(b)};
    };
    for (int r=0; r<rings; ++r)
        for (int s=0; s<segments; ++s) {
            const Vec3 a=model.point(point(r,s)), b=model.point(point(r+1,s));
            const Vec3 c=model.point(point(r+1,s+1)), d=model.point(point(r,s+1));
            if (r != rings-1) triangle(mesh, a, b, c, color);
            if (r != 0) triangle(mesh, a, c, d, color);
        }
}
void cylinder(MeshData& mesh, Vec3 from, Vec3 to, float radius, Color color) {
    if (length(to-from) < .0001f) return;
    const Mat4 model = segment(from, to, radius);
    for (int s=0; s<12; ++s) {
        const float a = 2*pi*static_cast<float>(s)/12;
        const float b = 2*pi*static_cast<float>(s+1)/12;
        const Vec3 p{std::cos(a),0,std::sin(a)}, q{std::cos(b),0,std::sin(b)};
        quad(mesh, model, p, p+Vec3{0,1,0}, q+Vec3{0,1,0}, q, color);
        triangle(mesh, model.point(), model.point(p), model.point(q), color);
        triangle(mesh, model.point({0,1,0}), model.point(q+Vec3{0,1,0}), model.point(p+Vec3{0,1,0}), color);
    }
}
void ball(MeshData& mesh, Vec3 center, float radius, Color color) {
    ellipsoid(mesh, Mat4::translation(center)*Mat4::scale({radius,radius,radius}), color);
}
Color jointColor(std::size_t joint) {
    if ((joint >= LeftShoulder && joint <= LeftHand) || (joint >= LeftHip && joint <= LeftToe)) return leftColor;
    if ((joint >= RightShoulder && joint <= RightHand) || joint >= RightHip) return rightColor;
    return spineColor;
}

// A tiny original 5x7 alphabet keeps the local viewer independent of fonts,
// image files and a second graphics/UI runtime.
std::array<unsigned char,7> glyph(char c) {
    switch(c) {
    case 'A': return {14,17,17,31,17,17,17}; case 'B': return {30,17,17,30,17,17,30};
    case 'C': return {14,17,16,16,16,17,14}; case 'D': return {30,17,17,17,17,17,30};
    case 'E': return {31,16,16,30,16,16,31}; case 'F': return {31,16,16,30,16,16,16};
    case 'G': return {14,17,16,23,17,17,14}; case 'H': return {17,17,17,31,17,17,17};
    case 'I': return {14,4,4,4,4,4,14}; case 'J': return {7,2,2,2,18,18,12};
    case 'K': return {17,18,20,24,20,18,17}; case 'L': return {16,16,16,16,16,16,31};
    case 'M': return {17,27,21,21,17,17,17}; case 'N': return {17,25,21,19,17,17,17};
    case 'O': return {14,17,17,17,17,17,14}; case 'P': return {30,17,17,30,16,16,16};
    case 'Q': return {14,17,17,17,21,18,13}; case 'R': return {30,17,17,30,20,18,17};
    case 'S': return {15,16,16,14,1,1,30}; case 'T': return {31,4,4,4,4,4,4};
    case 'U': return {17,17,17,17,17,17,14}; case 'V': return {17,17,17,17,17,10,4};
    case 'W': return {17,17,17,21,21,21,10}; case 'X': return {17,17,10,4,10,17,17};
    case 'Y': return {17,17,10,4,4,4,4}; case 'Z': return {31,1,2,4,8,16,31};
    case '0': return {14,17,19,21,25,17,14}; case '1': return {4,12,4,4,4,4,14};
    case '2': return {14,17,1,2,4,8,31}; case '3': return {30,1,1,14,1,1,30};
    case '4': return {2,6,10,18,31,2,2}; case '5': return {31,16,16,30,1,1,30};
    case '6': return {14,16,16,30,17,17,14}; case '7': return {31,1,2,4,8,8,8};
    case '8': return {14,17,17,14,17,17,14}; case '9': return {14,17,17,15,1,1,14};
    case '/': return {1,2,2,4,8,8,16}; case '-': return {0,0,0,31,0,0,0};
    case '.': return {0,0,0,0,0,12,12}; case ':': return {0,12,12,0,12,12,0};
    case '+': return {0,4,4,31,4,4,0}; default: return {};
    }
}
void rect(MeshData& mesh, float x, float y, float w, float h, Color color, int pw, int ph) {
    const auto p = [pw,ph](float px,float py) {return Vec3{2*px/pw-1,1-2*py/ph,0};};
    triangle(mesh,p(x,y),p(x+w,y),p(x+w,y+h),color);
    triangle(mesh,p(x,y),p(x+w,y+h),p(x,y+h),color);
}
void text(MeshData& mesh, std::string_view value, float x, float y, float scale,
          Color color, int pw, int ph) {
    for(char c:value) {
        const auto rows=glyph(c);
        for(int row=0;row<7;++row)
            for(int col=0;col<5;++col)
                if(rows[row] & (1 << (4-col)))
                    rect(mesh,x+col*scale,y+row*scale,scale,scale,color,pw,ph);
        x += 6*scale;
    }
}
} // namespace

const char* viewName(View view) {
    switch(view) {
    case View::Skeleton: return "BONES";
    case View::Solid: return "SOLID";
    case View::Overlay: return "OVERLAY";
    }
    return "";
}
Mat4 cameraMatrix(const ViewState& state, float aspect) {
    const Vec3 target{state.worldX,.94f,0};
    const float yaw=radians(state.yaw), pitch=radians(state.pitch);
    const Vec3 eye=target+Vec3{8*std::sin(yaw)*std::cos(pitch),8*std::sin(pitch),8*std::cos(yaw)*std::cos(pitch)};
    const float height=3.05f/state.zoom;
    return orthographic(height*aspect,height,.1f,40)*lookAt(eye,target);
}
SceneGeometry makeScene(const Skeleton& skeleton, const ViewState& state, int pw, int ph) {
    SceneGeometry scene;
    const float center=std::floor(state.worldX);
    box(scene.world,Mat4::translation({center,-.055f,0})*Mat4::scale({30,.1f,16}),{.11f,.15f,.19f});
    for(int i=-12;i<=12;++i)
        box(scene.world,Mat4::translation({center+i,.001f,0})*Mat4::scale({.008f,.003f,16}),{.18f,.23f,.28f});
    for(int i=-8;i<=8;++i)
        box(scene.world,Mat4::translation({center,.001f,static_cast<float>(i)})*Mat4::scale({30,.003f,.008f}),{.18f,.23f,.28f});
    box(scene.world,Mat4::translation({center,.004f,0})*Mat4::scale({30,.004f,.012f}),{.33f,.43f,.47f});

    if(state.view != View::Skeleton) {
        ellipsoid(scene.world,skeleton.world(Pelvis)*Mat4::scale({.16f,.13f,.22f}),bodyColor);
        ellipsoid(scene.world,skeleton.world(Chest)*Mat4::translation({0,.04f,0})*Mat4::scale({.17f,.24f,.25f}),bodyColor);
        cylinder(scene.world,skeleton.position(Waist),skeleton.position(Chest),.115f,{.29f,.36f,.42f});
        cylinder(scene.world,skeleton.position(Neck),skeleton.position(Head),.065f,bodyColor);
        ellipsoid(scene.world,skeleton.world(Head)*Mat4::translation({0,.04f,0})*Mat4::scale({.12f,.16f,.14f}),{.81f,.83f,.80f});
        box(scene.world,skeleton.world(Head)*Mat4::translation({.113f,.07f,0})*Mat4::scale({.035f,.035f,.17f}),{.20f,.40f,.43f});
        for(const bool left:{true,false}) {
            const Joint shoulder=left?LeftShoulder:RightShoulder, elbow=left?LeftElbow:RightElbow;
            const Joint wrist=left?LeftWrist:RightWrist, hand=left?LeftHand:RightHand;
            const Joint hip=left?LeftHip:RightHip, knee=left?LeftKnee:RightKnee, ankle=left?LeftAnkle:RightAnkle;
            const Color color=left?Color{.29f,.56f,.56f}:Color{.63f,.43f,.34f};
            cylinder(scene.world,skeleton.position(shoulder),skeleton.position(elbow),.066f,color);
            cylinder(scene.world,skeleton.position(elbow),skeleton.position(wrist),.055f,bodyColor);
            ball(scene.world,skeleton.position(shoulder),.082f,color);
            ball(scene.world,skeleton.position(elbow),.060f,{.25f,.30f,.35f});
            ellipsoid(scene.world,skeleton.world(hand)*Mat4::scale({.045f,.065f,.05f}),bodyColor);
            cylinder(scene.world,skeleton.position(hip),skeleton.position(knee),.091f,color);
            cylinder(scene.world,skeleton.position(knee),skeleton.position(ankle),.071f,bodyColor);
            ball(scene.world,skeleton.position(knee),.080f,{.25f,.30f,.35f});
            box(scene.world,skeleton.world(ankle)*Mat4::translation({.07f,-.028f,0})*Mat4::scale({.26f,.08f,.15f}),{.24f,.29f,.34f});
        }
    }
    if(state.view != View::Solid) {
        const auto& bones=skeleton.bones();
        for(std::size_t i=0;i<JointCount;++i) {
            const auto joint=static_cast<Joint>(i);
            const Vec3 position=skeleton.position(joint);
            const Color color=jointColor(i);
            if(bones[i].parent>=0)
                cylinder(scene.bones,skeleton.position(static_cast<Joint>(bones[i].parent)),position,.010f,color);
            ball(scene.bones,position,joint==Pelvis?.038f:.025f,color);
        }
    }

    const float ui=std::min(static_cast<float>(pw)/1280,static_cast<float>(ph)/800);
    const Color white{.89f,.93f,.94f}, muted{.48f,.59f,.65f}, panel{.065f,.095f,.125f};
    rect(scene.hud,0,0,static_cast<float>(pw),106*ui,panel,pw,ph);
    text(scene.hud,"DEAR HUMAN / PLAN D",28*ui,22*ui,3*ui,white,pw,ph);
    text(scene.hud,"01 ENVIRONMENT   /   02 SKELETON   /   03 MESH",29*ui,60*ui,1.65f*ui,muted,pw,ph);
    for(int i=0;i<3;++i) {
        const bool active=static_cast<int>(state.view)==i;
        const float x=(28+i*158)*ui;
        rect(scene.hud,x,122*ui,146*ui,30*ui,active?Color{.16f,.30f,.33f}:panel,pw,ph);
        char label[32]; std::snprintf(label,sizeof(label),"%d %s",i+1,viewName(static_cast<View>(i)));
        text(scene.hud,label,x+12*ui,132*ui,1.6f*ui,active?leftColor:muted,pw,ph);
    }
    const float footer=static_cast<float>(ph)-91*ui;
    rect(scene.hud,0,footer,static_cast<float>(pw),91*ui,panel,pw,ph);
    text(scene.hud,"ARROWS MOVE   W WALK   SPACE PAUSE   Q E ORBIT   V SIDE   R RESET",28*ui,footer+20*ui,1.65f*ui,white,pw,ph);
    char status[160];
    std::snprintf(status,sizeof(status),"21 JOINTS  /  %s  /  %s  /  PITCH %.0f  /  YAW %.0f  /  SCROLL ZOOM",
        state.paused?"PAUSED":"PLAYING",state.walkAmount>.01f?"WALK":"REST",state.pitch,state.yaw);
    text(scene.hud,status,28*ui,footer+51*ui,1.5f*ui,muted,pw,ph);
    text(scene.hud,"LEFT",28*ui,177*ui,1.5f*ui,leftColor,pw,ph);
    text(scene.hud,"RIGHT",28*ui,199*ui,1.5f*ui,rightColor,pw,ph);
    text(scene.hud,"SPINE",28*ui,221*ui,1.5f*ui,spineColor,pw,ph);
    return scene;
}
} // namespace dh
