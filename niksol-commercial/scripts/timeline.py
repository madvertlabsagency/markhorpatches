"""Voiceover-locked timing anchors (seconds) for the Niksol Energy commercial.

Derived from silence analysis of the locked ElevenLabs voiceover
(ffmpeg silencedetect at -35 dB / 0.18 s and -30 dB / 0.07 s).
Every scene and text reveal keys off these values, so if the voiceover
ever changes, update this file and re-render.
"""

FPS = 25
W, H = 1080, 1920
VO_DURATION = 63.164
DURATION = 66.6  # VO + ~3.4 s brand/CTA hold

# Phrase segments: (start, end, text). Text is what the VO says (Roman Urdu).
PHRASES = [
    (0.00, 2.77, "Agar aap commercial ya industrial business chala rahe hain,"),
    (3.04, 5.65, "toh bijli ka bill lakhon mein aana koi nayi baat nahi."),
    (6.09, 9.69, "Lekin solar solution sirf panels lagane tak limited nahi hona chahiye."),
    (10.17, 10.99, "Alhamdulillah,"),
    (11.28, 15.02, "Niksol Energy Pakistan bhar mein textile mills, factories"),
    (15.10, 19.05, "aur barray commercial setups ke solar projects successfully complete kar chuki hai."),
    (19.50, 22.99, "Hum provide karte hain complete end-to-end EPC solutions."),
    (23.36, 24.21, "Site assessment,"),
    (24.47, 26.27, "load analysis, feasibility,"),
    (26.54, 29.65, "professional 3D design aur structural engineering se lekar,"),
    (29.87, 32.47, "direct manufacturer partnerships ke through"),
    (32.71, 34.79, "procurement, installation aur final commissioning tak."),
    (35.35, 36.05, "Har stage,"),
    (36.27, 36.90, "har detail —"),
    (37.25, 38.78, "Niksol Energy ki zimmedari."),
    (39.30, 42.18, "Hum provide karte hain only Tier-1 solar panels,"),
    (42.45, 43.43, "quality inverters,"),
    (43.67, 44.82, "customized engineering"),
    (45.02, 46.76, "aur 10-year structural warranty."),
    (47.17, 48.61, "Saath hi system monitoring,"),
    (48.82, 51.23, "technical support aur after-sales services bhi."),
    (51.67, 55.86, "Toh apni factory ya commercial building ke liye aaj hi Niksol Energy se rabta karein."),
    (56.26, 57.50, "Within 24 hours"),
    (57.71, 61.55, "FREE site assessment, professional 3D solar design aur detailed project quotation hasil karein."),
    (62.04, 62.96, "Niksol Energy."),
]

# Keyword anchors for kinetic typography and sound accents.
A = dict(
    commercial=0.45, industrial=1.45, solutions=2.95, bill=3.10,
    lekin=6.09, panels=7.60,
    alhamdulillah=10.17, niksol_pk=11.28, mills=13.40, factories=15.10, setups=16.85,
    epc_intro=19.50, epc_complete=21.20, epc_e2e=21.75, epc_sol=22.30,
    site=23.36, load=24.47, feas=25.58, d3=26.54, struct=28.05,
    direct=29.87, procure=32.71, install=33.58, commission=34.25,
    stage=35.35, detail=36.27, zimmedari=37.25,
    tier1=40.30, inverters=42.45, custom=43.67, warranty=45.02,
    monitoring=47.40, support=48.82, aftersales=49.80,
    cta=51.67, contact=53.90, h24=56.26, free=57.71, design3d=59.50, quote=60.58,
    brand=62.04,
)

# Scene cuts (start times). Each scene runs until the next one starts.
SCENES = [
    ("hook", 0.00),
    ("beyond", 6.09),
    ("projects_title", 10.17),
    ("project_1", 13.40),
    ("project_2", 15.10),
    ("project_3", 16.85),
    ("epc_title", 19.49),
    ("epc_flow", 23.36),
    ("accountable", 35.35),
    ("quality", 39.30),
    ("support", 47.17),
    ("cta_contact", 51.67),
    ("cta_offer", 56.26),
    ("endcard", 62.04),
]
