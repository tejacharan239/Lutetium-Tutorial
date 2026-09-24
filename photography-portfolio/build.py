#!/usr/bin/env python3
"""Build the photography portfolio into a static site.

    python build.py --out _site

Reads site.json and every photo under photos/ (a subfolder name becomes the
photo's category), then writes index.html, 404.html, robots.txt, sitemap.xml
and resized WebP images into --out.

Published images are re-encoded from the pixels only: GPS position and the
rest of the original metadata never reach the live site. The camera readout
(lens, shutter, ISO) is read from the original and written into the page as
text, along with a five-colour palette sampled from each photo.

With no photos yet, placeholder scenes from samples.py are used and the page
says so. --preview writes a single page for Claude's artifact viewer.
"""

import argparse
import colorsys
import hashlib
import html
import json
import re
import shutil
import sys
import tempfile
import urllib.parse
from collections import Counter
from datetime import date, datetime
from pathlib import Path

from PIL import Image, ImageOps

try:
    import pillow_heif

    pillow_heif.register_heif_opener()
except ImportError:  # HEIC support is optional locally; CI installs it
    pillow_heif = None

HERE = Path(__file__).resolve().parent
PHOTOS = HERE / "photos"
CACHE = HERE / ".cache" / "img"
SRC = HERE / "src"
META_VERSION = 3
WIDTHS = (640, 1280, 2048)
EXTS = {".jpg", ".jpeg", ".png", ".webp", ".heic", ".heif"}
CAMERA_FILENAME = re.compile(r"^(img|dsc|dscf|pxl|mvimg|photo|image|screenshot|whatsapp image)?[\s_-]*\d", re.I)
FONTS = "https://fonts.googleapis.com/css2?family=Geist:wght@300..600&family=Geist+Mono:wght@400;500&display=swap"
FAVICON = ("<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'>"
           "<rect width='32' height='32' rx='8' fill='#1b1b19'/>"
           "<circle cx='16' cy='16' r='7' fill='none' stroke='#f5f5f2' stroke-width='2.2'/>"
           "<circle cx='16' cy='16' r='2.4' fill='#8fcbb5'/></svg>")

e = html.escape
warnings = []


def warn(msg):
    warnings.append(msg)


# --- reading photos -------------------------------------------------------

def humanize(stem):
    """'one-figure-on-the-shore' -> 'One figure on the shore'; 'IMG_2041' -> ''."""
    if CAMERA_FILENAME.match(stem):
        return ""
    words = re.sub(r"[_-]+", " ", stem).strip()
    return words[:1].upper() + words[1:]


def slugify(text):
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-") or "photo"


def _num(v):
    try:
        return float(v)
    except (TypeError, ValueError, ZeroDivisionError):
        return None


def _text(v):
    if isinstance(v, bytes):
        v = v.decode("utf-8", "ignore")
    return str(v or "").replace("\x00", "").strip()


def zoom_label(f35):
    """Phone lenses are named by zoom factor, relative to a ~25 mm main camera."""
    z = f35 / 25
    step = min((0.5, 0.6, 1, 1.5, 2, 2.5, 3, 4, 5, 10), key=lambda s: abs(z - s) / s)
    return f"{step:g}×" if abs(z - step) / step < 0.15 else f"{z:.1f}×"


def read_exif(im, camera_names):
    ex = im.getexif()
    sub = ex.get_ifd(0x8769)
    gps = ex.get_ifd(0x8825)
    model = _text(ex.get(0x0110))
    info = {
        "camera": camera_names.get(model, model),
        "f35": _num(sub.get(0xA405)),
        "fnum": _num(sub.get(0x829D)),
        "shutter": _num(sub.get(0x829A)),
        "iso": _num(sub.get(0x8827)),
        "taken": None,
        "has_gps": bool(gps.get(2) or gps.get(4)),
    }
    raw = _text(sub.get(0x9003) or ex.get(0x0132))
    try:
        info["taken"] = datetime.strptime(raw[:19], "%Y:%m:%d %H:%M:%S").isoformat()
    except ValueError:
        pass
    return info


