#!/bin/bash
set -a
source "$(dirname "$0")/../.dev.vars"
set +a
# Load fs.cpSync shim — works around a Node 22 + Windows bug where cpSync
# silently fails on paths with Unicode / DOS short names. Required for
# OpenNext bundling on this machine. Convert to Windows path so Node accepts it.
SHIM_PATH_UNIX="$(cd "$(dirname "$0")" && pwd)/fix-cpsync.cjs"
if command -v cygpath >/dev/null 2>&1; then
    SHIM_PATH="$(cygpath -w "$SHIM_PATH_UNIX")"
else
    SHIM_PATH="$SHIM_PATH_UNIX"
fi
export NODE_OPTIONS="${NODE_OPTIONS} --require=${SHIM_PATH}"
npm run deploy
