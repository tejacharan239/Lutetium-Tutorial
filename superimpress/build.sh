#!/usr/bin/env bash
# Build the SuperImpress promo end to end:
#   fonts -> timeline -> soundtrack -> frames -> loudness-normalised mux
#
#   ./build.sh                  # 1920x1080, 30 fps -> build/superimpress-promo.mp4
#   RSCALE=0.5 ./build.sh       # a 960x540 draft of the same cut, much faster
#   WORKERS=8 ./build.sh        # parallel browsers (default: number of CPUs)
#   VBR=5M ./build.sh           # delivery video bitrate (default 3.4M: about 25 MB for the film)
set -euo pipefail
cd "$(dirname "$0")"
FF=${FFMPEG:-$(python3 -c 'import imageio_ffmpeg; print(imageio_ffmpeg.get_ffmpeg_exe())')}
WORKERS=${WORKERS:-$(nproc)}
OUT=${OUT:-build/superimpress-promo.mp4}
VBR=${VBR:-3400k}
mkdir -p build

[ -s build/fonts.css ] || python3 fonts.py build/fonts.css
node timeline.mjs build/timeline.json
python3 soundtrack.py build/timeline.json build/soundtrack.wav
# frames go to a near-lossless mezzanine; the delivery encode below is made from it
CRF=12 FPS=30 FFMPEG="$FF" node ../tools/render-video.mjs promo.html build/video.mp4 "$WORKERS"

# Two-pass loudness normalisation to -14 LUFS / -2 dBTP, the usual target for web and
# social video: measure first, then apply a single linear gain with those measurements.
M=$("$FF" -hide_banner -nostats -i build/soundtrack.wav -af loudnorm=I=-14:TP=-2:LRA=11:print_format=json -f null - 2>&1 | sed -n '/^{/,/^}/p')
arg() { python3 -c "import json,sys; print(json.loads(sys.stdin.read())['$1'])" <<<"$M"; }
LN="loudnorm=I=-14:TP=-2:LRA=11:measured_I=$(arg input_i):measured_TP=$(arg input_tp):measured_LRA=$(arg input_lra):measured_thresh=$(arg input_thresh):offset=$(arg target_offset):linear=true"

# Two-pass x264 at a fixed bitrate: paper grain on every moving surface makes a constant-
# quality encode large, and two passes spend the bits where the motion is.
X264=(-c:v libx264 -preset slow -profile:v high -pix_fmt yuv420p -r 30 -g 60 -b:v "$VBR" -maxrate 7M -bufsize 10M -passlogfile build/x264)
"$FF" -y -hide_banner -loglevel error -i build/video.mp4 "${X264[@]}" -pass 1 -an -f null /dev/null
"$FF" -y -hide_banner -loglevel error -i build/video.mp4 -i build/soundtrack.wav -map 0:v -map 1:a \
  "${X264[@]}" -pass 2 -af "$LN,aresample=48000" -c:a aac -b:a 192k -shortest -movflags +faststart "$OUT"
rm -f build/x264*
echo "built $OUT"
