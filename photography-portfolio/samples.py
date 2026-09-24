"""Placeholder photographs for a portfolio that has none yet.

When portfolio/photos/ is empty, build.py calls write_samples() so the site
still has something to lay out. The scenes are drawn procedurally (no one
else's photographs end up in your portfolio) and carry a small EXIF block so
the readout under each photo has something to show. Once you add a single
real photo, the samples are no longer used.
"""

from pathlib import Path

import numpy as np
from PIL import Image

LONG_EDGE = 2000


def _size(ratio):
    w, h = ratio
    if w >= h:
        return LONG_EDGE, round(LONG_EDGE * h / w)
    return round(LONG_EDGE * w / h), LONG_EDGE


def _hex(c):
    c = c.lstrip("#")
    return np.array([int(c[i:i + 2], 16) / 255 for i in (0, 2, 4)])


def _sky(h, w, stops):
    """Vertical gradient through (position, colour) stops."""
    y = np.linspace(0, 1, h)
    pos = [p for p, _ in stops]
    cols = np.array([_hex(c) for _, c in stops])
    rgb = np.stack([np.interp(y, pos, cols[:, k]) for k in range(3)], axis=1)
    return np.broadcast_to(rgb[:, None, :], (h, w, 3)).copy()


def _ridge(w, rng, octaves=5, base=3, smooth=False):
    """A 1D fractal profile in [0, 1] used for mountains, hills and dunes."""
    x = np.linspace(0, 1, w)
    y = np.zeros(w)
    amp, total = 1.0, 0.0
    for o in range(octaves):
        f = base * 2 ** o
        pts = rng.random(f + 2)
        t = x * (f + 1)
        if smooth:
            i = np.floor(t).astype(int)
            fr = t - i
            fr = fr * fr * (3 - 2 * fr)
            y += amp * (pts[i] * (1 - fr) + pts[np.minimum(i + 1, f + 1)] * fr)
        else:
            y += amp * np.interp(t, np.arange(f + 2), pts)
        total += amp
        amp *= 0.5
    return y / total


def _layer(img, top, colour, strength=1.0):
    """Fill everything below the per-column line `top` (in pixels)."""
    h = img.shape[0]
    mask = np.arange(h)[:, None] >= top[None, :]
    img[mask] = img[mask] * (1 - strength) + _hex(colour) * strength
    return mask


def _glow(img, cx, cy, r, colour, power=1.0):
    h, w, _ = img.shape
    yy, xx = np.mgrid[0:h, 0:w]
    d = np.hypot(xx - cx, yy - cy)
    disc = np.clip((r - d) / 2 + 0.5, 0, 1)
    halo = np.exp(-d / (r * 3.5)) * 0.55 * power
    a = np.clip(disc + halo, 0, 1)[..., None]
    img[:] = img * (1 - a) + _hex(colour) * a


def _bokeh(img, rng, n, colours, rmin, rmax, region, stretch=1.0):
    h, w, _ = img.shape
    x0, y0, x1, y1 = region
    for _ in range(n):
        cx, cy = rng.uniform(x0, x1) * w, rng.uniform(y0, y1) * h
        r = rng.uniform(rmin, rmax) * w
        c = _hex(colours[rng.integers(len(colours))])
        ys, ye = int(max(cy - r * stretch * 2, 0)), int(min(cy + r * stretch * 2, h))
        xs, xe = int(max(cx - r * 2, 0)), int(min(cx + r * 2, w))
        if ys >= ye or xs >= xe:
            continue
        yy, xx = np.mgrid[ys:ye, xs:xe]
        d = np.hypot(xx - cx, (yy - cy) / stretch)
        a = (np.clip((r - d) / (r * 0.25), 0, 1) * rng.uniform(0.25, 0.7))[..., None]
        img[ys:ye, xs:xe] = 1 - (1 - img[ys:ye, xs:xe]) * (1 - c * a)


def _finish(img, rng, grain=0.022, vignette=0.38):
    h, w, _ = img.shape
    yy, xx = np.mgrid[0:h, 0:w]
    r2 = ((xx - w / 2) / (w / 2)) ** 2 + ((yy - h / 2) / (h / 2)) ** 2
    img *= (1 - vignette * r2 / 2)[..., None]
    img += rng.normal(0, grain, (h, w, 1))
    return Image.fromarray((np.clip(img, 0, 1) * 255).astype(np.uint8))


