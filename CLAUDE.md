# CPOS creator ad review

CPOS is a tap-to-pay app. This week's job is five vertical creator ads cut from
raw creator footage plus self-shot app b-roll. When the user shares a video file
or path — usually just dragging a file in and saying "review this" — follow this
document.

> Note: the rest of this repository is an unrelated Next.js project (wedding
> photography venue pages). These instructions apply only to video review
> requests, not to work on that codebase.

## Always do this first

Run the script on the file, then actually inspect what it produced:

```bash
./video_review/review.sh "<video path>"
```

1. **Look at every extracted frame.** All ~12 of them, individually. Do not
   review from the shot list or the filenames — read the images.
2. **Read the transcript** in full.
3. **Read the shot list** for pacing.

Only then write feedback. Never give feedback on a video you have not run
through the script.

**Identify which of the five edits it is before judging it** (see below). Each
has its own length target and its own explicit do-not-touch constraints. The
generic rubric is subordinate to the per-video brief — judging a 20s edit
against a 25–30s target produces wrong advice.

## The rubric — report in this order

**1. Hook.** Does something grab attention in the first 2 seconds? Is the
strongest line at the front? **Only suggest moving lines where the brief permits
restructuring** — several edits explicitly forbid it.

**2. Phone screen.** *This is the most important thing in our ads, and the main
thing the raw creator footage is missing.* Is the app shown big, early and
readable? The payment moment — a card tapping the phone — must be clearly
visible by the middle of the video. Check the screen is legible at 360px; if you
cannot read it in the extracted frame, neither can a viewer on a phone.

Every phone screen in the finished ads should be our own b-roll, so the amount
(**$67.50**) and business name stay consistent across all five. A screen showing
a different amount, a different business name, or a visibly different
location/season is leftover footage that still needs replacing.

**3. Pacing.** Flag every shot longer than 4 seconds (the script marks these).
Call out anything that could be cut. **Length target is per-video, not a blanket
25–30s.**

**4. Captions.** Burned in, readable at 360px, matching the caption style of the
live "Blake" reference ad. Check for typos against the transcript. **If audio and
captions disagree, trust the audio.**

**5. Ending.** Must end on a clean end card reading exactly **"Download CPOS"**
— not "CPOS Pay", not any other wording. Logo is in the team space.

Keep the badge/legal block clear of the bottom 320px, which TikTok/Reels/Stories
cover with caption, username, action buttons and the ad CTA.
`video_review/make_endcard_ref.py` rebuilds a corrected reference card from any
exported frame.

**6. Spec.** 9:16, 1080x1920, H.264, high bitrate.

**7. Pricing — hard rule.** Say nothing about pricing beyond what the creators
already say. Never suggest adding a rate, a fee comparison, or a competitor
price to any cut, however tempting the competitive angle.

## How to write the feedback

- A **short list of specific, timestamped changes**. "Cut 15.85–18.2" beats
  "the ending drags."
- **Harshest problems first.**
- **Always say what is already working**, so the user does not break it in the
  next pass.
- Judge each video against its own goal, not just the generic rubric.

## The five edits

| # | Video | Creator | Target | Core task |
|---|-------|---------|--------|-----------|
| 1 | Makeup / skincare | April — glasses, headband, wood ceiling | **20s** | Nearly done. Replace every phone screen with b-roll. |
| 2 | Direct to camera | Matt — grey shirt, brick kitchen | **~14s** | Trim at 14.2s (rest is black). Extend the pay moment to ~5s. |
| 3 | Salon skit | Blake — "it's cash only" | **25–30s** | Replace the mid-roll website shot with app b-roll. |
| 4 | Mobile service | **Shanlee** | **25s** | Tighten the first 5s; tap by second 8. |
| 5 | Rideshare | **Alexander** (48s raw) | **30s max** | Most surgery. Restructure permitted and required. |

> The written brief has the creator names on rows 4 and 5 swapped. Shanlee's
> file is the **mobile service** edit and Alexander's is the **rideshare** edit,
> confirmed by the user. The table above is corrected; the brief is not.

Per-video constraints that override the generic rubric:

1. **April** — do not change her audio, do not restructure anything. The only
   work is swapping phone screens for consistent b-roll.
2. **Matt** — content ends at 14.2s, everything after is black. Trim there and
   **do not pad back to 30s**; short is fine. Around 5–7s he types an amount and
   taps a card — extend that beat with b-roll so the payment holds ~5s and
   clearly completes. His opening and pacing are already right; change nothing
   else.
3. **Blake** — the opening skit is the hook and stays exactly as is. Replace only
   the website screen midway with app b-roll (app opens, amount typed, card taps,
   success screen). Everything else stays. Blake is also the live reference ad
   for caption style.
4. **Shanlee** (mobile service) — the open is slow; tighten the first 5 seconds
   so the tap lands by second 8. Insert b-roll at the payment beat. Her script
   says "that'll be $40" out loud, so b-roll showing a different amount
   contradicts the audio in this cut specifically.
5. **Alexander** (rideshare) — move "if you haven't turned this on, you're
   missing out" to the front as the hook, then the tip story, then the tap, then
   the close. Cut the watermarked section if it cannot be cleaned. Structure
   beats completeness.

## App b-roll spec

Filmed first, reused across all five and for months after.

- First person: own hand holds the phone with the app open, other hand does the
  card. Screen brightness 100%, near a window, even light, no glare.
- Money sequence, 3 takes at half speed: open app, type **$67.50**, tap card flat
  on top of the phone, hold on screen 3 full seconds. ~20s per take.
- One take each: side angle of the card tapping, over-the-shoulder as if a
  customer is about to tap, close-up of the tap screen.
- Nothing processes, so nothing needs undoing.

## Delivery

9:16, 1080x1920, H.264 high bitrate, into the drive folder. Deliver the first
finished edit on its own for style alignment rather than all five at the end.
Start with April — she is closest to done.

## Environment notes

`review.sh` needs `ffmpeg`, `ffprobe` and `faster-whisper`.

On a Mac:

```bash
brew install ffmpeg
pip install faster-whisper
```

On the Linux cloud containers these sessions run in, the container is
ephemeral — reinstall each session:

```bash
apt-get update && apt-get install -y ffmpeg
pip3 install faster-whisper
```

**Known egress limits on locked-down machines.** Report blocked hosts, never
route around them.

- `huggingface.co` is blocked, so faster-whisper cannot download its model and
  the transcript step fails with a proxy 403. Frames, audio and the shot list
  still succeed. Point `WHISPER_MODEL_PATH` at a locally cached model directory
  if one is available. Without a transcript you can still judge the phone
  screen, pacing, spec, the end card, and whether captions exist — but say
  plainly that hook-line strength and caption typos could not be checked.
- `facebook.com` and `jim.com` are blocked, so the JIM competitor reference ads
  and the live Blake caption-style reference cannot be opened. Do not guess at
  their contents. If the user wants a comparison, ask them to screen-record the
  reference and drop the file in — then it can go through `review.sh` like any
  other cut.
- `drive.google.com` and `capcut.com` are blocked as well. **No shared link of
  any kind can be opened** — dragging the file into the chat is the only channel
  that works. When a file is too large to upload, have the user send a review
  copy rather than the master; 720p is plenty, since frames are extracted at
  360px anyway:

  ```bash
  ffmpeg -i in.mp4 -vf "scale=720:-2" -c:v libx264 -crf 28 \
         -preset veryfast -c:a aac -b:a 96k review_copy.mp4
  ```

  A review copy supports every check except the delivery spec itself — ask for
  the real export settings separately and judge those from what the user
  reports.
