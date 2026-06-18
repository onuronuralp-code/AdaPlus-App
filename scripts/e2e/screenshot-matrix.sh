#!/usr/bin/env bash
# screenshot-matrix.sh
# Boots each iOS simulator in device-matrix.json, launches the AdaPlus app,
# navigates to key screens, and captures screenshots for layout review.
#
# Usage:
#   ./scripts/e2e/screenshot-matrix.sh [options]
#
# Options:
#   --mode expo-go      Use Expo Go + running dev server (default, no build needed)
#   --mode dev-build    Use installed dev build (requires `npx expo run:ios` first)
#   --filter tag        Only run devices whose tag contains this string (e.g. "iphone-se")
#   --priority critical Only run devices marked "priority": "critical"
#   --no-shutdown       Don't shutdown simulators after capture (faster for iteration)
#
# Examples:
#   ./scripts/e2e/screenshot-matrix.sh
#   ./scripts/e2e/screenshot-matrix.sh --filter iphone-se
#   ./scripts/e2e/screenshot-matrix.sh --priority critical
#   ./scripts/e2e/screenshot-matrix.sh --mode dev-build --no-shutdown

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
MATRIX_FILE="$SCRIPT_DIR/device-matrix.json"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
OUTPUT_DIR="$PROJECT_ROOT/e2e/screenshots/$TIMESTAMP"
REPORT_FILE="$PROJECT_ROOT/e2e/screenshots/$TIMESTAMP/report.html"

MODE="expo-go"
FILTER=""
PRIORITY_ONLY=""
NO_SHUTDOWN=false

# ── argument parsing ──────────────────────────────────────────────────────────
while [[ $# -gt 0 ]]; do
  case $1 in
    --mode)        MODE="$2";       shift 2 ;;
    --filter)      FILTER="$2";     shift 2 ;;
    --priority)    PRIORITY_ONLY="$2"; shift 2 ;;
    --no-shutdown) NO_SHUTDOWN=true; shift ;;
    *) echo "Unknown flag: $1"; exit 1 ;;
  esac
done

# ── helpers ───────────────────────────────────────────────────────────────────
log()  { echo "▶  $*"; }
ok()   { echo "✅ $*"; }
warn() { echo "⚠️  $*"; }
err()  { echo "❌ $*" >&2; }

require_tool() {
  if ! command -v "$1" &>/dev/null; then
    err "Required tool '$1' not found. $2"
    exit 1
  fi
}

require_tool xcrun   "Install Xcode Command Line Tools: xcode-select --install"
require_tool python3 "Install Python 3"

BUNDLE_ID=$(python3 -c "import json; d=json.load(open('$MATRIX_FILE')); print(d['meta']['bundleId'])")
DEV_SERVER=$(python3 -c "import json; d=json.load(open('$MATRIX_FILE')); print(d['meta']['defaultDevServer'])")
EXPO_GO_ID=$(python3 -c "import json; d=json.load(open('$MATRIX_FILE')); print(d['meta']['expoGoAppId'])")

mkdir -p "$OUTPUT_DIR"

# ── check dev server (expo-go mode) ──────────────────────────────────────────
if [[ "$MODE" == "expo-go" ]]; then
  if ! curl -sf "$DEV_SERVER" -o /dev/null --max-time 3; then
    warn "Expo dev server not detected at $DEV_SERVER"
    warn "Start it first: npx expo start --localhost"
    warn "Continuing anyway — screenshots may show a blank screen."
  else
    ok "Dev server is running at $DEV_SERVER"
  fi
fi

# ── screen definitions (what to screenshot and when) ─────────────────────────
declare -a SCREENS=("splash:3" "explore:6" "forum:10" "ilanlar:14" "profile:18")
# format: name:wait_seconds_after_launch