# --- scenes ---------------------------------------------------------------

def ridgeline_at_dusk(rng):
    w, h = _size((3, 4))
    img = _sky(h, w, [(0, "#1d2b53"), (0.35, "#6b4f8a"), (0.55, "#e9866a"), (0.62, "#f6c28b"), (1, "#f6c28b")])
    _glow(img, w * 0.62, h * 0.55, w * 0.06, "#fff1cf")
    layers = ["#b9738a", "#8a5378", "#5c3a63", "#35243f", "#1a1222"]
    for i, c in enumerate(layers):
        base = h * (0.5 + i * 0.09)
        _layer(img, (base - _ridge(w, rng, base=2 + i) * h * (0.16 - i * 0.015)).astype(int), c)
    return img


def blue_hour_pier(rng):
    w, h = _size((4, 3))
    horizon = int(h * 0.56)
    img = _sky(h, w, [(0, "#0e1f3d"), (0.4, "#2f4f86"), (0.56, "#d98f7a"), (1, "#0b1427")])
    sky = img[:horizon].copy()
    refl = sky[::-1][: h - horizon]
    rows = np.arange(h - horizon)
    shift = (np.sin(rows * 0.9) * (2 + rows * 0.04)).astype(int)
    cols = (np.arange(w)[None, :] + shift[:, None]) % w
    img[horizon:] = refl[rows[:, None], cols] * 0.7 + _hex("#0b1427") * 0.3
    _bokeh(img, rng, 26, ["#ffd9a0", "#ffe7c2"], 0.002, 0.005, (0.05, 0.53, 0.95, 0.555))
    pier_top = int(h * 0.6)
    img[pier_top:pier_top + 10, int(w * 0.18):] = _hex("#070b16")
    for x in np.linspace(w * 0.2, w * 0.98, 14).astype(int):
        img[pier_top:int(h * 0.74), x:x + 9] = _hex("#070b16")
    return img