def exposure_line(m):
    parts = []
    if m.get("f35"):
        parts.append(f"{m['f35']:g} mm")
    if m.get("fnum"):
        parts.append(f"ƒ/{m['fnum']:.1f}".replace(".0", ""))
    t = m.get("shutter")
    if t:
        parts.append(f"{t:g} s" if t >= 1 else f"1/{round(1 / t)} s")
    if m.get("iso"):
        parts.append(f"ISO {m['iso']:g}")
    return " · ".join(parts)


def palette(im):
    """Five representative colours (dark to light) and the one to tint the page with."""
    q = im.resize((96, 96), Image.Resampling.BOX).quantize(colors=5, method=Image.Quantize.MEDIANCUT)
    pal = q.getpalette()
    counts = sorted(q.getcolors(), reverse=True)
    total = sum(c for c, _ in counts)
    cols = []
    for count, idx in counts:
        rgb = tuple(pal[idx * 3: idx * 3 + 3])
        h, l, s = colorsys.rgb_to_hls(*(v / 255 for v in rgb))
        cols.append({"hex": "#%02x%02x%02x" % rgb, "share": count / total, "l": l, "s": s})
    # The tint is the most colourful swatch that still covers a fair share of the frame.
    best = max(cols, key=lambda c: c["s"] * c["share"] ** 0.5 * (1 - abs(c["l"] - 0.5)))
    # Keep its hue, fix its lightness: a dark photo should colour the page, not grey it.
    h, _, s = colorsys.rgb_to_hls(*(int(best["hex"][i:i + 2], 16) / 255 for i in (1, 3, 5)))
    tint = "#%02x%02x%02x" % tuple(round(v * 255) for v in colorsys.hls_to_rgb(h, 0.55, min(s, 0.75)))
    return [c["hex"] for c in sorted(cols, key=lambda c: c["l"])], tint


def process(src, rel, out_img, camera_names):
    """Resize one photo into out_img and return its metadata.

    Outputs are cached in .cache/ by content hash, so rebuilding after adding
    one photo only encodes that photo.
    """
    digest = hashlib.sha1(src.read_bytes()).hexdigest()[:10]
    base = f"{slugify(src.stem)}-{digest}"
    meta_path = CACHE / f"{base}.json"
    meta = json.loads(meta_path.read_text()) if meta_path.exists() else None
    fresh = meta and meta.get("v") == META_VERSION and all((CACHE / f).exists() for f in meta["files"])
    if not fresh:
        CACHE.mkdir(parents=True, exist_ok=True)
        im = Image.open(src)
        meta = read_exif(im, camera_names)
        icc = im.info.get("icc_profile")
        im = ImageOps.exif_transpose(im)
        if im.mode != "RGB":
            im = im.convert("RGB")
        w, h = im.size
        swatches, tint = palette(im)
        meta.update(v=META_VERSION, w=w, h=h, palette=swatches, tint=tint,
                    colour="#%02x%02x%02x" % im.resize((1, 1), Image.Resampling.BOX).getpixel((0, 0)))
        meta["srcs"], meta["files"] = [], []
        for width in sorted({min(x, w) for x in WIDTHS}):
            name = f"{base}-{width}.webp"
            small = im.resize((width, round(h * width / w)), Image.Resampling.LANCZOS)
            small.info = {}
            small.save(CACHE / name, "WEBP", quality=82, method=5, icc_profile=icc)
            meta["srcs"].append([name, width])
            meta["files"].append(name)
        og = f"{base}-og.jpg"
        ow = min(1200, w)
        small = im.resize((ow, round(h * ow / w)), Image.Resampling.LANCZOS)
        small.info = {}
        small.save(CACHE / og, "JPEG", quality=84, optimize=True, progressive=True, icc_profile=icc)
        meta["og"] = og
        meta["files"].append(og)
        meta_path.write_text(json.dumps(meta))
    if meta.get("has_gps"):
        warn(f"{rel} has GPS location inside the original file. The published "
             "image is stripped, but the original in the repository still carries it.")
    for f in meta["files"]:
        shutil.copy2(CACHE / f, out_img / f)
    return meta


