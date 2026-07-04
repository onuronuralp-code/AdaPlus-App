#!/usr/bin/env python3
"""
AdaPlus App Store Screenshot Framer
Composites each screenshot into an iPhone frame with gradient background and headline.
Output: 1284×2778px PNGs ready for App Store Connect.
"""

import os
import math
from PIL import Image, ImageDraw, ImageFont, ImageFilter

# ── Paths ─────────────────────────────────────────────────────────────────────
INPUT_DIR  = os.path.expanduser("~/Desktop/AdaPlus AppStore Screenshots")
OUTPUT_DIR = os.path.expanduser("~/Desktop/AdaPlus AppStore Screenshots/Framed")
FONT_PATH  = "/System/Library/Fonts/HelveticaNeue.ttc"

os.makedirs(OUTPUT_DIR, exist_ok=True)

# ── Canvas ────────────────────────────────────────────────────────────────────
W, H = 1284, 2778

# ── Per-screenshot config ─────────────────────────────────────────────────────
# bg_top / bg_bottom: gradient start/end colors
# headline: bold text (use \n for line breaks)
# sub: smaller supporting text
# accent: pill/badge color
SCREENS = [
    {
        "file":     "1_explore.png",
        "out":      "framed_1_explore.png",
        "headline": "Adaları\nKeşfet!",
        "sub":      "Tüm hizmetler ve etkinlikler\nbir arada",
        "bg_top":   (13,  27,  42),
        "bg_bot":   (30,  58,  95),
        "text":     (255, 255, 255),
        "accent":   (59,  130, 246),
    },
    {
        "file":     "2_schedule.png",
        "out":      "framed_2_schedule.png",
        "headline": "Vapur Saatlerini\nAnında Öğren",
        "sub":      "Tüm adalara güncel sefer saatleri",
        "bg_top":   (15,  23,  42),
        "bg_bot":   (29,  78,  137),
        "text":     (255, 255, 255),
        "accent":   (59,  130, 246),
    },
    {
        "file":     "3_iletisim.png",
        "out":      "framed_3_iletisim.png",
        "headline": "Her Zaman\nYanındayız",
        "sub":      "Görüş ve önerilerinizi bekliyoruz",
        "bg_top":   (5,   46,  22),
        "bg_bot":   (16, 185, 129),
        "text":     (255, 255, 255),
        "accent":   (16,  185, 129),
    },
    {
        "file":     "4_profil.png",
        "out":      "framed_4_profil.png",
        "headline": "Toplulukla\nBağlan",
        "sub":      "Deneyimlerini paylaş, fikirlerini duyur",
        "bg_top":   (30,  27,  75),
        "bg_bot":   (88,  28, 135),
        "text":     (255, 255, 255),
        "accent":   (139,  92, 246),
    },
    {
        "file":     "5_ilanlar.png",
        "out":      "framed_5_ilanlar.png",
        "headline": "Ada İlanları\nBir Arada",
        "sub":      "Emlak, hizmet, iş ilanı ve daha fazlası",
        "bg_top":   (30,  41,  59),
        "bg_bot":   (15,  23,  42),
        "text":     (255, 255, 255),
        "accent":   (59,  130, 246),
    },
    {
        "file":     "6_etkinlikler.png",
        "out":      "framed_6_etkinlikler.png",
        "headline": "Etkinlikleri\nKaçırma!",
        "sub":      "Ada'nın tüm etkinlikleri cebinde",
        "bg_top":   (120,  53,  15),
        "bg_bot":   (245, 158,  11),
        "text":     (255, 255, 255),
        "accent":   (245, 158,  11),
    },
    {
        "file":     "7_topluluk.png",
        "out":      "framed_7_topluluk.png",
        "headline": "Fikirlerini\nPaylaş!",
        "sub":      "Tartış, oyla, toplulukla bağlan",
        "bg_top":   (2,   44,  34),
        "bg_bot":   (5,  150, 105),
        "text":     (255, 255, 255),
        "accent":   (16,  185, 129),
    },
]

# ── Helpers ───────────────────────────────────────────────────────────────────

def lerp_color(c1, c2, t):
    return tuple(int(c1[i] + (c2[i] - c1[i]) * t) for i in range(3))

