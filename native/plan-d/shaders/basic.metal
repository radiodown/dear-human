#include <metal_stdlib>
using namespace metal;

struct VertexInput {
    float3 position [[attribute(0)]];
    float3 normal [[attribute(1)]];
    float4 color [[attribute(2)]];
};
struct Camera { float4x4 view_projection; };
struct Lighting { float4 direction_and_unlit; };
struct VertexOutput {
    float4 position [[position]];
    float3 normal;
    float4 color;
};
vertex VertexOutput vertex_main(VertexInput input [[stage_in]], constant Camera& camera [[buffer(0)]]) {
    VertexOutput output;
    output.position = camera.view_projection * float4(input.position, 1.0);
    output.normal = input.normal;
    output.color = input.color;
    return output;
}
fragment float4 fragment_main(VertexOutput input [[stage_in]], constant Lighting& light [[buffer(0)]]) {
    float diffuse = max(dot(normalize(input.normal), normalize(light.direction_and_unlit.xyz)), 0.0);
    float intensity = mix(0.38 + 0.62 * diffuse, 1.0, light.direction_and_unlit.w);
    // Source palette is expressed as display RGB. Light in linear space, then
    // encode to display RGB in an ordinary RGBA8 target for both PNG and SDR.
    float3 linear_color = pow(max(input.color.rgb, float3(0.0)), float3(2.2));
    return float4(pow(linear_color * intensity, float3(1.0 / 2.2)), input.color.a);
}