def collect(folder):
    found = []
    for p in sorted(folder.rglob("*")):
        rel = p.relative_to(folder)
        if p.is_file() and p.suffix.lower() in EXTS and not any(s.startswith((".", "_")) for s in rel.parts):
            found.append(p)
    return found


def load_photos(cfg, out_img, use_samples, tmp):
    folder = PHOTOS
    files = [] if use_samples or not PHOTOS.exists() else collect(PHOTOS)
    sample_mode = not files
    if sample_mode:
        from samples import write_samples

        folder = Path(tmp) / "samples"
        files = write_samples(folder)
    if any(p.suffix.lower() in {".heic", ".heif"} for p in files) and pillow_heif is None:
        sys.exit("HEIC photos found: install pillow-heif (pip install pillow-heif).")

    notes = cfg.get("photos", {})
    photos, seen = [], set()
    for src in files:
        rel = src.relative_to(folder).as_posix()
        note = notes.get(rel, {})
        m = process(src, rel, out_img, cfg.get("camera_names", {}))
        cat = rel.split("/")[0] if "/" in rel else ""
        pid = "p-" + slugify(src.stem)
        while pid in seen:
            pid += "-2"
        seen.add(pid)
        taken = datetime.fromisoformat(m["taken"]) if m.get("taken") else None
        title = note.get("title", humanize(src.stem))
        zoom = zoom_label(m["f35"]) if m.get("f35") else ""
        photos.append({
            "rel": rel, "id": pid, "title": title,
            "alt": note.get("alt") or title or (f"{cat.title()} photograph" if cat else "Photograph"),
            "caption": note.get("caption", ""),
            "cat": cat, "catLabel": humanize(cat) or cat,
            "w": m["w"], "h": m["h"], "colour": m["colour"], "tint": m["tint"], "palette": m["palette"],
            "srcs": m["srcs"], "og": m["og"],
            "camera": m["camera"], "zoom": zoom,
            "exposure": exposure_line(m),
            "taken": m.get("taken") or "",
            "when": taken.strftime("%B %Y") if taken else "",
        })
    if sample_mode:
        return photos, sample_mode

    found = {p["rel"] for p in photos}
    for rel in list(notes) + cfg.get("order", []) + [cfg.get("featured") or None]:
        if rel and rel not in found:
            warn(f"site.json mentions {rel}, but there is no such file in photos/.")

    # Photos listed in "order" come first, in that order; the rest newest first.
    rank = {rel: i for i, rel in enumerate(cfg.get("order", []))}
    ranked = sorted((p for p in photos if p["rel"] in rank), key=lambda p: rank[p["rel"]])
    rest = sorted((p for p in photos if p["rel"] not in rank), key=lambda p: p["taken"], reverse=True)
    return ranked + rest, sample_mode


# --- page -----------------------------------------------------------------

ICONS = {
    "grid": '<svg viewBox="0 0 20 20" aria-hidden="true"><rect x="3" y="3" width="6" height="6" rx="1"/><rect x="11" y="3" width="6" height="6" rx="1"/><rect x="3" y="11" width="6" height="6" rx="1"/><rect x="11" y="11" width="6" height="6" rx="1"/></svg>',
    "single": '<svg viewBox="0 0 20 20" aria-hidden="true"><rect x="4" y="2.5" width="12" height="10" rx="1"/><path d="M4 16h12M4 18.5h7"/></svg>',
    "theme": '<svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="6.5"/><path d="M10 3.5a6.5 6.5 0 0 1 0 13z" class="fill"/></svg>',
    "prev": '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>',
    "next": '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg>',
    "close": '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>',
}


def srcset(p):
    return ", ".join(f"img/{name} {w}w" for name, w in p["srcs"])