def draw_gradient(draw, width, height, top_color, bot_color):
    for y in range(height):
        t = y / max(height - 1, 1)
        r, g, b = lerp_color(top_color, bot_color, t)
        draw.line([(0, y), (width, y)], fill=(r, g, b, 255))

def rounded_rect_mask(size, radius):
    mask = Image.new("L", size, 0)
    d = ImageDraw.Draw(mask)
    d.rounded_rectangle([(0, 0), (size[0]-1, size[1]-1)], radius=radius, fill=255)
    return mask

def load_font(size, bold=False):
    # HelveticaNeue.ttc: index 0 = regular, index 7 = bold
    try:
        idx = 7 if bold else 0
        return ImageFont.truetype(FONT_PATH, size, index=idx)
    except Exception:
        return ImageFont.load_default()

def draw_multiline_centered(draw, text, y, font, color, canvas_width, line_spacing=1.15):
    lines = text.split("\n")
    total_h = 0
    line_heights = []
    for line in lines:
        bb = font.getbbox(line)
        lh = bb[3] - bb[1]
        line_heights.append(lh)
        total_h += lh
    total_h += int(line_heights[0] * (line_spacing - 1)) * (len(lines) - 1)

    cur_y = y
    for i, line in enumerate(lines):
        bb = font.getbbox(line)
        lw = bb[2] - bb[0]
        x = (canvas_width - lw) // 2
        draw.text((x, cur_y), line, font=font, fill=color)
        cur_y += line_heights[i] + int(line_heights[i] * (line_spacing - 1))
    return cur_y  # returns y after last line

def draw_phone_frame(canvas, screenshot_path, frame_top_y, frame_bottom_limit=None):
    """
    Draws an iPhone-style frame centered vertically between frame_top_y and frame_bottom_limit.
    Returns the y position after the frame.
    """
    if frame_bottom_limit is None:
        frame_bottom_limit = H - 60

    # Phone dimensions — fit within available vertical space
    phone_w = 760
    phone_h = int(phone_w * 2.165)   # ~9:19.5 aspect (iPhone Pro)
    available_h = frame_bottom_limit - frame_top_y
    if phone_h > available_h:
        phone_h = available_h
        phone_w = int(phone_h / 2.165)

    # Center horizontally and vertically in available space
    phone_x = (W - phone_w) // 2
    phone_y = frame_top_y + (available_h - phone_h) // 2

    # iPhone bezel proportions: very thin sides/top, screen goes edge-to-edge
    bezel_side  = int(phone_w * 0.030)
    bezel_top   = int(phone_w * 0.042)
    bezel_bot   = int(phone_w * 0.055)
    corner_r    = int(phone_w * 0.120)
    screen_r    = int(phone_w * 0.095)

    # Screen area
    scr_x = phone_x + bezel_side
    scr_y = phone_y + bezel_top
    scr_w = phone_w - 2 * bezel_side
    scr_h = phone_h - bezel_top - bezel_bot

    # 1. Phone shadow
    shadow = Image.new("RGBA", (phone_w + 80, phone_h + 80), (0, 0, 0, 0))
    sd = ImageDraw.Draw(shadow)
    sd.rounded_rectangle([(40, 40), (phone_w + 40, phone_h + 40)],
                          radius=corner_r, fill=(0, 0, 0, 140))
    shadow = shadow.filter(ImageFilter.GaussianBlur(radius=22))
    canvas.paste(shadow, (phone_x - 40, phone_y - 40), shadow)

    # 2. Phone body (dark titanium)
    phone_layer = Image.new("RGBA", (phone_w, phone_h), (0, 0, 0, 0))
    pd = ImageDraw.Draw(phone_layer)
    pd.rounded_rectangle([(0, 0), (phone_w - 1, phone_h - 1)],
                          radius=corner_r, fill=(28, 28, 30, 255))

    # 3. Screen background (black)
    pd.rounded_rectangle(
        [(bezel_side, bezel_top), (bezel_side + scr_w, bezel_top + scr_h)],
        radius=screen_r, fill=(0, 0, 0, 255)
    )

    canvas.paste(phone_layer, (phone_x, phone_y), phone_layer)

    # 4. Screenshot inside screen
    try:
        shot = Image.open(screenshot_path).convert("RGBA")
        shot = shot.resize((scr_w, scr_h), Image.LANCZOS)
        screen_mask = rounded_rect_mask((scr_w, scr_h), screen_r)
        canvas.paste(shot, (scr_x, scr_y), screen_mask)
    except Exception as e:
        print(f"  ⚠  Could not load screenshot: {e}")

    # 5. Dynamic Island — pill INSIDE the screen, near the top (real iPhone placement)
    di_w = int(scr_w * 0.38)
    di_h = int(scr_w * 0.062)
    di_x = scr_x + (scr_w - di_w) // 2
    di_y = scr_y + int(scr_h * 0.018)
    di_draw = ImageDraw.Draw(canvas)
    di_draw.rounded_rectangle(
        [(di_x, di_y), (di_x + di_w, di_y + di_h)],
        radius=di_h // 2, fill=(10, 10, 12, 255)
    )

    # 6. Phone frame highlight (thin inner border)
    highlight = ImageDraw.Draw(canvas)
    highlight.rounded_rectangle(
        [(phone_x + 1, phone_y + 1), (phone_x + phone_w - 2, phone_y + phone_h - 2)],
        radius=corner_r, outline=(80, 80, 85, 180), width=2
    )

    return phone_y + phone_h

