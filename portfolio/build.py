#!/usr/bin/env python3
"""Build the photography portfolio into a static site.

    python portfolio/build.py --out _site

Reads portfolio/site.json and every photo under portfolio/photos/ (a
subfolder name becomes the photo's category), then writes index.html,
404.html, robots.txt, sitemap.xml and resized WebP images into --out.

Published images are re-encoded from the pixels only: GPS position and the
rest of the original metadata never reach the live site. The camera readout
(phone, lens, shutter, ISO) is read from the original and written into the
page as text instead.

With no photos yet, placeholder scenes from samples.py are used and the page
says so. --preview writes a single page for Claude's artifact viewer.
"""

import argparse
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
WIDTHS = (640, 1280, 2048)
EXTS = {".jpg", ".jpeg", ".png", ".webp", ".heic", ".heif"}
CAMERA_FILENAME = re.compile(r"^(img|dsc|dscf|pxl|mvimg|photo|image|screenshot|whatsapp image)?[\s_-]*\d", re.I)
FONTS = ("https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@62..125,300..800"
         "&family=Martian+Mono:wdth,wght@75..112.5,300..600&display=swap")
FAVICON = ("<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'>"
           "<rect width='32' height='32' rx='7' fill='#121211'/>"
           "<path d='M8 13V8h5M19 8h5v5M24 19v5h-5M13 24H8v-5' fill='none' stroke='#f3b63f' "
           "stroke-width='2.4' stroke-linecap='round' stroke-linejoin='round'/>"
           "<circle cx='16' cy='16' r='2.2' fill='#f3b63f'/></svg>")

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
    if m.get("iso"):
        parts.append(f"ISO {m['iso']:g}")
    t = m.get("shutter")
    if t:
        parts.append(f"{t:g} s" if t >= 1 else f"1/{round(1 / t)} s")
    if m.get("fnum"):
        parts.append(f"ƒ/{m['fnum']:.1f}".replace(".0", ""))
    if m.get("f35"):
        parts.append(f"{m['f35']:g} mm")
    return " · ".join(parts)


def process(src, rel, out_img, camera_names):
    """Resize one photo into out_img and return its metadata.

    Outputs are cached in portfolio/.cache by content hash, so rebuilding
    after adding one photo only encodes that photo.
    """
    digest = hashlib.sha1(src.read_bytes()).hexdigest()[:10]
    base = f"{slugify(src.stem)}-{digest}"
    meta_path = CACHE / f"{base}.json"
    meta = json.loads(meta_path.read_text()) if meta_path.exists() else None
    if meta is None or not all((CACHE / f).exists() for f in meta["files"]):
        CACHE.mkdir(parents=True, exist_ok=True)
        im = Image.open(src)
        meta = read_exif(im, camera_names)
        icc = im.info.get("icc_profile")
        im = ImageOps.exif_transpose(im)
        if im.mode != "RGB":
            im = im.convert("RGB")
        w, h = im.size
        meta.update(w=w, h=h, colour="#%02x%02x%02x" % im.resize((1, 1), Image.Resampling.BOX).getpixel((0, 0)))
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
    files = [] if use_samples else collect(PHOTOS)
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
        photos.append({
            "rel": rel, "id": pid, "title": title,
            "alt": note.get("alt") or title or (f"{cat.title()} photograph" if cat else "Photograph"),
            "caption": note.get("caption", ""),
            "cat": cat, "catLabel": humanize(cat) or cat,
            "w": m["w"], "h": m["h"], "colour": m["colour"],
            "srcs": m["srcs"], "og": m["og"],
            "camera": m["camera"],
            "zoom": zoom_label(m["f35"]) if m.get("f35") else "",
            "exposure": exposure_line(m),
            "taken": m.get("taken") or "",
            "when": taken.strftime("%B %Y") if taken else "",
        })
    if sample_mode:
        return photos, sample_mode

    found = {p["rel"] for p in photos}
    for rel in list(notes) + cfg.get("order", []) + [cfg.get("featured") or None]:
        if rel and rel not in found:
            warn(f"site.json mentions {rel}, but there is no such file in portfolio/photos/.")

    # Photos listed in "order" come first, in that order; the rest newest first.
    rank = {rel: i for i, rel in enumerate(cfg.get("order", []))}
    ranked = sorted((p for p in photos if p["rel"] in rank), key=lambda p: rank[p["rel"]])
    rest = sorted((p for p in photos if p["rel"] not in rank), key=lambda p: p["taken"], reverse=True)
    return ranked + rest, sample_mode


# --- page -----------------------------------------------------------------

def srcset(p):
    return ", ".join(f"img/{name} {w}w" for name, w in p["srcs"])


def largest(p):
    return "img/" + p["srcs"][-1][0]


