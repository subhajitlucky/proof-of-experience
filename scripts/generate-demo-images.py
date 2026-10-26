#!/usr/bin/env python3
"""Generate original, flat editorial demo images for the seed catalogue."""

from __future__ import annotations

import math
import random
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

OUT = Path(__file__).resolve().parent.parent / "prisma" / "seed-assets"
OUT.mkdir(parents=True, exist_ok=True)

IVORY = "#e7eee7"
PAPER = "#f1f5ef"
INK = "#122219"
SLATE = "#3a4b40"
MUTED = "#62756a"
ACCENT = "#0d5a43"
CLAY = "#c8c4b2"
SAND = "#d3d8cb"
CREAM = "#e2e9e1"

SERIF = "/usr/share/fonts/truetype/liberation/LiberationSerif-Regular.ttf"
SERIF_BOLD = "/usr/share/fonts/truetype/liberation/LiberationSerif-Bold.ttf"
SANS = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
SANS_BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"

SCALE = 2
W, H = 1600, 1200


def canvas(color: str) -> Image.Image:
    image = Image.new("RGB", (W * SCALE, H * SCALE), color)
    return image


def grain(image: Image.Image, strength: int = 9) -> Image.Image:
    rng = random.Random(42 + strength)
    noise = Image.new("L", (W, H))
    pixels = noise.load()
    for y in range(H):
        for x in range(W):
            pixels[x, y] = rng.randint(0, 255)
    noise = noise.resize((W * SCALE, H * SCALE), Image.Resampling.NEAREST)
    grain_layer = Image.merge("RGB", (noise, noise, noise))
    return Image.blend(image, grain_layer, strength / 1000)


