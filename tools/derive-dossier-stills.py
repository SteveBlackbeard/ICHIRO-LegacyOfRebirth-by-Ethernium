#!/usr/bin/env python3
"""Build lightweight, visually coherent dossier stills from archived masters."""

from __future__ import annotations

import argparse
import hashlib
import json
import math
import random
from pathlib import Path

from PIL import Image, ImageDraw, ImageEnhance, ImageFilter, ImageFont, ImageOps


COVER_SIZE = (768, 768)
EVIDENCE_SIZE = (1280, 720)
PROJECT_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_MASTER_ROOT = Path(r"C:\Users\Blackbeard\Documents\ICHIRO FINAL ASSET MASTERS\v267")
DEFAULT_OUTPUT_ROOT = PROJECT_ROOT / "assets" / "dossiers"


def open_rgb(path: Path) -> Image.Image:
    return Image.open(path).convert("RGB")


def split_panels(image: Image.Image, count: int) -> list[Image.Image]:
    width, height = image.size
    return [
        image.crop((round(width * index / count), 0, round(width * (index + 1) / count), height))
        for index in range(count)
    ]


def cover_frame(image: Image.Image, focus=(0.5, 0.5)) -> Image.Image:
    return ImageOps.fit(image, COVER_SIZE, Image.Resampling.LANCZOS, centering=focus)


def evidence_frame(image: Image.Image, fill=0.89) -> Image.Image:
    background = ImageOps.fit(image, EVIDENCE_SIZE, Image.Resampling.LANCZOS)
    background = background.filter(ImageFilter.GaussianBlur(24))
    background = ImageEnhance.Brightness(background).enhance(0.36)

    foreground = ImageOps.contain(
        image,
        (round(EVIDENCE_SIZE[0] * fill), round(EVIDENCE_SIZE[1] * fill)),
        Image.Resampling.LANCZOS,
    )
    x = (EVIDENCE_SIZE[0] - foreground.width) // 2
    y = (EVIDENCE_SIZE[1] - foreground.height) // 2
    background.paste(foreground, (x, y))
    return background


