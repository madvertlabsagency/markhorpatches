#!/usr/bin/env bash
# Render the clean 9:16 picture in parallel segments, then concat.
set -euo pipefail
cd "$(dirname "$0")/.."
FRAMES=$(python3 -c "import sys;sys.path.insert(0,'scripts');from timeline import DURATION,FPS;print(round(DURATION*FPS))")
J=${JOBS:-4}
STEP=$(( (FRAMES + J - 1) / J ))
mkdir -p out/seg
: > out/seg/list.txt
pids=()
for ((k=0; k<J; k++)); do
  f0=$((k*STEP)); f1=$(( (k+1)*STEP < FRAMES ? (k+1)*STEP : FRAMES ))
  python3 scripts/render.py segment $f0 $f1 out/seg/seg_$k.mp4 > out/seg/log_$k.txt 2>&1 &
  pids+=($!)
  echo "file 'seg_$k.mp4'" >> out/seg/list.txt
done
for p in "${pids[@]}"; do wait $p; done
ffmpeg -v error -y -f concat -safe 0 -i out/seg/list.txt -c copy out/seg/picture_clean.mp4
echo "frames=$FRAMES done"
