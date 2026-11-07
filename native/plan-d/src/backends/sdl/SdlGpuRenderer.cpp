#include "SdlGpuRenderer.hpp"
#include <cstddef>
#include <cstring>
#include <memory>
#include <stdexcept>
#include <string>

namespace dh {
namespace {
void require(bool success, const char* operation) {
    if (!success) throw std::runtime_error(std::string(operation) + ": " + SDL_GetError());
}
// Present acquired swapchain images even if an error interrupts frame setup.
struct PendingCommand {
    SDL_GPUCommandBuffer* command;
    ~PendingCommand() { if(command) SDL_SubmitGPUCommandBuffer(command); }
};
}

SdlGpuRenderer::SdlGpuRenderer() = default;
SdlGpuRenderer::~SdlGpuRenderer() { shutdown(); }

void SdlGpuRenderer::initialize(SDL_Window* window) {
    window_ = window;
    device_ = SDL_CreateGPUDevice(config_.shaderFormat, true, config_.driver);
    require(device_ != nullptr,"Create GPU device");
    require(SDL_ClaimWindowForGPUDevice(device_,window_),"Claim native window");
    require(SDL_SetGPUSwapchainParameters(device_,window_,SDL_GPU_SWAPCHAINCOMPOSITION_SDR,SDL_GPU_PRESENTMODE_VSYNC),"Set swapchain");
    depthFormat_ = SDL_GPU_TEXTUREFORMAT_D32_FLOAT;
    require(SDL_GPUTextureSupportsFormat(device_,depthFormat_,SDL_GPU_TEXTURETYPE_2D,SDL_GPU_TEXTUREUSAGE_DEPTH_STENCIL_TARGET),"D32 depth support");
    SDL_GPUBufferCreateInfo vertexInfo{};
    vertexInfo.usage=SDL_GPU_BUFFERUSAGE_VERTEX; vertexInfo.size=vertexCapacity;
    vertices_=SDL_CreateGPUBuffer(device_,&vertexInfo);
    require(vertices_ != nullptr,"Create vertex buffer");
    SDL_GPUBufferCreateInfo indexInfo{};
    indexInfo.usage=SDL_GPU_BUFFERUSAGE_INDEX; indexInfo.size=indexCapacity;
    indices_=SDL_CreateGPUBuffer(device_,&indexInfo);
    require(indices_ != nullptr,"Create index buffer");
    SDL_GPUTransferBufferCreateInfo uploadInfo{};
    uploadInfo.usage=SDL_GPU_TRANSFERBUFFERUSAGE_UPLOAD; uploadInfo.size=vertexCapacity+indexCapacity;
    upload_=SDL_CreateGPUTransferBuffer(device_,&uploadInfo);
    require(upload_ != nullptr,"Create upload buffer");
    SDL_GPUShader* vertex=loadShader(true);
    SDL_GPUShader* fragment=nullptr;
    try {
        fragment=loadShader(false);
        lit_=makePipeline(vertex,fragment,true);
        overlay_=makePipeline(vertex,fragment,false);
    } catch(...) {
        if(fragment) SDL_ReleaseGPUShader(device_,fragment);
        SDL_ReleaseGPUShader(device_,vertex);
        throw;
    }
    SDL_ReleaseGPUShader(device_,fragment);
    SDL_ReleaseGPUShader(device_,vertex);
    SDL_Log("Dear Human Plan D | SDL %d.%d.%d | GPU %s",
        SDL_VERSIONNUM_MAJOR(SDL_GetVersion()),SDL_VERSIONNUM_MINOR(SDL_GetVersion()),SDL_VERSIONNUM_MICRO(SDL_GetVersion()),backend());
}
SDL_GPUShader* SdlGpuRenderer::loadShader(bool vertex) {
    const char* base=SDL_GetBasePath();
    require(base != nullptr,"Find executable directory");
    const auto folder=std::filesystem::path(base)/"shaders";
    const auto path=folder/(vertex?config_.vertexFile:config_.fragmentFile);
    size_t size=0;
    std::unique_ptr<void,decltype(&SDL_free)> bytes(SDL_LoadFile(path.string().c_str(),&size),SDL_free);
    require(bytes != nullptr,"Read shader file");
    SDL_GPUShaderCreateInfo info{};
    info.code=static_cast<const Uint8*>(bytes.get()); info.code_size=size;
    info.entrypoint=vertex?"vertex_main":"fragment_main";
    info.format=config_.shaderFormat; info.stage=vertex?SDL_GPU_SHADERSTAGE_VERTEX:SDL_GPU_SHADERSTAGE_FRAGMENT;
    info.num_uniform_buffers=1;
    auto* shader=SDL_CreateGPUShader(device_,&info);
    require(shader != nullptr,vertex?"Compile vertex shader":"Compile fragment shader");
    return shader;
}
SDL_GPUGraphicsPipeline* SdlGpuRenderer::makePipeline(SDL_GPUShader* vertex,SDL_GPUShader* fragment,bool depth) {
    SDL_GPUVertexBufferDescription buffer{};
    buffer.slot=0; buffer.pitch=sizeof(Vertex); buffer.input_rate=SDL_GPU_VERTEXINPUTRATE_VERTEX;
    const SDL_GPUVertexAttribute attributes[]{
        {0,0,SDL_GPU_VERTEXELEMENTFORMAT_FLOAT3,static_cast<Uint32>(offsetof(Vertex,position))},
        {1,0,SDL_GPU_VERTEXELEMENTFORMAT_FLOAT3,static_cast<Uint32>(offsetof(Vertex,normal))},
        {2,0,SDL_GPU_VERTEXELEMENTFORMAT_FLOAT4,static_cast<Uint32>(offsetof(Vertex,color))},
        {3,0,SDL_GPU_VERTEXELEMENTFORMAT_FLOAT3,static_cast<Uint32>(offsetof(Vertex,material))}
    };
    SDL_GPUColorTargetDescription target{};
    target.format=SDL_GPU_TEXTUREFORMAT_R8G8B8A8_UNORM;
    SDL_GPUGraphicsPipelineCreateInfo info{};
    info.vertex_shader=vertex; info.fragment_shader=fragment;
    info.vertex_input_state={&buffer,1,attributes,4};
    info.primitive_type=SDL_GPU_PRIMITIVETYPE_TRIANGLELIST;
    info.rasterizer_state.fill_mode=SDL_GPU_FILLMODE_FILL;
    info.rasterizer_state.cull_mode=SDL_GPU_CULLMODE_NONE;
    info.rasterizer_state.front_face=SDL_GPU_FRONTFACE_COUNTER_CLOCKWISE;
    info.multisample_state.sample_count=SDL_GPU_SAMPLECOUNT_1;
    info.depth_stencil_state.compare_op=SDL_GPU_COMPAREOP_LESS_OR_EQUAL;
    info.depth_stencil_state.enable_depth_test=depth;
    info.depth_stencil_state.enable_depth_write=depth;
    info.target_info.color_target_descriptions=&target; info.target_info.num_color_targets=1;
    info.target_info.has_depth_stencil_target=true; info.target_info.depth_stencil_format=depthFormat_;
    auto* pipeline=SDL_CreateGPUGraphicsPipeline(device_,&info);
    require(pipeline != nullptr,"Create graphics pipeline");
    return pipeline;
}
void SdlGpuRenderer::resize(Uint32 width,Uint32 height) {
    if(width_==width && height_==height && color_ && depth_) return;
    if(color_) { SDL_ReleaseGPUTexture(device_,color_); color_=nullptr; }
    if(depth_) { SDL_ReleaseGPUTexture(device_,depth_); depth_=nullptr; }
    SDL_GPUTextureCreateInfo info{};
    info.type=SDL_GPU_TEXTURETYPE_2D; info.width=width; info.height=height;
    info.layer_count_or_depth=1; info.num_levels=1; info.sample_count=SDL_GPU_SAMPLECOUNT_1;
    info.format=SDL_GPU_TEXTUREFORMAT_R8G8B8A8_UNORM;
    info.usage=SDL_GPU_TEXTUREUSAGE_COLOR_TARGET|SDL_GPU_TEXTUREUSAGE_SAMPLER;
    color_=SDL_CreateGPUTexture(device_,&info);
    require(color_ != nullptr,"Create color target");
    info.format=depthFormat_; info.usage=SDL_GPU_TEXTUREUSAGE_DEPTH_STENCIL_TARGET;
    depth_=SDL_CreateGPUTexture(device_,&info);
    require(depth_ != nullptr,"Create depth target");
    width_=width; height_=height;
}
bool SdlGpuRenderer::draw(const RenderFrame& frame,const std::filesystem::path& capture) {
    const auto& scene=frame.scene;
    const auto& camera=frame.camera;
    MeshData combined;
    const auto append=[&combined](const MeshData& mesh) {
        const auto vertexBase=static_cast<Uint32>(combined.vertices.size());
        combined.vertices.insert(combined.vertices.end(),mesh.vertices.begin(),mesh.vertices.end());
        for(const auto index:mesh.indices) combined.indices.push_back(vertexBase+index);
    };
    append(scene.world); append(scene.bones); append(scene.hud);
    const auto vertexBytes=static_cast<Uint32>(combined.vertices.size()*sizeof(Vertex));
    const auto indexBytes=static_cast<Uint32>(combined.indices.size()*sizeof(Uint32));
    if(vertexBytes>vertexCapacity || indexBytes>indexCapacity)
        throw std::runtime_error("Scene exceeds the preparation_001 geometry budget");

    PendingCommand pending{SDL_AcquireGPUCommandBuffer(device_)};
    require(pending.command != nullptr,"Acquire GPU command buffer");
    SDL_GPUTexture* swapchain=nullptr;
    Uint32 w=0,h=0;
    require(SDL_WaitAndAcquireGPUSwapchainTexture(pending.command,window_,&swapchain,&w,&h),"Acquire swapchain");
    if(!swapchain) return false;
    resize(w,h);
    auto* mapped=static_cast<Uint8*>(SDL_MapGPUTransferBuffer(device_,upload_,true));
    require(mapped != nullptr,"Map mesh upload");
    std::memcpy(mapped,combined.vertices.data(),vertexBytes);
    std::memcpy(mapped+vertexCapacity,combined.indices.data(),indexBytes);
    SDL_UnmapGPUTransferBuffer(device_,upload_);
    SDL_GPUCopyPass* copy=SDL_BeginGPUCopyPass(pending.command);
    require(copy != nullptr,"Begin mesh copy");
    const SDL_GPUTransferBufferLocation vertexSource{upload_,0}, indexSource{upload_,vertexCapacity};
    const SDL_GPUBufferRegion vertexDestination{vertices_,0,vertexBytes}, indexDestination{indices_,0,indexBytes};
    SDL_UploadToGPUBuffer(copy,&vertexSource,&vertexDestination,true);
    SDL_UploadToGPUBuffer(copy,&indexSource,&indexDestination,true);
    SDL_EndGPUCopyPass(copy);

    SDL_GPUColorTargetInfo colorTarget{};
    colorTarget.texture=color_; colorTarget.clear_color={.075f,.105f,.14f,1};
    colorTarget.load_op=SDL_GPU_LOADOP_CLEAR; colorTarget.store_op=SDL_GPU_STOREOP_STORE; colorTarget.cycle=true;
    SDL_GPUDepthStencilTargetInfo depthTarget{};
    depthTarget.texture=depth_; depthTarget.clear_depth=1;
    depthTarget.load_op=SDL_GPU_LOADOP_CLEAR; depthTarget.store_op=SDL_GPU_STOREOP_DONT_CARE;
    depthTarget.stencil_load_op=SDL_GPU_LOADOP_DONT_CARE; depthTarget.stencil_store_op=SDL_GPU_STOREOP_DONT_CARE;
    depthTarget.cycle=true;
    SDL_GPURenderPass* pass=SDL_BeginGPURenderPass(pending.command,&colorTarget,1,&depthTarget);
    require(pass != nullptr,"Begin 3D render pass");
    const SDL_GPUBufferBinding vertexBinding{vertices_,0}, indexBinding{indices_,0};
    SDL_BindGPUVertexBuffers(pass,0,&vertexBinding,1);
    SDL_BindGPUIndexBuffer(pass,&indexBinding,SDL_GPU_INDEXELEMENTSIZE_32BIT);
    SDL_BindGPUGraphicsPipeline(pass,lit_);
    const float lighting[]{.50f,.80f,.55f,0,frame.eye.x,frame.eye.y,frame.eye.z,0};
    SDL_PushGPUVertexUniformData(pending.command,0,camera.m.data(),sizeof(camera.m));
    SDL_PushGPUFragmentUniformData(pending.command,0,lighting,sizeof(lighting));
    const auto worldCount=static_cast<Uint32>(scene.world.indices.size());
    const auto boneCount=static_cast<Uint32>(scene.bones.indices.size());
    const auto hudCount=static_cast<Uint32>(scene.hud.indices.size());
    SDL_DrawGPUIndexedPrimitives(pass,worldCount,1,0,0,0);
    SDL_BindGPUGraphicsPipeline(pass,overlay_);
    const float unlit[]{0,1,0,1,frame.eye.x,frame.eye.y,frame.eye.z,0};
    SDL_PushGPUFragmentUniformData(pending.command,0,unlit,sizeof(unlit));
    if(boneCount) SDL_DrawGPUIndexedPrimitives(pass,boneCount,1,worldCount,0,0);
    const Mat4 identity=Mat4::identity();
    SDL_PushGPUVertexUniformData(pending.command,0,identity.m.data(),sizeof(identity.m));
    SDL_DrawGPUIndexedPrimitives(pass,hudCount,1,worldCount+boneCount,0,0);
    SDL_EndGPURenderPass(pass);

    SDL_GPUBlitInfo blit{};
    blit.source.texture=color_; blit.source.w=w; blit.source.h=h;
    blit.destination.texture=swapchain; blit.destination.w=w; blit.destination.h=h;
    blit.load_op=SDL_GPU_LOADOP_DONT_CARE; blit.filter=SDL_GPU_FILTER_NEAREST;
    SDL_BlitGPUTexture(pending.command,&blit);
    if(capture.empty()) {
        auto* command=pending.command; pending.command=nullptr;
        require(SDL_SubmitGPUCommandBuffer(command),"Present native frame");
        return true;
    }

    // Read our color target, never the write-only swapchain. Both the window
    // and this PNG come from the same GPU-rendered image, including the HUD.
    const Uint32 rowPixels=(w+63u)&~63u;
    SDL_GPUTransferBufferCreateInfo downloadInfo{};
    downloadInfo.usage=SDL_GPU_TRANSFERBUFFERUSAGE_DOWNLOAD; downloadInfo.size=rowPixels*h*4;
    const auto releaseDownload=[this](SDL_GPUTransferBuffer* p) { if(p) SDL_ReleaseGPUTransferBuffer(device_,p); };
    std::unique_ptr<SDL_GPUTransferBuffer,decltype(releaseDownload)> download(SDL_CreateGPUTransferBuffer(device_,&downloadInfo),releaseDownload);
    require(download != nullptr,"Create capture readback");
    copy=SDL_BeginGPUCopyPass(pending.command);
    require(copy != nullptr,"Begin capture copy");
    SDL_GPUTextureRegion source{};
    source.texture=color_; source.w=w; source.h=h; source.d=1;
    const SDL_GPUTextureTransferInfo destination{download.get(),0,rowPixels,h};
    SDL_DownloadFromGPUTexture(copy,&source,&destination);
    SDL_EndGPUCopyPass(copy);
    auto* command=pending.command; pending.command=nullptr;
    SDL_GPUFence* fence=SDL_SubmitGPUCommandBufferAndAcquireFence(command);
    require(fence != nullptr,"Submit capture");
    const bool completed=SDL_WaitForGPUFences(device_,true,&fence,1);
    SDL_ReleaseGPUFence(device_,fence);
    require(completed,"Wait for capture");
    void* pixels=SDL_MapGPUTransferBuffer(device_,download.get(),false);
    require(pixels != nullptr,"Read captured pixels");
    SDL_Surface* surface=SDL_CreateSurfaceFrom(static_cast<int>(w),static_cast<int>(h),SDL_PIXELFORMAT_RGBA32,pixels,static_cast<int>(rowPixels*4));
    bool saved=false;
    if(surface) {
        if(!capture.parent_path().empty()) std::filesystem::create_directories(capture.parent_path());
        saved=SDL_SavePNG(surface,capture.string().c_str());
        SDL_DestroySurface(surface);
    }
    SDL_UnmapGPUTransferBuffer(device_,download.get());
    require(saved,"Save rendered PNG");
    SDL_Log("GPU capture: %s (%u x %u)",capture.string().c_str(),w,h);
    return true;
}
const char* SdlGpuRenderer::backend() const { return device_?SDL_GetGPUDeviceDriver(device_):"uninitialized"; }
void SdlGpuRenderer::shutdown() {
    if(!device_) return;
    SDL_WaitForGPUIdle(device_);
    if(overlay_) SDL_ReleaseGPUGraphicsPipeline(device_,overlay_);
    if(lit_) SDL_ReleaseGPUGraphicsPipeline(device_,lit_);
    if(color_) SDL_ReleaseGPUTexture(device_,color_);
    if(depth_) SDL_ReleaseGPUTexture(device_,depth_);
    if(upload_) SDL_ReleaseGPUTransferBuffer(device_,upload_);
    if(indices_) SDL_ReleaseGPUBuffer(device_,indices_);
    if(vertices_) SDL_ReleaseGPUBuffer(device_,vertices_);
    if(window_) SDL_ReleaseWindowFromGPUDevice(device_,window_);
    SDL_DestroyGPUDevice(device_);
    device_=nullptr; overlay_=nullptr; lit_=nullptr; color_=nullptr; depth_=nullptr;
    upload_=nullptr; indices_=nullptr; vertices_=nullptr; window_=nullptr;
}
} // namespace dh