def largest(p):
    return "img/" + p["srcs"][-1][0]


def tile(p, eager):
    ar = p["w"] / p["h"]
    small = p["srcs"][min(1, len(p["srcs"]) - 1)][0]
    load = 'fetchpriority="high"' if eager else 'loading="lazy" decoding="async"'
    detail = " · ".join(x for x in (p["zoom"], p["exposure"]) if x)
    return (
        f'<figure class="tile" data-cat="{e(p["cat"])}" data-tint="{p["tint"]}" '
        f'style="--ar:{ar:.4f};flex-grow:{ar * 100:.1f};view-transition-name:t{p["index"]}">'
        f'<a class="ph" href="{largest(p)}" data-i="{p["index"]}" style="background:{p["colour"]}" '
        f'aria-label="{e(p["title"] or p["alt"])}, open larger">'
        f'<i style="padding-bottom:{100 / ar:.3f}%"></i>'
        f'<img src="img/{small}" srcset="{srcset(p)}" sizes="(max-width: 700px) 92vw, 60vw" '
        f'width="{p["w"]}" height="{p["h"]}" alt="{e(p["alt"])}" {load}></a>'
        f'<figcaption class="cap"><span class="cap-t">{e(p["title"])}</span>'
        f'<span class="cap-x">{e(detail)}</span></figcaption></figure>')


def lens_use(photos):
    counts = Counter(p["zoom"] for p in photos if p["zoom"])
    if not counts:
        return ""
    total = sum(counts.values())
    order = sorted(counts, key=lambda z: float(z.rstrip("×")))
    segs = "".join(f'<span class="seg" style="--n:{counts[z]};--k:{i}"></span>' for i, z in enumerate(order))
    legend = "".join(f'<li style="--k:{i}"><b>{e(z)}</b> {counts[z]}</li>' for i, z in enumerate(order))
    label = ", ".join(f"{z} lens: {counts[z]} of {total}" for z in order)
    return (f'<div class="row"><dt>Lenses</dt><dd><span class="lensbar" role="img" aria-label="{e(label)}">'
            f'{segs}</span><ul class="legend" aria-hidden="true">{legend}</ul></dd></div>')


