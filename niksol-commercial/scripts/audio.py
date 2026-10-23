"""Sound design + mix for the Niksol Energy commercial (no instrumental music).

All background sound is synthesised here from noise and simple physical
models, so nothing is licensed or copyrighted:
  * industrial room tone / machinery hum (opening, factory context)
  * outdoor rooftop wind (project + EPC sections)
  * airy whooshes on transitions, soft low "air" impacts on reveals
  * small mechanical clicks on text locks / step changes
  * Version A only: sparse frame-duff (daff) style hand-drum accents

Outputs (48 kHz stereo WAV) in out/audio/:
  vo.wav, bed_natural.wav, bed_duff.wav, mix_A.wav (VO + natural + duff),
  mix_B.wav (VO + natural only, the stricter version). Loudness is normalised
  to about -16 LUFS / -1.5 dBTP by ffmpeg loudnorm (two-pass).
"""
import json
import os
import subprocess
import sys
import wave

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from timeline import A, DURATION, SCENES  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "out", "audio")
SR = 48000
N = int(DURATION * SR)
rng = np.random.default_rng(7)


def db(x):
    return 10 ** (x / 20)


def fft_filter(x, lo=None, hi=None, slope=4.0):
    """Zero-phase band filter in the frequency domain (soft edges)."""
    n = len(x)
    X = np.fft.rfft(x)
    f = np.fft.rfftfreq(n, 1 / SR)
    g = np.ones_like(f)
    if hi:
        g *= 1 / (1 + (f / hi) ** (2 * slope))
    if lo:
        g *= 1 / (1 + (lo / np.maximum(f, 1e-3)) ** (2 * slope))
    return np.fft.irfft(X * g, n)


def norm(x):
    return x / (np.max(np.abs(x)) + 1e-9)


def env_ar(n, a, r):
    t = np.arange(n) / SR
    e = np.minimum(1, t / max(a, 1e-4)) * np.exp(-np.maximum(0, t - a) / r)
    return e


def place(buf, sig, t, gain=1.0):
    i = int(t * SR)
    if i >= len(buf):
        return
    j = min(len(buf), i + len(sig))
    buf[i:j] += sig[: j - i] * gain


def stereo(mono, width=0.0, seed=0):
    """Decorrelated stereo from mono by mixing in a filtered copy."""
    if width <= 0:
        return np.stack([mono, mono], 1)
    r = np.random.default_rng(seed)
    d = int(SR * 0.011)
    side = np.roll(mono, d) * width
    _ = r
    return np.stack([mono + side, mono - side], 1)


# ------------------------------------------------------------------ elements
def room_tone():
    """Low industrial rumble + faint 100 Hz mains-type machine hum, slow movement."""
    br = np.cumsum(rng.standard_normal(N))
    br = fft_filter(br - np.mean(br), lo=25, hi=180)
    br = norm(br)
    t = np.arange(N) / SR
    hum = 0.25 * np.sin(2 * np.pi * 100 * t) + 0.08 * np.sin(2 * np.pi * 200 * t + 1)
    hum *= 0.6 + 0.4 * np.sin(2 * np.pi * 0.21 * t) ** 2
    mech = fft_filter(rng.standard_normal(N), lo=600, hi=2400)
    mech = norm(mech) * (0.5 + 0.5 * np.sin(2 * np.pi * 7.3 * t) ** 8) * 0.25  # rhythmic machine texture
    return br * 0.7 + hum * 0.35 + mech


def wind():
    w = fft_filter(rng.standard_normal(N), lo=120, hi=1400, slope=2)
    w = norm(w)
    t = np.arange(N) / SR
    lfo = 0.55 + 0.25 * np.sin(2 * np.pi * 0.09 * t) + 0.2 * np.sin(2 * np.pi * 0.23 * t + 2)
    return w * lfo


def whoosh(dur=0.7, f0=300, f1=3200, seed=0):
    r = np.random.default_rng(seed)
    n = int(dur * SR)
    x = r.standard_normal(n)
    # time-varying band via short-time FFT crossfade of 4 bands
    out = np.zeros(n)
    bands = np.geomspace(f0, f1, 6)
    seg = n // (len(bands) - 1)
    for k in range(len(bands) - 1):
        b = fft_filter(x, lo=bands[k] * 0.7, hi=bands[k + 1] * 1.3, slope=2)
        w = np.zeros(n)
        c = (k + 0.5) * seg
        idx = np.arange(n)
        w = np.exp(-((idx - c) / (seg * 0.9)) ** 2)
        out += b * w
    e = np.sin(np.pi * np.clip(np.arange(n) / n, 0, 1)) ** 1.5
    return norm(out * e)