def add_archive_finish(image: Image.Image, accent=(96, 228, 218), seed=1) -> Image.Image:
    image = ImageEnhance.Contrast(image).enhance(1.07)
    image = ImageEnhance.Color(image).enhance(0.94)
    image = ImageEnhance.Sharpness(image).enhance(1.08)
    width, height = image.size

    overlay = Image.new("RGBA", image.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    for y in range(1, height, 4):
        draw.line((0, y, width, y), fill=(8, 11, 14, 16))

    border_alpha = 94 if width > 800 else 78
    draw.rounded_rectangle(
        (8, 8, width - 9, height - 9),
        radius=12,
        outline=(*accent, border_alpha),
        width=2,
    )
    draw.line((24, 24, min(width * 0.34, 260), 24), fill=(*accent, 126), width=2)
    draw.line((width - 160, height - 24, width - 24, height - 24), fill=(*accent, 80), width=1)

    # A tiny deterministic sensor-noise pass prevents flat gradients without
    # introducing a full-screen runtime shader.
    rng = random.Random(seed)
    for _ in range(max(80, width * height // 18000)):
        x = rng.randrange(width)
        y = rng.randrange(height)
        alpha = rng.randrange(10, 30)
        draw.point((x, y), fill=(*accent, alpha))

    image = Image.alpha_composite(image.convert("RGBA"), overlay)

    vignette = Image.new("L", image.size, 255)
    vignette_draw = ImageDraw.Draw(vignette)
    for inset in range(0, min(width, height) // 3, 8):
        value = min(255, 72 + int(inset * 183 / max(1, min(width, height) // 3)))
        vignette_draw.rounded_rectangle(
            (inset, inset, width - inset - 1, height - inset - 1),
            radius=max(0, 22 - inset // 4),
            outline=value,
            width=9,
        )
    vignette = vignette.filter(ImageFilter.GaussianBlur(36))
    dark = Image.new("RGBA", image.size, (0, 0, 0, 116))
    image = Image.composite(image, Image.alpha_composite(image, dark), vignette)
    return image.convert("RGB")


def add_route_overlay(image: Image.Image, points, accent=(96, 228, 218)) -> Image.Image:
    layer = Image.new("RGBA", image.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(layer)
    scaled = [(int(x * image.width), int(y * image.height)) for x, y in points]
    draw.line(scaled, fill=(*accent, 170), width=max(3, image.width // 260), joint="curve")
    for index, (x, y) in enumerate(scaled):
        radius = 8 + (index % 2) * 3
        draw.ellipse((x - radius, y - radius, x + radius, y + radius), outline=(*accent, 220), width=3)
        draw.ellipse((x - 2, y - 2, x + 2, y + 2), fill=(240, 255, 252, 230))
    return Image.alpha_composite(image.convert("RGBA"), layer).convert("RGB")


def add_waveform(image: Image.Image) -> Image.Image:
    layer = Image.new("RGBA", image.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(layer)
    center = int(image.height * 0.72)
    points = []
    for x in range(40, image.width - 40, 3):
        phase = x / image.width
        envelope = math.sin(math.pi * phase) ** 1.4
        y = center + int(
            (math.sin(x * 0.079) + 0.52 * math.sin(x * 0.193)) * 34 * envelope
        )
        points.append((x, y))
    draw.line(points, fill=(255, 151, 52, 214), width=3)
    draw.line((40, center, image.width - 40, center), fill=(96, 228, 218, 72), width=1)
    return Image.alpha_composite(image.convert("RGBA"), layer).convert("RGB")


def add_damage(image: Image.Image, seed=3) -> Image.Image:
    rng = random.Random(seed)
    layer = Image.new("RGBA", image.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(layer)
    for _ in range(14):
        x = rng.randint(20, image.width - 20)
        y = rng.randint(20, image.height - 20)
        length = rng.randint(14, 78)
        draw.line((x, y, x + length, y + rng.randint(-6, 6)), fill=(240, 247, 244, 34), width=1)
    for _ in range(4):
        y = rng.randint(40, image.height - 40)
        draw.rectangle((0, y, image.width, y + rng.randint(2, 7)), fill=(255, 86, 55, rng.randint(16, 32)))
    return Image.alpha_composite(image.convert("RGBA"), layer).convert("RGB")


def make_signature_crop(passport: Image.Image) -> Image.Image:
    width, height = passport.size
    crop = passport.crop((int(width * 0.39), int(height * 0.78), int(width * 0.88), int(height * 0.96)))
    frame = evidence_frame(crop, fill=0.78)
    return add_damage(frame, 33)


def make_collage(images: list[Image.Image]) -> Image.Image:
    canvas = Image.new("RGB", EVIDENCE_SIZE, (4, 6, 8))
    slots = [
        (0, 0, 640, 360),
        (640, 0, 1280, 360),
        (0, 360, 640, 720),
        (640, 360, 1280, 720),
    ]
    for image, box in zip(images, slots):
        tile = ImageOps.fit(
            image,
            (box[2] - box[0], box[3] - box[1]),
            Image.Resampling.LANCZOS,
        )
        canvas.paste(tile, (box[0], box[1]))
    seams = Image.new("RGBA", EVIDENCE_SIZE, (0, 0, 0, 0))
    draw = ImageDraw.Draw(seams)
    draw.line((640, 0, 640, 720), fill=(96, 228, 218, 130), width=2)
    draw.line((0, 360, 1280, 360), fill=(96, 228, 218, 130), width=2)
    return Image.alpha_composite(canvas.convert("RGBA"), seams).convert("RGB")


def make_charm(symbol: Image.Image) -> Image.Image:
    canvas = Image.new("RGBA", EVIDENCE_SIZE, (3, 4, 6, 255))
    alpha = symbol.getchannel("A")
    alpha = ImageOps.fit(alpha, (390, 390), Image.Resampling.LANCZOS)
    glow_alpha = alpha.filter(ImageFilter.GaussianBlur(28))
    glow = Image.new("RGBA", alpha.size, (255, 164, 38, 0))
    glow.putalpha(glow_alpha.point(lambda value: round(value * 0.42)))
    x = (canvas.width - alpha.width) // 2
    y = (canvas.height - alpha.height) // 2
    canvas.alpha_composite(glow, (x, y))

    metal = Image.new("RGBA", alpha.size, (0, 0, 0, 0))
    metal_draw = ImageDraw.Draw(metal)
    for row in range(alpha.height):
        mix = row / max(1, alpha.height - 1)
        value = round(235 - 82 * math.sin(mix * math.pi))
        metal_draw.line((0, row, alpha.width, row), fill=(value, round(value * 0.76), 72, 255))
    metal.putalpha(alpha)
    canvas.alpha_composite(metal, (x, y))

    frame_draw = ImageDraw.Draw(canvas)
    radius = 230
    center = (canvas.width // 2, canvas.height // 2)
    frame_draw.ellipse(
        (center[0] - radius, center[1] - radius, center[0] + radius, center[1] + radius),
        outline=(255, 197, 91, 132),
        width=5,
    )
    return canvas.convert("RGB")


def make_wall_inscription(wall: Image.Image) -> Image.Image:
    canvas = evidence_frame(wall)
    layer = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(layer)
    font_path = Path(r"C:\Windows\Fonts\consolab.ttf")
    font = ImageFont.truetype(str(font_path), 30)
    small = ImageFont.truetype(str(font_path), 18)
    panel = (100, 166, 925, 548)
    draw.rounded_rectangle(panel, radius=8, fill=(4, 5, 6, 176), outline=(238, 239, 231, 92), width=2)
    draw.text((145, 222), "HE WAS NOT BUILT TO SAVE US.", font=font, fill=(232, 232, 222, 224))
    draw.text((145, 274), "HE CHOSE TO.", font=font, fill=(255, 132, 75, 238))
    draw.line((145, 334, 738, 334), fill=(96, 228, 218, 112), width=2)
    draw.text((145, 365), "THEN WHY DID KPCO CLOSE THE ROADS?", font=small, fill=(199, 205, 201, 184))
    return Image.alpha_composite(canvas.convert("RGBA"), layer).convert("RGB")


def save_webp(image: Image.Image, path: Path, budget: int, start_quality=84) -> dict:
    path.parent.mkdir(parents=True, exist_ok=True)
    quality = start_quality
    while quality >= 54:
        image.save(path, "WEBP", quality=quality, method=6)
        if path.stat().st_size <= budget:
            break
        quality -= 3
    if path.stat().st_size > budget:
        raise RuntimeError(f"{path.name} exceeds {budget} bytes at quality {quality}")
    digest = hashlib.sha256(path.read_bytes()).hexdigest()
    return {
        "path": path.relative_to(PROJECT_ROOT).as_posix(),
        "bytes": path.stat().st_size,
        "quality": quality,
        "sha256": digest,
        "size": list(image.size),
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--masters", type=Path, default=DEFAULT_MASTER_ROOT)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT_ROOT)
    parser.add_argument(
        "--manifest",
        type=Path,
        default=Path(__file__).resolve().parents[1] / "reports" / "dossier-stills-v267.json",
    )
    args = parser.parse_args()
    masters = args.masters
    output = args.output

    d03_portrait = open_rgb(masters / "dossier-03" / "keigami-portrait-master.png")
    d03_passport = open_rgb(masters / "dossier-03" / "keigami-passport-master.png")
    d04 = split_panels(open_rgb(masters / "dossier-04" / "child-training-triptych-master.png"), 3)
    d05_lumen = open_rgb(masters / "dossier-05" / "lumen-master.png")
    d06_map = open_rgb(masters / "dossier-06" / "new-eden-map-master.jpg")
    d06_drone = open_rgb(masters / "dossier-06" / "chibi-go-drone-master.png")
    d07 = split_panels(open_rgb(masters / "dossier-07" / "kira-statement-triptych-master.png"), 3)
    d08 = split_panels(open_rgb(masters / "dossier-08" / "aira-reconstruction-triptych-master.png"), 3)
    d09_map = open_rgb(masters / "dossier-09" / "new-eden-tactical-master.jpg")
    d10_prisma = open_rgb(masters / "dossier-10" / "prisma-city-master.png")
    d10_spice = open_rgb(masters / "dossier-10" / "spice-alley-master.webp")
    d10_ramen = open_rgb(masters / "dossier-10" / "boon-ramen-master.png")
    d10_rumors = split_panels(open_rgb(masters / "dossier-10" / "public-rumors-quadtych-master.png"), 4)
    symbol = Image.open(
        Path(__file__).resolve().parents[1] / "assets" / "brand" / "kpr-logo-symbol.png"
    ).convert("RGBA")

    stills: dict[str, tuple[Image.Image, int, tuple[int, int, int], int]] = {
        "dossier-03-cover.webp": (cover_frame(d03_portrait, (0.5, 0.34)), 180 * 1024, (226, 226, 218), 3),
        "dossier-03-evidence-01.webp": (evidence_frame(d03_passport, 0.93), 700 * 1024, (96, 166, 255), 31),
        "dossier-03-evidence-02.webp": (make_signature_crop(d03_passport), 700 * 1024, (255, 102, 78), 32),
        "dossier-04-cover.webp": (cover_frame(d04[0], (0.5, 0.44)), 180 * 1024, (255, 153, 68), 4),
        "dossier-04-evidence-01.webp": (evidence_frame(d04[1]), 700 * 1024, (255, 153, 68), 41),
        "dossier-04-evidence-02.webp": (evidence_frame(d04[2]), 700 * 1024, (255, 153, 68), 42),
        "dossier-05-cover.webp": (cover_frame(d05_lumen, (0.51, 0.48)), 180 * 1024, (255, 154, 52), 5),
        "dossier-05-evidence-01.webp": (add_waveform(evidence_frame(d05_lumen)), 700 * 1024, (255, 154, 52), 51),
        "dossier-06-cover.webp": (cover_frame(d06_map, (0.56, 0.53)), 180 * 1024, (96, 228, 218), 6),
        "dossier-06-evidence-01.webp": (
            add_route_overlay(evidence_frame(d06_map), [(0.18, 0.77), (0.35, 0.61), (0.53, 0.54), (0.72, 0.36)]),
            700 * 1024,
            (96, 228, 218),
            61,
        ),
        "dossier-06-evidence-02.webp": (evidence_frame(d06_drone, 0.74), 700 * 1024, (255, 207, 88), 62),
        "dossier-07-cover.webp": (cover_frame(d07[0], (0.5, 0.38)), 180 * 1024, (208, 157, 255), 7),
        "dossier-07-evidence-01.webp": (evidence_frame(d07[1]), 700 * 1024, (208, 157, 255), 71),
        "dossier-07-evidence-02.webp": (add_damage(evidence_frame(d07[2]), 73), 700 * 1024, (208, 157, 255), 72),
        "dossier-08-cover.webp": (cover_frame(d08[0], (0.5, 0.37)), 180 * 1024, (96, 228, 218), 8),
        "dossier-08-evidence-01.webp": (evidence_frame(d08[1]), 700 * 1024, (96, 228, 218), 81),
        "dossier-08-evidence-02.webp": (evidence_frame(d08[2]), 700 * 1024, (255, 157, 77), 82),
        "dossier-09-cover.webp": (cover_frame(d09_map, (0.61, 0.60)), 180 * 1024, (255, 88, 58), 9),
        "dossier-09-evidence-01.webp": (
            add_route_overlay(evidence_frame(d09_map), [(0.13, 0.70), (0.31, 0.59), (0.50, 0.49), (0.72, 0.45), (0.86, 0.24)], (255, 88, 58)),
            700 * 1024,
            (255, 88, 58),
            91,
        ),
        "dossier-10-cover.webp": (cover_frame(d10_spice, (0.5, 0.52)), 180 * 1024, (208, 157, 255), 10),
        "dossier-10-evidence-01.webp": (
            make_collage([d10_prisma, d10_spice, d10_ramen, d10_rumors[2]]),
            700 * 1024,
            (208, 157, 255),
            101,
        ),
        "dossier-10-evidence-02.webp": (make_wall_inscription(d10_rumors[2]), 700 * 1024, (96, 228, 218), 102),
        "dossier-10-evidence-03.webp": (evidence_frame(d10_ramen, 0.86), 700 * 1024, (255, 154, 52), 103),
        "dossier-10-evidence-04.webp": (make_charm(symbol), 700 * 1024, (255, 215, 118), 104),
        "dossier-10-evidence-05.webp": (evidence_frame(d10_rumors[0]), 700 * 1024, (208, 157, 255), 105),
        "dossier-10-evidence-06.webp": (evidence_frame(d10_rumors[1]), 700 * 1024, (226, 226, 218), 106),
        "dossier-10-evidence-07.webp": (evidence_frame(d10_rumors[2]), 700 * 1024, (255, 154, 52), 107),
        "dossier-10-evidence-08.webp": (evidence_frame(d10_rumors[3]), 700 * 1024, (255, 88, 58), 108),
    }

    manifest = []
    for filename, (image, budget, accent, seed) in stills.items():
        finished = add_archive_finish(image, accent=accent, seed=seed)
        manifest.append(save_webp(finished, output / filename, budget))

    args.manifest.parent.mkdir(parents=True, exist_ok=True)
    args.manifest.write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    total = sum(item["bytes"] for item in manifest)
    print(f"Generated {len(manifest)} dossier stills ({total / 1024 / 1024:.2f} MiB)")


if __name__ == "__main__":
    main()
