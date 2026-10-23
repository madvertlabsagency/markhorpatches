# Niksol Energy — C&I Solar EPC Commercial (9:16 Meta Reels)

Motion-as-code project: every frame is rendered by Python from the locked voiceover's timing anchors, with no keyframing by hand.

## Deliverables (`out/final/`, not committed: ~85 MB each)

* `Niksol_Energy_Commercial_9x16_Subtitled.mp4`: master, VO + natural sound + sparse duff (Version A), burned-in Roman-Urdu subtitles
* `Niksol_Energy_Commercial_9x16_Clean.mp4`: same, no subtitles
* `Niksol_Energy_Commercial_9x16_Natural_Audio_Only.mp4`: stricter Version B (VO + natural ambience/Foley only, no duff), subtitled
* `Niksol_Energy_Commercial_9x16.srt`: subtitle file for platform upload
* `out/audio/stem_*.wav`: VO, natural+SFX and duff stems; `mix_A.wav`, `mix_B.wav`

## Rebuild

```bash
python3 scripts/prep_media.py      # decode clips to raw caches (cache/, ~14 GB)
python3 scripts/audio.py           # sound design + loudness-normalised mixes
python3 scripts/subtitles.py       # SRT + ASS
./scripts/render_all.sh            # picture, 4 parallel workers (~3 min)
./scripts/mux.sh                   # final MP4s
python3 scripts/contact_sheet.py <dir> 12.0 35.5 ...   # review stills
```

* Timing: `scripts/timeline.py` (VO phrases, keyword anchors, scene cuts)
* Scenes and motion: `scripts/render.py`
* To add client artwork, drop files into `assets/images/` using the names in `docs/ASSET_MANIFEST.md`
* Docs: `docs/EDIT_DECISION_LIST.md`, `docs/ASSET_MANIFEST.md`, `docs/QC_REPORT.md`

## 3D motion-graphics plates (`mg/`)

Where no real footage exists, `mg/scene.html` (three.js) renders the B-roll: a solar array dolly (`panels`), mounting structure build with panels landing (`build`), and string inverters powering up (`inverter`).

```bash
cd mg && npm install three@0.160.0 playwright-core@1.47.2
node render_mg.mjs panels 6 ../assets/video/mg_panels.mp4
node render_mg.mjs build 5 ../assets/video/mg_build.mp4
node render_mg.mjs inverter 4.5 ../assets/video/mg_inverter.mp4
cd .. && python3 scripts/prep_media.py mg_panels mg_build mg_inverter
```
