#!/usr/bin/env python3
"""
generate-report.py  <screenshot-run-dir>

Reads results.json from a screenshot-matrix run and produces an HTML file
with a side-by-side grid so you can visually compare layouts across devices.

Highlights:
 - Colour-coded priority badges (critical / standard)
 - Safe-area inset annotations
 - Grouped by screen so narrow vs wide comparisons are obvious
 - Click any thumbnail to view full-size
"""
import json, os, sys, base64
from pathlib import Path
from datetime import datetime

if len(sys.argv) < 2:
    print("Usage: generate-report.py <run-dir>")
    sys.exit(1)

run_dir = Path(sys.argv[1])
results_file = run_dir / "results.json"

if not results_file.exists():
    print(f"No results.json found in {run_dir}")
    sys.exit(1)

results = json.loads(results_file.read_text())
timestamp = run_dir.name
report_path = run_dir / "report.html"

# Gather all screen names in order
all_screens = []
for device in results:
    for shot in device.get("screenshots", []):
        if shot["screen"] not in all_screens:
            all_screens.append(shot["screen"])

PRIORITY_COLORS = {"critical": "#EF4444", "standard": "#6366F1"}
NOTCH_LABELS = {
    "none": "No notch",
    "notch": "Notch",
    "dynamicIsland": "Dynamic Island"
}

def img_src(file_rel):
    abs_path = run_dir / file_rel
    if not abs_path.exists():
        return None
    data = abs_path.read_bytes()
    b64 = base64.b64encode(data).decode()
    return f"data:image/png;base64,{b64}"

# Build CSS
CSS = """
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: -apple-system, BlinkMacSystemFont, 'SF Pro', sans-serif; background: #0F172A; color: #E2E8F0; }
header { padding: 24px 32px; background: #1E293B; border-bottom: 1px solid #334155; }
header h1 { font-size: 20px; font-weight: 700; color: #F8FAFC; }
header p { font-size: 13px; color: #94A3B8; margin-top: 4px; }
.screen-section { padding: 28px 32px; border-bottom: 1px solid #1E293B; }
.screen-section h2 { font-size: 15px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; color: #94A3B8; margin-bottom: 20px; }
.device-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 20px; }
.device-card { background: #1E293B; border-radius: 12px; overflow: hidden; border: 1px solid #334155; transition: border-color .15s; }
.device-card:hover { border-color: #6366F1; }
.card-header { padding: 10px 12px; background: #0F172A; }
.card-name { font-size: 12px; font-weight: 700; color: #F1F5F9; }
.card-meta { font-size: 10px; color: #64748B; margin-top: 2px; }
.card-badges { display: flex; gap: 6px; margin-top: 6px; flex-wrap: wrap; }
.badge { font-size: 9px; font-weight: 700; padding: 2px 6px; border-radius: 4px; text-transform: uppercase; letter-spacing: .5px; }
.badge-critical { background: #7F1D1D; color: #FCA5A5; }
.badge-standard { background: #1E1B4B; color: #A5B4FC; }
.badge-notch { background: #164E63; color: #67E8F9; }
.badge-inset { background: #14532D; color: #86EFAC; }
.thumb-wrap { position: relative; cursor: pointer; }
.thumb-wrap img { width: 100%; display: block; }
.thumb-wrap .dims { position: absolute; bottom: 6px; right: 6px; background: rgba(0,0,0,.7); color: #fff; font-size: 9px; padding: 2px 5px; border-radius: 3px; }
.no-shot { height: 140px; display: flex; align-items: center; justify-content: center; color: #475569; font-size: 11px; background: #0F172A; }
/* lightbox */
#lightbox { display:none; position:fixed; inset:0; background:rgba(0,0,0,.92); z-index:9999; align-items:center; justify-content:center; }
#lightbox.open { display:flex; }
#lightbox img { max-width:92vw; max-height:92vh; border-radius:8px; }
#lightbox-close { position:fixed; top:16px; right:20px; font-size:24px; cursor:pointer; color:#fff; }
"""

JS = """
document.querySelectorAll('.thumb-wrap').forEach(el => {
  el.addEventListener('click', () => {
    const lb = document.getElementById('lightbox');
    document.getElementById('lightbox-img').src = el.querySelector('img').src;
    lb.classList.add('open');
  });
});
document.getElementById('lightbox-close').addEventListener('click', () => {
  document.getElementById('lightbox').classList.remove('open');
});
document.getElementById('lightbox').addEventListener('click', e => {
  if (e.target === e.currentTarget) e.currentTarget.classList.remove('open');
});
"""

# Build HTML
sections_html = []
for screen in all_screens:
    cards_html = []
    for device in results:
        shot = next((s for s in device.get("screenshots", []) if s["screen"] == screen), None)
        priority = device.get("priority", "standard")
        notch = device.get("notchType", "none")
        sa_top = device.get("safeAreaTop", 0)
        sa_bot = device.get("safeAreaBottom", 0)
        width = device.get("widthPt", "?")
        height = device.get("heightPt", "?")

        if shot:
            src = img_src(shot["file"])
            if src:
                img_html = f"""
                <div class="thumb-wrap">
                  <img src="{src}" loading="lazy" alt="{screen} on {device['name']}" />
                  <span class="dims">{width}×{height}pt</span>
                </div>"""
            else:
                img_html = f'<div class="no-shot">No screenshot</div>'
        else:
            img_html = f'<div class="no-shot">Not captured</div>'

        cards_html.append(f"""
        <div class="device-card">
          <div class="card-header">
            <div class="card-name">{device['name']}</div>
            <div class="card-meta">{device.get('os', '')}  ·  {width}×{height}pt</div>
            <div class="card-badges">
              <span class="badge badge-{priority}">{priority}</span>
              <span class="badge badge-notch">{NOTCH_LABELS.get(notch, notch)}</span>
              <span class="badge badge-inset">↑{sa_top} ↓{sa_bot}</span>
            </div>
          </div>
          {img_html}
        </div>""")

    sections_html.append(f"""
    <section class="screen-section">
      <h2>{screen}</h2>
      <div class="device-grid">
        {''.join(cards_html)}
      </div>
    </section>""")

device_summary = ", ".join(d["name"] for d in results)
html = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>AdaPlus Layout Matrix — {timestamp}</title>
<style>{CSS}</style>
</head>
<body>
<header>
  <h1>AdaPlus Cross-Device Layout Matrix</h1>
  <p>Run: {timestamp} · {len(results)} devices · {len(all_screens)} screens · {device_summary}</p>
</header>
{''.join(sections_html)}
<div id="lightbox">
  <span id="lightbox-close">✕</span>
  <img id="lightbox-img" src="" alt="Full size screenshot" />
</div>
<script>{JS}</script>
</body>
</html>"""

report_path.write_text(html)
print(f"Report written: {report_path}")
