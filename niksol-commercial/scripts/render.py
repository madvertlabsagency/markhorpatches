"""Niksol Energy 9:16 commercial: frame renderer (motion as code).

Each frame is a pure function of time t. Scenes and text reveals key off the
voiceover anchors in timeline.py, so picture stays locked to the voice.

Usage:
  python3 scripts/render.py frame <t> <out.png>        # single still for review
  python3 scripts/render.py segment <f0> <f1> <out.mp4> # render frame range
"""
import functools
import json
import math
import os
import subprocess
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from timeline import A, DURATION, FPS, H, SCENES, W  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CACHE = os.path.join(ROOT, "cache")
IMG = os.path.join(ROOT, "assets", "images")
FONTS = "/usr/share/fonts/opentype/inter/"

NAVY = (6, 21, 47)
DBLUE = (8, 35, 75)
BLUE = (0, 141, 255)
CYAN = (0, 217, 255)
GOLD = (255, 196, 0)
WHITE = (255, 255, 255)
SILVER = (220, 229, 240)

# Safe area for Meta Reels: keep key content between these y values.
SAFE_TOP, SAFE_BOTTOM = 270, 1180
MAX_TEXT_W = 960  # 60 px side margins


# ----------------------------------------------------------------- easing
def clamp(x, a=0.0, b=1.0):
    return a if x < a else b if x > b else x


def prog(t, t0, dur):
    return clamp((t - t0) / dur) if dur > 0 else float(t >= t0)


def ease_out(p):
    return 1 - (1 - p) ** 3


def ease_in_out(p):
    return 3 * p * p - 2 * p * p * p


def ease_out_back(p, s=1.2):
    p -= 1
    return 1 + (s + 1) * p ** 3 + s * p ** 2


# ----------------------------------------------------------------- media
@functools.lru_cache(maxsize=None)
def _meta():
    return json.load(open(os.path.join(CACHE, "meta.json")))


@functools.lru_cache(maxsize=None)
def _mm(name):
    m = _meta()[name]
    return np.memmap(os.path.join(CACHE, name + ".rgb"), dtype=np.uint8, mode="r",
                     shape=(m["n"], m["h"], m["w"], 3))


def src_frame(name, ts):
    """Frame of a cached clip at source time ts (s), blended for slow motion."""
    mm = _mm(name)
    f = clamp(ts * FPS, 0, mm.shape[0] - 1)
    i = int(f)
    fr = f - i
    if fr < 0.15 or i + 1 >= mm.shape[0]:
        return np.asarray(mm[i])
    if fr > 0.85:
        return np.asarray(mm[i + 1])
    a = mm[i].astype(np.uint16) * int((1 - fr) * 256) + mm[i + 1].astype(np.uint16) * int(fr * 256)
    return (a >> 8).astype(np.uint8)


def plate(name, ts, zoom=1.0, cx=0.5, cy=0.5):
    """Full-frame 1080x1920 plate from a clip. For wide (real) footage a 9:16
    window is cropped; zoom > 1 pushes in; (cx, cy) is the window centre in
    normalised source coordinates."""
    arr = src_frame(name, ts)
    sh, sw = arr.shape[:2]
    zoom = max(zoom, 1.0)
    ch = sh / zoom
    cw = ch * W / H
    if cw > sw:
        cw = sw
        ch = cw * H / W
    x0 = clamp(cx * sw - cw / 2, 0, sw - cw)
    y0 = clamp(cy * sh - ch / 2, 0, sh - ch)
    im = Image.fromarray(arr)
    if abs(cw - W) < 1 and abs(ch - H) < 1:
        return im.convert("RGB")
    return im.resize((W, H), Image.BICUBIC, box=(x0, y0, min(sw, x0 + cw), min(sh, y0 + ch)))


def darken(im, k, color=NAVY):
    """Blend toward navy by k (0..1)."""
    if k <= 0:
        return im
    return Image.blend(im, Image.new("RGB", im.size, color), k)


@functools.lru_cache(maxsize=None)
def find_image(stem):
    for ext in (".png", ".webp", ".jpg", ".jpeg"):
        p = os.path.join(IMG, stem + ext)
        if os.path.exists(p):
            return p
    return None


@functools.lru_cache(maxsize=None)
def load_rgba(stem):
    p = find_image(stem)
    return Image.open(p).convert("RGBA") if p else None


@functools.lru_cache(maxsize=None)
def logo_rgba():
    """Official logo is supplied on black: convert black to transparency
    (colour-to-alpha) so it sits cleanly on any background without
    altering the mark's colours."""
    a = np.asarray(Image.open(find_image("logo_niksol")).convert("RGB")).astype(np.float32)
    alpha = a.max(axis=2)
    alpha = np.clip((alpha - 18) / (255 - 18), 0, 1)
    rgb = np.where(alpha[..., None] > 0.01, a / np.maximum(alpha[..., None], 1e-3), 0)
    rgb = np.clip(rgb, 0, 255)
    out = np.dstack([rgb, alpha * 255]).astype(np.uint8)
    im = Image.fromarray(out, "RGBA")
    return im.crop(im.getbbox())


# ----------------------------------------------------------------- text
@functools.lru_cache(maxsize=None)
def font(name, size):
    return ImageFont.truetype(FONTS + name, size)


HEAD = "InterDisplay-Black.otf"
BOLD = "InterDisplay-ExtraBold.otf"
SEMI = "Inter-SemiBold.otf"
MED = "Inter-Medium.otf"


@functools.lru_cache(maxsize=None)
def _grad(h, style):
    y = np.linspace(0, 1, h)[:, None]
    if style == "metal":  # polished metallic: bright top, cool silver lower band
        top = np.array([255, 255, 255]); mid = np.array([214, 224, 238]); bot = np.array([168, 182, 204])
        c = np.where(y < 0.55, top + (mid - top) * (y / 0.55), mid + (bot - mid) * ((y - 0.55) / 0.45))
    elif style == "blue":
        top = np.array([90, 220, 255]); bot = np.array([0, 120, 255])
        c = top + (bot - top) * y
    elif style == "gold":
        top = np.array([255, 222, 90]); bot = np.array([255, 170, 0])
        c = top + (bot - top) * y
    else:
        c = np.ones_like(y) * np.array(style)
    return c.astype(np.uint8)


