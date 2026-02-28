#!/bin/bash
set -a
source "$(dirname "$0")/../.dev.vars"
set +a
npm run deploy
