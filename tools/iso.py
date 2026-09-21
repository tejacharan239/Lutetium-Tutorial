"""Isometric + risograph drawing primitives that emit SVG.

Projection is a true axonometric: x runs down-right, y runs down-left, z is up.
A circle lying in the xy-plane projects to an axis-aligned ellipse whose radii
are in a fixed sqrt(3) ratio, which is what makes the domes and cylinders sit
on the grid instead of merely looking tilted.
"""
import math

K = math.cos(math.radians(30))     # 0.8660254
EX = K * math.sqrt(2)              # circle -> ellipse, horizontal radius factor
EY = math.sqrt(2) / 2              # ...vertical radius factor  (EX/EY == sqrt(3))

# ---------------------------------------------------------------- riso inks
P = {
    'navy':    '#2B3A67', 'navyD': '#1E2A4E', 'navyL': '#3D5083', 'navyXL': '#54689B',
    'teal':    '#3E9E8F', 'tealD': '#2C7469', 'tealL': '#65BEAE',
    'blush':   '#E9B2A6', 'blushD': '#CE8B79', 'blushL': '#F4CFC6',
    'cream':   '#F5EEDC', 'creamD': '#E3D8BE', 'creamL': '#FBF6EA',
    'gold':    '#EFBF49', 'goldD': '#D69F26', 'goldL': '#F7D986',
    'rust':    '#C4664D', 'rustD': '#A34C36',
    'plum':    '#9A5E7E', 'plumD': '#7A4562', 'plumL': '#BE87A3',
    'ink':     '#1E2647', 'paper': '#FAF5E9', 'white': '#FFFFFF',
}

def iso(x, y, z=0.0):
    """World (x, y, z) -> screen (px, py)."""
    return ((x - y) * K, (x + y) * 0.5 - z)

def pt(x, y, z=0.0, o=(0.0, 0.0)):
    px, py = iso(x, y, z)
    return (px + o[0], py + o[1])

def _poly(points, fill, extra=''):
    d = ' '.join('%.2f,%.2f' % p for p in points)
    return '<polygon points="%s" fill="%s"%s/>' % (d, fill, extra)

# ---------------------------------------------------------------- solids
def box(x, y, z, w, d, h, top, left, right, o=(0, 0), extra=''):
    """Axis-aligned cuboid. Returns top, left (y+d) and right (x+w) faces."""
    T = [pt(x, y, z + h, o), pt(x + w, y, z + h, o), pt(x + w, y + d, z + h, o), pt(x, y + d, z + h, o)]
    L = [pt(x, y + d, z, o), pt(x + w, y + d, z, o), pt(x + w, y + d, z + h, o), pt(x, y + d, z + h, o)]
    R = [pt(x + w, y, z, o), pt(x + w, y + d, z, o), pt(x + w, y + d, z + h, o), pt(x + w, y, z + h, o)]
    return _poly(L, left, extra) + _poly(R, right, extra) + _poly(T, top, extra)

def plane(x, y, w, d, fill, z=0.0, o=(0, 0), extra=''):
    """Flat tile lying on the ground (or at height z)."""
    return _poly([pt(x, y, z, o), pt(x + w, y, z, o), pt(x + w, y + d, z, o), pt(x, y + d, z, o)], fill, extra)

def disc(cx, cy, r, fill, z=0.0, o=(0, 0), extra=''):
    px, py = pt(cx, cy, z, o)
    return '<ellipse cx="%.2f" cy="%.2f" rx="%.2f" ry="%.2f" fill="%s"%s/>' % (
        px, py, r * EX, r * EY, fill, extra)

def cylinder(cx, cy, r, z, h, top, side, o=(0, 0), extra=''):
    rx, ry = r * EX, r * EY
    tx, ty = pt(cx, cy, z + h, o)
    bx, by = pt(cx, cy, z, o)
    body = ('M %.2f,%.2f A %.2f,%.2f 0 0 0 %.2f,%.2f L %.2f,%.2f A %.2f,%.2f 0 0 1 %.2f,%.2f Z'
            % (tx - rx, ty, rx, ry, tx + rx, ty, bx + rx, by, rx, ry, bx - rx, by))
    return ('<path d="%s" fill="%s"%s/>' % (body, side, extra)) + \
           disc(cx, cy, r, top, z + h, o, extra)

def dome(cx, cy, r, z, h, fill, o=(0, 0), extra="", rim=None):
    """Half-ellipsoid cap of height h sitting at height z."""
    rx, ry = r * EX, r * EY
    cxp, cyp = pt(cx, cy, z, o)
    d = ('M %.2f,%.2f A %.2f,%.2f 0 0 1 %.2f,%.2f A %.2f,%.2f 0 0 1 %.2f,%.2f Z'
         % (cxp - rx, cyp, rx, h, cxp + rx, cyp, rx, ry, cxp - rx, cyp))
    out = '<path d="%s" fill="%s"%s/>' % (d, fill, extra)
    if rim:
        # a crescent of shade along the lower-right of the cap, so it reads as a solid
        out += ('<path d="M %.2f,%.2f A %.2f,%.2f 0 0 1 %.2f,%.2f A %.2f,%.2f 0 0 0 %.2f,%.2f Z" '
                'fill="%s" opacity=".55"%s/>'
                % (cxp - rx, cyp, rx, ry, cxp + rx, cyp, rx * 0.66, h * 0.72, cxp - rx, cyp, rim, extra))
    return out

def ring(cx, cy, r, z, fill, w=1.6, o=(0, 0), extra=''):
    px, py = pt(cx, cy, z, o)
    return ('<ellipse cx="%.2f" cy="%.2f" rx="%.2f" ry="%.2f" fill="none" stroke="%s" '
            'stroke-width="%.2f"%s/>' % (px, py, r * EX, r * EY, fill, w, extra))