def air_impact(seed=0):
    """Soft low thump made from filtered noise (no tonal instrument)."""
    r = np.random.default_rng(seed)
    n = int(1.2 * SR)
    x = fft_filter(r.standard_normal(n), lo=30, hi=140, slope=3)
    e = env_ar(n, 0.006, 0.28)
    body = norm(x * e)
    tail = fft_filter(r.standard_normal(n), lo=200, hi=900) * env_ar(n, 0.01, 0.5)
    return norm(body + norm(tail) * 0.12)


def click(seed=0, bright=1.0):
    r = np.random.default_rng(seed)
    n = int(0.06 * SR)
    x = fft_filter(r.standard_normal(n), lo=1800 * bright, hi=7000)
    x2 = fft_filter(r.standard_normal(n), lo=400, hi=1200) * 0.4
    return norm((x + x2) * env_ar(n, 0.0008, 0.012))


def duff_dum(seed=0):
    """Frame-drum 'dum': damped membrane (pitch-dropping partial) + skin slap."""
    r = np.random.default_rng(seed)
    n = int(0.9 * SR)
    t = np.arange(n) / SR
    f = 72 + 30 * np.exp(-t / 0.035)
    ph = 2 * np.pi * np.cumsum(f) / SR
    body = np.sin(ph) * np.exp(-t / 0.22) + 0.3 * np.sin(1.59 * ph) * np.exp(-t / 0.09)
    slap = fft_filter(r.standard_normal(n), lo=300, hi=2500) * env_ar(n, 0.001, 0.018)
    jingle_free = body + norm(slap) * 0.25
    return norm(jingle_free)


def duff_tak(seed=0):
    r = np.random.default_rng(seed)
    n = int(0.35 * SR)
    t = np.arange(n) / SR
    rim = np.sin(2 * np.pi * 330 * t) * np.exp(-t / 0.03) * 0.5
    slap = fft_filter(r.standard_normal(n), lo=900, hi=5000) * env_ar(n, 0.0008, 0.035)
    return norm(rim + norm(slap))


# ------------------------------------------------------------------ build
def read_vo():
    os.makedirs(OUT, exist_ok=True)
    p = os.path.join(OUT, "vo.wav")
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", os.path.join(ROOT, "assets/audio/voiceover.mp3"),
                    "-ar", str(SR), "-ac", "1", "-af", "highpass=f=70,afade=t=out:st=63.0:d=0.16",
                    p], check=True)
    with wave.open(p) as w:
        x = np.frombuffer(w.readframes(w.getnframes()), np.int16).astype(np.float64) / 32768
    vo = np.zeros(N)
    vo[: min(N, len(x))] = x[:N]
    return vo


def duck_curve(vo):
    """Gain curve for the bed: -9 dB under speech, smooth attack/release."""
    win = int(0.03 * SR)
    p = np.convolve(vo ** 2, np.ones(win) / win, "same")
    lvl = np.sqrt(p)
    speech = np.clip((20 * np.log10(lvl + 1e-6) + 45) / 15, 0, 1)
    # smooth: fast attack (40 ms), slow release (350 ms) approximated by two box filters
    k1 = np.ones(int(0.04 * SR)) / int(0.04 * SR)
    k2 = np.ones(int(0.35 * SR)) / int(0.35 * SR)
    s = np.maximum(np.convolve(speech, k1, "same"), np.convolve(speech, k2, "same") * 0.9)
    return db(-9 * s)


def scene_times():
    return [s for _, s in SCENES]


HOOK_CUTS = [0.62, 1.30, 2.10, 2.85, 3.55, 4.30, 5.15]
INTERNAL_CUTS = HOOK_CUTS + [21.15, A["load"], A["feas"], A["d3"], 27.30, A["struct"], A["procure"], A["install"],
                             A["commission"], A["inverters"], A["custom"], A["warranty"], A["support"],
                             A["aftersales"], A["contact"], A["free"], A["design3d"], A["quote"]]
