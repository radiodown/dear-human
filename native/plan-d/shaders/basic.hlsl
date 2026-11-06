cbuffer Camera : register(b0, space1) { column_major float4x4 view_projection; };
cbuffer Lighting : register(b0, space3) { float4 direction_and_unlit; };
struct VertexInput {
    float3 position : TEXCOORD0;
    float3 normal : TEXCOORD1;
    float4 color : TEXCOORD2;
};
struct VertexOutput {
    float4 position : SV_Position;
    float3 normal : TEXCOORD0;
    float4 color : TEXCOORD1;
};
VertexOutput vertex_main(VertexInput input) {
    VertexOutput output;
    output.position = mul(view_projection, float4(input.position, 1.0));
    output.normal = input.normal;
    output.color = input.color;
    return output;
}
float4 fragment_main(VertexOutput input) : SV_Target0 {
    float diffuse = max(dot(normalize(input.normal), normalize(direction_and_unlit.xyz)), 0.0);
    float intensity = lerp(0.38 + 0.62 * diffuse, 1.0, direction_and_unlit.w);
    float3 linear_color = pow(max(input.color.rgb, 0.0), 2.2);
    return float4(pow(linear_color * intensity, 1.0 / 2.2), input.color.a);
}