@functools.lru_cache(maxsize=4096)
def text_img(txt, fname, size, style="metal", track=0, glow=0, shadow=True):
    """Rendered text as tight RGBA. style: metal | blue | gold | (r,g,b)."""
    f = font(fname, size)
    # measure with tracking
    widths = [f.getlength(ch) for ch in txt]
    tw = int(sum(widths) + track * max(len(txt) - 1, 0)) + 4
    asc, desc = f.getmetrics()
    th = asc + desc
    pad = max(glow * 3, 12)
    mask = Image.new("L", (tw + pad * 2, th + pad * 2), 0)
    d = ImageDraw.Draw(mask)
    x = pad
    for ch, w in zip(txt, widths):
        d.text((x, pad), ch, font=f, fill=255)
        x += w + track
    grad = _grad(th + pad * 2, style if isinstance(style, str) else tuple(style))
    fill = np.broadcast_to(grad[:, None, :], (th + pad * 2, tw + pad * 2, 3))
    out = Image.new("RGBA", mask.size, (0, 0, 0, 0))
    if shadow:
        sh = mask.filter(ImageFilter.GaussianBlur(max(3, size // 14)))
        sha = Image.new("RGBA", mask.size, (2, 8, 20, 0))
        sha.putalpha(sh.point(lambda v: int(v * 0.85)))
        out = Image.alpha_composite(out, sha)
    if glow:
        gl = mask.filter(ImageFilter.GaussianBlur(glow))
        gc = BLUE if style != "gold" else (255, 150, 0)
        gli = Image.new("RGBA", mask.size, gc + (0,))
        gli.putalpha(gl.point(lambda v: int(min(255, v * 1.1))))
        out = Image.alpha_composite(out, gli)
    txt_layer = Image.fromarray(np.ascontiguousarray(fill), "RGB").convert("RGBA")
    txt_layer.putalpha(mask)
    out = Image.alpha_composite(out, txt_layer)
    bb = out.getbbox()
    out = out.crop(bb) if bb else out
    if out.width > MAX_TEXT_W:  # keep every headline inside the side margins
        out = out.resize((MAX_TEXT_W, int(out.height * MAX_TEXT_W / out.width)), Image.LANCZOS)
    return out


def with_alpha(im, k):
    if k >= 0.999:
        return im
    im = im.copy()
    a = im.getchannel("A").point(lambda v: int(v * k))
    im.putalpha(a)
    return im


def paste(canvas, im, x, y, anchor="c", alpha=1.0):
    """Paste RGBA onto RGB canvas. anchor: c (centre), l (left-centre), r."""
    if alpha <= 0.003 or im is None:
        return
    w, h = im.size
    if anchor == "c":
        x0, y0 = x - w // 2, y - h // 2
    elif anchor == "l":
        x0, y0 = x, y - h // 2
    elif anchor == "r":
        x0, y0 = x - w, y - h // 2
    else:
        x0, y0 = x, y
    im = with_alpha(im, alpha)
    canvas.paste(im, (int(x0), int(y0)), im)


def wipe_text(canvas, im, x, y, t, t0, dur=0.45, anchor="c", alpha=1.0, line=True, exit_t=None,
              exit_dur=0.3):
    """Masked left-to-right reveal with a thin cyan leading edge, plus a
    subtle tracking-style drift. Optional fade/slide exit."""
    if t < t0:
        return
    p = ease_out(prog(t, t0, dur))
    k = alpha
    dy = 0
    if exit_t is not None and t > exit_t:
        e = ease_in_out(prog(t, exit_t, exit_dur))
        k *= 1 - e
        dy = -30 * e
    w, h = im.size
    if anchor == "c":
        x0 = x - w // 2
    elif anchor == "r":
        x0 = x - w
    else:
        x0 = x
    vis = max(1, int(w * p))
    drift = int((1 - p) * 26)
    part = im.crop((0, 0, vis, h))
    paste(canvas, part, x0 + drift, y - h // 2 + dy, anchor="tl", alpha=k)
    if line and p < 0.999:
        d = ImageDraw.Draw(canvas)
        lx = x0 + drift + vis
        la = (1 - p) * k
        col = tuple(int(c * la + n * (1 - la)) for c, n in zip(CYAN, (40, 60, 90)))
        d.rectangle([lx - 2, y - h // 2 + dy - 10, lx + 1, y + h // 2 + dy + 10], fill=col)


def rise_text(canvas, im, x, y, t, t0, dur=0.5, anchor="c", alpha=1.0, exit_t=None, exit_dur=0.3, dist=40):
    if t < t0:
        return
    p = ease_out(prog(t, t0, dur))
    k = alpha * p
    dy = (1 - p) * dist
    if exit_t is not None and t > exit_t:
        e = ease_in_out(prog(t, exit_t, exit_dur))
        k *= 1 - e
        dy -= 30 * e
    paste(canvas, im, x, y + dy, anchor=anchor, alpha=k)


def scale_in(canvas, im, x, y, t, t0, dur=0.45, s0=0.9, s1=1.0, hold_zoom=0.0, alpha=1.0, exit_t=None,
             exit_dur=0.3):
    """Fade + scale reveal, then slow push (hold_zoom per second)."""
    if t < t0 or im is None:
        return
    p = ease_out(prog(t, t0, dur))
    s = s0 + (s1 - s0) * p + hold_zoom * max(0, t - t0)
    k = alpha * p
    if exit_t is not None and t > exit_t:
        e = ease_in_out(prog(t, exit_t, exit_dur))
        k *= 1 - e
        s += 0.04 * e
    w, h = im.size
    imr = im.resize((max(1, int(w * s)), max(1, int(h * s))), Image.BICUBIC)
    paste(canvas, imr, x, y, alpha=k)


# ----------------------------------------------------------------- graphics
@functools.lru_cache(maxsize=None)
def vignette():
    y, x = np.mgrid[0:H, 0:W]
    nx = (x - W / 2) / (W / 2)
    ny = (y - H / 2) / (H / 2)
    r = np.sqrt(nx ** 2 * 0.9 + ny ** 2 * 0.55)
    a = np.clip((r - 0.55) / 0.75, 0, 1) ** 1.6 * 200
    im = np.zeros((H, W, 4), np.uint8)
    im[..., :3] = (2, 8, 22)
    im[..., 3] = a.astype(np.uint8)
    return Image.fromarray(im, "RGBA")


@functools.lru_cache(maxsize=None)
def band(y0, y1, strength=200):
    """Soft dark band behind a text block for legibility over footage."""
    hh = y1 - y0
    ys = np.linspace(-1, 1, hh)
    a = (np.clip(1 - np.abs(ys) ** 2.2, 0, 1) * strength).astype(np.uint8)
    im = np.zeros((hh, W, 4), np.uint8)
    im[..., :3] = (3, 12, 30)
    im[..., 3] = a[:, None]
    return Image.fromarray(im, "RGBA")


def draw_band(canvas, y0, y1, k=1.0, strength=200):
    paste(canvas, band(y0, y1, strength), 0, y0, anchor="tl", alpha=k)


@functools.lru_cache(maxsize=None)
def grid_overlay():
    im = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    for x in range(0, W, 60):
        d.line([(x, 0), (x, H)], fill=(0, 141, 255, 16))
    for y in range(0, H, 60):
        d.line([(0, y), (W, y)], fill=(0, 141, 255, 16))
    for x in range(0, W, 300):
        d.line([(x, 0), (x, H)], fill=(0, 141, 255, 34))
    for y in range(0, H, 300):
        d.line([(0, y), (W, y)], fill=(0, 141, 255, 34))
    return im


def hline(canvas, x0, x1, y, t, t0, dur=0.5, color=CYAN, width=3, alpha=1.0, center=False):
    if t < t0:
        return
    p = ease_out(prog(t, t0, dur))
    d = ImageDraw.Draw(canvas)
    col = tuple(int(c * alpha + 10 * (1 - alpha)) for c in color)
    if center:
        mid = (x0 + x1) / 2
        half = (x1 - x0) / 2 * p
        d.rectangle([mid - half, y, mid + half, y + width - 1], fill=col)
    else:
        d.rectangle([x0, y, x0 + (x1 - x0) * p, y + width - 1], fill=col)


def light_sweep(canvas, box, t, t0, dur=0.7):
    """Diagonal light sweep across a region (used on FREE and logo)."""
    if not (t0 <= t <= t0 + dur):
        return
    p = ease_in_out(prog(t, t0, dur))
    x0, y0, x1, y1 = box
    w, h = x1 - x0, y1 - y0
    region = canvas.crop(box)
    arr = np.asarray(region).astype(np.float32)
    yy, xx = np.mgrid[0:h, 0:w]
    pos = -0.3 * w + p * 1.6 * w
    dist = np.abs((xx + yy * 0.45) - pos)
    m = np.clip(1 - dist / 70, 0, 1) ** 2 * 0.55
    lum = arr.mean(axis=2, keepdims=True) / 255
    arr = arr + (255 - arr) * m[..., None] * np.clip(lum * 1.6, 0, 1)
    canvas.paste(Image.fromarray(arr.astype(np.uint8)), box[:2])


def glass_panel(canvas, box, alpha=1.0, border=CYAN, fill_a=150, radius=26):
    x0, y0, x1, y1 = [int(v) for v in box]
    layer = Image.new("RGBA", (x1 - x0, y1 - y0), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    d.rounded_rectangle([0, 0, x1 - x0 - 1, y1 - y0 - 1], radius, fill=(5, 20, 48, fill_a),
                        outline=border + (200,), width=2)
    paste(canvas, layer, x0, y0, anchor="tl", alpha=alpha)


def icon(kind, size=64, color=CYAN, stroke=4):
    """Simple line icons drawn in code (phone, mail, globe, check, gear, chart, headset, wrench)."""
    s = size * 4
    im = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    c = color + (255,)
    lw = stroke * 4
    if kind in ("phone", "mail"):
        # crisp glyphs from DejaVu Sans (U+260E telephone, U+2709 envelope)
        g = "\u260e" if kind == "phone" else "\u2709"
        f = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", int(s * 0.8))
        bb = d.textbbox((0, 0), g, font=f)
        d.text(((s - (bb[2] - bb[0])) / 2 - bb[0], (s - (bb[3] - bb[1])) / 2 - bb[1]), g, font=f, fill=c)
    elif kind == "phone_outline":
        d.rounded_rectangle([s * .28, s * .06, s * .72, s * .94], s * .1, outline=c, width=lw)
        d.line([s * .42, s * .16, s * .58, s * .16], fill=c, width=lw)
        d.ellipse([s * .45, s * .76, s * .55, s * .86], fill=c)
    elif kind == "mail":
        d.rectangle([s * .12, s * .26, s * .88, s * .74], outline=c, width=lw)
        d.line([s * .12, s * .26, s * .5, s * .55, s * .88, s * .26], fill=c, width=lw, joint="curve")
    elif kind == "globe":
        d.ellipse([s * .12, s * .12, s * .88, s * .88], outline=c, width=lw)
        d.ellipse([s * .34, s * .12, s * .66, s * .88], outline=c, width=lw)
        d.line([s * .12, s * .5, s * .88, s * .5], fill=c, width=lw)
    elif kind == "check":
        d.ellipse([s * .08, s * .08, s * .92, s * .92], outline=c, width=lw)
        d.line([s * .3, s * .52, s * .45, s * .67, s * .72, s * .37], fill=c, width=lw, joint="curve")
    elif kind == "monitor":
        d.rounded_rectangle([s * .1, s * .18, s * .9, s * .7], s * .05, outline=c, width=lw)
        d.line([s * .5, s * .7, s * .5, s * .84], fill=c, width=lw)
        d.line([s * .3, s * .84, s * .7, s * .84], fill=c, width=lw)
        d.line([s * .22, s * .56, s * .4, s * .42, s * .55, s * .5, s * .78, s * .3], fill=c, width=lw,
               joint="curve")
    elif kind == "headset":
        d.arc([s * .18, s * .14, s * .82, s * .78], 180, 360, fill=c, width=lw)
        d.rounded_rectangle([s * .14, s * .44, s * .3, s * .7], s * .04, outline=c, width=lw)
        d.rounded_rectangle([s * .7, s * .44, s * .86, s * .7], s * .04, outline=c, width=lw)
        d.arc([s * .3, s * .5, s * .78, s * .9], 20, 90, fill=c, width=lw)
    elif kind == "wrench":
        d.ellipse([s * .55, s * .1, s * .9, s * .45], outline=c, width=lw)
        d.line([s * .6, s * .4, s * .18, s * .82], fill=c, width=lw * 2)
    elif kind == "shield":
        d.polygon([(s * .5, s * .08), (s * .86, s * .2), (s * .82, s * .58), (s * .5, s * .92),
                   (s * .18, s * .58), (s * .14, s * .2)], outline=c, width=lw)
        d.line([s * .33, s * .5, s * .46, s * .63, s * .68, s * .38], fill=c, width=lw, joint="curve")
    elif kind == "pin":
        d.ellipse([s * .25, s * .08, s * .75, s * .58], outline=c, width=lw)
        d.polygon([(s * .3, s * .45), (s * .5, s * .92), (s * .7, s * .45)], outline=c, width=lw)
        d.ellipse([s * .42, s * .25, s * .58, s * .41], fill=c)
    return im.resize((size, size), Image.LANCZOS)


# ----------------------------------------------------------------- transitions
def wipe_mask(p, angle=0.35):
    """Diagonal wipe mask (L) at progress p, plus x-position of the edge."""
    y, x = np.mgrid[0:H:4, 0:W:4]
    v = x + y * angle
    vmax = W + H * angle
    edge = -60 + p * (vmax + 120)
    m = np.clip((edge - v) / 12 + 0.5, 0, 1)
    mi = Image.fromarray((m * 255).astype(np.uint8), "L").resize((W, H), Image.BILINEAR)
    return mi, edge


def edge_glow(canvas, edge, angle=0.35, k=1.0):
    """Thin cyan/white line along the wipe edge."""
    d = ImageDraw.Draw(canvas, "RGBA")
    # line where x + y*angle = edge
    p0 = (edge, 0)
    p1 = (edge - H * angle, H)
    d.line([p0, p1], fill=CYAN + (int(160 * k),), width=10)
    d.line([p0, p1], fill=(230, 250, 255, int(230 * k)), width=3)


# ----------------------------------------------------------------- scenes
def sc_hook(t):
    """0-6.09: real mill footage (canopy reveal) + C&I headline."""
    # 035: tilt-down from sky to mill & elevated solar canopy. Source 1.4s onward
    # (first ~1 s of the file is black).
    ts = 1.4 + t * 1.0
    zoom = 1.0 + 0.04 * t / 6
    cx = 0.36 + 0.10 * (t / 6)  # drift from tower toward canopy
    im = plate("real_035", ts, zoom=zoom, cx=cx, cy=0.5)
    im = darken(im, 0.18)
    draw_band(im, 330, 1010, k=clamp(t / 0.4), strength=190)
    ex = 5.55
    wipe_text(im, text_img("NIKSOL ENERGY", SEMI, 30, CYAN, track=12, shadow=False), 540, 440, t, 0.10,
              exit_t=ex)
    wipe_text(im, text_img("COMMERCIAL", HEAD, 128, "metal", glow=0), 540, 575, t, A["commercial"],
              exit_t=ex)
    wipe_text(im, text_img("& INDUSTRIAL", HEAD, 128, "blue", glow=10), 540, 715, t, A["industrial"],
              exit_t=ex)
    hline(im, 250, 830, 808, t, A["solutions"] - 0.1, color=GOLD, width=3,
          alpha=1 - ease_in_out(prog(t, ex, 0.3)), center=True)
    rise_text(im, text_img("SOLAR SOLUTIONS", BOLD, 58, "gold", track=10), 540, 868, t, A["solutions"],
              exit_t=ex)
    return im


def sc_beyond(t):
    """6.09-10.17: 'not just panels' over the blueprint-to-panel plate."""
    lt = t - A["lekin"]
    im = plate("flow_blueprint_panels", 1.0 + lt * 0.9, zoom=1.0 + 0.03 * lt / 4)
    im = darken(im, 0.25)
    draw_band(im, 380, 980, strength=150)
    rise_text(im, text_img("MORE THAN", BOLD, 58, SILVER, track=14), 540, 500, t, 6.25)
    wipe_text(im, text_img("JUST SOLAR", HEAD, 132, "metal"), 540, 640, t, A["panels"] - 0.35)
    wipe_text(im, text_img("PANELS", HEAD, 132, "blue", glow=10), 540, 785, t, A["panels"])
    hline(im, 300, 780, 880, t, 8.5, color=CYAN, width=3, center=True)
    rise_text(im, text_img("ENGINEERED END TO END", SEMI, 36, SILVER, track=9), 540, 930, t, 8.6)
    return im


@functools.lru_cache(maxsize=None)
def projects_title_parts():
    im = load_rgba("title_projects_across_pakistan").convert("RGB")
    # Left: the title lettering. Right: the Pakistan map with project pins.
    title = im.crop((40, 150, 1030, 760))
    title = title.resize((W, int(title.height * W / title.width)), Image.LANCZOS)
    mp = im.crop((640, 0, 1672, 941))
    mp = mp.resize((W, int(mp.height * W / mp.width)), Image.LANCZOS)
    # soft top edge on the map so it melts under the title
    m = Image.new("L", mp.size, 255)
    arr = np.asarray(m).astype(np.float32)
    ramp = np.clip(np.arange(mp.height) / 220, 0, 1)
    arr = arr * ramp[:, None]
    # hide the title lettering that overlaps the map's left side (source x<1030, y<600)
    sx = W / 1032
    yy, xx = np.mgrid[0:mp.height, 0:mp.width]
    tx = np.clip((xx - (1030 - 640) * sx) / 60 + 1, 0, 1)
    ty = np.clip((yy - 600 * sx) / 60 + 1, 0, 1)
    arr = arr * np.maximum(tx, ty)
    mpa = mp.convert("RGBA")
    mpa.putalpha(Image.fromarray(arr.astype(np.uint8)))
    tm = np.ones((title.height, title.width), np.float32) * 255
    rampb = np.clip((title.height - np.arange(title.height)) / 160, 0, 1)
    rampx = np.clip((title.width - np.arange(title.width)) / 120, 0, 1)
    tm = tm * rampb[:, None] * rampx[None, :]
    ta = title.convert("RGBA")
    ta.putalpha(Image.fromarray(tm.astype(np.uint8)))
    return ta, mpa


def sc_projects_title(t):
    """10.17-13.40: approved 'Projects Across Pakistan' artwork, re-laid for 9:16."""
    lt = t - A["alhamdulillah"]
    bg = plate("flow_light_motion", 2.0 + lt * 0.6)
    im = darken(bg, 0.55)
    title, mp = projects_title_parts()
    z = 1.0 + 0.025 * lt
    scale_in(im, mp, 540, 1010, t, A["alhamdulillah"], dur=0.5, s0=1.06, s1=1.0, hold_zoom=0.012)
    scale_in(im, title, 540, 520, t, A["alhamdulillah"] + 0.15, dur=0.45, s0=0.94, s1=1.0, hold_zoom=0.008)
    _ = z
    return im


# Yusuf Flour Mill drone/ground clip (1816x836). Segments chosen to avoid the
# burned-in captions (11.0-12.4 s and 17.5-18.9 s) and the logo tail (19.5 s+).
YUSUF = dict(
    wide=(0.0, 1.85),      # aerial: mill buildings + full array
    flyover=(2.0, 4.6),    # rooftop flyover
    rows=(4.8, 7.4),       # panel rows
    close=(7.6, 10.9),     # close panel detail
    ground=(12.6, 15.8),   # low-angle array
    breakers=(16.0, 16.9), # DB / breakers
    inverters=(17.0, 19.3),
)


def yusuf_plate(seg, lt, dur, speed=None, zoom0=1.0, zoom1=1.08, cx0=0.5, cx1=0.5, cy=0.5):
    a, b = YUSUF[seg]
    if speed is None:
        speed = min(1.0, (b - a) / max(dur, 0.01))
    ts = a + lt * speed
    p = clamp(lt / max(dur, 0.01))
    return plate("real_yusuf", min(ts, b), zoom=zoom0 + (zoom1 - zoom0) * p, cx=cx0 + (cx1 - cx0) * p, cy=cy)


PROJECTS = [
    # (anchor, scene end, name lines, capacity, unit, sub, yusuf segment, pan)
    ("mills", 15.10, ("HAMZA", "FLOUR MILL"), "320", "KW", "SOLAR SYSTEM", "wide", (0.62, 0.7)),
    ("factories", 16.85, ("RANA", "FLOUR MILL"), "820", "KW", "SOLAR SYSTEM", "ground", (0.6, 0.4)),
    ("setups", 19.49, ("YOUSUF", "FLOUR MILLS"), "1", "MEGAWATT+", "SOLAR SYSTEM", "flyover", (0.45, 0.55)),
]


def sc_project(i):
    anchor, t_end, name, cap, unit, sub, seg, pan = PROJECTS[i]

    def fn(t):
        t0 = A[anchor]
        lt = t - t0
        dur = t_end - t0
        if i == 2:  # Yousuf: flyover, then panel rows
            if lt < 1.3:
                im = yusuf_plate("flyover", lt, 1.3, speed=1.0, zoom0=1.0, zoom1=1.04, cx0=0.45, cx1=0.5)
            else:
                im = yusuf_plate("rows", lt - 1.3, dur - 1.3, speed=1.0, zoom0=1.02, zoom1=1.08)
        else:
            im = yusuf_plate(seg, lt, dur, speed=1.0, zoom0=1.0, zoom1=1.07, cx0=pan[0], cx1=pan[1])
        im = darken(im, 0.12)
        # lower-third style portfolio card, kept inside the safe zone
        card_in = ease_out(prog(t, t0 + 0.05, 0.35))
        draw_band(im, 330, 1100, k=card_in, strength=185)
        y = 420
        rise_text(im, text_img(f"COMPLETED PROJECT  0{i + 1}", SEMI, 30, CYAN, track=10, shadow=False), 120,
                  y, t, t0 + 0.05, anchor="l", dist=20)
        hline(im, 120, 420, y + 34, t, t0 + 0.1, color=CYAN, width=3)
        wipe_text(im, text_img(name[0], HEAD, 104, "metal"), 116, y + 120, t, t0 + 0.1, anchor="l")
        wipe_text(im, text_img(name[1], HEAD, 104, "metal"), 116, y + 235, t, t0 + 0.22, anchor="l")
        capi = text_img(cap, HEAD, 210, "gold", glow=8)
        uniti = text_img(unit, HEAD, 92 if len(unit) < 4 else 70, "gold")
        scale_in(im, capi, 116 + capi.width // 2, y + 420, t, t0 + 0.35, dur=0.4, s0=0.85, hold_zoom=0.01)
        rise_text(im, uniti, 116 + capi.width + 18, y + 455 - (0 if len(unit) < 4 else 10), t, t0 + 0.5,
                  anchor="l", dist=20)
        rise_text(im, text_img(sub, BOLD, 44, SILVER, track=12), 120, y + 590, t, t0 + 0.6, anchor="l", dist=20)
        # Niksol watermark from the source footage sits top-left; keep ours right
        return im
    return fn


def sc_epc_title(t):
    """19.49-23.36: Complete end-to-end EPC solutions."""
    lt = t - 19.49
    im = plate("flow_line_transition", 0.4 + lt * 0.85)
    im = darken(im, 0.3)
    paste(im, grid_overlay(), 0, 0, anchor="tl", alpha=0.5)
    rise_text(im, text_img("NIKSOL ENERGY PROVIDES", SEMI, 32, CYAN, track=10, shadow=False), 540, 430, t, 19.65)
    wipe_text(im, text_img("COMPLETE", HEAD, 126, "metal"), 540, 560, t, A["epc_complete"])
    wipe_text(im, text_img("END-TO-END", HEAD, 126, "blue", glow=10), 540, 695, t, A["epc_e2e"])
    wipe_text(im, text_img("EPC SOLUTIONS", HEAD, 112, "metal"), 540, 825, t, A["epc_sol"])
    hline(im, 150, 930, 905, t, A["epc_sol"] + 0.3, color=CYAN, width=2, center=True)
    for j, (w, x) in enumerate((("ENGINEERING", 230), ("PROCUREMENT", 540), ("CONSTRUCTION", 850))):
        rise_text(im, text_img(w, SEMI, 30, SILVER, track=5), x, 955, t, A["epc_sol"] + 0.45 + j * 0.15, dist=15)
    return im


EPC_STEPS = [
    # (anchor, label lines, image slot, stage index, real-footage fallback)
    ("site", ("SITE", "ASSESSMENT"), "badge_site_assessment", 0, None),
    ("load", ("LOAD", "ANALYSIS"), "badge_load_analysis", 0, None),
    ("feas", ("FEASIBILITY",), "badge_feasibility", 0, None),
    ("d3", ("PROFESSIONAL", "3D DESIGN"), "badge_3d_solar_design", 0, None),
    ("struct", ("STRUCTURAL", "ENGINEERING"), "badge_structural_engineering", 0, None),
    ("direct", ("DIRECT", "MANUFACTURER", "PARTNERSHIPS"), None, 1, None),
    ("procure", ("PROCUREMENT",), "badge_procurement", 1, None),
    ("install", ("INSTALLATION",), "badge_installation", 2, "close"),
    ("commission", ("FINAL", "COMMISSIONING"), "badge_final_commissioning", 2, "breakers"),
]
STAGES = ("ENGINEERING", "PROCUREMENT", "CONSTRUCTION")


def epc_tracker(im, t, stage, t_stage):
    """Three-stage E-P-C progress tracker across the top of the safe zone."""
    y = 330
    xs = (190, 540, 890)
    d = ImageDraw.Draw(im)
    d.rectangle([xs[0], y - 2, xs[2], y + 1], fill=(40, 70, 110))
    # progress fill toward current stage
    fill_to = xs[0] + (xs[stage] - xs[0]) * 1.0
    if stage > 0:
        p = ease_out(prog(t, t_stage, 0.5))
        fill_to = xs[stage - 1] + (xs[stage] - xs[stage - 1]) * p
    d.rectangle([xs[0], y - 2, fill_to, y + 1], fill=CYAN)
    for j, x in enumerate(xs):
        active = j == stage
        done = j < stage
        r = 16 if active else 11
        col = GOLD if active else (CYAN if done else (60, 90, 130))
        d.ellipse([x - r, y - r, x + r, y + r], fill=col if (active or done) else NAVY, outline=col, width=3)
        lab = text_img(STAGES[j], BOLD if active else SEMI, 30 if active else 26,
                       WHITE if active else (SILVER if done else (120, 140, 170)), track=4)
        paste(im, lab, x, y + 44)


def step_card(lines, num):
    """Typographic fallback for an EPC step without supplied badge art."""
    widths = [text_img(l, HEAD, 92, "metal").width for l in lines]
    wmax = max(widths + [400])
    h = 120 + 110 * len(lines)
    card = Image.new("RGBA", (wmax + 140, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(card)
    d.rounded_rectangle([0, 0, card.width - 1, h - 1], 28, fill=(5, 22, 52, 205), outline=CYAN + (210,), width=3)
    d.rectangle([0, 40, 8, h - 40], fill=GOLD)
    numi = text_img(f"{num:02d}", HEAD, 54, CYAN, shadow=False)
    card.paste(numi, (70, 34), numi)
    for k, l in enumerate(lines):
        li = text_img(l, HEAD, 92, "metal" if k < len(lines) - 1 or len(lines) == 1 else "blue")
        card.paste(li, (66, 110 + k * 110), li)
    return card


@functools.lru_cache(maxsize=None)
def step_visual(idx):
    anchor, lines, slot, stage, real = EPC_STEPS[idx]
    img = load_rgba(slot) if slot else None
    if img is not None:
        img = img.crop(img.getchannel("A").point(lambda v: 255 if v > 20 else 0).getbbox())
        s = min(860 / img.width, 700 / img.height)
        return img.resize((int(img.width * s), int(img.height * s)), Image.LANCZOS), True
    return step_card(lines, idx + 1), False


def sc_epc_flow(t):
    """23.36-35.35: Engineering -> Procurement -> Construction montage."""
    # active step
    idx = 0
    for j, s in enumerate(EPC_STEPS):
        if t >= A[s[0]]:
            idx = j
    anchor, lines, slot, stage, real = EPC_STEPS[idx]
    t0 = A[anchor]
    t1 = A[EPC_STEPS[idx + 1][0]] if idx + 1 < len(EPC_STEPS) else 35.35
    lt = t - t0
    # background by stage
    if real:
        im = yusuf_plate(real, lt, t1 - t0, speed=1.0, zoom0=1.0, zoom1=1.06,
                         cx0=0.45 if real == "close" else 0.3, cx1=0.55 if real == "close" else 0.4)
        im = darken(im, 0.2)
    elif stage == 0:
        bt = t - A["site"]
        if t < A["d3"]:
            im = plate("flow_blueprint_bg", 0.5 + bt * 0.75)
        else:
            im = plate("flow_blueprint_panels", 3.2 + (t - A["d3"]) * 0.8)
        im = darken(im, 0.35)
    else:
        im = plate("flow_line_transition", 5.0 + (t - A["direct"]) * 0.5)
        im = darken(im, 0.35)
    stage_t = {0: A["site"], 1: A["direct"], 2: A["install"]}[stage]
    draw_band(im, 270, 420, strength=170)
    epc_tracker(im, t, stage, stage_t)
    vis, is_badge = step_visual(idx)
    if real:
        # real footage carries the moment; label as a clean lower-third
        draw_band(im, 820, 1120, strength=190)
        rise_text(im, text_img(f"{idx + 1:02d}", HEAD, 50, CYAN, shadow=False), 120, 900, t, t0, anchor="l",
                  dist=15)
        for k, l in enumerate(lines):
            wipe_text(im, text_img(l, HEAD, 96, "metal" if k == 0 else "blue"), 116, 990 + k * 100, t,
                      t0 + 0.05 + 0.1 * k, anchor="l")
    elif anchor == "direct":
        draw_band(im, 470, 1060, strength=150)
        rise_text(im, text_img("DIRECT", HEAD, 120, "gold", glow=6), 540, 600, t, t0, dist=25)
        wipe_text(im, text_img("MANUFACTURER", HEAD, 104, "metal"), 540, 730, t, t0 + 0.25)
        wipe_text(im, text_img("PARTNERSHIPS", HEAD, 104, "metal"), 540, 850, t, t0 + 0.45)
        rise_text(im, text_img("SOURCED AT THE SOURCE", SEMI, 32, SILVER, track=10), 540, 960, t, t0 + 1.0)
    else:
        scale_in(im, vis, 540, 760, t, t0, dur=0.32, s0=0.9, s1=1.0, hold_zoom=0.015)
        if is_badge:
            pass  # supplied badge already carries its label
    # flash on step change
    fl = 1 - prog(t, t0, 0.18)
    if fl > 0 and idx > 0:
        im = Image.blend(im, Image.new("RGB", im.size, (180, 230, 255)), 0.18 * fl)
    return im


def sc_accountable(t):
    """35.35-39.30: Every stage. Every detail. One accountable EPC partner."""
    lt = t - A["stage"]
    im = yusuf_plate("wide", lt, 3.95, speed=0.45, zoom0=1.04, zoom1=1.0, cx0=0.55, cx1=0.45)
    im = darken(im, 0.3)
    draw_band(im, 360, 1080, strength=200)
    ex = A["zimmedari"] - 0.15
    wipe_text(im, text_img("EVERY STAGE.", HEAD, 116, "metal"), 540, 560, t, A["stage"], exit_t=ex)
    wipe_text(im, text_img("EVERY DETAIL.", HEAD, 116, "blue", glow=8), 540, 700, t, A["detail"], exit_t=ex)
    z0 = A["zimmedari"]
    rise_text(im, text_img("NIKSOL ENERGY", BOLD, 46, "gold", track=12), 540, 500, t, z0 + 0.05, dist=20)
    scale_in(im, text_img("ONE ACCOUNTABLE", HEAD, 104, "metal"), 540, 640, t, z0 + 0.1, dur=0.35, s0=1.12)
    scale_in(im, text_img("EPC PARTNER", HEAD, 128, "blue", glow=10), 540, 775, t, z0 + 0.3, dur=0.35, s0=1.12)
    hline(im, 260, 820, 870, t, z0 + 0.55, color=CYAN, width=5, center=True)
    return im


QUALITY = [
    # (anchor, big line, small line, style, bg)
    ("tier1", "TIER-1", "SOLAR PANELS", "metal", ("yusuf", "close")),
    ("inverters", "QUALITY", "INVERTERS", "blue", ("yusuf", "inverters")),
    ("custom", "CUSTOM", "ENGINEERING", "metal", ("clip", "flow_blueprint_bg")),
    ("warranty", "10-YEAR", "STRUCTURAL WARRANTY", "gold", ("035", None)),
]


def sc_quality(t):
    """39.30-47.17: Tier-1 panels, quality inverters, custom engineering, 10-yr structural warranty."""
    idx = 0
    for j, q in enumerate(QUALITY):
        if t >= A[q[0]] - (0.9 if j == 0 else 0):
            idx = j
    anchor, big, small, style, bg = QUALITY[idx]
    t0 = A[anchor] - (0.9 if idx == 0 else 0)
    t1 = A[QUALITY[idx + 1][0]] if idx + 1 < len(QUALITY) else 47.17
    lt = t - t0
    if bg[0] == "yusuf":
        if bg[1] == "inverters":
            # crop the upper part of the frame to keep the burned caption out
            im = yusuf_plate("inverters", lt, t1 - t0, speed=0.8, zoom0=1.26, zoom1=1.32, cx0=0.25, cx1=0.3,
                             cy=0.38)
        else:
            im = plate("real_yusuf", 8.6 + lt * 0.55, zoom=1.0 + 0.05 * lt / (t1 - t0), cx=0.6)
    elif bg[0] == "035":
        # steel canopy structure of the real installation
        im = plate("real_035", 6.6 + lt * 0.35, zoom=1.08 - 0.04 * lt / (t1 - t0), cx=0.78, cy=0.45)
    else:
        im = plate(bg[1], 6.0 + lt * 0.6)
    im = darken(im, 0.22)
    draw_band(im, 420, 1020, strength=200)
    # progress pips
    d = ImageDraw.Draw(im)
    for j in range(4):
        x = 540 + (j - 1.5) * 44
        on = j <= idx
        d.rounded_rectangle([x - 14, 440, x + 14, 446], 3, fill=GOLD if j == idx else (CYAN if on else (60, 80, 110)))
    if idx == 3:
        # structural frame outline over the real canopy, then the warranty lockup
        p = ease_out(prog(t, t0, 0.6))
        fr = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        fd = ImageDraw.Draw(fr)
        a = int(120 * p)
        for k in range(5):
            x = 160 + k * 190
            fd.line([(x, 520), (x, 520 + 420 * p)], fill=CYAN + (a,), width=2)
        fd.line([(160, 520), (160 + 760 * p, 520)], fill=CYAN + (a,), width=2)
        fd.line([(160, 940), (160 + 760 * p, 940)], fill=CYAN + (a,), width=2)
        for k in range(4):
            x = 160 + k * 190
            fd.line([(x, 520), (x + 190 * p, 940)], fill=CYAN + (a // 2,), width=2)
        paste(im, fr, 0, 0, anchor="tl", alpha=0.8)
        draw_band(im, 540, 980, strength=170)
        scale_in(im, text_img("10-YEAR", HEAD, 190, "gold", glow=8), 540, 680, t, t0 + 0.1, dur=0.4, s0=1.15)
        wipe_text(im, text_img("STRUCTURAL", HEAD, 92, "metal"), 540, 820, t, t0 + 0.35)
        wipe_text(im, text_img("WARRANTY", HEAD, 92, "metal"), 540, 920, t, t0 + 0.5)
    else:
        scale_in(im, text_img(big, HEAD, 170 if len(big) < 8 else 140, style, glow=8 if style == "blue" else 0),
                 540, 650, t, A[anchor] if idx == 0 else t0, dur=0.38, s0=1.12)
        wipe_text(im, text_img(small, HEAD, 84, "metal" if style != "metal" else "blue", glow=6), 540, 800, t,
                  (A[anchor] if idx == 0 else t0) + 0.2)
        if idx == 0:
            rise_text(im, text_img("ONLY", BOLD, 44, CYAN, track=14), 540, 520, t, t0 + 0.2, dist=15)
    return im


SUPPORT = [("monitoring", "SYSTEM MONITORING", "monitor"), ("support", "TECHNICAL SUPPORT", "headset"),
           ("aftersales", "AFTER-SALES SERVICES", "shield")]


def sc_support(t):
    """47.17-51.67: monitoring, technical support, after-sales (illustrative dashboard)."""
    lt = t - 47.17
    if t < A["support"]:
        im = plate("flow_dashboard_c", 1.0 + lt * 0.8)
    else:
        im = plate("flow_dashboard_b", 3.0 + (t - A["support"]) * 0.8)
    im = darken(im, 0.4)
    draw_band(im, 380, 1080, strength=170)
    rise_text(im, text_img("AFTER INSTALLATION", SEMI, 32, CYAN, track=10, shadow=False), 540, 440, t, 47.3,
              dist=15)
    active = 0
    for j, s in enumerate(SUPPORT):
        if t >= A[s[0]]:
            active = j
    for j, (anchor, lab, ic) in enumerate(SUPPORT):
        t0 = A[anchor]
        if t < t0:
            continue
        y = 560 + j * 170
        p = ease_out(prog(t, t0, 0.4))
        on = j == active
        box = (110 + (1 - p) * 60, y - 66, 970 + (1 - p) * 60, y + 66)
        glass_panel(im, box, alpha=p, border=CYAN if on else (70, 110, 160), fill_a=190 if on else 140)
        paste(im, icon(ic, 72, CYAN if on else SILVER), box[0] + 80, y, alpha=p)
        paste(im, text_img(lab, HEAD, 54 if len(lab) < 19 else 50, "metal" if on else SILVER), box[0] + 150, y,
              anchor="l", alpha=p * (1 if on else 0.75))
    paste(im, text_img("Illustrative visualisation", MED, 22, (150, 170, 200), shadow=False), 970, 1060,
          anchor="r", alpha=0.8)
    return im


def sc_cta_contact(t):
    """51.67-56.26: Contact Niksol for your factory / commercial building."""
    lt = t - A["cta"]
    im = plate("real_035", 4.2 + lt * 0.75, zoom=1.0 + 0.05 * lt / 4.6, cx=0.62, cy=0.5)
    im = darken(im, 0.25)
    draw_band(im, 380, 1100, strength=200)
    ex = A["contact"] - 0.2
    rise_text(im, text_img("FOR YOUR", BOLD, 50, CYAN, track=14), 540, 500, t, A["cta"] + 0.1, exit_t=ex)
    wipe_text(im, text_img("FACTORY", HEAD, 130, "metal"), 540, 630, t, A["cta"] + 0.35, exit_t=ex)
    wipe_text(im, text_img("& COMMERCIAL", HEAD, 104, "blue", glow=8), 540, 760, t, A["cta"] + 1.4, exit_t=ex)
    wipe_text(im, text_img("BUILDING", HEAD, 104, "metal"), 540, 870, t, A["cta"] + 1.6, exit_t=ex)
    c0 = A["contact"]
    rise_text(im, text_img("CONTACT", HEAD, 110, "metal"), 540, 560, t, c0, dist=25)
    wipe_text(im, text_img("NIKSOL ENERGY", HEAD, 110, "gold", glow=6), 540, 690, t, c0 + 0.2)
    rise_text(im, text_img("TODAY", BOLD, 56, SILVER, track=18), 540, 800, t, c0 + 0.45, dist=20)
    if t >= c0 + 0.7:
        p = ease_out(prog(t, c0 + 0.7, 0.4))
        glass_panel(im, (170, 880, 910, 990), alpha=p, border=GOLD, fill_a=200, radius=55)
        paste(im, icon("phone", 54, GOLD), 245, 935, alpha=p)
        paste(im, text_img("+92 333 0755575", HEAD, 58, WHITE), 580, 935, alpha=p)
    return im


def sc_cta_offer(t):
    """56.26-62.04: Within 24 hours - FREE site assessment, 3D design, quotation."""
    lt = t - A["h24"]
    im = plate("flow_blueprint_bg", 5.0 + lt * 0.7, zoom=1.04)
    im = darken(im, 0.35)
    draw_band(im, 300, 1140, strength=190)
    # 24 hours chip
    if t >= A["h24"]:
        p = ease_out_back(prog(t, A["h24"], 0.4))
        chip = text_img("WITHIN 24 HOURS", HEAD, 50, NAVY, track=4, shadow=False)
        cw, chh = chip.width + 80, 84
        layer = Image.new("RGBA", (cw, chh), (0, 0, 0, 0))
        ImageDraw.Draw(layer).rounded_rectangle([0, 0, cw - 1, chh - 1], 42, fill=GOLD + (255,))
        layer.paste(chip, (40, (chh - chip.height) // 2), chip)
        s = max(0.01, p)
        lay = layer.resize((max(1, int(cw * s)), max(1, int(chh * s))), Image.BICUBIC)
        paste(im, lay, 540, 400, alpha=clamp(p))
    f0 = A["free"]
    rise_text(im, text_img("BOOK YOUR", BOLD, 50, SILVER, track=16), 540, 505, t, f0 - 0.25, dist=20)
    free = text_img("FREE", HEAD, 230, "metal", glow=12)
    scale_in(im, free, 540, 640, t, f0, dur=0.35, s0=1.18)
    light_sweep(im, (540 - free.width // 2 - 20, 640 - free.height // 2, 540 + free.width // 2 + 20,
                     640 + free.height // 2), t, f0 + 0.35, 0.8)
    wipe_text(im, text_img("SITE ASSESSMENT", HEAD, 92, "blue", glow=8), 540, 790, t, f0 + 0.25)
    for j, (anchor, lab) in enumerate((("design3d", "PROFESSIONAL 3D SOLAR DESIGN"),
                                       ("quote", "DETAILED PROJECT QUOTATION"))):
        t0 = A[anchor]
        if t < t0:
            continue
        y = 920 + j * 100
        p = ease_out(prog(t, t0, 0.4))
        paste(im, icon("check", 56, CYAN), 130 + (1 - p) * 40, y, alpha=p)
        paste(im, text_img(lab, HEAD, 46, "metal"), 180 + (1 - p) * 40, y, anchor="l", alpha=p)
    return im


def sc_endcard(t):
    """62.04-end: brand lockup with mandatory contacts."""
    lt = t - A["brand"]
    bg = plate("flow_light_motion", 4.0 + lt * 0.5)
    im = darken(bg, 0.62)
    paste(im, grid_overlay(), 0, 0, anchor="tl", alpha=0.35)
    lg = logo_rgba()
    s = 470 / lg.width
    lgi = lg.resize((int(lg.width * s), int(lg.height * s)), Image.LANCZOS)
    p = ease_out(prog(t, A["brand"], 0.6))
    scale_in(im, lgi, 540, 600, t, A["brand"], dur=0.6, s0=0.92, s1=1.0, hold_zoom=0.006)
    light_sweep(im, (300, 360, 780, 840), t, A["brand"] + 0.5, 0.9)
    rise_text(im, text_img("COMMERCIAL & INDUSTRIAL SOLAR EPC", BOLD, 36, SILVER, track=6), 540, 880, t,
              A["brand"] + 0.45, dist=15)
    t1 = A["brand"] + 0.75
    if t >= t1:
        q = ease_out(prog(t, t1, 0.4))
        lab = text_img("BOOK YOUR FREE SITE ASSESSMENT", HEAD, 40, NAVY, shadow=False)
        cw, chh = lab.width + 70, 74
        layer = Image.new("RGBA", (cw, chh), (0, 0, 0, 0))
        ImageDraw.Draw(layer).rounded_rectangle([0, 0, cw - 1, chh - 1], 37, fill=GOLD + (255,))
        layer.paste(lab, (35, (chh - lab.height) // 2), lab)
        paste(im, layer, 540, 965 + (1 - q) * 20, alpha=q)
    rows = [("phone", "+92 333 0755575", 58), ("mail", "sales@niksolenergy.com", 46),
            ("globe", "www.niksolenergy.com", 40)]
    for j, (ic, txt, sz) in enumerate(rows):
        t0 = A["brand"] + 1.0 + j * 0.15
        if t < t0:
            continue
        q = ease_out(prog(t, t0, 0.4))
        y = 1060 + j * 66 + (1 - q) * 15
        ti = text_img(txt, HEAD if j == 0 else BOLD, sz, WHITE if j < 2 else SILVER)
        total = ti.width + 64
        x0 = 540 - total // 2
        paste(im, icon(ic, 46 if j == 0 else 40, CYAN), x0 + 22, y, alpha=q)
        paste(im, ti, x0 + 64, y, anchor="l", alpha=q)
    # final fade
    fo = prog(t, DURATION - 0.6, 0.6)
    if fo > 0:
        im = Image.blend(im, Image.new("RGB", im.size, (0, 0, 0)), ease_in_out(fo))
    _ = p
    return im


SCENE_FN = {
    "hook": sc_hook, "beyond": sc_beyond, "projects_title": sc_projects_title,
    "project_1": sc_project(0), "project_2": sc_project(1), "project_3": sc_project(2),
    "epc_title": sc_epc_title, "epc_flow": sc_epc_flow, "accountable": sc_accountable,
    "quality": sc_quality, "support": sc_support, "cta_contact": sc_cta_contact,
    "cta_offer": sc_cta_offer, "endcard": sc_endcard,
}
# Transition into each scene: (kind, duration). Wipes run centred on the cut.
TRANS = {
    "beyond": ("wipe", 0.4), "projects_title": ("wipe", 0.45), "project_1": ("wipe", 0.35),
    "project_2": ("wipe", 0.35), "project_3": ("wipe", 0.35), "epc_title": ("wipe", 0.45),
    "epc_flow": ("wipe", 0.4), "accountable": ("fade", 0.3), "quality": ("wipe", 0.4),
    "support": ("wipe", 0.4), "cta_contact": ("wipe", 0.45), "cta_offer": ("wipe", 0.4),
    "endcard": ("fade", 0.45),
}


def scene_at(t):
    idx = 0
    for j, (n, s) in enumerate(SCENES):
        if t >= s:
            idx = j
    return idx


def render_frame(t):
    idx = scene_at(t)
    name, start = SCENES[idx]
    im = SCENE_FN[name](t)
    # transition into this scene: blend from the previous scene over the first part
    if idx > 0 and name in TRANS:
        kind, d = TRANS[name]
        if t < start + d * 0.5:
            pname = SCENES[idx - 1][0]
            prev = SCENE_FN[pname](min(t, start - 1e-3))
            p = 0.5 + (t - start) / d  # 0.5..1 over the first half after the cut
            p = clamp(p)
            if kind == "fade":
                im = Image.blend(prev, im, ease_in_out(p))
            else:
                m, edge = wipe_mask(ease_in_out(p))
                prev.paste(im, (0, 0), m)
                edge_glow(prev, edge, k=1 - abs(p - 0.5) * 1.2)
                im = prev
    # the half before the cut: start the wipe on the outgoing scene
    if idx + 1 < len(SCENES):
        nname, nstart = SCENES[idx + 1]
        if nname in TRANS:
            kind, d = TRANS[nname]
            if t >= nstart - d * 0.5:
                nxt = SCENE_FN[nname](nstart)
                p = clamp(0.5 - (nstart - t) / d)
                if kind == "fade":
                    im = Image.blend(im, nxt, ease_in_out(p))
                else:
                    m, edge = wipe_mask(ease_in_out(p))
                    im.paste(nxt, (0, 0), m)
                    edge_glow(im, edge, k=1 - abs(p - 0.5) * 1.2)
    im.paste(vignette(), (0, 0), vignette())
    return im


def main():
    cmd = sys.argv[1]
    if cmd == "frame":
        render_frame(float(sys.argv[2])).save(sys.argv[3])
    elif cmd == "segment":
        f0, f1, out = int(sys.argv[2]), int(sys.argv[3]), sys.argv[4]
        enc = subprocess.Popen(
            ["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r",
             str(FPS), "-i", "-", "-c:v", "libx264", "-preset", "medium", "-crf", "12", "-pix_fmt",
             "yuv420p", "-colorspace", "bt709", "-color_primaries", "bt709", "-color_trc", "bt709",
             "-x264-params", "keyint=50", out], stdin=subprocess.PIPE)
        for f in range(f0, f1):
            enc.stdin.write(render_frame(f / FPS).tobytes())
            if (f - f0) % 50 == 0:
                print(f"{out}: {f - f0}/{f1 - f0}", flush=True)
        enc.stdin.close()
        enc.wait()


if __name__ == "__main__":
    main()
