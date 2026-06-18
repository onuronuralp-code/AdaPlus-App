#!/usr/bin/env bash
# install-expo-go.sh
# Downloads the Expo Go iOS simulator build and installs it on every
# iOS device listed in device-matrix.json (booting each sim temporarily).
#
# Run this ONCE before using screenshot-matrix.sh.
#
# Usage:
#   ./scripts/e2e/install-expo-go.sh
#   ./scripts/e2e/install-expo-go.sh --filter iphone-se   # single device
#   ./scripts/e2e/install-expo-go.sh --priority critical

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MATRIX_FILE="$SCRIPT_DIR/device-matrix.json"
CACHE_DIR="${TMPDIR:-/tmp}/expo-go-cache"
FILTER=""
PRIORITY_ONLY=""

while [[ $# -gt 0 ]]; do
  case $1 in
    --filter)   FILTER="$2";        shift 2 ;;
    --priority) PRIORITY_ONLY="$2"; shift 2 ;;
    *) echo "Unknown flag: $1"; exit 1 ;;
  esac
done

log()  { echo "▶  $*"; }
ok()   { echo "✅ $*"; }
err()  { echo "❌ $*" >&2; }

# ── get Expo Go simulator URL from the API ─────────────────────────────────────
log "Fetching latest Expo Go version info…"
IOS_URL=$(curl -sf "https://api.expo.dev/v2/versions/latest" | \
  python3 -c "import sys,json; d=json.load(sys.stdin)['data']; print(d['iosUrl'])")

if [[ -z "$IOS_URL" ]]; then
  err "Could not determine Expo Go download URL from api.expo.dev"
  exit 1
fi

VERSION=$(echo "$IOS_URL" | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' | head -1)
TARBALL="$CACHE_DIR/Exponent-$VERSION.tar.gz"
APP_DIR="$CACHE_DIR/Exponent-$VERSION"

ok "Expo Go version: $VERSION"
log "URL: $IOS_URL"
echo ""

# ── download (skip if cached) ─────────────────────────────────────────────────
mkdir -p "$CACHE_DIR"
if [[ -f "$TARBALL" ]]; then
  log "Using cached download: $TARBALL"
else
  log "Downloading Expo Go simulator build…"
  curl -L --progress-bar -o "$TARBALL" "$IOS_URL"
  ok "Downloaded."
fi

# ── extract .app ──────────────────────────────────────────────────────────────
# The tarball extracts the *contents* of the .app bundle flat (no wrapper dir),
# so we create a named .app directory and extract into it directly.
APP_BUNDLE="$CACHE_DIR/Exponent.app"
APP_PATH="$APP_BUNDLE"

if [[ ! -f "$APP_BUNDLE/Info.plist" ]]; then
  log "Extracting into $APP_BUNDLE…"
  mkdir -p "$APP_BUNDLE"
  tar -xzf "$TARBALL" -C "$APP_BUNDLE"
fi

if [[ ! -f "$APP_BUNDLE/Info.plist" ]]; then
  err "Extraction failed — Info.plist missing from $APP_BUNDLE"
  exit 1
fi
ok "App bundle: $APP_PATH"
echo ""

# ── install on each device ────────────────────────────────────────────────────
DEVICES=$(python3 - <<PYEOF
import json
d = json.load(open("$MATRIX_FILE"))
devices = d["devices"]["ios"]
if "$FILTER":
    devices = [x for x in devices if "$FILTER" in x.get("tag","")]
if "$PRIORITY_ONLY":
    devices = [x for x in devices if x.get("priority") == "$PRIORITY_ONLY"]
for dev in devices:
    print(f"{dev['udid']}|{dev['name']}")
PYEOF
)

if [[ -z "$DEVICES" ]]; then
  echo "No devices matched."
  exit 0
fi

INSTALLED=0
SKIPPED=0

while IFS='|' read -r udid name; do
  echo "── $name  [${udid:0:8}…] ──"

  # Check if already installed
  ALREADY=$(xcrun simctl listapps "$udid" 2>/dev/null | python3 -c "
import sys, json
try:
    d = json.load(sys.stdin)
    found = any('exponent' in k.lower() or 'expo' in k.lower() for k in d)
    print('yes' if found else 'no')
except: print('no')
" 2>/dev/null || echo "no")

  if [[ "$ALREADY" == "yes" ]]; then
    ok "Already installed — skipping"
    ((SKIPPED++)) || true
    continue
  fi

  # Boot if needed
  STATE=$(xcrun simctl list devices | grep "$udid" | head -1 || true)
  BOOTED_HERE=false
  if ! echo "$STATE" | grep -q "Booted"; then
    log "Booting simulator…"
    xcrun simctl boot "$udid" 2>/dev/null || true
    sleep 5
    BOOTED_HERE=true
  fi

  # Install
  log "Installing Expo Go…"
  if xcrun simctl install "$udid" "$APP_PATH"; then
    ok "Installed on $name"
    ((INSTALLED++)) || true
  else
    echo "⚠️  Install failed on $name"
  fi

  # Shutdown if we booted it
  if $BOOTED_HERE; then
    xcrun simctl shutdown "$udid" 2>/dev/null || true
  fi

  echo ""
done <<< "$DEVICES"

echo "══════════════════════════════════════════"
ok "Done — $INSTALLED installed, $SKIPPED already had Expo Go"
echo ""
echo "Now run the screenshot matrix:"
echo "  npm run e2e:screenshots"
