#pragma once

#include "Renderer.hpp"
#include "GpuBackendConfig.hpp"

namespace dh {
class SdlGpuRenderer final : public IRenderer {
public:
    SdlGpuRenderer();
    ~SdlGpuRenderer() override;
    SdlGpuRenderer(const SdlGpuRenderer&) = delete;
    SdlGpuRenderer& operator=(const SdlGpuRenderer&) = delete;
    void initialize(SDL_Window* window);
    bool draw(const RenderFrame& frame, const std::filesystem::path& capture = {}) override;
    void shutdown();
    const char* backend() const override;
private:
    GpuBackendConfig config_{gpuBackendConfig()};
    static constexpr Uint32 vertexCapacity = 16 * 1024 * 1024;
    static constexpr Uint32 indexCapacity = 8 * 1024 * 1024;
    SDL_Window* window_{};
    SDL_GPUDevice* device_{};
    SDL_GPUGraphicsPipeline *lit_{}, *overlay_{};
    SDL_GPUBuffer *vertices_{}, *indices_{};
    SDL_GPUTransferBuffer* upload_{};
    SDL_GPUTexture *color_{}, *multisampleColor_{}, *depth_{}, *hairAtlas_{};
    SDL_GPUSampler* hairSampler_{};
    std::array<SDL_GPUTexture*,2> sampleTextures_{};
    SDL_GPUTexture* loadTexture(const std::filesystem::path& path);
    Uint32 width_{}, height_{};
    SDL_GPUTextureFormat depthFormat_{};
    void loadHairAtlas();
    void resize(Uint32 width, Uint32 height);
    SDL_GPUShader* loadShader(bool vertex);
    SDL_GPUGraphicsPipeline* makePipeline(SDL_GPUShader* vertex, SDL_GPUShader* fragment, bool depth);
};
} // namespace dh
