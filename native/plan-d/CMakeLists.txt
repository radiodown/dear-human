cmake_minimum_required(VERSION 3.24)
project(DearHumanPlanD VERSION 0.6.0 LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

option(PLAN_D_BUILD_VIEWER "Build the native SDL viewer" ON)
option(PLAN_D_BUILD_MOVEMENT_CHECK "Build the small shared-movement check" OFF)
option(PLAN_D_BUILD_SAMPLE_CHECK "Build the focused asset/sway/contact check" OFF)

# This target has no SDL includes, library links or platform definitions.
add_library(plan-d-core STATIC src/Simulation.cpp src/Skeleton.cpp src/Scene.cpp src/CloneModel.cpp src/HairModel.cpp src/HeadModel.cpp src/ModelExport.cpp src/SampleAssets.cpp src/HairDynamics.cpp src/SampleWorld.cpp)
target_include_directories(plan-d-core PUBLIC src)
if(MSVC)
    target_compile_options(plan-d-core PRIVATE /W4 /permissive- /utf-8)
else()
    target_compile_options(plan-d-core PRIVATE -Wall -Wextra -Wpedantic)
endif()
if(PLAN_D_BUILD_MOVEMENT_CHECK)
    add_executable(plan-d-movement-check tests/movement.cpp)
    target_link_libraries(plan-d-movement-check PRIVATE plan-d-core)
    set_target_properties(plan-d-movement-check PROPERTIES RUNTIME_OUTPUT_DIRECTORY "${CMAKE_BINARY_DIR}/bin")
endif()
if(PLAN_D_BUILD_SAMPLE_CHECK)
    add_executable(plan-d-sample-check tests/samples.cpp)
    target_link_libraries(plan-d-sample-check PRIVATE plan-d-core)
    set_target_properties(plan-d-sample-check PROPERTIES RUNTIME_OUTPUT_DIRECTORY "${CMAKE_BINARY_DIR}/bin")
endif()
if(NOT PLAN_D_BUILD_VIEWER)
    return()
endif()

# Use the same SDL release on both platforms; never silently select a newer API.
find_package(SDL3 3.4.20 EXACT CONFIG QUIET)
if(NOT SDL3_FOUND)
    include(FetchContent)
    set(SDL_SHARED OFF CACHE BOOL "" FORCE)
    set(SDL_STATIC ON CACHE BOOL "" FORCE)
    set(SDL_TEST_LIBRARY OFF CACHE BOOL "" FORCE)
    set(SDL_TESTS OFF CACHE BOOL "" FORCE)
    set(SDL_EXAMPLES OFF CACHE BOOL "" FORCE)
    FetchContent_Declare(SDL3
        URL https://github.com/libsdl-org/SDL/releases/download/release-3.4.20/SDL3-3.4.20.tar.gz
        DOWNLOAD_EXTRACT_TIMESTAMP TRUE)
    FetchContent_MakeAvailable(SDL3)
endif()

if(APPLE)
    set(platform_profile src/backends/metal/GpuBackendConfig.cpp)
elseif(WIN32)
    set(platform_profile src/backends/d3d12/GpuBackendConfig.cpp)
else()
    message(FATAL_ERROR "The viewer targets macOS/Metal and Windows/D3D12. The core can be built independently.")
endif()

add_library(plan-d-sdl STATIC
    src/backends/sdl/Backend.cpp
    src/backends/sdl/SdlPlatform.cpp
    src/backends/sdl/SdlGpuRenderer.cpp
    ${platform_profile})
target_link_libraries(plan-d-sdl PUBLIC plan-d-core PRIVATE SDL3::SDL3)
add_library(plan-d-app STATIC src/Application.cpp)
target_link_libraries(plan-d-app PUBLIC plan-d-core)
add_executable(dear-human-plan-d src/main.cpp)
target_link_libraries(dear-human-plan-d PRIVATE plan-d-app plan-d-sdl SDL3::SDL3)
foreach(target plan-d-app plan-d-sdl dear-human-plan-d)
    if(MSVC)
        target_compile_options(${target} PRIVATE /W4 /permissive- /utf-8)
    else()
        target_compile_options(${target} PRIVATE -Wall -Wextra -Wpedantic)
    endif()
endforeach()
set(runtime_directory "${CMAKE_BINARY_DIR}/bin")
set_target_properties(dear-human-plan-d PROPERTIES
    RUNTIME_OUTPUT_DIRECTORY "${runtime_directory}")
foreach(config Debug Release RelWithDebInfo MinSizeRel)
    string(TOUPPER "${config}" config_upper)
    set_target_properties(dear-human-plan-d PROPERTIES
        RUNTIME_OUTPUT_DIRECTORY_${config_upper} "${runtime_directory}")
endforeach()

if(APPLE)
    # SDL compiles this small MSL source through Metal at runtime. Full Xcode
    # and its optional offline Metal compiler are not required for this stage.
    set(shader_output "${runtime_directory}/shaders/basic.metal")
    add_custom_command(OUTPUT "${shader_output}"
        COMMAND ${CMAKE_COMMAND} -E make_directory "${runtime_directory}/shaders"
        COMMAND ${CMAKE_COMMAND} -E copy_if_different
            "${CMAKE_CURRENT_SOURCE_DIR}/shaders/basic.metal" "${shader_output}"
        DEPENDS shaders/basic.metal VERBATIM)
    list(APPEND shader_outputs "${shader_output}")
elseif(WIN32)
    # Windows is a prepared build path, not a verified platform in preparation_001.
    find_program(PLAN_D_DXC NAMES dxc REQUIRED)
    foreach(stage vertex fragment)
        if(stage STREQUAL "vertex")
            set(profile vs_6_0)
            set(entry vertex_main)
        else()
            set(profile ps_6_0)
            set(entry fragment_main)
        endif()
        set(shader_output "${runtime_directory}/shaders/${stage}.dxil")
        add_custom_command(OUTPUT "${shader_output}"
            COMMAND ${CMAKE_COMMAND} -E make_directory "${runtime_directory}/shaders"
            COMMAND "${PLAN_D_DXC}" -T "${profile}" -E "${entry}"
                -Fo "${shader_output}" "${CMAKE_CURRENT_SOURCE_DIR}/shaders/basic.hlsl"
            DEPENDS shaders/basic.hlsl VERBATIM)
        list(APPEND shader_outputs "${shader_output}")
    endforeach()
    if(TARGET SDL3::SDL3-shared)
        add_custom_command(TARGET dear-human-plan-d POST_BUILD
            COMMAND ${CMAKE_COMMAND} -E copy_if_different
                "$<TARGET_FILE:SDL3::SDL3-shared>" "$<TARGET_FILE_DIR:dear-human-plan-d>")
    endif()
endif()
add_custom_target(plan-d-shaders DEPENDS ${shader_outputs})
add_dependencies(dear-human-plan-d plan-d-shaders)

# Native and GLB export share this authored atlas; builds only copy it.
set(hair_atlas_output "${runtime_directory}/assets/hair-atlas.png")
add_custom_command(OUTPUT "${hair_atlas_output}"
    COMMAND ${CMAKE_COMMAND} -E make_directory "${runtime_directory}/assets"
    COMMAND ${CMAKE_COMMAND} -E copy_if_different "${CMAKE_CURRENT_SOURCE_DIR}/assets/hair-atlas.png" "${hair_atlas_output}"
    DEPENDS assets/hair-atlas.png VERBATIM)
add_custom_target(plan-d-assets DEPENDS "${hair_atlas_output}")
add_dependencies(dear-human-plan-d plan-d-assets)

# Copy the pinned free sample files and license notices beside the executable.
add_custom_target(plan-d-samples
    COMMAND ${CMAKE_COMMAND} -E copy_directory
        "${CMAKE_CURRENT_SOURCE_DIR}/assets/samples" "${runtime_directory}/assets/samples"
    VERBATIM)
add_dependencies(dear-human-plan-d plan-d-samples)
