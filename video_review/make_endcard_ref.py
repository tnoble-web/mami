#!/usr/bin/env python3
"""
Build a corrected end-card reference at 1080x1920 from the assets already in
the exported frame, so the logo and store badges stay pixel-exact.

What changes vs the current card:
  * badge + legal block lifted out of the bottom 320px platform-UI zone
  * "CPOS is not a bank." promoted to its own legible line
  * Apple attribution corrected ("App Store" is a service mark, not a trademark)
  * missing terminal period after "Google LLC" added

Outputs endcard_corrected.png and endcard_guides.png next to the source frame.
"""

import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFont

SRC = Path(sys.argv[1] if len(sys.argv) > 1 else
           "/home/user/mami/video_review/endcard/full_1080.png")
OUT_DIR = SRC.parent
W, H = 1080, 1920

# Bottom band the platforms cover with caption / username / action buttons /
# the ad CTA. Nothing legible should sit below this line.
SAFE_BOTTOM = 1600

# Measured element boxes in the source frame (left, top, right, bottom).
LOGO_BLOCK = (208, 470, 872, 1125)   # mark + "Download CPOS" + cpos.com
BADGES     = (263, 1545, 817, 1637)  # both store badges, one strip

FONT = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
FONT_B = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"

DISCLOSURE = "CPOS is not a bank."
ATTRIBUTION = [
    "© 2026 CPOS",
    "App Store is a service mark of Apple Inc., registered in the U.S.",
    "and other countries and regions. Google Play and the Google Play",
    "logo are trademarks of Google LLC.",
]


def ink_colour(arr, box):
    """Darkest representative colour inside a box — the text ink."""
    l, t, r, b = box
    region = arr[t:b, l:r].reshape(-1, 3)
    return tuple(int(v) for v in region[region.sum(axis=1).argmin()])


def main():
    src = Image.open(SRC).convert("RGB")
    arr = np.array(src).astype(int)

    bg = tuple(int(v) for v in arr[5, 5])
    body_ink = ink_colour(arr, (208, 1691, 870, 1745))   # legal text colour
    brand_ink = ink_colour(arr, (252, 983, 830, 1041))   # wordmark colour

    logo = src.crop(LOGO_BLOCK)
    badges = src.crop(BADGES)

    card = Image.new("RGB", (W, H), bg)
    draw = ImageDraw.Draw(card)

    # Logo lockup keeps its original position — it was well placed.
    card.paste(logo, (LOGO_BLOCK[0], LOGO_BLOCK[1]))

    # Badges lift ~295px into the dead white gap under the wordmark.
    badge_y = 1250
    card.paste(badges, (BADGES[0], badge_y))
    badge_bottom = badge_y + badges.height

    # Required disclosure gets its own line at a size someone can actually read.
    f_disc = ImageFont.truetype(FONT_B, 34)
    disc_y = badge_bottom + 56
    tw = draw.textlength(DISCLOSURE, font=f_disc)
    draw.text(((W - tw) / 2, disc_y), DISCLOSURE, font=f_disc, fill=brand_ink)

    # Trademark attribution stays small; it only has to be present.
    f_attr = ImageFont.truetype(FONT, 22)
    y = disc_y + 34 + 30
    for line in ATTRIBUTION:
        tw = draw.textlength(line, font=f_attr)
        draw.text(((W - tw) / 2, y), line, font=f_attr, fill=body_ink)
        y += 29

    card.save(OUT_DIR / "endcard_corrected.png")
    print(f"content ends at y={int(y)}  (safe line {SAFE_BOTTOM})")
    assert y < SAFE_BOTTOM, "layout still crosses the safe line"

    # ---- annotated version, current vs corrected -------------------------
    guides = Image.new("RGB", (W * 2 + 60, H + 130), (24, 24, 28))
    gd = ImageDraw.Draw(guides)
    f_lab = ImageFont.truetype(FONT_B, 30)
    f_note = ImageFont.truetype(FONT, 24)

    for idx, (img, label) in enumerate(((src, "CURRENT"), (card, "CORRECTED"))):
        x0 = 20 + idx * (W + 20)
        panel = img.copy()
        pd = ImageDraw.Draw(panel, "RGBA")
        # red wash over the zone platform UI covers
        pd.rectangle([0, SAFE_BOTTOM, W, H], fill=(220, 40, 40, 70))
        pd.line([0, SAFE_BOTTOM, W, SAFE_BOTTOM], fill=(220, 40, 40), width=5)
        pd.text((16, SAFE_BOTTOM + 12), "platform UI zone (bottom 320px)",
                font=f_note, fill=(150, 20, 20))
        guides.paste(panel, (x0, 60))
        gd.text((x0, 16), label, font=f_lab, fill=(240, 240, 245))

    gd.text((20 + W + 20, H + 66),
            "badges + legal lifted clear; disclosure enlarged; Apple wording fixed",
            font=f_note, fill=(150, 150, 160))
    guides.save(OUT_DIR / "endcard_guides.png")
    print("wrote endcard_corrected.png and endcard_guides.png")


if __name__ == "__main__":
    main()