def img_tag(p, sizes, lazy=True, cls=""):
    small = p["srcs"][min(1, len(p["srcs"]) - 1)][0]
    return (f'<img{f" class={chr(34)}{cls}{chr(34)}" if cls else ""} src="img/{small}" srcset="{srcset(p)}" '
            f'sizes="{sizes}" width="{p["w"]}" height="{p["h"]}" alt="{e(p["alt"])}"'
            + (' loading="lazy" decoding="async"' if lazy else ' fetchpriority="high"') + ">")


def hero(p, cfg):
    ar = p["w"] / p["h"]
    readout = "".join(f"<span>{e(x)}</span>" for x in p["exposure"].split(" · ") if x)
    longest = max([4] + [len(w) for w in cfg["name"].split()])
    return f"""
  <section class="hero" aria-labelledby="name">
    <div class="intro">
      <p class="eyebrow">{e(cfg.get("tagline", ""))}{e(" · " + cfg["location"]) if cfg.get("location") else ""}</p>
      <h1 id="name" style="--len:{longest}">{e(cfg["name"])}</h1>
      <p class="lede">{e(cfg.get("intro", ""))}</p>
      <p class="jump"><a href="#work">See the photographs</a></p>
    </div>
    <figure class="finder" style="--ar:{ar:.4f}">
      <a class="frame" href="{largest(p)}" data-i="{p['index']}" style="background:{p['colour']}">
        {img_tag(p, "(max-width: 860px) 100vw, 60vw", lazy=False)}
        <span class="brk tl"></span><span class="brk tr"></span><span class="brk bl"></span><span class="brk br"></span>
        <span class="af" aria-hidden="true"></span>
        {f'<span class="lens">{e(p["zoom"])}</span>' if p["zoom"] else ""}
        {f'<span class="readout">{readout}</span>' if readout else ""}
      </a>
      <figcaption>{e(p["title"] or p["catLabel"])}{e(" · " + p["when"]) if p["when"] else ""}</figcaption>
    </figure>
  </section>"""


def tile(p):
    ar = p["w"] / p["h"]
    lens = f'<span class="lens-sm">{e(p["zoom"])}</span>' if p["zoom"] else ""
    label = f'<span class="tile-cap"><span>{e(p["title"])}</span>{lens}</span>' if p["title"] or lens else ""
    return (f'<a class="tile" href="{largest(p)}" data-i="{p["index"]}" data-cat="{e(p["cat"])}" '
            f'style="--ar:{ar:.4f};flex-grow:{ar * 100:.1f};background:{p["colour"]}">'
            f'<i style="padding-bottom:{100 / ar:.3f}%"></i>{img_tag(p, "(max-width: 700px) 70vw, 34vw")}{label}</a>')


def lens_use(photos):
    counts = Counter(p["zoom"] for p in photos if p["zoom"])
    if not counts:
        return ""
    total = sum(counts.values())
    order = sorted(counts, key=lambda z: float(z.rstrip("×")))
    segs = "".join(f'<span class="seg" style="--n:{counts[z]};--k:{i}"></span>' for i, z in enumerate(order))
    legend = "".join(f'<li style="--k:{i}"><b>{e(z)}</b> {counts[z]}</li>' for i, z in enumerate(order))
    label = ", ".join(f"{z} lens: {counts[z]} of {total}" for z in order)
    return (f'<div class="kit-row"><dt>Lenses used</dt><dd><span class="lensbar" role="img" aria-label="{e(label)}">'
            f'{segs}</span><ul class="lens-legend" aria-hidden="true">{legend}</ul></dd></div>')

