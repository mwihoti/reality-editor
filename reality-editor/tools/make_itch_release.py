#!/usr/bin/env python3
"""Build the itch.io release assets for Reality Editor.

    python3 tools/make_itch_release.py

Writes into dist/:
    RealityEditor_web.zip     the HTML5 build (index.html at the top level)
    itch-media/cover.png      630x500 cover
    itch-media/shot-*.png     page screenshots
"""

import shutil
import zipfile
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
DIST = ROOT / "dist"
MEDIA = DIST / "itch-media"
BUILD = DIST / "build"
ZIP = DIST / "RealityEditor_web.zip"

RUNTIME = ["index.html"]
SRC = sorted((ROOT / "src").glob("*.js"))
SHOTS = ["shot-wall.png", "shot-gap.png", "shot-final.png", "shot-won.png", "shot-title.png"]

FONT_CANDIDATES = [
    "/usr/share/fonts/TTF/JetBrainsMonoNerdFontMono-Bold.ttf",
    "/usr/share/fonts/TTF/JetBrainsMonoNLNerdFontPropo-Bold.ttf",
    "/usr/share/fonts/noto/NotoSansMono-Bold.ttf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSansMono-Bold.ttf",
]


def font(size):
    for path in FONT_CANDIDATES:
        if Path(path).exists():
            return ImageFont.truetype(path, size)
    return ImageFont.load_default()


def build_files():
    if BUILD.exists():
        shutil.rmtree(BUILD)
    (BUILD / "src").mkdir(parents=True)
    for name in RUNTIME:
        shutil.copy2(ROOT / name, BUILD / name)
    for js in SRC:
        shutil.copy2(js, BUILD / "src" / js.name)

    if ZIP.exists():
        ZIP.unlink()
    with zipfile.ZipFile(ZIP, "w", zipfile.ZIP_DEFLATED) as z:
        for path in sorted(BUILD.rglob("*")):
            if path.is_file():
                z.write(path, path.relative_to(BUILD))
    return ZIP


def make_cover():
    MEDIA.mkdir(parents=True, exist_ok=True)
    cover = Image.new("RGB", (630, 500), (15, 12, 22))
    draw = ImageDraw.Draw(cover)

    art = Image.open(ROOT / "shot-title.png").convert("RGB")
    art = art.resize((630, round(art.height * 630 / art.width)), Image.LANCZOS)
    cover.paste(art, (0, 26))

    # soften the seam under the screenshot
    for y in range(26 + art.height - 40, 26 + art.height):
        draw.line([(0, y), (630, y)], fill=(15, 12, 22), width=1)

    draw.text((630 // 2, 414), "CUT  \u00b7  REWIND  \u00b7  MAKE THE EXIT",
              font=font(19), fill=(255, 107, 129), anchor="mm")
    draw.text((630 // 2, 452), "A THREE-SCENE PUZZLE PLATFORMER IN THE BROWSER",
              font=font(11), fill=(196, 186, 168), anchor="mm")

    out = MEDIA / "cover.png"
    cover.save(out, optimize=True)
    return out


def copy_shots():
    made = []
    for name in SHOTS:
        src = ROOT / name
        if not src.exists():
            continue
        img = Image.open(src).convert("RGB")
        img = img.resize((1280, 720), Image.LANCZOS)
        out = MEDIA / name.replace("shot-", "screen-")
        img.save(out, optimize=True)
        made.append(out)
    return made


if __name__ == "__main__":
    zip_path = build_files()
    cover = make_cover()
    shots = copy_shots()
    print(f"zip    {zip_path}  ({zip_path.stat().st_size / 1024:.0f} KiB)")
    with zipfile.ZipFile(zip_path) as z:
        names = z.namelist()
    print("       contains:", ", ".join(names))
    print(f"cover  {cover}  ({cover.stat().st_size / 1024:.0f} KiB)")
    for s in shots:
        print(f"shot   {s}  ({s.stat().st_size / 1024:.0f} KiB)")