def line(a, b, stroke, w=1.4, o=(0, 0), extra=''):
    p, q = pt(*a, o=o), pt(*b, o=o)
    return ('<line x1="%.2f" y1="%.2f" x2="%.2f" y2="%.2f" stroke="%s" stroke-width="%.2f" '
            'stroke-linecap="round"%s/>' % (p[0], p[1], q[0], q[1], stroke, w, extra))

def figure(x, y, z, o=(0, 0), body=None, head=None, scale=1.0, extra=''):
    """A tiny person, for scale. Drawn in screen space at an isometric anchor."""
    body = body or P['gold']
    head = head or P['cream']
    px, py = pt(x, y, z, o)
    s = scale
    return ('<g%s><ellipse cx="%.2f" cy="%.2f" rx="%.2f" ry="%.2f" fill="%s" opacity=".25"/>'
            '<rect x="%.2f" y="%.2f" width="%.2f" height="%.2f" rx="%.2f" fill="%s"/>'
            '<circle cx="%.2f" cy="%.2f" r="%.2f" fill="%s"/></g>'
            % (extra, px, py, 3.0 * s, 1.7 * s, P['ink'],
               px - 2.1 * s, py - 9.5 * s, 4.2 * s, 9.5 * s, 1.6 * s, body,
               px, py - 12.2 * s, 2.7 * s, head))

def tile(x, y, w, d, fill, o=(0, 0), extra=''):
    """A diamond floor tile -- the unit the reference composes rooms from."""
    return plane(x, y, w, d, fill, 0.0, o, extra)

def wall_x(x, y, z, d, h, fill, o=(0, 0), extra=''):
    """Thin wall running along +y at a fixed x (the left-facing plane)."""
    return _poly([pt(x, y, z, o), pt(x, y + d, z, o), pt(x, y + d, z + h, o), pt(x, y, z + h, o)], fill, extra)

def wall_y(x, y, z, w, h, fill, o=(0, 0), extra=''):
    """Thin wall running along +x at a fixed y (the right-facing plane)."""
    return _poly([pt(x, y, z, o), pt(x + w, y, z, o), pt(x + w, y, z + h, o), pt(x, y, z + h, o)], fill, extra)

# ---------------------------------------------------------------- print process
def defs(uid='r'):
    """Risograph screen: ink is laid down as dots, so the paper shows through."""
    return f'''<defs>
  <pattern id="htl{uid}" width="3.6" height="3.6" patternUnits="userSpaceOnUse" patternTransform="rotate(15)">
    <rect width="3.6" height="3.6" fill="none"/>
    <circle cx="1.8" cy="1.8" r="1.28" fill="{P['paper']}"/>
  </pattern>
  <pattern id="htd{uid}" width="5.4" height="5.4" patternUnits="userSpaceOnUse" patternTransform="rotate(-9)">
    <circle cx="2.7" cy="2.7" r="1.35" fill="{P['ink']}"/>
  </pattern>
  <filter id="grain{uid}" x="0" y="0" width="100%" height="100%">
    <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="3" stitchTiles="stitch" result="n"/>
    <feColorMatrix in="n" type="saturate" values="0"/>
  </filter>
</defs>'''

def screen(w, h, uid='r', light=0.30, dark=0.10, grain=0.22):
    """Overlay layers that turn flat vector fills into a printed image.

    `light` punches paper-coloured dots out of the ink, which is what actually
    reads as risograph; `dark` adds a finer opposing screen so pale areas are
    not left perfectly smooth.
    """
    return (
        '<rect width="%d" height="%d" fill="url(#htl%s)" opacity="%.3f"/>' % (w, h, uid, light) +
        '<rect width="%d" height="%d" fill="url(#htd%s)" opacity="%.3f" '
        'style="mix-blend-mode:multiply"/>' % (w, h, uid, dark) +
        '<rect width="%d" height="%d" filter="url(#grain%s)" opacity="%.3f" '
        'style="mix-blend-mode:multiply"/>' % (w, h, uid, grain)
    )

def plate(x, y, w, h, title, lines, accent=None, uid='r', fs=11.5):
    """A cream annotation card, keylined so it sits on the paper rather than in it."""
    accent = accent or P['gold']
    s = '<g>'
    s += '<rect x="%.1f" y="%.1f" width="%d" height="%d" fill="%s" opacity=".18"/>' % (x + 4, y + 4, w, h, P['ink'])
    s += '<rect x="%d" y="%d" width="%d" height="%d" fill="%s" stroke="%s" stroke-width="1.6"/>' % (
        x, y, w, h, P['cream'], P['ink'])
    s += '<rect x="%d" y="%d" width="5" height="%d" fill="%s"/>' % (x, y, h, accent)
    s += ('<text x="%d" y="%d" font-family="IBM Plex Mono, monospace" font-size="9.5" font-weight="600" '
          'letter-spacing="1.5" fill="%s">%s</text>' % (x + 17, y + 21, P['navyL'], title))
    for i, ln in enumerate(lines):
        s += ('<text x="%d" y="%.1f" font-family="IBM Plex Mono, monospace" font-size="%.1f" '
              'fill="%s">%s</text>' % (x + 17, y + 40 + i * 16.5, fs, P['ink'], ln))
    return s + '</g>'

def heading(x, y, text, size=13, fill=None, weight=600, ls=2.2):
    return ('<text x="%d" y="%d" font-family="IBM Plex Mono, monospace" font-size="%d" '
            'font-weight="%d" letter-spacing="%.1f" fill="%s">%s</text>'
            % (x, y, size, weight, ls, fill or P['navyL'], text))
