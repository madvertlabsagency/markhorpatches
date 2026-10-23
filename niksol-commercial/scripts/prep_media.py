"""Decode source clips into 25 fps raw RGB caches the renderer can memory-map.

Flow clips (720x1280 @ 24 fps) are upscaled to 1080x1920.
Real footage (4096x2160) is scaled to 1920 px height, keeping its full width
so the renderer can pan a vertical window across it.
Source audio is discarded (Flow clips carry generated audio we must not use).
"""
import json
import os
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CACHE = os.path.join(ROOT, "cache")
GRADE = "eq=contrast=1.04:saturation=1.05:gamma=0.98"

CLIPS = {
    "flow_light_motion": ("assets/video/flow_light_motion.mp4", 1080, 1920),
    "flow_blueprint_bg": ("assets/video/flow_blueprint_bg.mp4", 1080, 1920),
    "flow_blueprint_panels": ("assets/video/flow_blueprint_panels.mp4", 1080, 1920),
    "flow_line_transition": ("assets/video/flow_line_transition.mp4", 1080, 1920),
    "flow_dashboard": ("assets/video/flow_dashboard.mp4", 1080, 1920),
    "flow_dashboard_b": ("assets/video/flow_dashboard_b.mp4", 1080, 1920),
    "flow_dashboard_c": ("assets/video/flow_dashboard_c.mp4", 1080, 1920),
    # three.js motion-graphics plates rendered by mg/render_mg.mjs (already 1080x1920 @ 25 fps)
    "mg_panels": ("assets/video/mg_panels.mp4", 1080, 1920),
    "mg_build": ("assets/video/mg_build.mp4", 1080, 1920),
    "mg_inverter": ("assets/video/mg_inverter.mp4", 1080, 1920),
    # Real project footage, cached near native size; the renderer crops a
    # 9:16 window per frame (pan / push-in) and upscales it.
    "real_035": ("assets/video/real_035.mp4", 2048, 1080),
    "real_yusuf": ("assets/video/real_yusuf.mp4", 1816, 836),
}


def main(names):
    os.makedirs(CACHE, exist_ok=True)
    meta_path = os.path.join(CACHE, "meta.json")
    meta = json.load(open(meta_path)) if os.path.exists(meta_path) else {}
    for name in names or CLIPS:
        src, w, h = CLIPS[name]
        out = os.path.join(CACHE, name + ".rgb")
        if os.path.exists(out) and name in meta:
            continue
        vf = f"fps=25,scale={w}:{h}:flags=lanczos,{GRADE}"
        if name.startswith("real_"):
            vf += ",unsharp=5:5:0.5"
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", os.path.join(ROOT, src), "-an",
                        "-vf", vf, "-f", "rawvideo", "-pix_fmt", "rgb24", out], check=True)
        n = os.path.getsize(out) // (w * h * 3)
        meta[name] = {"w": w, "h": h, "n": n}
        print(name, meta[name])
        json.dump(meta, open(meta_path, "w"), indent=1)


if __name__ == "__main__":
    main(sys.argv[1:])
