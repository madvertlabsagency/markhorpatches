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
from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageFont

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


# ----------------------------------------------------------------- client artwork helpers
@functools.lru_cache(maxsize=None)
def card_img(stem, width=1032, crop=None, radius=22):
    """16:9 / banner card fitted to width with rounded corners and a thin cyan rim."""
    im = load_rgba(stem)
    if crop:
        im = im.crop(crop)
    s = width / im.width
    im = im.resize((width, round(im.height * s)), Image.LANCZOS)
    w, h = im.size
    mask = Image.new("L", im.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, w - 1, h - 1], radius, fill=255)
    im.putalpha(ImageChops.multiply(im.getchannel("A"), mask))
    rim = Image.new("RGBA", im.size, (0, 0, 0, 0))
    ImageDraw.Draw(rim).rounded_rectangle([0, 0, w - 1, h - 1], radius, outline=CYAN + (170,), width=3)
    return Image.alpha_composite(im, rim)


@functools.lru_cache(maxsize=None)
def card_shadow(w, h):
    pad = 60
    sh = Image.new("RGBA", (w + pad * 2, h + pad * 2), (0, 0, 0, 0))
    ImageDraw.Draw(sh).rounded_rectangle([pad, pad + 18, pad + w, pad + h + 18], 26, fill=(0, 4, 12, 210))
    return sh.filter(ImageFilter.GaussianBlur(26))


