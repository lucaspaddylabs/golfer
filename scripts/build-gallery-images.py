from PIL import Image
from pathlib import Path

src_dir = Path(r"C:\Users\boogs\.cursor\projects\c-Users-boogs-Documents-paddylabs-golfer\assets")
out_dir = Path(r"c:\Users\boogs\Documents\paddylabs\golfer\assets")

# Attachment order from the user
sources = [
    ("01-852e1aa8-60fe-4ad0-9f28-c7cb34da77ab.jpg", "Perfect grip and swing"),
    ("05-41d78317-846c-4f46-9e80-f7a372950f38.png", "Grip swing listen steps"),
    ("04-be338300-7a8c-4349-8ba4-36ea621c30bf.jpg", "Same grip every swing"),
    ("download-dab091b8-d9c0-4b21-9e0b-5ba25de9b8c5.png", "Fits in golf bag"),
    ("06-c7dea887-3e9a-4426-9ca1-846c79b27a08.jpg", "Dave Ridge verified buyer"),
    ("02-390e5b16-5466-4969-9aa5-dbe0f6a6ada9.jpg", "Hear your release"),
]

sizes = [160, 480, 800, 1200]
widths = []

for i, (name, label) in enumerate(sources, start=1):
    src = src_dir / name
    im = Image.open(src).convert("RGB")
    w, h = im.size
    side = min(w, h)
    left = (w - side) // 2
    top = (h - side) // 2
    im = im.crop((left, top, left + side, top + side))
    if side > 1600:
        im = im.resize((1600, 1600), Image.Resampling.LANCZOS)
        side = 1600
    widths.append(side)

    master = out_dir / f"gn-arc-v2-gallery-{i:02d}.jpg"
    im.save(master, "JPEG", quality=88, optimize=True, progressive=True)
    print(f"{i}: {name} -> {master.name} {side}x{side} ({master.stat().st_size} bytes) [{label}]")

    for s in sizes:
        if s >= side:
            continue
        out = out_dir / f"gn-arc-v2-gallery-{i:02d}-{s}.jpg"
        resized = im.resize((s, s), Image.Resampling.LANCZOS)
        q = 80 if s <= 160 else (82 if s <= 480 else 85)
        resized.save(out, "JPEG", quality=q, optimize=True, progressive=True)
        print(f"   {out.name} {out.stat().st_size}")

print("WIDTHS=" + ",".join(str(x) for x in widths))
