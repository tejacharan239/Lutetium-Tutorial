# -*- coding: utf-8 -*-
"""Fetch the promo's typefaces from Google Fonts and inline them as data: URIs.

Rendering then needs no network and the typography is identical on every run.
Only the latin subset is kept; icons such as ticks and arrows are drawn as SVG.

    python3 fonts.py build/fonts.css
"""
import base64, os, re, sys, urllib.request

FAMILIES = [
    'Fraunces:ital,opsz,wght,SOFT@0,9..144,300..900,0..100;1,9..144,300..900,0..100',  # display
    'DM+Sans:ital,opsz,wght@0,9..40,300..800;1,9..40,300..800',                        # interface
    'IBM+Plex+Mono:wght@500;600',                                                    # labels
    'Caveat:wght@600;700',                                                           # handwriting
]
UA = ('Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) '
      'Chrome/124.0 Safari/537.36')          # a modern UA is served woff2 with unicode-range subsets

def get(url):
    return urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': UA}), timeout=60).read()

def main(out):
    url = 'https://fonts.googleapis.com/css2?' + '&'.join('family=' + f for f in FAMILIES) + '&display=block'
    css = get(url).decode()
    faces = re.findall(r'/\*\s*([\w-]+)\s*\*/\s*(@font-face\s*{[^}]*})', css)
    keep = [f for (subset, f) in faces if subset == 'latin']
    assert keep, 'no latin faces in the Google Fonts response'
    parts = []
    for face in keep:
        src = re.search(r'url\((https://[^)]+)\)', face).group(1)
        data = base64.b64encode(get(src)).decode()
        parts.append(face.replace(src, 'data:font/woff2;base64,' + data))
    os.makedirs(os.path.dirname(os.path.abspath(out)), exist_ok=True)
    open(out, 'w').write('\n'.join(parts) + '\n')
    fams = sorted(set(re.findall(r"font-family:\s*'([^']+)'", '\n'.join(keep))))
    print('%s: %d faces (%s), %.0f KB' % (out, len(keep), ', '.join(fams), os.path.getsize(out) / 1024))

if __name__ == '__main__':
    main(sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(__file__), 'build', 'fonts.css'))