@functools.lru_cache(maxsize=None)
def blurred_bg(stem, crop=None, dark=0.5):
    """Full-frame blurred cover of an artwork (classic vertical re-frame backdrop)."""
    im = load_rgba(stem).convert("RGB")
    if crop:
        im = im.crop(crop)
    s = max(W / im.width, H / im.height) * 1.1
    im = im.resize((int(im.width * s), int(im.height * s)), Image.BILINEAR)
    x0, y0 = (im.width - W) // 2, (im.height - H) // 2
    im = im.crop((x0, y0, x0 + W, y0 + H))
    small = im.resize((W // 6, H // 6), Image.BILINEAR).filter(ImageFilter.GaussianBlur(5))
    return darken(small.resize((W, H), Image.BILINEAR), dark)


def still_plate(stem, lt, dur, z0=1.12, z1=1.0, cx0=0.5, cx1=0.5, cy=0.5):
    """Ken Burns move on a still image, cover-fitted to 9:16."""
    im = load_rgba(stem).convert("RGB")
    p = clamp(lt / max(dur, 0.01))
    z = z0 + (z1 - z0) * ease_out(p)
    sw, sh = im.size
    ch = sh / z
    cw = ch * W / H
    if cw > sw:
        cw = sw / z
        ch = cw * H / W
    cx = cx0 + (cx1 - cx0) * p
    x0 = clamp(cx * sw - cw / 2, 0, sw - cw)
    y0 = clamp(cy * sh - ch / 2, 0, sh - ch)
    return im.resize((W, H), Image.BICUBIC, box=(x0, y0, x0 + cw, y0 + ch))


def show_card(im, card, t, t0, y=740, push=0.012, enter=0.38, from_x=140, exit_t=None):
    """Animated card: slide-in from the right with fade, shadow, rim flash, slow push."""
    if t < t0:
        return
    p = ease_out(prog(t, t0, enter))
    k = p
    s = 0.95 + 0.05 * p + push * max(0, t - t0)
    dx = (1 - p) * from_x
    if exit_t is not None and t > exit_t:
        e = ease_in_out(prog(t, exit_t, 0.25))
        k *= 1 - e
        dx -= 120 * e
    w, h = card.size
    sw, shh = max(1, int(w * s)), max(1, int(h * s))
    cr = card.resize((sw, shh), Image.BICUBIC)
    paste(im, card_shadow(sw, shh), 540 + dx, y + 18, alpha=k * 0.9)
    paste(im, cr, 540 + dx, y, alpha=k)
    # rim flash on entry
    fl = 1 - prog(t, t0 + enter * 0.6, 0.35)
    if 0 < fl < 1 and p > 0.5:
        d = ImageDraw.Draw(im, "RGBA")
        x0, y0 = 540 + dx - sw / 2, y - shh / 2
        a = int(220 * fl)
        d.rounded_rectangle([x0 - 3, y0 - 3, x0 + sw + 3, y0 + shh + 3], 24, outline=(200, 245, 255, a), width=4)


@functools.lru_cache(maxsize=None)
def badge_img(stem, maxw=840, maxh=720):
    im = load_rgba(stem)
    a = im.getchannel("A").point(lambda v: v if v > 40 else 0)  # drop speckled near-transparent pixels
    im.putalpha(a)
    im = im.crop(a.point(lambda v: 255 if v > 40 else 0).getbbox())
    s = min(maxw / im.width, maxh / im.height)
    return im.resize((int(im.width * s), int(im.height * s)), Image.LANCZOS)


@functools.lru_cache(maxsize=None)
def logo_tile(stem, w=420, h=170):
    """Partner logo on a clean white rounded tile."""
    tile = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    ImageDraw.Draw(tile).rounded_rectangle([0, 0, w - 1, h - 1], 22, fill=(255, 255, 255, 255),
                                           outline=GOLD + (255,), width=3)
    lg = load_rgba(stem)
    arr = np.asarray(lg).copy()
    # trim white margins of the supplied square logos
    rgb = arr[..., :3].astype(int)
    ink = (rgb.min(axis=2) < 235) & (arr[..., 3] > 20)
    ys, xs = np.where(ink)
    lg = lg.crop((xs.min(), ys.min(), xs.max() + 1, ys.max() + 1))
    s = min((w - 60) / lg.width, (h - 40) / lg.height)
    lg = lg.resize((int(lg.width * s), int(lg.height * s)), Image.LANCZOS)
    tile.paste(lg, ((w - lg.width) // 2, (h - lg.height) // 2), lg)
    return tile


@functools.lru_cache(maxsize=None)
def photo_frame(stem, width, angle, crop=None):
    """Photo with a white print border, rotated, for the MOU 'dashboard' drop-ins."""
    im = load_rgba(stem).convert("RGB")
    if crop:
        im = im.crop(crop)
    s = width / im.width
    im = im.resize((width, int(im.height * s)), Image.LANCZOS)
    b = 12
    fr = Image.new("RGBA", (im.width + b * 2, im.height + b * 2), (245, 248, 252, 255))
    fr.paste(im, (b, b))
    ImageDraw.Draw(fr).rectangle([0, 0, fr.width - 1, fr.height - 1], outline=GOLD + (255,), width=3)
    pad = 50
    out = Image.new("RGBA", (fr.width + pad * 2, fr.height + pad * 2), (0, 0, 0, 0))
    sh = Image.new("RGBA", out.size, (0, 0, 0, 0))
    ImageDraw.Draw(sh).rectangle([pad + 10, pad + 22, pad + fr.width + 10, pad + fr.height + 22], fill=(0, 0, 0, 200))
    out = Image.alpha_composite(out, sh.filter(ImageFilter.GaussianBlur(18)))
    out.paste(fr, (pad, pad), fr)
    return out.rotate(angle, resample=Image.BICUBIC, expand=True)


def slam_text(im, txt_im, x, y, t, t0, exit_t=None, s0=1.35):
    """Kinetic 'slam': fast scale-down with a brief overshoot, used in the hook."""
    if t < t0:
        return
    p = prog(t, t0, 0.22)
    s = s0 + (1 - s0) * ease_out(p)
    if p >= 1:
        s = 1 + 0.02 * math.exp(-(t - t0 - 0.22) * 9) * math.sin((t - t0 - 0.22) * 40)
    k = clamp(p * 2.5)
    if exit_t is not None and t > exit_t:
        e = ease_in_out(prog(t, exit_t, 0.2))
        k *= 1 - e
        s *= 1 + 0.15 * e
    w, h = txt_im.size
    paste(im, txt_im.resize((max(1, int(w * s)), max(1, int(h * s))), Image.BICUBIC), x, y, alpha=k)


def flash(im, t, t0, dur=0.12, k=0.35, color=(220, 240, 255)):
    f = 1 - prog(t, t0, dur)
    if 0 < f < 1 or (t >= t0 and f == 1):
        return Image.blend(im, Image.new("RGB", im.size, color), k * f)
    return im


# ----------------------------------------------------------------- scenes
HOOK_CUTS = [
    # (start, source) - rapid real-footage montage, cut on the VO rhythm
    (0.00, ("yusuf", 0.2, 1.18, 1.04, 0.55, 0.5)),
    (0.62, ("still", "photo_site_canopy", 1.18, 1.05, 0.55)),
    (1.30, ("035", 5.2, 1.12, 1.02, 0.66)),
    (2.10, ("yusuf", 2.4, 1.15, 1.05, 0.5, 0.5)),
    (2.85, ("yusuf", 16.05, 1.2, 1.1, 0.4, 0.5)),
    (3.55, ("yusuf", 17.05, 1.32, 1.26, 0.27, 0.38)),
    (4.30, ("still", "bg_vertical_rooftop", 1.15, 1.02, 0.6)),
    (5.15, ("mg", "mg_panels", 0.4, 1.08, 1.0)),
]


def sc_hook(t):
    """0-6.09: fast real-footage montage with slamming kinetic type."""
    idx = 0
    for j, (st, _) in enumerate(HOOK_CUTS):
        if t >= st:
            idx = j
    st, src = HOOK_CUTS[idx]
    nxt = HOOK_CUTS[idx + 1][0] if idx + 1 < len(HOOK_CUTS) else 6.09
    lt, dur = t - st, nxt - st
    p = clamp(lt / dur)
    if src[0] == "yusuf":
        _, ts, z0, z1, cx, cy = src
        im = plate("real_yusuf", ts + lt, zoom=z0 + (z1 - z0) * ease_out(p), cx=cx, cy=cy)
    elif src[0] == "mg":
        _, name, ts, z0, z1 = src
        im = plate(name, ts + lt, zoom=z0 + (z1 - z0) * ease_out(p))
    elif src[0] == "035":
        _, ts, z0, z1, cx = src
        im = plate("real_035", ts + lt, zoom=z0 + (z1 - z0) * ease_out(p), cx=cx)
    else:
        _, stem, z0, z1, cx = src
        im = still_plate(stem, lt, dur, z0, z1, cx, cx)
    im = darken(im, 0.15)
    im = flash(im, t, st, 0.1, 0.4 if idx else 0)
    draw_band(im, 430, 960, strength=170)
    ex1 = 2.80
    slam_text(im, text_img("COMMERCIAL", HEAD, 132, "metal"), 540, 600, t, A["commercial"], exit_t=ex1)
    slam_text(im, text_img("& INDUSTRIAL", HEAD, 132, "blue", glow=10), 540, 740, t, A["industrial"], exit_t=ex1)
    rise_text(im, text_img("BUSINESS OWNERS", BOLD, 50, "gold", track=12), 540, 860, t, 1.95, exit_t=ex1, dist=20)
    ex2 = 5.75
    slam_text(im, text_img("ELECTRICITY BILLS", HEAD, 112, "metal"), 540, 600, t, 3.10, exit_t=ex2)
    slam_text(im, text_img("IN LAKHS?", HEAD, 150, "gold", glow=8), 540, 745, t, 3.95, exit_t=ex2)
    rise_text(im, text_img("NOTHING NEW.", BOLD, 54, SILVER, track=14), 540, 870, t, 4.80, exit_t=ex2, dist=20)
    return im


PROJECT_CARDS = [
    # (anchor, end, card stem, crop, footage(seg, cx))
    ("mills", 15.10, "project_hamza", None, ("wide", 0.62)),
    ("factories", 16.85, "project_rana", None, ("ground", 0.55)),
    ("setups", 19.49, "project_yousuf", None, ("flyover", 0.5)),
]


def sc_project(i):
    anchor, t_end, stem, crop, (seg, cx) = PROJECT_CARDS[i]

    def fn(t):
        t0 = A[anchor]
        lt = t - t0
        im = yusuf_plate(seg, lt, t_end - t0, speed=1.0, zoom0=1.0, zoom1=1.06, cx0=cx, cx1=cx + 0.06)
        im = darken(im, 0.45)
        rise_text(im, text_img(f"COMPLETED PROJECT  0{i + 1}", BOLD, 38, CYAN, track=12), 540, 345, t, t0 + 0.05,
                  dist=20)
        hline(im, 380, 700, 380, t, t0 + 0.1, color=GOLD, width=3, center=True)
        if i < 2:
            show_card(im, card_img(stem), t, t0 + 0.02, y=730)
        else:
            # Supplied Yousuf card reads "FLOOR MILLS / MEGAWAT+": show its photo side only and
            # set the approved spelling as live type.
            wipe_text(im, text_img("YOUSUF FLOUR MILLS", HEAD, 84, "metal"), 540, 455, t, t0 + 0.05)
            slam_text(im, text_img("1 MEGAWATT+", HEAD, 104, "gold", glow=6), 540, 565, t, t0 + 0.3, s0=1.2)
            show_card(im, card_img(stem, width=760, crop=(800, 30, 1672, 700)), t, t0 + 0.15, y=905)
        return im
    return fn


def sc_epc_title(t):
    """19.49-23.36: 9-step EPC strip pan, then the approved EPC title card."""
    lt = t - 19.49
    sw = A["epc_complete"] - 0.05
    if t < sw:
        im = plate("flow_line_transition", 0.4 + lt * 0.85)
        im = darken(im, 0.45)
        paste(im, grid_overlay(), 0, 0, anchor="tl", alpha=0.4)
        rise_text(im, text_img("FROM SITE TO SWITCH-ON", BOLD, 44, CYAN, track=10), 540, 380, t, 19.6, dist=15)
        strip = card_img("epc_process_strip", width=2300, radius=26)
        p = ease_in_out(clamp(lt / (sw - 19.49)))
        x = 540 + (strip.width - W) / 2 + 40 - p * (strip.width - W + 80)
        k = ease_out(prog(t, 19.49, 0.3))
        paste(im, strip, x, 760, alpha=k)
        return im
    im = blurred_bg("title_epc_solutions")
    paste(im, grid_overlay(), 0, 0, anchor="tl", alpha=0.3)
    rise_text(im, text_img("NIKSOL ENERGY PROVIDES", BOLD, 40, CYAN, track=10), 540, 400, t, sw, dist=15)
    show_card(im, card_img("title_epc_solutions"), t, sw, y=740)
    im = flash(im, t, sw, 0.12, 0.3)
    return im


EPC_STEPS = [
    # (anchor, badge stem, stage)
    ("site", "badge_site_assessment", 0),
    ("load", "badge_load_analysis", 0),
    ("feas", "badge_feasibility", 0),
    ("d3", "badge_3d_solar_design", 0),
    ("autocad", "badge_autocad", 0),
    ("struct", "badge_structural_engineering", 0),
    ("direct", None, 1),
    ("procure", "badge_procurement", 1),
    ("install", "badge_installation", 2),
    ("commission", "badge_final_commissioning", 2),
]
STAGES = ("ENGINEERING", "PROCUREMENT", "CONSTRUCTION")
PARTNERS = ["logo_jinko", "logo_luminey", "logo_pytes", "logo_topak"]
MOU = [
    # (stem, crop, width, final x, final y, angle, drop time)
    ("mou_luminey", None, 420, 300, 860, 5, 31.05),
    ("mou_pytes", (0, 45, 1079, 1005), 420, 780, 850, -4, 31.55),
    ("mou_topak", None, 580, 540, 920, 1.5, 32.05),
]


def epc_anchor(name):
    return 27.30 if name == "autocad" else A[name]


def partnerships(im, t):
    """Direct manufacturer partnerships: partner logos pop in, then the MOU photos drop onto the board."""
    t0 = A["direct"]
    tb = 31.0  # logos -> strip, photos start
    mv = ease_in_out(prog(t, tb, 0.35))
    # headline: big first, then a compact kicker
    k1 = 1 - mv
    if k1 > 0:
        wipe_text(im, text_img("DIRECT MANUFACTURER", HEAD, 78, "metal"), 540, 500, t, t0, alpha=k1)
        wipe_text(im, text_img("PARTNERSHIPS", HEAD, 104, "gold", glow=6), 540, 605, t, t0 + 0.15, alpha=k1)
    if mv > 0:
        paste(im, text_img("OFFICIAL MANUFACTURER PARTNERSHIPS", BOLD, 38, "gold", track=6), 540, 445, alpha=mv)
    # logos: 2x2 grid -> bottom strip
    for j, stem in enumerate(PARTNERS):
        ta = t0 + 0.2 + j * 0.22
        if t < ta:
            continue
        pop = ease_out_back(prog(t, ta, 0.3))
        gx, gy = (300 if j % 2 == 0 else 780), (790 if j < 2 else 990)
        sx, sy = 160 + j * 253, 530
        x = gx + (sx - gx) * mv
        y = gy + (sy - gy) * mv
        tile = logo_tile(stem)
        sc = max(0.01, pop) * (1 - 0.45 * mv)
        paste(im, tile.resize((max(1, int(tile.width * sc)), max(1, int(tile.height * sc))), Image.BICUBIC), x, y,
              alpha=clamp(pop))
    # MOU photos drop onto the board one by one
    for stem, crop, wdt, fx, fy, ang, td in MOU:
        if t < td:
            continue
        p = prog(t, td, 0.3)
        s = 1.35 - 0.35 * ease_out(p)
        ph = photo_frame(stem, wdt, ang, crop)
        y = fy - (1 - ease_out(p)) * 80
        paste(im, ph.resize((max(1, int(ph.width * s)), max(1, int(ph.height * s))), Image.BICUBIC), fx, y,
              alpha=clamp(p * 3))


def sc_epc_flow(t):
    """23.36-35.35: Engineering -> Procurement -> Construction with the client's badges."""
    idx = 0
    for j, s in enumerate(EPC_STEPS):
        if t >= epc_anchor(s[0]):
            idx = j
    anchor, stem, stage = EPC_STEPS[idx]
    t0 = epc_anchor(anchor)
    t1 = epc_anchor(EPC_STEPS[idx + 1][0]) if idx + 1 < len(EPC_STEPS) else 35.35
    lt = t - t0
    if stage == 0:
        if t < A["d3"]:
            im = plate("flow_blueprint_bg", 0.5 + (t - A["site"]) * 0.75)
        else:
            im = plate("flow_blueprint_panels", 3.2 + (t - A["d3"]) * 0.8)
        im = darken(im, 0.4)
    elif stage == 1:
        im = plate("flow_dashboard", 2.0 + (t - A["direct"]) * 0.6)
        im = darken(im, 0.62)
        paste(im, grid_overlay(), 0, 0, anchor="tl", alpha=0.5)
    else:
        if anchor == "install":
            im = plate("mg_build", 2.75 + lt, zoom=1.04)
        else:
            im = plate("mg_inverter", 0.95 + lt, zoom=1.0 + 0.03 * lt)
        im = darken(im, 0.35)
    stage_t = {0: A["site"], 1: A["direct"], 2: A["install"]}[stage]
    draw_band(im, 270, 420, strength=170)
    epc_tracker(im, t, stage, stage_t)
    if anchor == "direct":
        partnerships(im, t)
    else:
        b = badge_img(stem, 820, 620)
        scale_in(im, b, 540, 800, t, t0, dur=0.3, s0=0.86, s1=1.0, hold_zoom=0.02)
        rise_text(im, text_img(f"STEP {idx + 1 if idx < 6 else idx:02d} / 09", BOLD, 30, CYAN, track=8), 540,
                  450, t, t0, dist=10)
    if idx > 0:
        im = flash(im, t, t0, 0.14, 0.22)
    return im


def sc_accountable(t):
    """35.35-39.30: Every stage. Every detail. One accountable EPC partner."""
    lt = t - A["stage"]
    im = still_plate("bg_vertical_rooftop", lt, 3.95, 1.0, 1.08, 0.5, 0.5)
    im = darken(im, 0.2)
    draw_band(im, 380, 960, strength=170)
    ex = A["zimmedari"] - 0.15
    slam_text(im, text_img("EVERY STAGE.", HEAD, 112, "metal"), 540, 560, t, A["stage"], exit_t=ex, s0=1.2)
    slam_text(im, text_img("EVERY DETAIL.", HEAD, 112, "blue", glow=8), 540, 700, t, A["detail"], exit_t=ex,
              s0=1.2)
    z0 = A["zimmedari"]
    rise_text(im, text_img("NIKSOL ENERGY", BOLD, 46, "gold", track=12), 540, 500, t, z0 + 0.05, dist=20)
    scale_in(im, text_img("ONE ACCOUNTABLE", HEAD, 96, "metal"), 540, 640, t, z0 + 0.1, dur=0.35, s0=1.12)
    scale_in(im, text_img("EPC PARTNER", HEAD, 124, "blue", glow=10), 540, 775, t, z0 + 0.3, dur=0.35, s0=1.12)
    hline(im, 260, 820, 870, t, z0 + 0.55, color=CYAN, width=5, center=True)
    return im


def quality_pips(im, idx):
    d = ImageDraw.Draw(im)
    for j in range(4):
        x = 540 + (j - 1.5) * 44
        d.rounded_rectangle([x - 14, 330, x + 14, 336], 3,
                            fill=GOLD if j == idx else (CYAN if j < idx else (60, 80, 110)))


def sc_quality(t):
    """39.30-47.17: Tier-1 panels, inverters, custom engineering, 10-yr structural warranty."""
    if t < A["inverters"]:
        t0 = 39.30
        lt = t - t0
        im = plate("mg_panels", 2.2 + lt * 0.9, zoom=1.0 + 0.04 * lt / 3.15)
        im = darken(im, 0.15)
        draw_band(im, 420, 900, strength=190)
        quality_pips(im, 0)
        rise_text(im, text_img("ONLY", BOLD, 48, CYAN, track=14), 540, 500, t, 39.6, dist=15)
        slam_text(im, text_img("TIER-1", HEAD, 190, "metal"), 540, 640, t, A["tier1"], s0=1.25)
        wipe_text(im, text_img("SOLAR PANELS", HEAD, 88, "blue", glow=6), 540, 790, t, A["tier1"] + 0.25)
        return im
    if t < A["custom"]:
        t0 = A["inverters"]
        im = plate("mg_inverter", 2.6 + (t - t0), zoom=1.02)
        im = darken(im, 0.4)
        quality_pips(im, 1)
        scale_in(im, badge_img("badge_inverters", 900, 660), 540, 740, t, t0, dur=0.3, s0=0.85, hold_zoom=0.02)
        return flash(im, t, t0, 0.12, 0.25)
    if t < A["warranty"]:
        t0 = A["custom"]
        im = blurred_bg("title_custom_engineering")
        quality_pips(im, 2)
        show_card(im, card_img("title_custom_engineering"), t, t0, y=740)
        return flash(im, t, t0, 0.12, 0.25)
    t0 = A["warranty"]
    lt = t - t0
    im = plate("mg_build", 0.1 + lt * 0.95, zoom=1.04)
    im = darken(im, 0.35)
    quality_pips(im, 3)
    p = ease_out(prog(t, t0, 0.6))
    fr = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    fd = ImageDraw.Draw(fr)
    a = int(110 * p)
    for k in range(5):
        x = 140 + k * 200
        fd.line([(x, 420), (x, 420 + 680 * p)], fill=CYAN + (a,), width=2)
    for yy in (420, 1100):
        fd.line([(140, yy), (140 + 800 * p, yy)], fill=CYAN + (a,), width=2)
    for k in range(4):
        x = 140 + k * 200
        fd.line([(x, 420), (x + 200 * p, 1100)], fill=CYAN + (a // 2,), width=2)
    paste(im, fr, 0, 0, anchor="tl", alpha=0.85)
    scale_in(im, badge_img("badge_warranty_10yr", 860, 700), 540, 760, t, t0 + 0.05, dur=0.35, s0=1.2,
             hold_zoom=0.015)
    return flash(im, t, t0, 0.14, 0.3)


def sc_support(t):
    """47.17-51.67: system monitoring card, technical support, after-sales card."""
    if t < A["support"]:
        t0 = 47.17
        im = plate("flow_dashboard_c", 1.0 + (t - t0) * 0.8)
        im = darken(im, 0.5)
        show_card(im, card_img("title_system_monitoring"), t, t0 + 0.05, y=740)
        paste(im, text_img("Illustrative visualisation", MED, 22, (150, 170, 200), shadow=False), 1000, 1050,
              anchor="r", alpha=0.8)
        return im
    if t < A["aftersales"]:
        t0 = A["support"]
        im = plate("flow_dashboard_b", 3.0 + (t - t0) * 0.8)
        im = darken(im, 0.45)
        draw_band(im, 480, 960, strength=170)
        scale_in(im, icon("headset", 150, CYAN), 540, 560, t, t0, dur=0.3, s0=0.7)
        slam_text(im, text_img("TECHNICAL", HEAD, 120, "metal"), 540, 720, t, t0 + 0.05, s0=1.2)
        slam_text(im, text_img("SUPPORT", HEAD, 120, "blue", glow=8), 540, 850, t, t0 + 0.2, s0=1.2)
        return flash(im, t, t0, 0.12, 0.25)
    t0 = A["aftersales"]
    im = blurred_bg("title_after_sales")
    show_card(im, card_img("title_after_sales"), t, t0, y=740)
    return flash(im, t, t0, 0.12, 0.25)


def sc_cta_contact(t):
    """51.67-56.26: Contact Niksol for your factory / commercial building."""
    lt = t - A["cta"]
    c0 = A["contact"]
    if t < c0:
        im = still_plate("photo_site_canopy", lt, c0 - A["cta"], 1.0, 1.1, 0.5, 0.5)
    else:
        im = plate("real_035", 4.2 + (t - c0) * 0.75, zoom=1.0 + 0.05 * (t - c0) / 2.4, cx=0.62, cy=0.5)
        im = flash(im, t, c0, 0.1, 0.3)
    im = darken(im, 0.22)
    draw_band(im, 380, 1100, strength=200)
    ex = c0 - 0.2
    rise_text(im, text_img("FOR YOUR", BOLD, 50, CYAN, track=14), 540, 500, t, A["cta"] + 0.1, exit_t=ex)
    slam_text(im, text_img("FACTORY", HEAD, 140, "metal"), 540, 630, t, A["cta"] + 0.35, exit_t=ex, s0=1.25)
    wipe_text(im, text_img("& COMMERCIAL", HEAD, 104, "blue", glow=8), 540, 765, t, A["cta"] + 1.4, exit_t=ex)
    wipe_text(im, text_img("BUILDING", HEAD, 104, "metal"), 540, 875, t, A["cta"] + 1.6, exit_t=ex)
    slam_text(im, text_img("CONTACT", HEAD, 116, "metal"), 540, 560, t, c0, s0=1.25)
    wipe_text(im, text_img("NIKSOL ENERGY", HEAD, 110, "gold", glow=6), 540, 690, t, c0 + 0.2)
    rise_text(im, text_img("TODAY", BOLD, 56, SILVER, track=18), 540, 800, t, c0 + 0.45, dist=20)
    if t >= c0 + 0.7:
        p = ease_out(prog(t, c0 + 0.7, 0.4))
        glass_panel(im, (170, 880, 910, 990), alpha=p, border=GOLD, fill_a=200, radius=55)
        paste(im, icon("phone", 54, GOLD), 245, 935, alpha=p)
        paste(im, text_img("+92 333 0755575", HEAD, 58, WHITE), 580, 935, alpha=p)
    return im


CTA_CARDS = [
    ("h24", "cta_within_24h", 1000),
    ("free", "cta_free_site_assessment_b", 1032),
    ("design3d", "cta_3d_design", 1032),
    ("quote", "cta_quotation", 1032),
]


def sc_cta_offer(t):
    """56.26-62.04: Within 24 hours -> FREE site assessment -> 3D design -> quotation cards."""
    idx = 0
    for j, (a, _, _) in enumerate(CTA_CARDS):
        if t >= A[a]:
            idx = j
    anchor, stem, wdt = CTA_CARDS[idx]
    t0 = A[anchor]
    im = blurred_bg(stem, dark=0.55)
    paste(im, grid_overlay(), 0, 0, anchor="tl", alpha=0.25)
    if t >= A["free"] - 0.25:
        rise_text(im, text_img("BOOK YOUR FREE SITE ASSESSMENT", HEAD, 44, "gold", glow=4), 540, 380, t,
                  A["free"] - 0.25, dist=15)
    else:
        rise_text(im, text_img("NIKSOL ENERGY", BOLD, 40, CYAN, track=12), 540, 380, t, A["h24"], dist=15)
    show_card(im, card_img(stem, width=wdt), t, t0, y=760)
    if anchor == "free":
        c = card_img(stem, width=wdt)
        light_sweep(im, (540 - c.width // 2, 760 - c.height // 2, 540 + c.width // 2, 760 + c.height // 2), t,
                    t0 + 0.4, 0.8)
    return flash(im, t, t0, 0.12, 0.25)


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
    k = logo_bug_alpha(t)
    if k > 0:
        paste(im, logo_bug(), 1035, 195, anchor="r", alpha=k)
    return im


@functools.lru_cache(maxsize=None)
def logo_bug():
    lg = logo_rgba()
    s = 190 / lg.width
    return lg.resize((int(lg.width * s), int(lg.height * s)), Image.LANCZOS)


# Brand bug hidden on frames that already show the Niksol brand (titles, project cards, partnership board, end card).
BUG_OFF = [(10.17, 16.85), (29.87, 32.71), (62.04, 99.0)]


def logo_bug_alpha(t, fade=0.25):
    k = clamp((t - 0.3) / 0.4)
    for a, b in BUG_OFF:
        if a <= t <= b:
            return 0.0
        d = (a - t) if t < a else (t - b)
        k = min(k, clamp(d / fade))
    return k * 0.92


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
