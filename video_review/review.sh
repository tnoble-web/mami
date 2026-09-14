#!/usr/bin/env bash
#
# review.sh — extract everything needed to review a work-in-progress vertical ad.
#
#   ./review.sh /path/to/cut.mp4
#
# Produces, under video_review/<video-basename>/:
#   frames/    ~12 evenly spaced JPEGs at 360px wide, named with their timestamp
#   audio.wav  16kHz mono
#   transcript.txt
#
# and prints duration, resolution and a timestamped transcript to stdout.

set -euo pipefail

FRAME_COUNT=12
FRAME_WIDTH=360
WHISPER_MODEL="small.en"

die() { printf 'review.sh: %s\n' "$1" >&2; exit 1; }

[ $# -ge 1 ] || die "usage: review.sh <video-path>"
VIDEO="$1"
[ -f "$VIDEO" ] || die "no such file: $VIDEO"

for bin in ffmpeg ffprobe python3; do
  command -v "$bin" >/dev/null 2>&1 || die "$bin not found on PATH"
done

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BASE="$(basename "$VIDEO")"
BASE="${BASE%.*}"
OUT="${REVIEW_OUT_DIR:-$SCRIPT_DIR}/$BASE"
FRAMES="$OUT/frames"
rm -rf "$OUT"
mkdir -p "$FRAMES"

# ---------------------------------------------------------------- (a) metadata
probe() { ffprobe -v error -select_streams "$1" -show_entries "$2" -of default=nw=1:nk=1 "$VIDEO" 2>/dev/null | head -1; }

DURATION="$(ffprobe -v error -show_entries format=duration -of default=nw=1:nk=1 "$VIDEO")"
[ -n "$DURATION" ] || die "could not read duration — is this a video file?"
WIDTH="$(probe v:0 stream=width)"
HEIGHT="$(probe v:0 stream=height)"
FPS_RAW="$(probe v:0 stream=r_frame_rate)"
VCODEC="$(probe v:0 stream=codec_name)"
ACODEC="$(probe a:0 stream=codec_name)"

read -r DUR_FMT ASPECT SPEC_NOTE FPS < <(python3 - "$DURATION" "${WIDTH:-0}" "${HEIGHT:-0}" "${FPS_RAW:-0/1}" <<'PY'
import sys
from math import gcd
dur, w, h, fps_raw = float(sys.argv[1]), int(sys.argv[2]), int(sys.argv[3]), sys.argv[4]
try:
    n, d = fps_raw.split("/"); fps = float(n) / float(d) if float(d) else 0.0
except ValueError:
    fps = 0.0
g = gcd(w, h) or 1
aspect = f"{w//g}:{h//g}" if w and h else "?"
if (w, h) == (1080, 1920):
    note = "OK-1080x1920"
elif aspect == "9:16":
    note = f"9:16-but-{w}x{h}"
else:
    note = f"NOT-9:16-({aspect})"
print(f"{int(dur//60)}m{dur%60:04.1f}s {aspect} {note} {fps:.2f}")
PY
)

TARGET_NOTE="on-target"
python3 -c "import sys; sys.exit(0 if 25 <= float(sys.argv[1]) <= 30 else 1)" "$DURATION" \
  || TARGET_NOTE="OFF-TARGET (want 25-30s)"

echo "=============================================================="
echo "FILE       $VIDEO"
printf 'DURATION   %.2fs  (%s)  %s\n' "$DURATION" "$DUR_FMT" "$TARGET_NOTE"
echo "RESOLUTION ${WIDTH}x${HEIGHT}  aspect ${ASPECT}  [${SPEC_NOTE}]"
echo "FPS        ${FPS}"
echo "CODECS     video=${VCODEC:-none}  audio=${ACODEC:-none}"
echo "=============================================================="

# ------------------------------------------------------------------ (b) frames
# Sample at the midpoint of each of FRAME_COUNT equal slices, so the first and
# last grabs sit inside the video rather than on a black head/tail frame.
echo
echo "--- FRAMES (${FRAME_COUNT} @ ${FRAME_WIDTH}px wide) -> $FRAMES"
mapfile -t STAMPS < <(python3 -c "
import sys
dur, n = float(sys.argv[1]), int(sys.argv[2])
for i in range(n):
    print(f'{dur * (i + 0.5) / n:.3f}')
" "$DURATION" "$FRAME_COUNT")

i=0
for ts in "${STAMPS[@]}"; do
  i=$((i + 1))
  label="$(printf '%05.1f' "$ts")"
  name="$(printf 'f%02d_t%ss.jpg' "$i" "$label")"
  ffmpeg -nostdin -v error -ss "$ts" -i "$VIDEO" -frames:v 1 \
         -vf "scale=${FRAME_WIDTH}:-2" -q:v 3 "$FRAMES/$name" -y
  printf '  %s  (t=%ss)\n' "$name" "$ts"
done

# ------------------------------------------------------------- (b2) scene cuts
# Real cut points beat guessing pacing from 12 sampled frames. Note the
# scene filter logs via showinfo/metadata at info level, so -v error would
# swallow it — read the metadata output on stdout instead.
echo
echo "--- SHOTS (scene threshold 0.15, flagging >4s)"
ffmpeg -nostdin -v error -i "$VIDEO" -vf "select='gt(scene,0.15)',metadata=print:file=-" -f null - 2>/dev/null \
  | grep -o 'pts_time:[0-9.]*' | cut -d: -f2 \
  | python3 -c "
import sys
dur = float('$DURATION')
cuts = [0.0] + [float(x) for x in sys.stdin if x.strip()] + [dur]
prev, longest = cuts[0], []
for i, c in enumerate(cuts[1:], 1):
    d = c - prev
    flag = '   <-- LONG (>4s)' if d > 4 else ''
    if d > 4: longest.append(i)
    print(f'  shot {i:2d}:  {prev:6.2f}s -> {c:6.2f}s   ({d:5.2f}s){flag}')
    prev = c
print(f'  {len(cuts)-1} shots, avg {dur/(len(cuts)-1):.2f}s')
if longest: print(f'  shots over 4s: {longest}')
" || echo "  (scene detection unavailable)"

# ------------------------------------------------------------------- (c) audio
WAV="$OUT/audio.wav"
if [ -z "$ACODEC" ]; then
  echo
  echo "--- AUDIO: none (video has no audio track) — skipping transcript"
  echo
  echo "Done. Frames in $FRAMES"
  exit 0
fi

echo
echo "--- AUDIO -> $WAV (16kHz mono)"
ffmpeg -nostdin -v error -i "$VIDEO" -vn -ac 1 -ar 16000 -c:a pcm_s16le "$WAV" -y
echo "  $(du -h "$WAV" | cut -f1)"

# -------------------------------------------------------------- (d) transcript
echo
echo "--- TRANSCRIPT (faster-whisper ${WHISPER_MODEL}, cpu/int8)"
# WHISPER_MODEL_PATH lets you point at a locally cached model directory when
# the machine cannot reach huggingface.co to download one.
set +e
python3 - "$WAV" "$OUT/transcript.txt" "${WHISPER_MODEL_PATH:-$WHISPER_MODEL}" <<'PY'
import sys, os
wav, out_path, model_name = sys.argv[1], sys.argv[2], sys.argv[3]
os.environ.setdefault("OMP_NUM_THREADS", "4")
from faster_whisper import WhisperModel

model = WhisperModel(model_name, device="cpu", compute_type="int8")
segments, _ = model.transcribe(wav, beam_size=5, vad_filter=True)

def stamp(t):
    return f"{int(t // 60):02d}:{t % 60:05.2f}"

lines = []
for s in segments:
    line = f"[{stamp(s.start)} -> {stamp(s.end)}]  {s.text.strip()}"
    print(line, flush=True)
    lines.append(line)

if not lines:
    print("  (no speech detected)")
with open(out_path, "w") as fh:
    fh.write("\n".join(lines) + "\n")
PY
RC=$?
set -e
if [ $RC -ne 0 ]; then
  echo
  echo "  !! TRANSCRIPTION FAILED (exit $RC)."
  echo "     Most common cause on a locked-down machine: the model download"
  echo "     from huggingface.co is blocked by egress policy. Frames, audio"
  echo "     and shot list above are still valid — only the transcript is"
  echo "     missing. Point WHISPER_MODEL_PATH at a local model dir to fix."
fi

echo
echo "=============================================================="
echo "Frames:     $FRAMES"
echo "Audio:      $WAV"
if [ -s "$OUT/transcript.txt" ]; then
  echo "Transcript: $OUT/transcript.txt"
else
  echo "Transcript: NOT PRODUCED — see the error above"
fi
echo "=============================================================="
