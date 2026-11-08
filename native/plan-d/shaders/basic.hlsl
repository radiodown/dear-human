// Hair branch: original implementation informed by Scheuermann (SIGGRAPH 2004).
// See docs/plan-d-hair-004.md and hair_004/research/decision.md. Not full Marschner/TressFX.
Texture2D<float4> atlas : register(t0,space2);
SamplerState hairSampler : register(s0,space2);
Texture2D<float4> hairOne : register(t1,space2);
SamplerState sampleOne : register(s1,space2);
Texture2D<float4> hairTwo : register(t2,space2);
SamplerState sampleTwo : register(s2,space2);
cbuffer Camera : register(b0,space1) { column_major float4x4 view_projection; };
cbuffer Lighting : register(b0,space3) { float4 direction_and_unlit; float4 eye; };
struct VertexInput {
    float3 position : TEXCOORD0;
    float3 normal : TEXCOORD1;
    float4 color : TEXCOORD2;
    float3 material : TEXCOORD3;
    float3 flow : TEXCOORD4;
    float2 uv : TEXCOORD5;
};
struct VertexOutput {
    float4 position : SV_Position;
    float3 world : TEXCOORD0;
    float3 normal : TEXCOORD1;
    float4 color : TEXCOORD2;
    float3 material : TEXCOORD3;
    float3 flow : TEXCOORD4;
    float2 uv : TEXCOORD5;
};
VertexOutput vertex_main(VertexInput input) {
    VertexOutput output;
    output.position=mul(view_projection,float4(input.position,1.0));
    output.world=input.position; output.normal=input.normal;
    output.color=input.color; output.material=input.material; output.flow=input.flow; output.uv=input.uv;
    return output;
}
float4 fragment_main(VertexOutput input) : SV_Target0 {
    if(direction_and_unlit.w>.5) return input.color;
    float4 fibre=float4(1,1,1,1);
    if(input.material.z>1.5) {
        if(input.material.z>3.5) fibre=hairTwo.Sample(sampleTwo,input.uv);
        else if(input.material.z>2.5) fibre=hairOne.Sample(sampleOne,input.uv);
        else fibre=atlas.Sample(hairSampler,input.uv);
        if(fibre.a<.005) { discard; }
    }
    float3 n=normalize(input.normal),v=normalize(eye.xyz-input.world);
    float3 l=normalize(direction_and_unlit.xyz),h=normalize(v+l);
    float metal=clamp(input.material.x,0.0,1.0),rough=clamp(input.material.y,.12,1.0);
    float3 base=pow(max(input.color.rgb*fibre.rgb,0.0),2.2);
    float diffuse=max(dot(n,l),0.0);
    float fill=max(dot(n,normalize(float3(-.6,.25,-.7))),0.0);
    float ambient=.30+.12*max(n.y,0.0);
    float3 f0=lerp(float3(.035,.035,.035),base,metal);
    float spec=pow(max(dot(n,h),0.0),lerp(140.0,8.0,rough*rough))*(1.0-.65*rough);
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
        return float4(pow(max(hair,0.0),1.0/2.2),input.color.a*fibre.a);
    }
    float3 color=base*(ambient+.64*diffuse+.23*fill)+f0*spec*2.0+float3(.55,.68,.82)*rim;
    return float4(pow(max(color,0.0),1.0/2.2),input.color.a*fibre.a);
}
