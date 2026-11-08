#!/bin/zsh
set -eu
PLAN_D_DIR="${0:A:h}"
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"
if ! command -v cmake >/dev/null || ! command -v ninja >/dev/null; then
    print -u2 'CMake and Ninja are required. Run: brew install cmake ninja sdl3'
    exit 1
fi
if command -v brew >/dev/null; then
    cmake -S "$PLAN_D_DIR" -B "$PLAN_D_DIR/build" -G Ninja \
        -DCMAKE_BUILD_TYPE=Debug -DCMAKE_PREFIX_PATH="$(brew --prefix sdl3)"
else
    cmake -S "$PLAN_D_DIR" -B "$PLAN_D_DIR/build" -G Ninja -DCMAKE_BUILD_TYPE=Debug
fi
cmake --build "$PLAN_D_DIR/build"
cd "$PLAN_D_DIR"
exec "$PLAN_D_DIR/build/bin/dear-human-plan-d" "$@"
