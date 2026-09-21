# Rendering the video

`lutetium-177-reel.mp4` is generated from `index.html`, not drawn separately —
the twelve scene SVGs are the single source of truth for both the web player
and the video.

The pipeline:

1. **Inline the fonts.** Google Fonts are fetched once and embedded as
   `data:` URIs, so rendering needs no network and the typography is
   deterministic (Bricolage Grotesque, IBM Plex Mono, Source Serif 4 — latin
   subsets only).
2. **Build the composition.** Extract the `<svg>` of each scene from
   `index.html` and lay them into a 1920x1080 frame: scene artwork on a paper
   ground, a lower-third caption rule, a scene slate and a progress bar. The
   video captions are written for listening pace and are shorter than the
   page's narration paragraphs; an end card carries the disclaimer and sources.
3. **Scrub, don't record.** Every frame is rendered by seeking:
   `window.seek(t)` activates the right scene, then pauses every animation via
   the Web Animations API and sets `currentTime` explicitly. Frames are exact
   rather than whatever the compositor managed in real time, so the output is
   reproducible and drops nothing.
4. **Encode.** Frames stream as JPEG over `image2pipe` straight into ffmpeg
   (libx264, CRF 20, yuv420p, faststart) — no intermediate frame files.

`render-video.mjs` performs steps 3 and 4 against a prepared composition page.

Changing a scene means editing `index.html`; the video picks the change up on
the next render.
