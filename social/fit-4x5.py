#!/usr/bin/env python3
"""Fit images to 1080×1350 (4:5 Instagram portrait) on black canvas.
Landscape/wide images: letterboxed with black bars top & bottom.
Portrait/square images: zoomed to fill more of the frame.
"""
from PIL import Image
import os, glob

W, H = 1080, 1350
TARGET_RATIO = W / H  # 0.8

def process(src, dst):
    img = Image.open(src).convert("RGB")
    iw, ih = img.size
    ratio = iw / ih

    if ratio > 1.2:
        # Landscape — letterbox, scale to fit width
        scale = W / iw
        new_w, new_h = W, round(ih * scale)
    elif ratio < 0.9:
        # Portrait — zoom to fill width, crop height if needed
        scale = W / iw
        new_w = W
        new_h = round(ih * scale)
        if new_h > H:
            # Too tall, crop from center
            img_resized = img.resize((new_w, new_h), Image.LANCZOS)
            top = (new_h - H) // 2
            img_cropped = img_resized.crop((0, top, W, top + H))
            canvas = Image.new("RGB", (W, H), (255, 255, 255))
            canvas.paste(img_cropped, (0, 0))
            canvas.save(dst, quality=95)
            print(f"  portrait-crop: {os.path.basename(src)}")
            return
    else:
        # Square-ish — zoom in a bit more, fill ~85% of frame height
        target_h = int(H * 0.85)
        scale = target_h / ih
        new_w = round(iw * scale)
        new_h = target_h
        if new_w > W:
            scale = W / iw
            new_w = W
            new_h = round(ih * scale)

    img_resized = img.resize((new_w, new_h), Image.LANCZOS)
    canvas = Image.new("RGB", (W, H), (255, 255, 255))
    x = (W - new_w) // 2
    y = (H - new_h) // 2
    canvas.paste(img_resized, (x, y))
    canvas.save(dst, quality=95)
    kind = "landscape" if ratio > 1.2 else "square-ish"
    print(f"  {kind}: {os.path.basename(src)}")

for folder in ["post1-work", "post2-bts"]:
    print(f"\n{folder}/")
    for f in sorted(glob.glob(os.path.join(folder, "*"))):
        if f.lower().endswith((".png", ".jpg", ".jpeg")):
            process(f, f)

print("\nDone — all images are now 1080×1350.")