def page(cfg, photos, sample_mode, preview):
    for i, p in enumerate(photos):
        p["index"] = i
    name = cfg["name"]
    total = len(photos)

    cats = Counter(p["cat"] for p in photos if p["cat"])
    labels = {p["cat"]: p["catLabel"] for p in photos}
    chips = ""
    if len(cats) > 1:
        chips = f'<button type="button" aria-pressed="true" data-cat="">All<span class="n">{total}</span></button>' + "".join(
            f'<button type="button" aria-pressed="false" data-cat="{e(c)}">{e(labels[c])}<span class="n">{n}</span></button>'
            for c, n in sorted(cats.items(), key=lambda kv: [p["cat"] for p in photos].index(kv[0])))
        chips = f'<div class="chips" role="group" aria-label="Show">{chips}</div>'
    else:
        chips = f'<p class="total">{total} photographs</p>'

    meta_line = " · ".join(x for x in (cfg.get("tagline", ""), cfg.get("location", "")) if x)
    about = "".join(f"<p>{e(x)}</p>" for x in cfg.get("about", []))
    kit = "".join(f'<div class="row"><dt>{e(k)}</dt><dd>{e(v)}</dd></div>' for k, v in cfg.get("kit", []))
    kit += lens_use(photos)

    contact = []
    if cfg.get("email"):
        em = e(cfg["email"])
        contact.append(f'<div class="reach"><a class="big" id="email" href="mailto:{em}">{em}</a>'
                       f'<button type="button" class="pill" data-copy="{em}" data-copied="Email copied">Copy</button></div>')
    if cfg.get("instagram"):
        handle = cfg["instagram"].lstrip("@")
        contact.append(f'<div class="reach"><a class="big" href="https://instagram.com/{e(urllib.parse.quote(handle))}" '
                       f'rel="me noopener" target="_blank">@{e(handle)}</a><span class="where">Instagram</span></div>')

    data = [{k: p[k] for k in ("id", "title", "alt", "caption", "catLabel", "camera", "zoom", "exposure",
                               "when", "colour", "tint", "palette", "w", "h")}
            | {"src": largest(p), "srcset": srcset(p)} for p in photos]
    data_json = json.dumps(data, ensure_ascii=False).replace("</", "<\\/")
    notice = ('<p class="notice">Sample images. Add your photos to <code>photos/</code> and they replace these on the next build.</p>'
              if sample_mode else "")

    css = (SRC / "style.css").read_text()
    js = (SRC / "app.js").read_text()
    year = date.today().year
    body = f"""<a class="skip" href="#work">Skip to the photographs</a>
<header class="top" id="top">
  <a class="mark" href="#top">{e(name)}</a>
  <nav aria-label="Sections"><a href="#work">Work</a><a href="#about">About</a><a href="#contact">Contact</a></nav>
  <button type="button" class="icon theme" id="theme" aria-label="Switch theme">{ICONS["theme"]}</button>
</header>
<main>
  <section class="intro" aria-labelledby="intro-h">
    <h1 id="intro-h"><span class="name">{e(name)}.</span> {e(cfg.get("intro", ""))}</h1>
    {f'<p class="meta">{e(meta_line)}</p>' if meta_line else ""}
    {notice}
  </section>
  <div class="waves" aria-hidden="true"><canvas id="waves"></canvas></div>
  <section class="work" id="work" aria-label="Photographs">
    <div class="bar">
      {chips}
      <div class="views" role="group" aria-label="Layout">
        <button type="button" class="icon" data-view="grid" aria-pressed="true" aria-label="Grid">{ICONS["grid"]}</button>
        <button type="button" class="icon" data-view="single" aria-pressed="false" aria-label="One at a time">{ICONS["single"]}</button>
      </div>
    </div>
    <div class="grid" id="grid">{"".join(tile(p, p["index"] < 3) for p in photos)}</div>
  </section>
  <section class="about split" id="about" aria-labelledby="about-h">
    <h2 id="about-h">About</h2>
    <div>
      <div class="prose">{about}</div>
      <dl class="kit">{kit}</dl>
    </div>
  </section>
  <section class="contact split" id="contact" aria-labelledby="contact-h">
    <h2 id="contact-h">Contact</h2>
    <div>
      <p class="lead">For prints, licensing or a collaboration.</p>
      {"".join(contact)}
    </div>
  </section>
</main>
<footer class="foot">
  <p>© {year} {e(name)}. Please ask before using these photographs.</p>
  <a href="#top">Back to top</a>
</footer>
<dialog class="lb" id="lb" aria-label="Photo viewer">
  <div class="lb-top">
    <span class="lb-count" id="lb-count"></span>
    <span class="lb-hint" id="lb-hint">Double-tap to zoom</span>
    <button type="button" class="icon" id="lb-close" aria-label="Close viewer">{ICONS["close"]}</button>
  </div>
  <div class="lb-stage" id="lb-stage"><img id="lb-img" alt="" draggable="false"></div>
  <button type="button" class="icon lb-arrow prev" id="lb-prev" aria-label="Previous photo">{ICONS["prev"]}</button>
  <button type="button" class="icon lb-arrow next" id="lb-next" aria-label="Next photo">{ICONS["next"]}</button>
  <div class="lb-foot">
    <div class="lb-text">
      <p class="lb-title" id="lb-title"></p>
      <p class="lb-exif" id="lb-exif"></p>
      <p class="lb-caption" id="lb-caption"></p>
    </div>
    <div class="swatches" id="lb-swatches" aria-label="Colours in this photo"></div>
  </div>
</dialog>
<p class="toast" id="toast" role="status" aria-live="polite"></p>
<script type="application/json" id="photo-data">{data_json}</script>
<script>
{js}</script>
"""
    fonts = (f'<link rel="preconnect" href="https://fonts.googleapis.com">\n'
             f'<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n'
             f'<link rel="stylesheet" href="{FONTS}">')
    if preview:
        return f"<title>{e(name)} Photography</title>\n{fonts}\n<style>\n{css}</style>\n{body}"

    url = cfg.get("url", "").rstrip("/")
    desc = cfg.get("intro", "")
    featured = next((p for p in photos if p["rel"] == cfg.get("featured")), photos[0])
    og_img = f"{url}/img/{featured['og']}" if url else f"img/{featured['og']}"
    title = f"{name} · {cfg.get('tagline') or 'Photography'}"
    head = f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>{e(title)}</title>
