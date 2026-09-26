# SuperImpress promo

A 56-second promo for [superimpress.com](https://superimpress.com/) in cut-paper motion
design, 1920x1080 at 30 fps with a synthesised soundtrack. Every scene is a sheet of paper
laid onto a desk; job cards, buildings, stamps and paper planes are paper pieces that
cast soft shadows as they lift and land.

## Storyboard

| Time | Scene | On screen |
| --- | --- | --- |
| 0:00 | The pile | Job cards rain onto a heap while a counter ticks up. *Hundreds of new jobs. Every single day.* then *Which ones are **worth** applying to?* |
| 0:06 | The impression | A torn sheet covers the pile; a rubber stamp comes down and leaves the **SuperImpress** wordmark. *Find the jobs worth applying to.* |
| 0:11 | Pick | A pop-up paper town. The pointer picks three employers and their name tags fly into *Your companies*. *Pick the companies you want to work for. Their new jobs come to you.* |
| 0:18 | 01 · We find | A lens reads each company's careers page; each new listing flies into *New for you*. A day calendar tears off Monday. *We read their careers pages. Every day. New jobs reach you within hours of going up.* |
| 0:26 | 02 · We rate | Three cards are dealt face down and turned; **Strong 86**, **Stretch 63** and **Skip 24** are stamped on them, each with its reason. *Every new job gets a rating. A score out of 100, and the reasons why.* |
| 0:34 | 03 · 04 · Choose and apply | The Strong card is clicked, folds into a paper plane and flies to the company's own careers page, where the form is filled in and sent. *You choose. You apply on the company's own page. SuperImpress never applies for you.* |
| 0:42 | Autopilot | A one-page resume writes itself, a cover letter rises from its envelope, a message types out; a plug labelled *Your AI assistant* clicks into *SuperImpress*. *Need a resume or a cover letter? Autopilot writes it when you ask. Or connect Claude or another AI assistant. Same ratings, no credits.* |
| 0:49 | Start free | The end card: wordmark, tagline, *Start free*, *Free to start. No card needed.*, `superimpress.com`, and confetti. |

### Where the claims come from

Every product statement is taken from superimpress.com's own copy (September 2026): you pick
companies, it reads their careers pages every day and new jobs reach you within hours; each
job gets Strong, Stretch or Skip with a score out of 100 and reasons such as your level,
your past work and the location; you choose and apply on the company's own page and it never
applies for you; Autopilot writes a resume, cover letter or message when asked; Claude or
another AI assistant can be connected with the same ratings and no credits; free to start,
no card needed. The opening line about job boards is framing, not a product claim.

**The employers are fictional** (Kitebird, Quillon, Harborly, Fernwood, Tallwave, Oakmint),
so the video never implies that a real company lists with or endorses SuperImpress.

**The wordmark and palette are stand-ins.** superimpress.com was not reachable from the
environment this was built in, so the logo is set in Fraunces and the colours are an
invented paper palette. Brand colours live as tokens at the top of `promo.css`
(`--ver` is the accent); the wordmark is set in `scenes.js` (scenes 2 and 8).

## How it is made

- `engine.js` is a small deterministic motion engine. `seek(t)` recomputes every element's
  state from the timeline, so any frame can be rendered on its own and the video is cut
  into ranges rendered by parallel browsers. Randomness is seeded; the paper grain and
  stamp ink are generated on a canvas at load. Shadows follow a single key light: the
  higher a piece is lifted, the further and softer its shadow falls.
- `components.js` holds the paper props: job cards, the pointer, browser windows, paper
  planes with pencil trails, stamps, hand-drawn loops and confetti.
- `scenes.js` choreographs the eight sheets. Each landing sits on the 120 BPM beat grid,
  and each scene logs sound events (a card landing, a stamp, a pop) at the moment they
  happen on screen.
- `soundtrack.py` builds the music and foley from those events, from oscillators and
  filtered noise only: nothing is sampled or licensed. It reuses the voices and paper
  foley in `../tools/soundtrack.py`.
- `build.sh` inlines the fonts (`fonts.py`), exports the event log (`timeline.mjs`),
  synthesises the audio, renders frames with `../tools/render-video.mjs`, and muxes with
  two-pass loudness normalisation to -14 LUFS.

## Building

Needs Node with Playwright's Chromium, and Python 3 with `numpy`, `scipy` and
`imageio-ffmpeg` (for an ffmpeg binary). Fonts are fetched once from Google Fonts.

```sh
./build.sh                  # build/superimpress-promo.mp4, 1920x1080, 30 fps
RSCALE=0.5 ./build.sh       # a 960x540 draft of the same cut
```

To preview in a browser, serve this directory and open `promo.html?play` (plays in real
time, without sound), or `promo.html?t=27.5` to hold a single frame. `node snap.mjs <dir>
0.5 12 27.5 …` writes half-size stills at the given seconds, for reviewing a change
without rendering the whole film.
