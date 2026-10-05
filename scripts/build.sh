#!/usr/bin/env bash
# Builds every experiment and the homepage into _site/, ready for GitHub Pages.
# Each experiments/<name>/ with a package.json is built with `npm run build`
# and published at /<name>/.
set -euo pipefail

root="$(cd "$(dirname "$0")/.." && pwd)"
out="$root/_site"

rm -rf "$out"
mkdir -p "$out"
cp -R "$root/site/." "$out/"

for dir in "$root"/experiments/*/; do
  name="$(basename "$dir")"
  [ -f "$dir/package.json" ] || continue
  echo "==> Building $name"
  (cd "$dir" && npm ci && npm run build)
  cp -R "$dir/dist" "$out/$name"
done

touch "$out/.nojekyll"
echo "Site built in $out"
