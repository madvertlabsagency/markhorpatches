#!/usr/bin/env bash
# Mux picture + audio into the 9:16 deliverables (H.264 High, Rec.709, AAC 48 kHz).
set -euo pipefail
cd "$(dirname "$0")/.."
PIC=out/seg/picture_clean.mp4
V="-c:v libx264 -preset slow -crf 16 -profile:v high -pix_fmt yuv420p -r 25 -g 50 -colorspace bt709 -color_primaries bt709 -color_trc bt709 -movflags +faststart"
AUD="-c:a aac -b:a 256k -ar 48000 -ac 2"
SUBS="subtitles=out/subtitles_9x16.ass:fontsdir=/usr/share/fonts/opentype/inter"
ffmpeg -v error -y -i $PIC -i out/audio/mix_A.wav -map 0:v -map 1:a -vf "$SUBS" $V $AUD -shortest \
  out/final/Niksol_Energy_Commercial_9x16_Subtitled.mp4
ffmpeg -v error -y -i $PIC -i out/audio/mix_A.wav -map 0:v -map 1:a $V $AUD -shortest \
  out/final/Niksol_Energy_Commercial_9x16_Clean.mp4
ffmpeg -v error -y -i $PIC -i out/audio/mix_B.wav -map 0:v -map 1:a -vf "$SUBS" $V $AUD -shortest \
  out/final/Niksol_Energy_Commercial_9x16_Natural_Audio_Only.mp4
cp out/Niksol_Energy_Commercial_9x16.srt out/final/