<meta name="description" content="{e(desc)}">
{f'<link rel="canonical" href="{e(url)}/">' if url else ""}
<meta property="og:type" content="website">
<meta property="og:title" content="{e(title)}">
<meta property="og:description" content="{e(desc)}">
<meta property="og:image" content="{e(og_img)}">
{f'<meta property="og:url" content="{e(url)}/">' if url else ""}
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="data:image/svg+xml,{urllib.parse.quote(FAVICON)}">
<script>try{{var t=localStorage.getItem("theme");if(t)document.documentElement.dataset.theme=t}}catch(_){{}}</script>
{fonts}
<style>
{css}</style>
</head>
<body>
"""
    return head + body + "</body>\n</html>\n"


def not_found(cfg):
    css = (SRC / "style.css").read_text()
    home = cfg["url"].rstrip("/") + "/" if cfg.get("url") else "./"
    return f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Not found · {e(cfg["name"])}</title>
<meta name="robots" content="noindex">
<link rel="icon" href="data:image/svg+xml,{urllib.parse.quote(FAVICON)}">
<link rel="stylesheet" href="{FONTS}">
<style>
{css}</style>
</head>
<body>
<main class="missing">
  <p class="meta">404</p>
  <h1><span class="name">Out of frame.</span> There is no page at this address.</h1>
  <p><a class="pill" href="{e(home)}">See the photographs</a></p>
</main>
</body>
</html>
"""


def main():
    ap = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    ap.add_argument("--out", default="_site", help="output folder (default: _site)")
    ap.add_argument("--samples", action="store_true", help="use the sample images even if photos exist")
    ap.add_argument("--preview", action="store_true", help="write a single page for Claude's artifact viewer")
    args = ap.parse_args()

    try:
        cfg = json.loads((HERE / "site.json").read_text())
    except json.JSONDecodeError as err:
        sys.exit(f"site.json is not valid JSON: line {err.lineno}, column {err.colno}: {err.msg}.\n"
                 "Check for a missing comma or quote, or a comma after the last item in a list.")
    cfg.setdefault("name", "Your Name")

    out = Path(args.out)
    if out.exists():
        shutil.rmtree(out)
    (out / "img").mkdir(parents=True)
    with tempfile.TemporaryDirectory() as tmp:
        photos, sample_mode = load_photos(cfg, out / "img", args.samples, tmp)

    (out / "index.html").write_text(page(cfg, photos, sample_mode, args.preview))
    if not args.preview:
        (out / "404.html").write_text(not_found(cfg))
        url = cfg.get("url", "").rstrip("/")
        (out / "robots.txt").write_text("User-agent: *\nAllow: /\n" + (f"Sitemap: {url}/sitemap.xml\n" if url else ""))
        if url:
            (out / "sitemap.xml").write_text(
                '<?xml version="1.0" encoding="UTF-8"?>\n'
                '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
                f"  <url><loc>{e(url)}/</loc><lastmod>{date.today().isoformat()}</lastmod></url>\n</urlset>\n")

    size = sum(f.stat().st_size for f in out.rglob("*") if f.is_file())
    print(f"Built {len(photos)} photos{' (samples)' if sample_mode else ''} into {out}/ ({size / 1e6:.1f} MB)")
    for w in warnings:
        print(f"warning: {w}")


if __name__ == "__main__":
    main()