# ── device loop ───────────────────────────────────────────────────────────────
DEVICE_COUNT=$(python3 -c "
import json, sys
d = json.load(open('$MATRIX_FILE'))
devices = d['devices']['ios']
filtered = [x for x in devices
  if ('$FILTER' == '' or '$FILTER' in x.get('tag',''))
  and ('$PRIORITY_ONLY' == '' or x.get('priority','') == '$PRIORITY_ONLY')]
print(len(filtered))
")

log "Running screenshot matrix on $DEVICE_COUNT iOS devices (mode: $MODE)"
log "Output: $OUTPUT_DIR"
echo ""

PASS=0
FAIL=0

python3 - <<PYEOF
import json, subprocess, time, sys, os

MATRIX_FILE = "$MATRIX_FILE"
OUTPUT_DIR  = "$OUTPUT_DIR"
MODE        = "$MODE"
FILTER      = "$FILTER"
PRIORITY    = "$PRIORITY_ONLY"
NO_SHUTDOWN = "$NO_SHUTDOWN" == "true"
BUNDLE_ID   = "$BUNDLE_ID"
DEV_SERVER  = "$DEV_SERVER"
EXPO_GO_ID  = "$EXPO_GO_ID"
SCREENS     = [s.split(":") for s in "splash:3 explore:6 forum:10 ilanlar:14 profile:18".split()]

data    = json.load(open(MATRIX_FILE))
devices = data["devices"]["ios"]

if FILTER:
    devices = [d for d in devices if FILTER in d.get("tag", "")]
if PRIORITY:
    devices = [d for d in devices if d.get("priority") == PRIORITY]

results = []

for device in devices:
    name     = device["name"]
    udid     = device["udid"]
    tag      = device["tag"]
    width    = device["widthPt"]
    height   = device["heightPt"]
    sa_top   = device["safeAreaTop"]
    sa_bot   = device["safeAreaBottom"]

    print(f"\n{'='*60}")
    print(f"  {name}  ({width}×{height}pt)  [{udid[:8]}]")
    print(f"  safe-area: top={sa_top}  bottom={sa_bot}")
    print(f"{'='*60}")

    dev_dir = os.path.join(OUTPUT_DIR, tag)
    os.makedirs(dev_dir, exist_ok=True)

    meta = {
        "name": name, "tag": tag, "udid": udid,
        "widthPt": width, "heightPt": height,
        "safeAreaTop": sa_top, "safeAreaBottom": sa_bot,
        "notchType": device.get("notchType", "none"),
        "hasHomeButton": device.get("hasHomeButton", False),
        "priority": device.get("priority", "standard"),
        "screenshots": []
    }

    def run(cmd, check=True, capture=False):
        kwargs = dict(shell=True, check=check)
        if capture:
            kwargs["capture_output"] = True
            kwargs["text"] = True
        return subprocess.run(cmd, **kwargs)

    # 1. Boot simulator
    print(f"  ▶  Booting simulator…")
    state = run(f"xcrun simctl list devices | grep {udid}", capture=True).stdout
    if "Booted" not in state:
        run(f"xcrun simctl boot {udid}", check=False)
        time.sleep(4)
    else:
        print(f"  ℹ  Already booted")

    # 2. Launch app
    print(f"  ▶  Launching app ({MODE})…")
    if MODE == "expo-go":
        # Open the dev server URL in Expo Go
        expo_url = f"exp+ada://expo-development-client/?url={DEV_SERVER}"
        run(f"xcrun simctl openurl {udid} '{expo_url}'", check=False)
        # Fallback: open as standard exp:// URL
        run(f"xcrun simctl openurl {udid} 'exp://{DEV_SERVER.replace(\"http://\",\"\")}'", check=False)
    else:
        # Dev build — app must already be installed
        run(f"xcrun simctl launch {udid} {BUNDLE_ID}", check=False)

    # 3. Capture each screen with progressive wait
    prev_wait = 0
    for screen_name, wait_str in SCREENS:
        wait = int(wait_str)
        delta = wait - prev_wait
        if delta > 0:
            print(f"  ⏱  Waiting {delta}s for '{screen_name}'…")
            time.sleep(delta)
        prev_wait = wait

        shot_path = os.path.join(dev_dir, f"{screen_name}.png")
        result = run(f"xcrun simctl io {udid} screenshot '{shot_path}'", check=False)
        if result.returncode == 0 and os.path.exists(shot_path):
            size_kb = os.path.getsize(shot_path) // 1024
            print(f"  📸 {screen_name}.png  ({size_kb}KB)")
            meta["screenshots"].append({"screen": screen_name, "file": f"{tag}/{screen_name}.png"})
        else:
            print(f"  ⚠️  Screenshot failed for {screen_name}")

    # 4. Write device metadata
    with open(os.path.join(dev_dir, "meta.json"), "w") as f:
        json.dump(meta, f, indent=2)

    # 5. Optionally shutdown
    if not NO_SHUTDOWN:
        print(f"  ▶  Shutting down…")
        run(f"xcrun simctl shutdown {udid}", check=False)

    results.append(meta)
    print(f"  ✅ Done: {len(meta['screenshots'])} screenshots")

# Write consolidated results summary
with open(os.path.join(OUTPUT_DIR, "results.json"), "w") as f:
    json.dump(results, f, indent=2)

print(f"\n✅ Matrix complete. {len(results)} devices processed.")
print(f"   Output: {OUTPUT_DIR}")
PYEOF

# ── generate HTML report ──────────────────────────────────────────────────────
python3 "$SCRIPT_DIR/generate-report.py" "$OUTPUT_DIR"

ok "Report ready: $REPORT_FILE"
echo ""
echo "  open \"$REPORT_FILE\""
