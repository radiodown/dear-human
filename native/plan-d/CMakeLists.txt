cmake_minimum_required(VERSION 3.24)
project(DearHumanPlanD VERSION 0.1.0 LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

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

add_executable(dear-human-plan-d
    src/main.cpp src/Skeleton.cpp src/Scene.cpp src/Renderer.cpp)
target_include_directories(dear-human-plan-d PRIVATE src)
target_link_libraries(dear-human-plan-d PRIVATE SDL3::SDL3)
if(MSVC)
    target_compile_options(dear-human-plan-d PRIVATE /W4 /permissive- /utf-8)
else()
    target_compile_options(dear-human-plan-d PRIVATE -Wall -Wextra -Wpedantic)
endif()
set_target_properties(dear-human-plan-d PROPERTIES
    RUNTIME_OUTPUT_DIRECTORY "${CMAKE_BINARY_DIR}/bin")
foreach(config Debug Release RelWithDebInfo MinSizeRel)
    string(TOUPPER "${config}" config_upper)
    set_target_properties(dear-human-plan-d PROPERTIES
        RUNTIME_OUTPUT_DIRECTORY_${config_upper} "${CMAKE_BINARY_DIR}/bin")
endforeach()

if(APPLE)
    # SDL compiles this small MSL source through Metal at runtime. Full Xcode
    # and its optional offline Metal compiler are not required for this stage.
    configure_file(shaders/basic.metal shaders/basic.metal COPYONLY)
    add_custom_command(TARGET dear-human-plan-d POST_BUILD
        COMMAND ${CMAKE_COMMAND} -E make_directory "$<TARGET_FILE_DIR:dear-human-plan-d>/shaders"
        COMMAND ${CMAKE_COMMAND} -E copy_if_different
            "${CMAKE_BINARY_DIR}/shaders/basic.metal"
            "$<TARGET_FILE_DIR:dear-human-plan-d>/shaders/basic.metal")
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
        set(shader_output "${CMAKE_BINARY_DIR}/shaders/${stage}.dxil")
        add_custom_command(OUTPUT "${shader_output}"
            COMMAND ${CMAKE_COMMAND} -E make_directory "${CMAKE_BINARY_DIR}/shaders"
            COMMAND "${PLAN_D_DXC}" -T "${profile}" -E "${entry}"
                -Fo "${shader_output}" "${CMAKE_CURRENT_SOURCE_DIR}/shaders/basic.hlsl"
            DEPENDS shaders/basic.hlsl VERBATIM)
        list(APPEND shader_outputs "${shader_output}")
    endforeach()
    add_custom_target(plan-d-shaders DEPENDS ${shader_outputs})
    add_dependencies(dear-human-plan-d plan-d-shaders)
    add_custom_command(TARGET dear-human-plan-d POST_BUILD
        COMMAND ${CMAKE_COMMAND} -E make_directory "$<TARGET_FILE_DIR:dear-human-plan-d>/shaders"
        COMMAND ${CMAKE_COMMAND} -E copy_if_different ${shader_outputs}
            "$<TARGET_FILE_DIR:dear-human-plan-d>/shaders"
        COMMAND_EXPAND_LISTS)
    if(TARGET SDL3::SDL3-shared)
        add_custom_command(TARGET dear-human-plan-d POST_BUILD
            COMMAND ${CMAKE_COMMAND} -E copy_if_different
                "$<TARGET_FILE:SDL3::SDL3-shared>" "$<TARGET_FILE_DIR:dear-human-plan-d>")
    endif()
else()
    message(FATAL_ERROR "Plan D preparation_001 targets macOS (Metal) and Windows (D3D12).")
endif()
