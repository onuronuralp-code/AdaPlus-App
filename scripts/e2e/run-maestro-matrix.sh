#!/usr/bin/env bash
# run-maestro-matrix.sh
# Runs all Maestro flows against each iOS device in device-matrix.json
# consecutively, collecting per-device results and a unified summary.
#
# Prerequisites:
#   1. Install Maestro:       brew install maestro
#   2. Build dev client:      npx expo run:ios
#   3. App installed on all target simulators (use --install flag to automate)
#
# Usage:
#   ./scripts/e2e/run-maestro-matrix.sh [options]
#
# Options:
#   --flows <glob>     Glob of flows to run (default: "e2e/flows/*.yaml")
#   --filter <tag>     Only run devices matching tag (e.g. iphone-se)
#   --priority <val>   Only run devices with this priority (critical|standard)
#   --install          Re-install the .app on each simulator before running
#   --app-path <path>  Path to the .app bundle (required with --install)
#   --no-shutdown      Keep simulators running after test

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
MATRIX_FILE="$SCRIPT_DIR/device-matrix.json"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
RESULTS_DIR="$PROJECT_ROOT/e2e/maestro-results/$TIMESTAMP"

FLOWS_GLOB="$PROJECT_ROOT/e2e/flows/*.yaml"
FILTER=""
PRIORITY_ONLY=""
NO_SHUTDOWN=false
INSTALL_APP=false
APP_PATH=""

while [[ $# -gt 0 ]]; do
  case $1 in
    --flows)      FLOWS_GLOB="$2";    shift 2 ;;
    --filter)     FILTER="$2";        shift 2 ;;
    --priority)   PRIORITY_ONLY="$2"; shift 2 ;;
    --no-shutdown) NO_SHUTDOWN=true;  shift ;;
    --install)    INSTALL_APP=true;   shift ;;
    --app-path)   APP_PATH="$2";      shift 2 ;;
    *) echo "Unknown flag: $1"; exit 1 ;;
  esac
done

log()  { echo "▶  $*"; }
ok()   { echo "✅ $*"; }
warn() { echo "⚠️  $*"; }
err()  { echo "❌ $*" >&2; }

if ! command -v maestro &>/dev/null; then
  err "Maestro is not installed. Run: brew install maestro"
  exit 1
fi

mkdir -p "$RESULTS_DIR"
log "Maestro matrix run: $TIMESTAMP"
log "Flows: $FLOWS_GLOB"
log "Results: $RESULTS_DIR"
echo ""

OVERALL_PASS=0
OVERALL_FAIL=0

# Read and filter devices
DEVICES=$(python3 - <<PYEOF
import json
d = json.load(open("$MATRIX_FILE"))
devices = d["devices"]["ios"]
if "$FILTER":
    devices = [x for x in devices if "$FILTER" in x.get("tag","")]
if "$PRIORITY_ONLY":
    devices = [x for x in devices if x.get("priority") == "$PRIORITY_ONLY"]
for dev in devices:
    print(f"{dev['udid']}|{dev['name']}|{dev['tag']}")
PYEOF
)

if [[ -z "$DEVICES" ]]; then
  warn "No devices matched the current filters."
  exit 0
fi

while IFS='|' read -r udid name tag; do
  echo ""
  echo "══════════════════════════════════════════════════════════"
  echo "  $name  [$tag]  (${udid:0:8}…)"
  echo "══════════════════════════════════════════════════════════"

  DEV_RESULTS="$RESULTS_DIR/$tag"
  mkdir -p "$DEV_RESULTS"

  # Boot simulator
  STATE=$(xcrun simctl list devices | grep "$udid" | head -1)
  if ! echo "$STATE" | grep -q "Booted"; then
    log "Booting $name…"
    xcrun simctl boot "$udid" 2>/dev/null || true
    sleep 4
  else
    log "$name already booted"
  fi

  # Optional app install
  if $INSTALL_APP; then
    if [[ -z "$APP_PATH" ]]; then
      err "--install requires --app-path <path-to.app>"
      exit 1
    fi
    log "Installing app from $APP_PATH…"
    xcrun simctl install "$udid" "$APP_PATH"
  fi

  # Run each flow file
  DEVICE_PASS=0
  DEVICE_FAIL=0

  for FLOW in $FLOWS_GLOB; do
    FLOW_NAME=$(basename "$FLOW" .yaml)
    FLOW_RESULT_DIR="$DEV_RESULTS/$FLOW_NAME"
    mkdir -p "$FLOW_RESULT_DIR"

    log "Running flow: $FLOW_NAME"

    if maestro \
        --device "$udid" \
        test "$FLOW" \
        --format junit \
        --output "$FLOW_RESULT_DIR/junit.xml" \
        --screenshot-dir "$FLOW_RESULT_DIR/screenshots" \
        2>&1 | tee "$FLOW_RESULT_DIR/maestro.log" | grep -E "(PASS|FAIL|Error|✅|❌)"; then
      ok "$FLOW_NAME → PASS"
      ((DEVICE_PASS++)) || true
      ((OVERALL_PASS++)) || true
    else
      err "$FLOW_NAME → FAIL (see $FLOW_RESULT_DIR/maestro.log)"
      ((DEVICE_FAIL++)) || true
      ((OVERALL_FAIL++)) || true
    fi
  done

  echo ""
  ok "Device summary: $DEVICE_PASS passed, $DEVICE_FAIL failed"

  # Optionally shutdown
  if ! $NO_SHUTDOWN; then
    log "Shutting down $name…"
    xcrun simctl shutdown "$udid" 2>/dev/null || true
  fi

done <<< "$DEVICES"

# ── Final summary ─────────────────────────────────────────────────────────────
echo ""
echo "══════════════════════════════════════════════════════════"
echo "  MATRIX COMPLETE"
echo "══════════════════════════════════════════════════════════"
echo "  Flows passed:  $OVERALL_PASS"
echo "  Flows failed:  $OVERALL_FAIL"
echo "  Results dir:   $RESULTS_DIR"
echo ""

if (( OVERALL_FAIL > 0 )); then
  err "Some flows failed. Check the logs in $RESULTS_DIR"
  exit 1
else
  ok "All flows passed across all devices."
fi
