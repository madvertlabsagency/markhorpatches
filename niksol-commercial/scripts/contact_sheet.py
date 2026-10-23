"""Render review stills at given times and tile them into contact sheets."""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from PIL import Image
from render import render_frame
out = sys.argv[1]; times = [float(x) for x in sys.argv[2:]]
os.makedirs(out, exist_ok=True)
ims = []
for t in times:
    im = render_frame(t); im.save(os.path.join(out, f"f_{t:05.2f}.png")); ims.append(im.resize((270, 480)))
for k in range(0, len(ims), 10):
    sheet = Image.new("RGB", (270 * 5, 480 * 2))
    for i, im in enumerate(ims[k:k + 10]):
        sheet.paste(im, ((i % 5) * 270, (i // 5) * 480))
    sheet.save(os.path.join(out, f"sheet{k // 10}.jpg"), quality=88)