TYPE_HITS = [A["commercial"], A["industrial"], 1.95, 3.10, 3.95, 4.80, 7.25, A["panels"], 18.0 - 1.1, 17.15,
             A["epc_complete"] - 0.05, A["direct"], 30.0, A["stage"], A["detail"], A["zimmedari"] + 0.1,
             A["tier1"], A["support"], A["cta"] + 0.35, A["contact"]]
STEP_CLICKS = [A["site"], A["load"], A["feas"], A["d3"], 27.30, A["struct"], A["procure"], A["install"],
               A["commission"], 30.07, 30.29, 30.51, 30.73, A["zimmedari"] + 0.6, A["inverters"], A["custom"],
               A["monitoring"], A["aftersales"], A["contact"] + 0.7, A["h24"], A["design3d"], A["quote"],
               A["brand"] + 1.0]
MOU_DROPS = [31.05, 31.55, 32.05]

BPM = 96
# intensity of the duff bed per section (0 = silent)
DUFF_ENV = ([0, 6.09, 10.17, 19.49, 29.87, 35.35, 39.30, 51.67, 62.04, 62.05],
            [0.8, 0.5, 1.0, 0.75, 0.9, 0.35, 0.75, 0.95, 0.95, 0.0])


def section_level(tt):
    xs, ys = DUFF_ENV
    lvl = ys[0]
    for x, y in zip(xs, ys):
        if tt >= x:
            lvl = y
    return lvl


def room_reverb(x, seconds=1.1, wet=0.22, seed=9):
    r = np.random.default_rng(seed)
    n = int(seconds * SR)
    ir = fft_filter(r.standard_normal(n), lo=150, hi=4000) * np.exp(-np.arange(n) / SR / (seconds / 5))
    ir /= np.sqrt(np.sum(ir ** 2))
    m = len(x) + n
    y = np.fft.irfft(np.fft.rfft(x, m) * np.fft.rfft(ir, m), m)[: len(x)]
    return x + y * wet


def duff_bed(t):
    """Traditional frame-drum pattern: dum . . tak dum . tak (tak) per bar, humanised."""
    beat = 60 / BPM
    eighth = beat / 2
    bar = [(0, "dum", -24), (3, "tak", -31), (4, "dum", -27), (6, "tak", -30), (7, "tak", -37)]
    out = np.zeros(N)
    r = np.random.default_rng(21)
    hits = {}
    k = 0
    tt0 = 0.0
    while tt0 < 62.04:
        lvl = section_level(tt0)
        for pos, kind, g in bar:
            tt = tt0 + pos * eighth + r.normal(0, 0.006)
            if tt >= 62.04 or lvl <= 0:
                continue
            if lvl < 0.5 and kind == "tak":
                continue  # sparse in the quiet "every stage" moment
            key = (kind, k % 6)
            if key not in hits:
                hits[key] = (duff_dum if kind == "dum" else duff_tak)(seed=600 + k % 6)
            place(out, hits[key], max(0, tt), db(g + r.normal(0, 0.8)) * lvl)
            k += 1
        tt0 += 8 * eighth
    return room_reverb(out) * db(12)  # bed sits ~12 LU under the voice


def duff_accents():
    out = np.zeros(N)
    pattern = [(A["alhamdulillah"], "dum", -21), (A["mills"], "dum", -22), (A["factories"], "dum", -22),
               (A["setups"], "dum", -21), (A["setups"] + 0.36, "tak", -28), (A["zimmedari"], "dum", -22),
               (A["warranty"], "dum", -22), (A["free"], "dum", -21), (A["brand"], "dum", -20),
               (A["brand"] + 0.48, "tak", -28), (A["brand"] + 0.96, "dum", -24)]
    for k, (tt, kind, g) in enumerate(pattern):
        place(out, (duff_dum if kind == "dum" else duff_tak)(seed=80 + k), tt, db(g))
    return room_reverb(out, wet=0.18)