# ── Main ──────────────────────────────────────────────────────────────────────

for cfg in SCREENS:
    src = os.path.join(INPUT_DIR, cfg["file"])
    dst = os.path.join(OUTPUT_DIR, cfg["out"])

    if not os.path.exists(src):
        print(f"⚠  Missing: {src}, skipping.")
        continue

    print(f"🖼  Framing {cfg['file']}…")

    # Canvas
    canvas = Image.new("RGBA", (W, H), (0, 0, 0, 255))
    draw   = ImageDraw.Draw(canvas)

    # Gradient background
    draw_gradient(draw, W, H, cfg["bg_top"], cfg["bg_bot"])

    # Subtle noise texture (very faint dots for depth)
    import random
    rng = random.Random(42)
    for _ in range(8000):
        nx = rng.randint(0, W - 1)
        ny = rng.randint(0, H // 2)
        alpha = rng.randint(8, 22)
        draw.point((nx, ny), fill=(255, 255, 255, alpha))

    # ── Text area ──────────────────────────────────────────────────────────
    text_top = 120

    # Headline
    font_h = load_font(148, bold=True)
    after_headline = draw_multiline_centered(
        draw, cfg["headline"], text_top, font_h, cfg["text"], W, line_spacing=1.12
    )

    # Subheadline
    font_s = load_font(58, bold=False)
    sub_y = after_headline + 36
    draw_multiline_centered(
        draw, cfg["sub"], sub_y, font_s,
        tuple(min(255, c + 60) for c in cfg["text"]), W, line_spacing=1.3
    )

    # Accent line under headline
    accent_y = text_top - 12
    accent_w = 90
    accent_x = (W - accent_w) // 2
    draw.rounded_rectangle(
        [(accent_x, accent_y), (accent_x + accent_w, accent_y + 10)],
        radius=5, fill=cfg["accent"] + (255,)
    )

    # ── Phone frame ────────────────────────────────────────────────────────
    # Phone is centered vertically between the text area and the badge
    phone_start_y = int(H * 0.35)
    draw_phone_frame(canvas, src, phone_start_y, H - 130)

    # ── AdaPlus badge ──────────────────────────────────────────────────────
    badge_font = load_font(42, bold=True)
    badge_text = "AdaPlus"
    bb = badge_font.getbbox(badge_text)
    bw, bh = bb[2] - bb[0], bb[3] - bb[1]
    pad = 18
    bx = (W - bw - pad * 2) // 2
    by = H - bh - pad * 2 - 40
    draw.rounded_rectangle(
        [(bx, by), (bx + bw + pad * 2, by + bh + pad * 2)],
        radius=16, fill=cfg["accent"] + (200,)
    )
    draw.text((bx + pad, by + pad), badge_text, font=badge_font, fill=(255, 255, 255, 255))

    # Save
    canvas.convert("RGB").save(dst, "PNG", quality=95)
    size_kb = os.path.getsize(dst) // 1024
    print(f"  ✅ {cfg['out']}  ({size_kb}KB)")

print(f"\n🎉 Done! Framed screenshots saved to:\n   {OUTPUT_DIR}")
