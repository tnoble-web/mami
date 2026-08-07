# CPOS vertical ad review

CPOS is a tap-to-pay app. The ads are 30-second vertical spots. When the user
shares a video file or path — usually just dragging a file in and saying
"review this" — follow this document.

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

## The rubric — report in this order

**1. Hook.** Does something grab attention in the first 2 seconds? Is the
strongest line at the front? If a better line exists later in the transcript,
say which one and where to move it from.

**2. Phone screen.** *This is the most important thing in our ads.* Is the app
shown big, early and readable? The payment moment — a card tapping the phone —
must be clearly visible by the middle of the video. Check the screen is legible
at 360px; if you cannot read it in the extracted frame, neither can a viewer on
a phone.

**3. Pacing.** Flag every shot longer than 4 seconds (the script marks these).
Call out anything that could be cut. Target length is 25–30s.

**4. Captions.** Must be burned in and readable at 360px. Check for typos
against the transcript. **If audio and captions disagree, trust the audio.**

**5. Ending.** Must end on a clean end card reading exactly **"Download CPOS"**
— not "CPOS Pay", not any other wording.

**6. Spec.** 9:16, 1080x1920.

## How to write the feedback

- A **short list of specific, timestamped changes**. "Cut 15.85–18.2" beats
  "the ending drags."
- **Harshest problems first.**
- **Always say what is already working**, so the user does not break it in the
  next pass.
- Judge each video against its own goal (below), not just the generic rubric.

## Videos in flight

1. **Salon skit** — the opening skit stays untouched. A website shot gets
   replaced with app footage. Do not suggest changes to the open.
2. **Mobile service** — needs a faster open, with the card tap landing by
   second 8.
3. **Rideshare** — 48s being cut to 30s. The "haven't turned this on" line
   moves to the front.

If a shared file does not obviously match one of these, ask which it is rather
than guessing — the goal changes the feedback.

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

**Known limitation on locked-down machines:** faster-whisper downloads its
model from `huggingface.co` on first use. If egress policy blocks that host the
transcript step fails with a proxy 403 while frames, audio and the shot list
still succeed. Do not route around the block — report it. Point
`WHISPER_MODEL_PATH` at a locally cached model directory if one is available.
Without a transcript you can still judge the phone screen, pacing, spec, the
presence of the end card, and whether captions exist — but say plainly that
hook-line strength and caption typos could not be checked.
