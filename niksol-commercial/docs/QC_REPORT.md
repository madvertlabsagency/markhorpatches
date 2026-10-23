# QC Report — Niksol Energy 9:16 Commercial (v1)

## Technical checks (measured)

| Check | Result |
|---|---|
| Resolution / fps | 1080×1920, 25 fps constant, 1664 frames, 66.60 s |
| Video | H.264 High, yuv420p, Rec.709 tagged, CRF 16 (~10 Mbps), faststart |
| Audio | AAC 256 kbps, 48 kHz stereo |
| Loudness, Version A (VO + natural + duff) | −16.0 LUFS integrated, −1.5 dB true-peak ceiling (two-pass loudnorm) |
| Loudness, Version B (VO + natural only) | −16.0 LUFS, −1.5 dB |
| VO vs bed | VO stem −19.8 LUFS. Natural + SFX bed −39.5 LUFS, ducked −9 dB under speech. Duff −36.9 LUFS, sparse hits only |
| Black frames / frozen picture | ffmpeg blackdetect (0.1 s) + freezedetect (1.2 s): none found apart from the intended final fade |
| VO integrity | Voiceover is not edited, re-timed or regenerated. It starts at 0.00 s and ends at 63.16 s; picture runs 3.4 s past it for the end card |
| Sync | Scene cuts and text reveals land on VO anchors measured from the MP3 pauses (see `EDIT_DECISION_LIST.md`) |
| Safe zones | All key text sits between y≈300 and y≈1180, and subtitles sit above the bottom 35 % used by Reels UI. Headlines auto-fit to ≤ 960 px wide |
| Contacts | +92 333 0755575 · sales@niksolenergy.com · www.niksolenergy.com (website is printed on the client's own project cards) |
| Spelling | HAMZA FLOUR MILL · RANA FLOUR MILL · YOUSUF FLOUR MILLS · 320 KW · 820 KW · 1 MEGAWATT+ · 10-YEAR STRUCTURAL WARRANTY |
| Background sound | No music, no instruments, no vocals, no third-party samples. Every sound is synthesised in `scripts/audio.py`. Not presented as "halal-certified" |

## Items the client must confirm before publishing

1. **Footage vs project labels.** All three project showcases use the single `Yusuf_floor_mil.mp4` clip, split into different parts (client instruction). The wide aerial in that clip shows the same site as the **Hamza** project card (same building, truck and array layout), so it now sits under HAMZA. The flyover and rows sit under YOUSUF, and a low-angle shot under RANA. Please confirm which mill this footage really is, and supply Rana / Yousuf footage if available.
2. **Capacity conflict.** The footage's own burned-in caption says "Total System 300Kw", while the Yousuf card says 1 MEGAWATT+. 300 kW is close to Hamza's 320 KW, which again suggests this clip is Hamza. Please confirm the capacities.
3. **Spelling on the supplied Yousuf card:** it reads "YOUSUF **FLOOR** MILLS / 1 **MEGAWAT+**". The film uses the correct "FLOUR" and "MEGAWATT+". Fix the card before using it anywhere.
4. **"Within 24 hours".** This is spoken in the VO and shown on screen. Confirm Niksol actually delivers the site visit within 24 hours in its service areas.
5. **10-year warranty** is shown as *structural* warranty only, with no claim that it covers panels or inverters.
6. **Monitoring visuals** are AI-generated, abstract and labelled "Illustrative visualisation". They show no real readings.
7. **AI footage.** Flow clips are used only for abstract / blueprint moments and are never presented as a real Niksol site.

## Known limitations of v1

* v2 uses all client cards. The Yousuf card shows only its photo side, with the correct spelling set as live text.
* Partner logos (Jinko, Luminey, Pytes, Topak) appear under "Official manufacturer partnerships". Confirm that Jinko is a direct partner, because only Luminey, Pytes and Topak have MOU or partnership photos.
* The duff bed (Version A) is a continuous, gentle synthesised frame-drum pattern about 12 LU under the voice and ducked under speech. Version B has none.
* Subtitles are proportionally timed within each VO phrase (phrase boundaries are measured; word boundaries are estimated). The speech-recognition model download was blocked in this environment.
* The duff layer is synthesised, not recorded. If the client prefers, use the **Natural Audio Only** version or replace `stem_duff.wav` with an approved recording.
* 16:9 4K master and 4:5 feed versions are not rendered in v1, because the client asked for 9:16 as the priority. The renderer is resolution-parameterised, but those formats need their own layouts.
