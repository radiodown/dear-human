#include <metal_stdlib>
using namespace metal;
struct VertexInput {
    float3 position [[attribute(0)]];
    float3 normal [[attribute(1)]];
    float4 color [[attribute(2)]];
    float3 material [[attribute(3)]];
};
struct Camera { float4x4 view_projection; };
struct Lighting { float4 direction_and_unlit; float4 eye; };
struct VertexOutput {
    float4 position [[position]];
    float3 world;
    float3 normal;
    float4 color;
    float3 material;
};
vertex VertexOutput vertex_main(VertexInput input [[stage_in]], constant Camera& camera [[buffer(0)]]) {
    VertexOutput output;
    output.position=camera.view_projection*float4(input.position,1.0);
    output.world=input.position; output.normal=input.normal;
    output.color=input.color; output.material=input.material;
    return output;
}
fragment float4 fragment_main(VertexOutput input [[stage_in]], constant Lighting& light [[buffer(0)]]) {
    if(light.direction_and_unlit.w>.5) return input.color;
    float3 n=normalize(input.normal),v=normalize(light.eye.xyz-input.world);
    float3 l=normalize(light.direction_and_unlit.xyz),h=normalize(v+l);
    float metal=clamp(input.material.x,0.0,1.0),rough=clamp(input.material.y,.12,1.0);
    float3 base=pow(max(input.color.rgb,float3(0)),float3(2.2));
    float diffuse=max(dot(n,l),0.0);
    float fill=max(dot(n,normalize(float3(-.6,.25,-.7))),0.0);
    float ambient=.30+.12*max(n.y,0.0);
    float3 f0=mix(float3(.035),base,metal);
    float spec=pow(max(dot(n,h),0.0),mix(140.0,8.0,rough*rough))*(1.0-.65*rough);
    float rim=pow(1.0-max(dot(n,v),0.0),3.0)*(.006+.018*metal);
    float3 color=base*(ambient+.64*diffuse+.23*fill)+f0*spec*2.0+float3(.55,.68,.82)*rim;
    return float4(pow(max(color,float3(0)),float3(1.0/2.2)),input.color.a);
}
