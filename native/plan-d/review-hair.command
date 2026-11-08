#!/bin/zsh
set -eu
PLAN_D_HAIR_DIR="${0:A:h}"
exec "$PLAN_D_HAIR_DIR/run.command" --hair --paused --yaw 65 --pitch 5 "$@"
