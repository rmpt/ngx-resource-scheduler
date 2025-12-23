#!/usr/bin/env bash
set -euo pipefail

LIB_NAME="ngx-resource-scheduler"

# patch | minor | major
BUMP_TYPE="${1:-patch}"

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LIB_DIR="$ROOT_DIR/projects/$LIB_NAME"
DIST_DIR="$ROOT_DIR/dist/$LIB_NAME"

if [[ "$BUMP_TYPE" != "patch" && "$BUMP_TYPE" != "minor" && "$BUMP_TYPE" != "major" ]]; then
  echo "Usage: ./release-publish.sh [patch|minor|major]"
  exit 1
fi

echo "==> Bumping version ($BUMP_TYPE) in $LIB_DIR/package.json"
cd "$LIB_DIR"

# Bump version without creating a git tag (we'll do our own tag)
NEW_VERSION="$(npm version "$BUMP_TYPE" --no-git-tag-version)"
NEW_VERSION="${NEW_VERSION#v}"

echo "==> New version: $NEW_VERSION"

echo "==> Building Angular library: $LIB_NAME"
cd "$ROOT_DIR"
npx ng build "$LIB_NAME"

echo "==> Publishing to npm from dist/"
cd "$DIST_DIR"
npm publish --access public

echo "==> Committing + tagging in git (optional but recommended)"
cd "$ROOT_DIR"

if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  git add "$LIB_DIR/package.json" "$LIB_DIR/package-lock.json" 2>/dev/null || true
  git commit -m "chore(release): v$NEW_VERSION" || true
  git tag "v$NEW_VERSION" || true
  git push || true
  git push --tags || true
else
  echo "Not a git repo; skipping git commit/tag/push."
fi

echo "==> Done. Published v$NEW_VERSION"
