"""Build Roman-Urdu subtitles (SRT + styled ASS for burn-in) from the VO phrases.

Long phrases are split into chunks of <= ~44 characters with time allotted
proportionally to character count, so each card stays within two lines.
Placement: bottom margin 690 px on a 1920 px frame, i.e. above the
bottom ~35% that Meta Reels overlays with UI.
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from timeline import PHRASES  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MAXC = 44


def chunks(text):
    words = text.split()
    out, cur = [], ""
    for w in words:
        if cur and len(cur) + 1 + len(w) > MAXC:
            out.append(cur)
            cur = w
        else:
            cur = f"{cur} {w}".strip()
    if cur:
        out.append(cur)
    # merge a dangling short tail into the previous chunk
    if len(out) > 1 and len(out[-1]) < 12 and len(out[-2]) + len(out[-1]) < MAXC + 12:
        tail = out.pop()
        out[-1] += " " + tail
    return out


def cues():
    res = []
    for s, e, text in PHRASES:
        parts = chunks(text)
        total = sum(len(p) for p in parts)
        t = s
        for p in parts:
            d = (e - s) * len(p) / total
            res.append((t, t + d, p))
            t += d
    # extend each cue slightly into the following gap for readability
    ext = []
    for i, (s, e, p) in enumerate(res):
        nxt = res[i + 1][0] if i + 1 < len(res) else e + 0.6
        ext.append((s, min(nxt - 0.02, e + 0.25), p))
    return ext


def ts_srt(t):
    ms = int(round(t * 1000))
    return f"{ms // 3600000:02d}:{ms // 60000 % 60:02d}:{ms // 1000 % 60:02d},{ms % 1000:03d}"


def ts_ass(t):
    cs = int(round(t * 100))
    return f"{cs // 360000}:{cs // 6000 % 60:02d}:{cs // 100 % 60:02d}.{cs % 100:02d}"


def main():
    os.makedirs(os.path.join(ROOT, "out"), exist_ok=True)
    cs = cues()
    with open(os.path.join(ROOT, "out", "Niksol_Energy_Commercial_9x16.srt"), "w") as f:
        for i, (s, e, p) in enumerate(cs, 1):
            f.write(f"{i}\n{ts_srt(s)} --> {ts_srt(e)}\n{p}\n\n")
    head = """[Script Info]
ScriptType: v4.00+
PlayResX: 1080
PlayResY: 1920
WrapStyle: 0
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Sub,Inter SemiBold,46,&H00FFFFFF,&H00FFFFFF,&H00301506,&HA0301506,0,0,0,0,100,100,0,0,3,14,0,2,110,110,690,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
    with open(os.path.join(ROOT, "out", "subtitles_9x16.ass"), "w") as f:
        f.write(head)
        for s, e, p in cs:
            f.write(f"Dialogue: 0,{ts_ass(s)},{ts_ass(e)},Sub,,0,0,0,,{{\\fad(80,80)}}{p}\n")
    print(len(cs), "cues")


if __name__ == "__main__":
    main()