def hills_in_fog(rng):
    w, h = _size((3, 4))
    img = _sky(h, w, [(0, "#c9d2cf"), (0.6, "#e6e8e2"), (1, "#e6e8e2")])
    layers = ["#b4c0ba", "#9aaaa2", "#7d8f86", "#5c6f66", "#3d4d45", "#223029"]
    for i, c in enumerate(layers):
        line = h * (0.34 + i * 0.1) - _ridge(w, rng, octaves=3, base=2, smooth=True) * h * 0.12
        teeth = rng.random(w // 6 + 1).repeat(6)[:w] * h * 0.012 * (i + 1)
        _layer(img, (line - teeth).astype(int), c)
    return img


def city_after_midnight(rng):
    w, h = _size((9, 16))
    img = _sky(h, w, [(0, "#05070f"), (0.5, "#141a33"), (1, "#0a0c16")])
    x = 0
    while x < w:
        bw = int(rng.uniform(0.12, 0.26) * w)
        top = int(rng.uniform(0.18, 0.55) * h)
        shade = rng.uniform(0.03, 0.08)
        img[top:, x:x + bw] = shade
        for wy in range(top + 24, h - 20, 34):
            for wx in range(x + 12, x + bw - 16, 26):
                if rng.random() < 0.32:
                    img[wy:wy + 14, wx:wx + 12] = _hex(["#ffcf7a", "#ffe3b0", "#9fd3ff"][rng.integers(3)]) * rng.uniform(0.55, 1)
        x += bw + int(rng.uniform(0.005, 0.02) * w)
    _bokeh(img, rng, 40, ["#ff9b54", "#ffd166", "#ef476f", "#7bdff2"], 0.02, 0.06, (0, 0.72, 1, 1))
    return img


def neon_after_rain(rng):
    w, h = _size((3, 4))
    img = _sky(h, w, [(0, "#0b0a12"), (0.5, "#15101f"), (1, "#07060b")])
    colours = ["#ff3d7f", "#39c5ff", "#ffb347", "#b388ff"]
    _bokeh(img, rng, 22, colours, 0.03, 0.09, (0, 0.08, 1, 0.42))
    _bokeh(img, rng, 26, colours, 0.02, 0.05, (0, 0.55, 1, 0.98), stretch=4.5)
    img[int(h * 0.5):int(h * 0.505)] *= 0.4
    return img


def dunes_in_late_light(rng):
    w, h = _size((16, 9))
    img = _sky(h, w, [(0, "#9fb8cf"), (0.45, "#f1dcc0"), (1, "#f1dcc0")])
    for i in range(4):
        r = _ridge(w, rng, octaves=2, base=1 + i, smooth=True)
        top = (h * (0.42 + i * 0.13) - r * h * 0.14).astype(int)
        lit = 0.86 + 0.16 * np.sin(np.linspace(0, 2.6, w) + i * 1.3)
        base = _hex(["#d9a36a", "#c98a52", "#b5733f", "#9a5c30"][i])
        mask = np.arange(h)[:, None] >= top[None, :]
        img[mask] = (base[None, None, :] * lit[None, :, None] * np.ones((h, 1, 1)))[mask]
    return img


def moonrise(rng):
    w, h = _size((4, 3))
    img = _sky(h, w, [(0, "#070b1f"), (0.7, "#1f2c5c"), (1, "#394a7a")])
    stars = rng.random((h, w)) > 0.9993
    img[stars] = 0.9
    _glow(img, w * 0.3, h * 0.36, w * 0.035, "#f3f0e2", power=0.8)
    for i, c in enumerate(["#1b2448", "#0f1631", "#070a1a"]):
        _layer(img, (h * (0.66 + i * 0.1) - _ridge(w, rng, octaves=3, base=2, smooth=True) * h * 0.14).astype(int), c)
    return img


def one_figure_on_the_shore(rng):
    w, h = _size((1, 1))
    img = _sky(h, w, [(0, "#b8c7dd"), (0.62, "#f2d7d5"), (0.63, "#c9c2cc"), (1, "#a7a3b5")])
    fx, fy = int(w * 0.64), int(h * 0.7)
    img[fy - 70:fy, fx:fx + 16] = _hex("#2b2835")
    yy, xx = np.mgrid[fy - 96:fy - 66, fx - 7:fx + 23]
    head = np.hypot(xx - (fx + 8), yy - (fy - 80)) < 12
    img[fy - 96:fy - 66, fx - 7:fx + 23][head] = _hex("#2b2835")
    img[fy:fy + 6, fx - 180:fx + 10] = img[fy:fy + 6, fx - 180:fx + 10] * 0.7
    return img


SCENES = [
    ("landscape", ridgeline_at_dusk, (1, 250), 1.78, 26, 50, "2025:11:02 17:41:08"),
    ("street", neon_after_rain, (1, 60), 1.78, 26, 640, "2025:08:14 22:13:40"),
    ("landscape", hills_in_fog, (1, 500), 2.8, 77, 64, "2025:12:20 07:05:12"),
    ("night", city_after_midnight, (1, 15), 1.78, 26, 1250, "2025:09:30 00:48:19"),
    ("minimal", one_figure_on_the_shore, (1, 1000), 1.78, 26, 40, "2025:06:07 18:22:55"),
    ("landscape", dunes_in_late_light, (1, 800), 2.2, 13, 50, "2025:02:11 17:09:30"),
    ("night", moonrise, (1, 4), 2.8, 77, 800, "2025:10:17 19:55:02"),
    ("street", blue_hour_pier, (1, 30), 1.78, 26, 400, "2025:07:21 20:31:47"),
]


def write_samples(dest: Path):
    """Draw every scene into dest/<category>/<name>.jpg and return the paths."""
    out = []
    for n, (category, scene, shutter, fnum, f35, iso, when) in enumerate(SCENES):
        rng = np.random.default_rng(1000 + n)
        img = _finish(scene(rng).astype(float), rng)
        exif = Image.Exif()
        exif[0x0110] = "Sample"  # Model
        ifd = exif.get_ifd(0x8769)
        ifd[0x829A] = shutter[0] / shutter[1]  # ExposureTime
        ifd[0x829D] = fnum  # FNumber
        ifd[0x8827] = iso  # ISOSpeedRatings
        ifd[0xA405] = f35  # FocalLengthIn35mmFilm
        ifd[0x9003] = when  # DateTimeOriginal
        path = dest / category / (scene.__name__.replace("_", "-") + ".jpg")
        path.parent.mkdir(parents=True, exist_ok=True)
        img.save(path, quality=90, exif=exif)
        out.append(path)
    return out
