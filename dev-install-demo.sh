#!/usr/bin/env bash
set -euo pipefail

LIB_NAME="ngx-resource-scheduler"
DEMO_NAME="demo"

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DIST_DIR="$ROOT_DIR/dist/$LIB_NAME"
DEMO_DIR="$ROOT_DIR/projects/$DEMO_NAME"

echo "==> Building Angular library: $LIB_NAME"
cd "$ROOT_DIR"
npx ng build "$LIB_NAME"

echo "==> Packing npm tarball"
cd "$DIST_DIR"
TARBALL="$(npm pack | tail -n 1)"

echo "==> Installing tarball into demo: $DEMO_NAME"
cd "$DEMO_DIR"
npm i "$DIST_DIR/$TARBALL"

echo "==> Done."
echo "Installed: $TARBALL"
