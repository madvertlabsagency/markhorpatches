# Asset Manifest (verified media inventory)

## On disk and used

| File (in `assets/`) | Type | Spec | Source / notes | Used in |
|---|---|---|---|---|
| `audio/voiceover.mp3` | Locked VO | 63.164 s, 44.1 kHz mono MP3, −22.7 LUFS | ElevenLabs "Kamran M". Unaltered: only resampled to 48 kHz, 70 Hz high-pass, 160 ms tail fade | Master timing |
| `video/real_yusuf.mp4` | **Real** project footage | 1816×836, 30 fps, 22.4 s | Client file `Yusuf_floor_mil.mp4`. Has a NIKSOL watermark top-left, burned-in captions at 11.0–12.4 s ("Total System 300Kw") and 17.5–18.9 s ("3 Solis Inverter 100KW"), and a logo tail from 19.5 s. Captions and tail are never shown | Projects 01–03, Installation, Commissioning, Every Stage, Tier-1, Inverters |
| `video/real_035.mp4` | **Real** project footage | 4096×2160, 25 fps, 9.08 s (first ~1 s black) | Client file `035.mp4`: ground-level tilt-down of a brick mill with an elevated solar canopy. Site not named, so it carries no project label | Opening, Warranty (steel structure), CTA |
| `video/flow_blueprint_bg.mp4` | Google Flow (AI) | 720×1280, 24 fps, 10 s | Blueprint rooftop → solar layout | Engineering steps, Custom Engineering, Offer |
| `video/flow_blueprint_panels.mp4` | Google Flow (AI) | 720×1280, 24 fps, 10 s | Blueprint lines → panel CAD | "Beyond panels", 3D design / structural steps |
| `video/flow_line_transition.mp4` | Google Flow (AI) | 720×1280, 24 fps, 10 s | Line / circuit transitions. Its end contains an unrelated "e" logo, which is never used | EPC title, Procurement steps |
| `video/flow_light_motion.mp4` | Google Flow (AI) | 720×1280, 24 fps, 8 s | Particle light wave | Projects title backdrop, end card |
| `video/flow_dashboard_b.mp4`, `flow_dashboard_c.mp4` | Google Flow (AI) | 720×1280, 24 fps, 10 s | Abstract dashboards, labelled "Illustrative visualisation" on screen | Monitoring / Support |
| `video/flow_dashboard.mp4` | Google Flow (AI) | 720×1280, 24 fps, 10 s | Abstract dashboard | Not used (alternate) |
| `images/logo_niksol.jpg` | Official logo | 640×640 on black | Black keyed to alpha. Mark, colours and proportions unchanged | End card |
| `images/title_projects_across_pakistan.webp` | Approved title card | 1672×941 | Title lettering and map re-stacked for 9:16 | Projects title |
| `images/badge_site_assessment.webp` | EPC badge | 1536×1024 RGBA | — | EPC step 01 |
| `images/badge_feasibility.webp` | EPC badge | 1312×1199 RGBA | — | EPC step 03 |

Duplicate uploads (byte-identical, ignored): 3 × blueprint background, 2 × blueprint-panels, 2 × dashboard, 2 × dashboard-c, 2 × line-transition, and `5.webp` = `3.webp`.

## Client artwork (recovered from the chat session, v2)

All cards that were shared as chat images were recovered at full resolution and saved in `assets/images/`:
badges (`badge_*`: site assessment, load analysis, feasibility, 3D solar design, AutoCAD, structural engineering, procurement, installation, final commissioning, inverters, 10-year warranty), project cards (`project_hamza/rana/yousuf`), `title_epc_solutions`, `epc_process_strip`, `title_custom_engineering`, `title_system_monitoring`, `title_after_sales`, CTA cards (`cta_*`), backgrounds (`bg_*`), the real site photo `photo_site_canopy.jpg`, partner logos (`logo_jinko/luminey/pytes/topak`) and MOU photos (`mou_luminey/pytes/topak`). The Pytes MOU photo is an Instagram screenshot, so its UI strip and icons are cropped out.

## Missing per the brief (never supplied)

Factory / production-line footage, the 50-second `yousaf (1) (2).mp4`, separate Hamza and Rana drone files, a Tier-1 panels artwork, a Technical Support title card, approved duff recordings.