def font(path: str, size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(path, size * SCALE)


def spaced_text(
    draw: ImageDraw.ImageDraw,
    xy: tuple[int, int],
    text: str,
    fill: str,
    fnt: ImageFont.FreeTypeFont,
    spacing: int = 4,
) -> None:
    x, y = xy[0] * SCALE, xy[1] * SCALE
    for character in text:
        draw.text((x, y), character, fill=fill, font=fnt)
        width = draw.textlength(character, font=fnt)
        x += width + spacing * SCALE


def bezier(points: list[tuple[float, float]], steps: int = 80) -> list[tuple[float, float]]:
    (x0, y0), (x1, y1), (x2, y2), (x3, y3) = points
    result = []
    for index in range(steps + 1):
        t = index / steps
        mt = 1 - t
        x = mt**3 * x0 + 3 * mt**2 * t * x1 + 3 * mt * t**2 * x2 + t**3 * x3
        y = mt**3 * y0 + 3 * mt**2 * t * y1 + 3 * mt * t**2 * y2 + t**3 * y3
        result.append((x * SCALE, y * SCALE))
    return result


def seal(draw: ImageDraw.ImageDraw, cx: int, cy: int, radius: int, text: str = "POE") -> None:
    size = radius * 2
    left = (cx - radius) * SCALE
    top = (cy - radius) * SCALE
    right = (cx + radius) * SCALE
    bottom = (cy + radius) * SCALE
    draw.rectangle([left, top, right, bottom], outline=ACCENT, width=int(1.4 * SCALE))
    inset = int(5 * SCALE)
    draw.rectangle(
        [left + inset, top + inset, right - inset, bottom - inset],
        outline=ACCENT,
        width=max(1, int(0.65 * SCALE)),
    )
    label_font = font(SANS_BOLD, 10)
    spaced_text(draw, (cx - 16, cy - 7), text, ACCENT, label_font, spacing=3)
    small = font(SANS, 7)
    spaced_text(draw, (cx - 20, cy + 11), "RECORD", ACCENT, small, spacing=2)


def label_block(draw: ImageDraw.ImageDraw, title: str, place: str) -> None:
    example = font(SANS, 12)
    spaced_text(draw, (90, 90), "DEMO RECORD", ACCENT, example, spacing=3)
    title_font = font(SERIF, 40)
    draw.text((90 * SCALE, 132 * SCALE), title, font=title_font, fill=INK)
    place_font = font(SANS, 14)
    spaced_text(draw, (92, 200), place, MUTED, place_font, spacing=2)


def horizontal_rule(draw: ImageDraw.ImageDraw, y: int, color: str = "#cfc4b2") -> None:
    draw.line(
        [(90 * SCALE, y * SCALE), ((W - 90) * SCALE, y * SCALE)],
        fill=color,
        width=SCALE,
    )


def save_plate(name: str, image: Image.Image) -> None:
    image = grain(image, strength=5)
    image = image.resize((W, H), Image.Resampling.LANCZOS)
    image.save(OUT / name, optimize=True)


# Kyoto: a dark raku vessel on a warm field.
image = canvas(PAPER)
draw = ImageDraw.Draw(image)
label_block(draw, "Raku tea bowl, Kyoto", "KYOTO, JAPAN · MARCH 2026")
horizontal_rule(draw, 292)

# A dark raku vessel: a simple full volume, with a thick clay rim.
draw.ellipse(
    [390 * SCALE, 540 * SCALE, 1210 * SCALE, 1025 * SCALE],
    fill=INK,
)
draw.ellipse(
    [430 * SCALE, 485 * SCALE, 1170 * SCALE, 630 * SCALE],
    fill=CLAY,
    outline=INK,
    width=3 * SCALE,
)
draw.arc(
    [442 * SCALE, 500 * SCALE, 1158 * SCALE, 616 * SCALE],
    start=184,
    end=356,
    fill=CREAM,
    width=3 * SCALE,
)
draw.ellipse(
    [700 * SCALE, 745 * SCALE, 900 * SCALE, 840 * SCALE],
    outline="#514a41",
    width=SCALE,
)
# Cracks and kiln marks, deliberately irregular.
rng = random.Random(7)
for _ in range(28):
    x = rng.randint(480, 1120)
    y = rng.randint(650, 980)
    length = rng.randint(10, 55)
    draw.line(
        [(x * SCALE, y * SCALE), ((x + length) * SCALE, (y + rng.randint(-22, 22)) * SCALE)],
        fill="#6d6154",
        width=SCALE,
    )
for _ in range(90):
    x = rng.randint(480, 1120)
    y = rng.randint(660, 995)
    radius = rng.randint(1, 3)
    draw.ellipse(
        [(x - radius) * SCALE, (y - radius) * SCALE, (x + radius) * SCALE, (y + radius) * SCALE],
        fill="#6d6154",
    )
draw.line(
    [(500 * SCALE, 1028 * SCALE), (1100 * SCALE, 1028 * SCALE)],
    fill="#b7a78f",
    width=2 * SCALE,
)
seal(draw, 1390, 1040, 58)
small = font(SANS, 10)
spaced_text(draw, (92, 1025), "CERAMICIST · ELEVEN-DAY FIRING · ASH GLAZE", MUTED, small, spacing=2)
save_plate("kyoto-raku.png", image)


# Copenhagen: a winter table seen from above.
image = canvas(INK)
draw = ImageDraw.Draw(image)
# Linen runner.
draw.rectangle(
    [370 * SCALE, 300 * SCALE, 1230 * SCALE, 950 * SCALE],
    fill="#2d2924",
    outline="#554d42",
    width=SCALE,
)
# Plates.
for cx, cy, r in [(610, 555, 190), (945, 555, 190), (610, 815, 120), (945, 815, 120)]:
    draw.ellipse(
        [(cx - r) * SCALE, (cy - r) * SCALE, (cx + r) * SCALE, (cy + r) * SCALE],
        fill=IVORY,
        outline=CREAM,
        width=3 * SCALE,
    )
    draw.ellipse(
        [
            (cx - r + 32) * SCALE,
            (cy - r + 32) * SCALE,
            (cx + r - 32) * SCALE,
            (cy + r - 32) * SCALE,
        ],
        outline="#cfc3af",
        width=SCALE,
    )
# Food gestures in muted tones.
for cx, cy in [(610, 555), (945, 555)]:
    for offset in [(-44, -18), (8, -45), (50, 4), (-6, 42), (-18, 8)]:
        draw.ellipse(
            [
                (cx + offset[0] - 15) * SCALE,
                (cy + offset[1] - 15) * SCALE,
                (cx + offset[0] + 15) * SCALE,
                (cy + offset[1] + 15) * SCALE,
            ],
            fill=CLAY,
        )
    draw.arc(
        [
            (cx - 60) * SCALE,
            (cy - 50) * SCALE,
            (cx + 60) * SCALE,
            (cy + 50) * SCALE,
        ],
        start=205,
        end=335,
        fill=SLATE,
        width=SCALE,
    )
# Cutlery.
for x in [340, 1170]:
    draw.rectangle(
        [x * SCALE, 430 * SCALE, (x + 5) * SCALE, 690 * SCALE],
        fill=CREAM,
    )
    draw.ellipse(
        [(x - 3) * SCALE, 410 * SCALE, (x + 8) * SCALE, 455 * SCALE],
        fill=CREAM,
    )
# Glass and candle.
draw.ellipse(
    [1090 * SCALE, 700 * SCALE, 1200 * SCALE, 860 * SCALE],
    outline="#b9a990",
    width=2 * SCALE,
)
draw.arc(
    [1110 * SCALE, 730 * SCALE, 1180 * SCALE, 830 * SCALE],
    start=200,
    end=340,
    fill="#d8c7ae",
    width=2 * SCALE,
)
draw.rectangle([292 * SCALE, 500 * SCALE, 316 * SCALE, 760 * SCALE], fill=IVORY)
draw.ellipse([287 * SCALE, 470 * SCALE, 321 * SCALE, 535 * SCALE], fill=ACCENT)
# Label sits in the dark negative space.
eyebrow = font(SANS, 12)
spaced_text(draw, (90, 90), "DEMO RECORD", ACCENT, eyebrow, spacing=3)
title_font = font(SERIF, 40)
draw.text((90 * SCALE, 132 * SCALE), "A winter table, Copenhagen", font=title_font, fill=IVORY)
place_font = font(SANS, 14)
spaced_text(draw, (92, 200), "COPENHAGEN, DENMARK · FEBRUARY 2026", "#b8ac9b", place_font, spacing=2)
draw.line(
    [(90 * SCALE, 292 * SCALE), ((W - 90) * SCALE, 292 * SCALE)],
    fill="#5c5348",
    width=SCALE,
)
for x, y in [(90, 1040), (1030, 1040), (1300, 1040)]:
    draw.line([(x * SCALE, y * SCALE), ((x + 55) * SCALE, y * SCALE)], fill=MUTED, width=SCALE)
seal(draw, 1390, 1040, 58)
small = font(SANS, 10)
spaced_text(draw, (92, 1025), "CHEF · EIGHT SEATS · WINTER PRODUCE", MUTED, small, spacing=2)
save_plate("copenhagen-table.png", image)


# Okavango: field notes, sun, acacia, and tracks.
image = canvas(IVORY)
draw = ImageDraw.Draw(image)
draw.rectangle([0, 850 * SCALE, W * SCALE, H * SCALE], fill=SAND)
draw.rectangle([0, 850 * SCALE, W * SCALE, 862 * SCALE], fill="#8e7b65")
# Sun, flat disc.
draw.ellipse([1110 * SCALE, 410 * SCALE, 1320 * SCALE, 620 * SCALE], fill=ACCENT)
# Acacia tree.
trunk = [
    (980 * SCALE, 850 * SCALE),
    (940 * SCALE, 735 * SCALE),
    (910 * SCALE, 600 * SCALE),
    (918 * SCALE, 600 * SCALE),
    (952 * SCALE, 730 * SCALE),
    (1000 * SCALE, 850 * SCALE),
]
draw.polygon(trunk, fill=INK)
for end in [(790, 525), (880, 505), (970, 490), (1070, 505), (1160, 535)]:
    draw.line(
        [(922 * SCALE, 602 * SCALE), (end[0] * SCALE, end[1] * SCALE)],
        fill=INK,
        width=4 * SCALE,
    )
for cx, cy, rx, ry in [
    (760, 515, 140, 32),
    (900, 495, 180, 38),
    (1060, 505, 175, 40),
    (1180, 535, 90, 24),
]:
    draw.ellipse(
        [(cx - rx) * SCALE, (cy - ry) * SCALE, (cx + rx) * SCALE, (cy + ry) * SCALE],
        fill=INK,
    )
# Wild dog silhouette.
body = [
    (600, 805),
    (680, 790),
    (760, 798),
    (790, 812),
    (780, 842),
    (750, 855),
    (700, 860),
    (660, 900),
    (635, 900),
    (645, 860),
    (610, 865),
    (585, 900),
    (560, 900),
    (570, 860),
    (545, 845),
    (548, 815),
]
draw.polygon([(x * SCALE, y * SCALE) for x, y in body], fill=INK)
head = [(790, 812), (835, 790), (870, 802), (865, 830), (830, 846), (790, 842)]
draw.polygon([(x * SCALE, y * SCALE) for x, y in head], fill=INK)
draw.polygon(
    [
        (800 * SCALE, 798 * SCALE),
        (812 * SCALE, 760 * SCALE),
        (824 * SCALE, 798 * SCALE),
    ],
    fill=INK,
)
draw.line([(546 * SCALE, 822 * SCALE), (510 * SCALE, 800 * SCALE)], fill=INK, width=4 * SCALE)
# Tracks.
for base_x in [1040, 1120, 1200, 1280]:
    draw.ellipse(
        [(base_x - 10) * SCALE, 945 * SCALE, (base_x + 4) * SCALE, 972 * SCALE],
        fill="#7e6d5a",
    )
    draw.ellipse(
        [(base_x + 20) * SCALE, 975 * SCALE, (base_x + 34) * SCALE, 1002 * SCALE],
        fill="#7e6d5a",
    )
# Grid label and rule.
eyebrow = font(SANS, 12)
spaced_text(draw, (90, 90), "DEMO RECORD", ACCENT, eyebrow, spacing=3)
title_font = font(SERIF, 40)
draw.text((90 * SCALE, 132 * SCALE), "Tracking wild dogs, Okavango", font=title_font, fill=INK)
place_font = font(SANS, 14)
spaced_text(draw, (92, 200), "OKAVANGO DELTA, BOTSWANA · JULY 2026", MUTED, place_font, spacing=2)
draw.line(
    [(90 * SCALE, 292 * SCALE), ((W - 90) * SCALE, 292 * SCALE)],
    fill="#cfc4b2",
    width=SCALE,
)
seal(draw, 1390, 1040, 58)
small = font(SANS, 10)
spaced_text(draw, (92, 1025), "WILDLIFE GUIDE · TEN FIELD DAYS · PACK OBSERVATION", MUTED, small, spacing=2)
save_plate("okavango-wild-dogs.png", image)

print(f"Wrote three demo plates to {OUT}")
