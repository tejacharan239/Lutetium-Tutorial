"""Recurring objects in the diorama. Each returns an SVG fragment."""
import math
from iso import *
import iso as ISO

def glass_drum(cx, cy, r, z, h, o, tint=None):
    """A pale glass cylinder you can see into -- the reference's centrepiece."""
    tint = tint or P['creamL']
    if ISO.MODE == '3d': return m3('glass', o=o, x=cx, y=cy, r=r, z=z, h=h, c=tint)
    s = cylinder(cx, cy, r, z, h, tint, tint, o, ' opacity=".42"')
    s += ring(cx, cy, r, z + h, P['paper'], 1.5, o, ' opacity=".85"')
    s += ring(cx, cy, r, z, P['paper'], 1.2, o, ' opacity=".45"')
    for i in range(8):
        a = 2 * math.pi * i / 8
        wx, wy = cx + r * math.cos(a), cy + r * math.sin(a)
        s += line((wx, wy, z), (wx, wy, z + h), P['paper'], 1.0, o, ' opacity=".4"')
    return s

def cell(cx, cy, r, o, cap, capD, n_rec=0, rec_c=None, h=17, drum=None, core=None, glow=False):
    """A cell: glass drum, domed roof, receptor masts on the rim."""
    rec_c = rec_c or P['gold']
    s = glass_drum(cx, cy, r, 0, h, o, drum)
    if core:
        s += '<g class="pulse">%s</g>' % cylinder(cx, cy, r * 0.34, 0, h * 0.62, core, core, o, ' opacity=".95"')
    if glow:
        s += '<g class="ripple">%s</g>' % ring(cx, cy, r * 0.62, h * 0.5, P['goldL'], 2.2, o, ' opacity=".8"')
    s += dome(cx, cy, r, h, r * 0.92, cap, o, rim=capD, cut=True)
    s += ring(cx, cy, r, h, P['paper'], 1.4, o, ' opacity=".7"')
    for i in range(n_rec):
        a = 2 * math.pi * i / n_rec + 0.25
        wx, wy = cx + r * 0.97 * math.cos(a), cy + r * 0.97 * math.sin(a)
        # receptors bob in a travelling wave round the rim
        s += ('<g class="bob" style="animation-delay:-%.2fs">%s%s</g>'
              % (0.9 * i / max(1, n_rec), line((wx, wy, h - 1), (wx, wy, h + 12), rec_c, 2.4, o),
                 disc(wx, wy, 3.0, rec_c, h + 12.5, o)))
    return s

def floor(ox, oy, span, cols, fill, o, gut=7, z=0):
    st = span / cols
    return ''.join(plane(ox + i * st, oy + j * st, st - gut, st - gut, fill, z, o)
                   for i in range(cols) for j in range(cols))

def contours(ox, oy, span, o, n=8, colour=None, z=0.6):
    """Survey lines across the navy ground, as on the reference's water."""
    colour = colour or P['navyXL']
    s = '<g class="drift">'
    for k in range(n):
        t = oy + span * (k + 0.5) / n
        s += line((ox + 6, t, z), (ox + span - 6, t, z), colour, 1.1, o, ' opacity=".45"')
    return s + '</g>'

def room(ox, oy, w, d, o, floor_c, wall_c, wall_h=32):
    """A cutaway corner room -- walls on the two far sides, open to the viewer."""
    s = plane(ox, oy, w, d, floor_c, 0, o)
    s += wall_y(ox, oy, 0, w, wall_h, wall_c, o)
    s += wall_x(ox, oy, 0, d, wall_h, shade(wall_c, 0.82), o)
    return s

def shade(hexc, f):
    hexc = hexc.lstrip('#')
    r, g, b = (int(hexc[i:i + 2], 16) for i in (0, 2, 4))
    return '#%02X%02X%02X' % (max(0, min(255, int(r * f))), max(0, min(255, int(g * f))), max(0, min(255, int(b * f))))

def crate(x, y, o, s=14, top=None, col=None):
    col = col or P['gold']
    return box(x, y, 0, s, s, s * 0.7, top or shade(col, 1.18), shade(col, 0.72), col, o)

def mast(x, y, z, h, o, c, cap=3.0):
    return line((x, y, z), (x, y, z + h), c, 2.4, o) + disc(x, y, cap, c, z + h + 0.5, o)

def beam(x, y, z, o, c=None, n=5, spread=26, length=54):
    """A cone of light, as from the reference's lantern room."""
    c = c or P['goldL']
    s = '<g class="flicker">'
    for i in range(n):
        a = 2 * math.pi * i / n
        s += line((x, y, z), (x + spread * math.cos(a), y + spread * math.sin(a), z - length), c, 1.6, o,
                  ' opacity=".55"')
    return s + '</g>'

def stack(x, y, o, levels, col, step=9, s=22):
    """A stepped plinth -- used for cumulative-dose and bar-chart towers."""
    out = '<g class="grow">'
    for i, lv in enumerate(range(levels)):
        out += box(x + i * 1.5, y + i * 1.5, i * step, s - i * 3, s - i * 3, step, shade(col, 1.2), shade(col, 0.7), col, o)
    return out + '</g>'

def arrow(a, b, o, c=None, w=2.2):
    """A ground-level direction marker between two world points."""
    c = c or P['paper']
    if ISO.MODE == '3d': return m3('arrow', o=o, a=list(a), b=list(b), c=c, w=w)
    (ax, ay), (bx, by) = pt(*a, o=o), pt(*b, o=o)
    ang = math.atan2(by - ay, bx - ax)
    h = 7.0
    p1 = (bx - h * math.cos(ang - 0.42), by - h * math.sin(ang - 0.42))
    p2 = (bx - h * math.cos(ang + 0.42), by - h * math.sin(ang + 0.42))
    return ('<line class="drawline" pathLength="1" x1="%.1f" y1="%.1f" x2="%.1f" y2="%.1f" stroke="%s" '
            'stroke-width="%.1f" stroke-linecap="round"/>'
            '<polygon class="arrowhead" points="%.1f,%.1f %.1f,%.1f %.1f,%.1f" fill="%s"/>'
            % (ax, ay, bx, by, c, w, bx, by, p1[0], p1[1], p2[0], p2[1], c))
