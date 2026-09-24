# Photography portfolio

A one-page portfolio for photographs made on a phone. You add photos to a
folder and edit one settings file. The build resizes everything for the web,
removes location data from the published images, and writes each photo's
camera readout (lens, shutter, ISO) under it.

```
portfolio/
  photos/          your photos; a subfolder name becomes a category
    street/
    landscape/
  site.json        your name, intro, about text, contact details
  build.py         turns the two above into a website in _site/
  samples.py       placeholder images, used only while photos/ is empty
  src/             the page's stylesheet and script
```

## Add photos

1. **Remove location from each photo first.** Phones store the GPS position
   inside every photo, and the files in this repository are public.
   - iPhone: in Photos, tap Share → Options → turn off Location.
   - Android (Google Photos): open the photo → ⋮ → Details → remove location,
     or turn off "Share location" in the sharing options.

   The published site never includes location either way; the build strips it
   and warns about any original that still carries it.
2. Put the photos in `portfolio/photos/`, one subfolder per category:
   `photos/street/`, `photos/night/`, `photos/landscape/`. Photos placed
   directly in `photos/` have no category. With two or more categories, the
   page shows filters.
   - From a phone: open the repository on github.com → `portfolio/photos/` →
     the folder → **Add file → Upload files**.
   - JPEG, PNG, WebP and iPhone HEIC files all work. Keep each file under
     25 MB (GitHub's upload limit).
3. Name files the way you want them titled: `rain-on-the-old-road.jpg`
   becomes "Rain on the old road". Camera names such as `IMG_2041.jpg` get
   no title.

Photos appear newest first, by the date the phone recorded.

## Edit site.json

| Field | What it does |
|---|---|
| `name`, `tagline`, `intro` | The big name, the line above it and the paragraph below it |
| `location` | Shown next to the tagline, e.g. `"Lisbon"` |
| `url` | Your live address, e.g. `"https://yourname.com"`. Used for link previews and the sitemap |
| `email`, `instagram` | Contact section. Leave `instagram` empty to hide it; give the handle without `@` |
| `about` | Paragraphs of the About section |
| `kit` | Rows under About: `["Phone", "Pixel 8 Pro"]` |
| `camera_names` | Friendlier names for phone model codes: `"SM-S918B": "Galaxy S23 Ultra"` |
| `featured` | The photo in the viewfinder at the top, e.g. `"night/moonrise.jpg"`. Empty means the newest |
| `order` | Photos to show first, in this order. The rest follow newest first |
| `photos` | Per-photo title, caption and alt text (see below) |

```json
"photos": {
  "street/IMG_2041.jpg": {
    "title": "Chai before the rain",
    "caption": "The first wet evening of June.",
    "alt": "A tea seller pouring chai under a blue tarp while rain starts"
  }
}
```

`alt` is read aloud by screen readers and helps search engines; write what is
in the picture. JSON is strict: every item but the last in a list needs a
comma after it, and text needs straight double quotes. If you make a
mistake, the build names the line.

## Build and preview locally

```
pip install -r portfolio/requirements.txt
python portfolio/build.py --out _site
python -m http.server -d _site 8000     # then open http://localhost:8000
```

## Publish with GitHub Pages

`.github/workflows/portfolio.yml` builds the site on every change under
`portfolio/` and publishes it from the repository's default branch. Other
branches only check that the build works.

1. The repository must be public, unless you have GitHub Pro.
2. In the repository, open **Settings → Pages** and set **Source** to
   **GitHub Actions**.
3. Merge into the default branch, or run the **Portfolio** workflow from the
   Actions tab. The site appears at
   `https://<your-username>.github.io/<repository-name>/`.

## Use your own domain

1. Buy the domain from a registrar (Cloudflare, Porkbun, Namecheap and others)
   and turn on auto-renew.
2. At the registrar, add these DNS records:

   | Type | Name | Value |
   |---|---|---|
   | A | `@` | `185.199.108.153` |
   | A | `@` | `185.199.109.153` |
   | A | `@` | `185.199.110.153` |
   | A | `@` | `185.199.111.153` |
   | CNAME | `www` | `<your-username>.github.io` |

3. In **Settings → Pages → Custom domain**, enter the domain and save. When
   the certificate is ready (up to an hour after DNS works), tick
   **Enforce HTTPS**.
4. Verify the domain under your GitHub profile's **Settings → Pages**, so no
   one else can point a repository at it.
5. Set `"url"` in `site.json` to `https://yourdomain.com`.

DNS changes can take up to a day to reach everyone.
