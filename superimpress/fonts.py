# -*- coding: utf-8 -*-
"""Fetch the promo's typefaces and inline them as data: URIs.

Rendering then needs no network and the typography is identical on every run.

- Inter is the brand face. The SuperImpress wordmark uses Inter's serifed capital I
  (the `cv08` character variant), which Google Fonts strips from its build, so Inter
  comes from the complete release published on npm as `inter-ui` (SIL OFL 1.1). The
  tarball is checked against the registry's published sha512 before use.
- Caveat, for the one handwritten note, comes from Google Fonts (latin subset).

    python3 fonts.py build/fonts.css
"""
import base64, hashlib, io, os, re, sys, tarfile, urllib.request

INTER_TGZ = 'https://registry.npmjs.org/inter-ui/-/inter-ui-4.1.1.tgz'
INTER_SHA512 = '451h0J29HyOmA+JXgSi/6M12tL7ZCZ8arYKZUXiOXTJpJbAKqJvFh3k5SiV3x7tKe0C0KyrKUUiQIvvZ2PQDcA=='
INTER_FACES = [('package/variable-latin/InterVariable-subset.woff2', 'normal'),
               ('package/variable-latin/InterVariable-Italic-subset.woff2', 'italic')]
CAVEAT = 'https://fonts.googleapis.com/css2?family=Caveat:wght@700&display=block'
UA = ('Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) '
      'Chrome/124.0 Safari/537.36')          # a modern UA is served woff2 with unicode-range subsets

def get(url):
    return urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': UA}), timeout=60).read()

def data_uri(b):
    return 'data:font/woff2;base64,' + base64.b64encode(b).decode()

def main(out):
    tgz = get(INTER_TGZ)
    got = base64.b64encode(hashlib.sha512(tgz).digest()).decode()
    assert got == INTER_SHA512, 'inter-ui tarball does not match the registry integrity hash'
    tar = tarfile.open(fileobj=io.BytesIO(tgz))
    parts = []
    for path, style in INTER_FACES:
        woff2 = tar.extractfile(path).read()
        parts.append("@font-face { font-family: 'Inter'; font-style: %s; font-weight: 100 900; font-display: block;"
                     " src: url(%s) format('woff2'); }" % (style, data_uri(woff2)))
    css = get(CAVEAT).decode()
    for subset, face in re.findall(r'/\*\s*([\w-]+)\s*\*/\s*(@font-face\s*{[^}]*})', css):
        if subset == 'latin':
            src = re.search(r'url\((https://[^)]+)\)', face).group(1)
            parts.append(face.replace(src, data_uri(get(src))))
    assert len(parts) == 3, 'expected Inter roman and italic, and Caveat'
    os.makedirs(os.path.dirname(os.path.abspath(out)), exist_ok=True)
    open(out, 'w').write('\n'.join(parts) + '\n')
    print('%s: Inter (roman, italic) and Caveat, %.0f KB' % (out, os.path.getsize(out) / 1024))

if __name__ == '__main__':
    main(sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(__file__), 'build', 'fonts.css'))