def build():
    vo = read_vo()
    t = np.arange(N) / SR

    # ambience automation per section
    room = room_tone()
    room_env = np.interp(t, [0, 5.5, 7.0, 47, 49, 52, 62, DURATION], [1, 1, 0.35, 0.35, 0.2, 0.35, 0.15, 0])
    wnd = wind()
    wind_env = np.interp(t, [0, 3, 6, 10, 19.5, 23, 35, 39, 47, 51.7, 56, 62, DURATION],
                         [0.35, 0.5, 0.4, 0.8, 0.8, 0.4, 0.5, 0.8, 0.5, 0.8, 0.5, 0.3, 0])
    natural = np.zeros(N)
    natural += room * room_env * db(-25)
    natural += wnd * wind_env * db(-28)

    sfx = np.zeros(N)
    # scene transitions: full whoosh slightly before each cut
    for k, st in enumerate(scene_times()[1:]):
        place(sfx, whoosh(0.65, seed=k), st - 0.38, db(-21))
    # fast internal cuts (hook montage, step/card changes): short bright swish
    for k, tt in enumerate(INTERNAL_CUTS):
        place(sfx, whoosh(0.32, f0=900, f1=6000, seed=200 + k), tt - 0.2, db(-24))
    # kinetic-type hits: click + small air thump on every slam / text lock
    for k, tt in enumerate(TYPE_HITS):
        place(sfx, click(seed=300 + k, bright=1.3), tt, db(-21))
        place(sfx, air_impact(seed=400 + k), tt, db(-27))
    # reveal impacts
    for k, tt in enumerate([0.02, A["alhamdulillah"], A["mills"], A["factories"], A["setups"], A["epc_complete"],
                            A["zimmedari"], A["warranty"], A["free"], A["brand"]]):
        place(sfx, air_impact(seed=10 + k), tt, db(-15 if k in (0, 9) else -18))
    # clicks on step / item locks and partner logo pops
    for k, tt in enumerate(STEP_CLICKS):
        place(sfx, click(seed=40 + k), tt, db(-23))
    # MOU photos landing on the board
    for k, tt in enumerate(MOU_DROPS):
        place(sfx, air_impact(seed=500 + k), tt + 0.2, db(-19))
        place(sfx, click(seed=520 + k, bright=0.7), tt + 0.22, db(-22))

    # Version A: gentle frame-duff bed (calm, sparse groove, never louder than the voice)
    duff = duff_bed(t) + duff_accents()
    duck = duck_curve(vo)
    bed_nat = (natural + sfx) * duck
    bed_duff = duff * (0.5 + 0.5 * duck)

    fade = np.clip((DURATION - t) / 0.6, 0, 1)
    vo_st = stereo(vo)
    nat_st = stereo(bed_nat * fade, width=0.35, seed=1)
    duff_st = stereo(bed_duff * fade, width=0.1, seed=2)

    def write(name, x):
        x = np.clip(x, -1, 1)
        with wave.open(os.path.join(OUT, name), "w") as w:
            w.setnchannels(2)
            w.setsampwidth(2)
            w.setframerate(SR)
            w.writeframes((x * 32767).astype(np.int16).tobytes())

    write("stem_vo.wav", vo_st)
    write("stem_natural_sfx.wav", nat_st)
    write("stem_duff.wav", duff_st)
    write("premix_A.wav", vo_st + nat_st + duff_st)
    write("premix_B.wav", vo_st + nat_st)
    for v in ("A", "B"):
        loudnorm(os.path.join(OUT, f"premix_{v}.wav"), os.path.join(OUT, f"mix_{v}.wav"))


def loudnorm(src, dst, I=-16, TP=-1.5, LRA=11):
    r = subprocess.run(["ffmpeg", "-hide_banner", "-i", src, "-af",
                        f"loudnorm=I={I}:TP={TP}:LRA={LRA}:print_format=json", "-f", "null", "-"],
                       capture_output=True, text=True)
    js = json.loads(r.stderr[r.stderr.rindex("{"):])
    af = (f"loudnorm=I={I}:TP={TP}:LRA={LRA}:measured_I={js['input_i']}:measured_TP={js['input_tp']}:"
          f"measured_LRA={js['input_lra']}:measured_thresh={js['input_thresh']}:offset={js['target_offset']}"
          f":linear=true")
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", src, "-af", af, "-ar", str(SR), dst], check=True)


if __name__ == "__main__":
    build()
