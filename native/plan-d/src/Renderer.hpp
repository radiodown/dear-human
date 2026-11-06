#pragma once

#include "Scene.hpp"
#include <SDL3/SDL.h>
#include <filesystem>

namespace dh {
class Renderer {
public:
    Renderer();
    ~Renderer();
    Renderer(const Renderer&) = delete;
    Renderer& operator=(const Renderer&) = delete;
    void initialize(SDL_Window* window);
    bool draw(const SceneGeometry& scene, const Mat4& camera, const std::filesystem::path& capture = {});
    void shutdown();
    const char* backend() const;
private:
    static constexpr Uint32 vertexCapacity = 4 * 1024 * 1024;
    static constexpr Uint32 indexCapacity = 1024 * 1024;
    SDL_Window* window_{};
    SDL_GPUDevice* device_{};
    SDL_GPUGraphicsPipeline *lit_{}, *overlay_{};
    SDL_GPUBuffer *vertices_{}, *indices_{};
    SDL_GPUTransferBuffer* upload_{};
    SDL_GPUTexture *color_{}, *depth_{};
    Uint32 width_{}, height_{};
    SDL_GPUTextureFormat depthFormat_{};
    void resize(Uint32 width, Uint32 height);
    SDL_GPUShader* loadShader(bool vertex);
    SDL_GPUGraphicsPipeline* makePipeline(SDL_GPUShader* vertex, SDL_GPUShader* fragment, bool depth);
};
} // namespace dh
