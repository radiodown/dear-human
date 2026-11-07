cbuffer Camera : register(b0,space1) { column_major float4x4 view_projection; };
cbuffer Lighting : register(b0,space3) { float4 direction_and_unlit; float4 eye; };
struct VertexInput {
    float3 position : TEXCOORD0;
    float3 normal : TEXCOORD1;
    float4 color : TEXCOORD2;
    float3 material : TEXCOORD3;
};
struct VertexOutput {
    float4 position : SV_Position;
    float3 world : TEXCOORD0;
    float3 normal : TEXCOORD1;
    float4 color : TEXCOORD2;
    float3 material : TEXCOORD3;
};
VertexOutput vertex_main(VertexInput input) {
    VertexOutput output;
    output.position=mul(view_projection,float4(input.position,1.0));
    output.world=input.position; output.normal=input.normal;
    output.color=input.color; output.material=input.material;
    return output;
}
float4 fragment_main(VertexOutput input) : SV_Target0 {
    if(direction_and_unlit.w>.5) return input.color;
    float3 n=normalize(input.normal),v=normalize(eye.xyz-input.world);
    float3 l=normalize(direction_and_unlit.xyz),h=normalize(v+l);
    float metal=clamp(input.material.x,0.0,1.0),rough=clamp(input.material.y,.12,1.0);
    float3 base=pow(max(input.color.rgb,0.0),2.2);
    float diffuse=max(dot(n,l),0.0);
    float fill=max(dot(n,normalize(float3(-.6,.25,-.7))),0.0);
    float ambient=.30+.12*max(n.y,0.0);
    float3 f0=lerp(float3(.035,.035,.035),base,metal);
    float spec=pow(max(dot(n,h),0.0),lerp(140.0,8.0,rough*rough))*(1.0-.65*rough);
    float rim=pow(1.0-max(dot(n,v),0.0),3.0)*(.006+.018*metal);
    float3 color=base*(ambient+.64*diffuse+.23*fill)+f0*spec*2.0+float3(.55,.68,.82)*rim;
    return float4(pow(max(color,0.0),1.0/2.2),input.color.a);
}