def page(cfg, photos, sample_mode, preview):
    for i, p in enumerate(photos):
        p["index"] = i
    featured = next((p for p in photos if p["rel"] == cfg.get("featured")), photos[0])
    cats = []
    for p in photos:
        if p["cat"] and p["cat"] not in [c for c, _ in cats]:
            cats.append((p["cat"], p["catLabel"]))
    modes = ""
    if len(cats) > 1:
        buttons = '<button type="button" aria-pressed="true" data-cat="">All</button>' + "".join(
            f'<button type="button" aria-pressed="false" data-cat="{e(c)}">{e(label)}</button>' for c, label in cats)
        modes = f'<div class="modes" role="group" aria-label="Show photographs of">{buttons}</div>'

    about = "".join(f"<p>{e(x)}</p>" for x in cfg.get("about", []))
    kit = "".join(f'<div class="kit-row"><dt>{e(k)}</dt><dd>{e(v)}</dd></div>' for k, v in cfg.get("kit", []))
    kit += lens_use(photos)

    contact = []
    if cfg.get("email"):
        em = e(cfg["email"])
        contact.append(f'<div class="contact-row"><span class="label">Email</span><a class="big" id="email" href="mailto:{em}">{em}</a>'
                       f'<button type="button" class="copy" id="copy-email" data-copy="{em}">Copy</button></div>')
    if cfg.get("instagram"):
        handle = cfg["instagram"].lstrip("@")
        contact.append(f'<div class="contact-row"><span class="label">Instagram</span>'
                       f'<a class="big" href="https://instagram.com/{e(urllib.parse.quote(handle))}" rel="me noopener">@{e(handle)}</a></div>')

    data = [{k: p[k] for k in ("id", "title", "alt", "caption", "catLabel", "camera", "zoom", "exposure", "when", "colour", "w", "h")}
            | {"src": largest(p), "srcset": srcset(p)} for p in photos]
    data_json = json.dumps(data, ensure_ascii=False).replace("</", "<\\/")

    notice = ""
    if sample_mode:
        notice = ('<p class="notice">Sample images drawn by the build script. Add your own photos to '
                  '<code>portfolio/photos/</code> and they replace these on the next build.</p>')

    css = (SRC / "style.css").read_text()
    js = (SRC / "app.js").read_text()
    name = cfg["name"]
    year = date.today().year
    body = f"""<a class="skip" href="#work">Skip to the photographs</a>
{notice}
<header class="top">
  <a class="mark" href="#name">{e(name)}</a>
  <nav aria-label="Sections"><a href="#work">Work</a><a href="#about">About</a><a href="#contact">Contact</a></nav>
</header>
<main>{hero(featured, cfg)}
  <section id="work" class="work" aria-labelledby="work-h">
    <div class="section-head">
      <h2 id="work-h">Work</h2>
      <p class="count" id="count">{len(photos)} photographs</p>
    </div>
    {modes}
    <div class="grid">{"".join(tile(p) for p in photos)}</div>
  </section>
  <section id="about" class="about" aria-labelledby="about-h">
    <h2 id="about-h">About</h2>
    <div class="about-body">{about}</div>
    <dl class="kit">{kit}</dl>
  </section>
  <section id="contact" class="contact" aria-labelledby="contact-h">
    <h2 id="contact-h">Contact</h2>
    <div class="contact-body">
      <p class="contact-note">For prints, licensing or a collaboration, write to me.</p>
      {"".join(contact)}
    </div>
  </section>
</main>
<footer class="foot">
  <p>© {year} {e(name)}. Please ask before using these photographs.</p>
  <a href="#name">Back to top</a>
</footer>
<dialog class="lb" id="lb" aria-label="Photo viewer">
  <div class="lb-stage" id="lb-stage"><img id="lb-img" alt=""></div>
  <div class="lb-bar">
    <div class="lb-text">
      <p class="lb-title" id="lb-title"></p>
      <p class="lb-exif" id="lb-exif"></p>
      <p class="lb-caption" id="lb-caption"></p>
    </div>
    <div class="lb-nav">
      <span class="lb-count" id="lb-count"></span>
      <button type="button" id="lb-prev" aria-label="Previous photo"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg></button>
      <button type="button" id="lb-next" aria-label="Next photo"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg></button>
      <button type="button" id="lb-close" aria-label="Close viewer"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button>
    </div>
  </div>
</dialog>
<script type="application/json" id="photo-data">{data_json}</script>
<script>
{js}</script>
"""
    fonts = f'<link rel="preconnect" href="https://fonts.googleapis.com">\n<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n<link rel="stylesheet" href="{FONTS}">'
    if preview:
        return f"<title>{e(name)} Photography</title>\n{fonts}\n<style>\n{css}</style>\n{body}"

    url = cfg.get("url", "").rstrip("/")
    desc = cfg.get("intro", "")
    og_img = f"{url}/img/{featured['og']}" if url else f"img/{featured['og']}"
    head = f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>{e(name)} · {e(cfg.get("tagline", "Photography"))}</title>
<meta name="description" content="{e(desc)}">
{f'<link rel="canonical" href="{e(url)}/">' if url else ""}
<meta property="og:type" content="website">
<meta property="og:title" content="{e(name)} · {e(cfg.get("tagline", ""))}">
<meta property="og:description" content="{e(desc)}">
<meta property="og:image" content="{e(og_img)}">
{f'<meta property="og:url" content="{e(url)}/">' if url else ""}
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#121211">
<link rel="icon" href="data:image/svg+xml,{urllib.parse.quote(FAVICON)}">
{fonts}
<style>
{css}</style>
</head>
<body>
"""
    return head + body + "</body>\n</html>\n"


def not_found(cfg):
    css = (SRC / "style.css").read_text()
    home = (cfg.get("url") or "").rstrip("/") + "/" if cfg.get("url") else "./"
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
  <p class="eyebrow">404</p>
  <h1>Out of frame.</h1>
  <p class="lede">There is no page at this address. The photographs are all on the front page.</p>
  <p class="jump"><a href="{e(home)}">Go to the photographs</a></p>
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
        sys.exit(f"portfolio/site.json is not valid JSON: line {err.lineno}, column {err.colno}: {err.msg}.\n"
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
        robots = "User-agent: *\nAllow: /\n" + (f"Sitemap: {url}/sitemap.xml\n" if url else "")
        (out / "robots.txt").write_text(robots)
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
