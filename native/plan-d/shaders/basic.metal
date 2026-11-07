// Hair branch: original implementation informed by Scheuermann (SIGGRAPH 2004).
// See docs/plan-d-hair-004.md and hair_004/research/decision.md. Not full Marschner/TressFX.
#include <metal_stdlib>
using namespace metal;
struct VertexInput {
    float3 position [[attribute(0)]];
    float3 normal [[attribute(1)]];
    float4 color [[attribute(2)]];
    float3 material [[attribute(3)]];
    float3 flow [[attribute(4)]];
    float2 uv [[attribute(5)]];
};
struct Camera { float4x4 view_projection; };
struct Lighting { float4 direction_and_unlit; float4 eye; };
struct VertexOutput {
    float4 position [[position]];
    float3 world;
    float3 normal;
    float4 color;
    float3 material;
    float3 flow;
    float2 uv;
};
vertex VertexOutput vertex_main(VertexInput input [[stage_in]], constant Camera& camera [[buffer(0)]]) {
    VertexOutput output;
    output.position=camera.view_projection*float4(input.position,1.0);
    output.world=input.position; output.normal=input.normal;
    output.color=input.color; output.material=input.material; output.flow=input.flow; output.uv=input.uv;
    return output;
}
fragment float4 fragment_main(VertexOutput input [[stage_in]], constant Lighting& light [[buffer(0)]],
    texture2d<float> atlas [[texture(0)]], sampler hairSampler [[sampler(0)]],
    texture2d<float> hairOne [[texture(1)]], sampler sampleOne [[sampler(1)]],
    texture2d<float> hairTwo [[texture(2)]], sampler sampleTwo [[sampler(2)]]) {
    if(light.direction_and_unlit.w>.5) return input.color;
    float4 fibre=float4(1,1,1,1);
    if(input.material.z>1.5) {
        if(input.material.z>3.5) fibre=hairTwo.sample(sampleTwo,input.uv);
        else if(input.material.z>2.5) fibre=hairOne.sample(sampleOne,input.uv);
        else fibre=atlas.sample(hairSampler,input.uv);
        if(fibre.a<.005) { discard_fragment(); }
    }
    float3 n=normalize(input.normal),v=normalize(light.eye.xyz-input.world);
    float3 l=normalize(light.direction_and_unlit.xyz),h=normalize(v+l);
    float metal=clamp(input.material.x,0.0,1.0),rough=clamp(input.material.y,.12,1.0);
    float3 base=pow(max(input.color.rgb*fibre.rgb,float3(0)),float3(2.2));
    float diffuse=max(dot(n,l),0.0);
    float fill=max(dot(n,normalize(float3(-.6,.25,-.7))),0.0);
    float ambient=.30+.12*max(n.y,0.0);
    float3 f0=mix(float3(.035),base,metal);
    float spec=pow(max(dot(n,h),0.0),mix(140.0,8.0,rough*rough))*(1.0-.65*rough);
    float rim=pow(1.0-max(dot(n,v),0.0),3.0)*(.006+.018*metal);
    if(input.material.z>.5 && input.material.z<4.5) {
        // Kajiya-Kay style longitudinal sheen. Flow is skinned alongside normals.
        float3 t=normalize(input.flow);
        float strandAA=1.0-clamp(fwidth(input.material.x)*1.5,0.0,1.0);
        float strand=input.material.z>1.5 ? (.60+.40*fibre.r) : (.82+.18*sin(input.material.x*6.2831853)*strandAA);
        float primary=pow(sqrt(max(0.0,1.0-pow(dot(normalize(t+n*.13),h),2.0))),72.0);
        float secondary=pow(sqrt(max(0.0,1.0-pow(dot(normalize(t-n*.22),h),2.0))),20.0);
        float visible=.18+.82*max(dot(n,l),0.0);
        float3 backHalf=normalize(v+normalize(float3(-.6,.25,-.7)));
        float backSheen=pow(sqrt(max(0.0,1.0-pow(dot(normalize(t+n*.13),backHalf),2.0))),52.0);
        float3 hair=base*(.45+.45*diffuse+.25*fill)*strand
            +float3(.022,.023,.026)*primary*visible*strand
            +float3(.004,.004,.005)*secondary*visible
            +float3(.012,.013,.015)*backSheen*(.10+.90*fill)*strand;
        return float4(pow(max(hair,float3(0)),float3(1.0/2.2)),input.color.a*fibre.a);
    }
    float3 color=base*(ambient+.64*diffuse+.23*fill)+f0*spec*2.0+float3(.55,.68,.82)*rim;
    return float4(pow(max(color,float3(0)),float3(1.0/2.2)),input.color.a*fibre.a);
}
