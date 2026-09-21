# -*- coding: utf-8 -*-
"""The thirteen scenes, drawn as isometric risograph dioramas."""
import sys, math, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from iso import *
from actors import *

W, H = 720, 420

def A(content, cls):
    return '<g class="%s">%s</g>' % (cls, content)

def frame(uid, body, title):
    return ('%s<rect width="%d" height="%d" fill="%s"/>%s%s%s'
            % (defs(uid), W, H, P['paper'], body, screen(W, H, uid, 0.34, 0.09, 0.20),
               heading(26, 34, title)))

def lightcone(x, y, z, o, dx, dy, spread=34, colour=None):
    """A shaft of light falling from a lantern onto the ground."""
    colour = colour or P['goldL']
    ax, ay = pt(x, y, z, o)
    g1 = pt(x + dx - spread, y + dy, 0, o)
    g2 = pt(x + dx, y + dy - spread, 0, o)
    return ('<polygon points="%.1f,%.1f %.1f,%.1f %.1f,%.1f" fill="%s" opacity=".34"/>'
            % (ax, ay, g1[0], g1[1], g2[0], g2[1], colour))

# ===================================================================== 01
def s01():
    O = (356, 258); s = ''
    s += floor(-158, -158, 316, 2, P['navy'], O, 9)
    s += contours(-158, -158, 316, O, 10)
    s += A(room(-268, -76, 80, 80, O, P['blush'], P['blushD'])
           + crate(-248, -56, O, 15, col=P['cream']) + figure(-228, -30, 0, O, P['navy'], P['cream'], .85), 'a a-l d6')
    s += A(room(104, -172, 74, 74, O, P['creamD'], shade(P['creamD'], .86))
           + crate(122, -154, O, 14, col=P['teal']) + figure(142, -132, 0, O, P['rust'], P['cream'], .85), 'a a-r d7')
    s += A(lightcone(0, 0, 58, O, -104, -104, 64, P['paper']), 'a a-in d5')
    hero = cylinder(0, 0, 62, 0, 10, P['navyL'], shade(P['navy'], .78), O)
    hero += cylinder(0, 0, 52, 10, 10, P['navyXL'], shade(P['navyL'], .78), O)
    hero += glass_drum(0, 0, 44, 20, 42, O)
    hero += cylinder(0, 0, 14, 24, 26, P['gold'], P['goldD'], O)
    hero += disc(0, 0, 26, P['goldL'], 25, O, ' opacity=".38"')
    hero += figure(-20, 20, 24, O, P['rust'], P['cream'], .85)
    hero += dome(0, 0, 47, 62, 44, P['teal'], O, rim=P['tealD'])
    hero += ring(0, 0, 47, 62, P['paper'], 1.8, O, ' opacity=".8"')
    s += A(hero, 'a a-pop d1')
    s += A(crate(-96, 92, O, 16, col=P['goldL']) + crate(-74, 106, O, 13, col=P['cream'])
           + figure(-118, 84, 0, O, P['gold'], P['cream'], .95)
           + figure(84, -108, 0, O, P['teal'], P['cream'], .95), 'a a-in d8')
    s += A(plate(20, 236, 258, 128, 'PRRT',
                 ['Lu-177 DOTATATE', 'grade 1 . stage 4', 'neuroendocrine tumour', '', 'thirteen scenes'], P['gold']), 'a a-up d2')
    return frame('s1', s, 'SCENE 01 / THE MOLECULE, THE TARGET')

# ===================================================================== 02
def s02():
    O = (352, 214); s = ''
    s += floor(-150, -150, 300, 2, P['navy'], O, 8)
    s += contours(-150, -150, 300, O, 8)
    liver = cylinder(-58, -34, 56, 0, 14, P['tealD'], shade(P['tealD'], .78), O)
    liver += dome(-58, -34, 56, 14, 34, P['teal'], O, rim=P['tealD'])
    s += A(liver, 'a a-l d1')
    for i, (dx, dy, r) in enumerate([(-86, -58, 12), (-50, -64, 9), (-34, -20, 14), (-76, -12, 8), (-58, -38, 7)]):
        s += A(cylinder(dx, dy, r, 48, 5, P['plum'], P['plumD'], O)
               + dome(dx, dy, r, 53, r * .8, P['plumL'], O, rim=P['plumD']), 'a a-pop d%d' % (5 + i))
    s += A(cylinder(62, 52, 30, 0, 11, P['blushD'], shade(P['blushD'], .8), O)
           + dome(62, 52, 30, 11, 20, P['blush'], O, rim=P['blushD'])
           + disc(62, 52, 8, P['plum'], 31, O) + mast(62, 52, 31, 7, O, P['plumD'], 2.2), 'a a-r d3')
    s += A(arrow((30, 20, 1), (-20, -8, 1), O, P['paper'], 2.0), 'a a-in d9')
    s += A(figure(6, 108, 0, O, P['gold'], P['cream'], .95), 'a a-in d10')
    s += A(plate(438, 44, 258, 82, 'GRADE 1', ['Ki-67 <= 2%', 'well differentiated'], P['teal']), 'a a-r d2')
    s += A(plate(438, 140, 258, 82, 'STAGE 4', ['distant metastases', 'liver in ~85%'], P['plum']), 'a a-r d4')
    s += A(plate(24, 300, 300, 66, 'THE BIND', ['too slow for chemotherapy,', 'too scattered for surgery'], P['rust']), 'a a-up d11')
    return frame('s2', s, 'SCENE 02 / THE DISEASE ON THE TABLE')

# ===================================================================== 03
def s03():
    O = (352, 210); s = ''
    s += floor(-152, -152, 304, 2, P['navy'], O, 8)
    s += contours(-152, -152, 304, O, 8)
    s += A(room(-250, 44, 78, 78, O, P['blush'], P['blushD'])
           + crate(-230, 64, O, 15, col=P['cream']) + figure(-210, 90, 0, O, P['navy'], P['cream'], .85), 'a a-l d8')
    s += A(cell(-78, 22, 38, O, P['teal'], P['tealD'], 3, P['creamD'], 15), 'a a-l d1')
    s += A(cell(44, -66, 50, O, P['plum'], P['plumD'], 14, P['gold'], 17), 'a a-r d3')
    s += A(arrow((-30, -6, 2), (10, -32, 2), O, P['paper'], 2.0), 'a a-in d5')
    s += A(figure(-40, 112, 0, O, P['gold'], P['cream'], .95)
           + figure(-18, 124, 0, O, P['rust'], P['cream'], .95)
           + crate(4, 96, O, 13, col=P['goldL']), 'a a-in d6')
    s += A(plate(24, 302, 232, 82, 'NORMAL CELL', ['a few receptors', 'baseline SSTR2'], P['teal']), 'a a-up d7')
    s += A(plate(452, 46, 244, 82, 'GRADE 1 NET CELL', ['SSTR2 over-expressed', '10-100x more receptor'], P['plum']), 'a a-r d4')
    return frame('s3', s, 'SCENE 03 / WHY THIS TUMOUR IS ADDRESSABLE')

# ===================================================================== 04
def s04():
    O = (348, 236); s = ''
    s += floor(-160, -160, 320, 2, P['navy'], O, 8)
    def plinth(x, y, col):
        return (cylinder(x, y, 34, 0, 20, shade(col, 1.15), shade(col, .78), O)
                + ring(x, y, 34, 20, P['paper'], 1.4, O, ' opacity=".55"'))
    s += A(plinth(-96, 44, P['navyL']) + ''.join(
        disc(-96 + 20 * math.cos(2 * math.pi * i / 7), 44 + 20 * math.sin(2 * math.pi * i / 7), 7, P['teal'], 22, O)
        for i in range(7)) + ring(-96, 44, 20, 22, P['tealD'], 2.4, O), 'a a-l d1')
    cage = plinth(4, -26, P['navyL'])
    for i in range(8):
        a1, a2 = 2 * math.pi * i / 8, 2 * math.pi * (i + 1) / 8
        cage += line((4 + 22 * math.cos(a1), -26 + 22 * math.sin(a1), 22),
                     (4 + 22 * math.cos(a2), -26 + 22 * math.sin(a2), 22), P['goldD'], 2.6, O)
        cage += line((4 + 22 * math.cos(a1), -26 + 22 * math.sin(a1), 22),
                     (4 + 22 * math.cos(a1), -26 + 22 * math.sin(a1), 44), P['goldD'], 2.0, O)
    cage += ring(4, -26, 22, 44, P['goldD'], 2.4, O)
    s += A(cage, 'a a-up d3')
    s += A(cylinder(4, -26, 13, 20, 12, P['gold'], P['goldD'], O) + dome(4, -26, 13, 32, 15, P['goldL'], O, rim=P['goldD'])
           + ring(4, -26, 19, 30, P['goldL'], 1.8, O, ' opacity=".7"'), 'a a-pop d5')
    s += A(plinth(104, -96, P['navyL']) + cylinder(104, -96, 15, 20, 20, P['rust'], P['rustD'], O)
           + dome(104, -96, 15, 40, 17, P['goldL'], O, rim=P['gold']), 'a a-r d4')
    s += A(arrow((-64, 30, 3), (-22, 2, 3), O, P['paper'], 2.0)
           + arrow((36, -46, 3), (74, -72, 3), O, P['paper'], 2.0), 'a a-in d6')
    s += A(figure(-40, 120, 0, O, P['gold'], P['cream'], .95), 'a a-in d7')
    s += A(plate(20, 292, 206, 82, 'OCTREOTATE', ['finds the receptor', 'the address'], P['teal']), 'a a-up d2')
    s += A(plate(240, 316, 190, 66, 'DOTA', ['cages the metal'], P['gold']), 'a a-up d4')
    s += A(plate(470, 40, 226, 100, 'LUTETIUM-177', ['beta emitter', 'half-life 6.65 d', 'range 0.5-2 mm'], P['rust']), 'a a-r d5')
    return frame('s4', s, 'SCENE 04 / ASSEMBLING THE MOLECULE')

# ===================================================================== 05
def s05():
    O = (348, 222); s = ''
    s += A(room(-192, -104, 104, 94, O, P['blush'], P['blushD'], 30), 'a a-in d1')
    gantry = cylinder(-148, -66, 34, 0, 44, P['blush'], P['blushD'], O)
    gantry += disc(-148, -66, 34, P['blushL'], 44, O)
    gantry += disc(-148, -66, 18, P['navyD'], 44.2, O)
    gantry += ring(-148, -66, 25, 44.4, P['gold'], 2.2, O)
    s += A(gantry, 'a a-pop d2')
    s += A(box(-150, -22, 8, 48, 14, 5, P['creamL'], P['creamD'], P['cream'], O)
           + figure(-120, -16, 13, O, P['navy'], P['cream'], .8), 'a a-in d3')
    s += A(box(-186, 4, 0, 18, 13, 20, P['navyL'], shade(P['navy'], .8), P['navy'], O)
           + box(-184, 6, 20, 14, 9, 2, P['goldL'], P['goldD'], P['gold'], O)
           + figure(-160, 18, 0, O, P['teal'], P['cream'], .85), 'a a-in d4')
    s += A(floor(24, -96, 190, 2, P['navy'], O, 8), 'a a-r d5')
    for i, (lx, ly, r) in enumerate([(64, -44, 16), (124, -72, 12), (94, -8, 19), (156, -34, 10)]):
        s += A(cylinder(lx, ly, r, 0, 5, P['gold'], P['goldD'], O)
               + dome(lx, ly, r, 5, r * .9, P['goldL'], O, rim=P['gold'])
               + beam(lx, ly, 7, O, P['goldL'], 4, 13, -20), 'a a-pop d%d' % (6 + i))
    s += A(figure(150, 40, 0, O, P['rust'], P['cream'], .9), 'a a-in d9')
    s += A(plate(22, 300, 250, 82, 'Ga-68 DOTATATE PET', ['same peptide,', 'imaging payload'], P['navyL']), 'a a-up d3')
    s += A(plate(408, 286, 288, 98, 'KRENNING 3-4 REQUIRED',
                 ['uptake above normal liver', 'dark lesion = no treatment'], P['gold']), 'a a-up d10')
    return frame('s5', s, 'SCENE 05 / THE SCAN IS THE ELIGIBILITY TEST')

# ===================================================================== 06
def s06():
    O = (330, 214); s = ''
    s += A(room(-198, -66, 108, 100, O, P['blush'], P['blushD'], 30), 'a a-in d1')
    s += A(box(-186, -20, 0, 34, 24, 10, P['creamL'], P['creamD'], P['cream'], O)
           + box(-186, 2, 10, 34, 5, 20, P['creamL'], P['creamD'], P['cream'], O)
           + figure(-168, -8, 10, O, P['navy'], P['cream'], .95), 'a a-in d2')
    s += A(line((-120, -60, 0), (-120, -60, 70), P['navyL'], 2.6, O)
           + box(-126, -66, 52, 12, 12, 16, P['tealL'], P['tealD'], P['teal'], O)
           + box(-126, -66, 32, 12, 12, 16, P['goldL'], P['goldD'], P['gold'], O)
           + line((-120, -60, 32), (-150, -26, 14), P['paper'], 1.6, O), 'a a-dn d3')
    s += A(figure(-92, -30, 0, O, P['rust'], P['cream'], .9), 'a a-in d4')
    s += A(floor(40, -110, 180, 2, P['navy'], O, 8), 'a a-r d5')
    kid = cylinder(112, -52, 46, 0, 26, P['rustD'], shade(P['rust'], .62), O)
    kid += dome(112, -52, 46, 26, 34, P['rust'], O, rim=P['rustD'])
    s += A(kid, 'a a-r d6')
    for i in range(3):
        a = -0.5 + i * 0.5
        s += A(box(112 + 44 * math.cos(a) - 6, -52 + 44 * math.sin(a) - 6, 26, 12, 12, 11,
                   P['tealL'], P['tealD'], P['teal'], O), 'a a-pop d%d' % (7 + i))
    s += A(cylinder(186, -6, 9, 0, 9, P['gold'], P['goldD'], O)
           + arrow((176, -14, 12), (206, 10, 12), O, P['rust'], 2.2), 'a a-in d10')
    s += A(plate(20, 292, 262, 90, 'AMINO ACIDS FIRST', ['lysine + arginine, 2.5%', 'block the kidney uptake'], P['teal']), 'a a-up d4')
    s += A(plate(454, 44, 242, 90, 'THEN THE DOSE', ['7.4 GBq over 30 min', 'four cycles, q8 weeks'], P['gold']), 'a a-r d5')
    s += A(plate(454, 296, 242, 68, 'OCTREOTIDE HELD', ['4 weeks before'], P['rust']), 'a a-up d11')
    return frame('s6', s, 'SCENE 06 / INFUSION DAY')

# ===================================================================== 07
def s07():
    O = (352, 224); s = ''
    s += floor(-160, -160, 320, 2, P['navy'], O, 9)
    s += contours(-160, -160, 320, O, 8)
    s += A(glass_drum(10, -20, 76, 0, 46, O) + dome(10, -20, 78, 46, 60, P['plum'], O, rim=P['plumD'])
           + ring(10, -20, 78, 46, P['paper'], 1.8, O, ' opacity=".8"'), 'a a-pop d1')
    for i in range(10):
        a = 2 * math.pi * i / 10 + .3
        s += A(mast(10 + 76 * math.cos(a), -20 + 76 * math.sin(a), 44, 13, O, P['gold']), 'a a-pop d2')
    s += A(cylinder(10, -20, 24, 0, 18, P['navyXL'], P['navyL'], O)
           + dome(10, -20, 24, 18, 18, P['navyL'], O, rim=P['navy'])
           + disc(10, -20, 11, P['gold'], 37, O) + ring(10, -20, 17, 37, P['goldL'], 1.8, O, ' opacity=".75"'), 'a a-pop d8')
    s += A(figure(-56, 84, 0, O, P['gold'], P['cream'], 1.0)
           + box(-46, 92, 9, 9, 9, 8, P['goldL'], P['goldD'], P['gold'], O), 'a a-in d3')
    s += A(arrow((-42, 66, 2), (-4, 34, 2), O, P['paper'], 2.2), 'a a-in d4')
    s += A(figure(58, 40, 0, O, P['teal'], P['cream'], .9), 'a a-in d6')
    s += A(plate(20, 60, 214, 82, '1 . APPROACH', ['drug arrives', 'in the blood'], P['gold']), 'a a-l d3')
    s += A(plate(20, 300, 214, 82, '2 . BIND SSTR2', ['the gate opens', 'Kd < 1 nmol/L'], P['teal']), 'a a-up d5')
    s += A(plate(482, 52, 214, 82, '3 . SWALLOWED', ['pulled inside', 'by endocytosis'], P['plum']), 'a a-r d7')
    s += A(plate(482, 296, 214, 88, '4 . STRANDED', ['peptide digested,', 'the metal stays'], P['rust']), 'a a-r d9')
    return frame('s7', s, 'SCENE 07 / LOCK, SWALLOW, TRAP')

# ===================================================================== 08
def s08():
    O = (338, 244); s = ''
    s += floor(-164, -164, 328, 2, P['navy'], O, 9)
    core = cylinder(-84, -20, 34, 0, 24, P['navyXL'], P['navyL'], O)
    core += dome(-84, -20, 34, 24, 26, P['navyL'], O, rim=P['navy'])
    core += cylinder(-84, -20, 13, 8, 18, P['gold'], P['goldD'], O)
    core += ring(-84, -20, 22, 26, P['goldL'], 2.2, O, ' opacity=".8"')
    s += A(core, 'a a-l d1')
    for i in range(7):
        a = 2 * math.pi * i / 7 + .2
        s += A(arrow((-84 + 34 * math.cos(a), -20 + 34 * math.sin(a), 30),
                     (-84 + 80 * math.cos(a), -20 + 80 * math.sin(a), 30), O, P['goldL'], 1.8),
               'a a-in d%d' % (3 + i % 4))
    for i, (wx, wy) in enumerate([(-10, -84), (18, -48), (-28, -112)]):
        s += A(disc(wx, wy, 11, P['teal'], 6, O) + disc(wx + 22, wy + 12, 9, P['rust'], 6, O), 'a a-pop d%d' % (6 + i))
    hx, hy = 112, -46
    rails, rungs = '', ''
    N, step, off = 11, 17.0, 11.0
    def rail_pt(k, side):
        t = -N * step / 2 + k * step
        return (hx + t * 0.70 + side * off, hy - t * 0.70 + side * off, 34 + t * 0.34)
    for k in range(N - 1):
        if k in (4, 5):
            continue
        for side in (-1, 1):
            rails += line(rail_pt(k, side), rail_pt(k + 1, side),
                          P['cream'] if side < 0 else P['creamD'], 3.4, O)
    for k in range(N):
        if k in (4, 5, 6):
            continue
        rungs += line(rail_pt(k, -1), rail_pt(k, 1), P['navyXL'], 2.2, O)
    s += A(rails + rungs, 'a a-up d8')
    bp = rail_pt(5, 0)
    s += A(line((bp[0] - 26, bp[1] - 26, bp[2]), (bp[0] + 26, bp[1] + 26, bp[2]), P['rust'], 3.8, O)
           + line((bp[0] - 26, bp[1] + 26, bp[2]), (bp[0] + 26, bp[1] - 26, bp[2]), P['rust'], 3.8, O),
           'a a-pop d11')
    s += A(figure(-30, 112, 0, O, P['gold'], P['cream'], .95), 'a a-in d10')
    s += A(plate(20, 292, 250, 90, 'ONE ELECTRON PER DECAY', ['mean 134 keV', 'splits water into radicals'], P['gold']), 'a a-up d5')
    s += A(plate(446, 268, 250, 108, 'DOUBLE-STRAND BREAK',
                 ['both rails cut at once', 'no template left to copy', 'repair is outrun'], P['rust']), 'a a-up d12')
    return frame('s8', s, 'SCENE 08 / WHAT THE RADIATION DOES')

# ===================================================================== 09
def s09():
    O = (300, 216); s = ''
    s += floor(-176, -176, 352, 2, P['navy'], O, 9)
    s += contours(-176, -176, 352, O, 9)
    s += A(ring(-36, -18, 118, 1.5, P['goldL'], 2.6, O, ' stroke-dasharray="7 6" opacity=".9"'), 'a a-in d1')
    s += A(cell(-36, -18, 34, O, P['plum'], P['plumD'], 6, P['gold'], 15, core=P['gold'], glow=True), 'a a-pop d2')
    s += A(cell(44, -66, 30, O, P['plumL'], P['plumD'], 5, P['gold'], 14, core=P['gold']), 'a a-pop d3')
    for i, (cx, cy) in enumerate([(-116, -58), (-4, -110), (40, 34), (-96, 54), (-130, -132)]):
        s += A(cell(cx, cy, 27, O, P['navyXL'], P['navyL'], 0, None, 12), 'a a-pop d%d' % (4 + i))
    s += A(''.join(arrow((-36, -18, 24), (-36 + 104 * math.cos(2 * math.pi * i / 6), -18 + 104 * math.sin(2 * math.pi * i / 6), 24), O, P['goldL'], 1.6) for i in range(6)), 'a a-in d6')
    s += A(line((-154, 122, 1), (82, 122, 1), P['goldL'], 2.6, O)
           + mast(-154, 122, 1, 8, O, P['goldL'], 2.0) + mast(82, 122, 1, 8, O, P['goldL'], 2.0), 'a a-up d9')
    s += A(plate(20, 296, 250, 90, 'BETA RANGE 0.5-2 mm', ['a cell is ~20 um across', 'so 25-100 cells deep'], P['gold']), 'a a-up d9')
    s += A(plate(446, 40, 250, 124, 'DOSE ALSO LANDS HERE',
                 ['kidneys . creatinine', 'bone marrow . blood count', 'spleen and liver', 'these cap the total dose'], P['rust']), 'a a-r d10')
    s += A(plate(446, 286, 250, 90, 'CROSSFIRE', ['neighbours with no receptor', 'are irradiated anyway'], P['plum']), 'a a-r d11')
    return frame('s9', s, 'SCENE 09 / RANGE, CROSSFIRE, COLLATERAL DOSE')

# ===================================================================== 10
def s10():
    O = (340, 208); s = ''
    s += floor(-180, -180, 360, 2, P['navy'], O, 9)
    for i in range(4):
        x, y = -108 + i * 72, 108 - i * 72
        s += A(cylinder(x, y, 30, 0, 16, P['navyXL'], P['navyL'], O)
               + dome(x, y, 30, 16, 24, P['teal'] if i % 2 == 0 else P['tealL'], O, rim=P['tealD'])
               + box(x - 6, y - 6, 40, 12, 12, 15, P['goldL'], P['goldD'], P['gold'], O)
               + figure(x + 26, y + 26, 0, O, P['rust'], P['cream'], .85), 'a a-pop d%d' % (1 + i * 2))
        if i < 3:
            s += A(arrow((x + 34, y - 34, 2), (x + 58, y - 58, 2), O, P['paper'], 2.0), 'a a-in d%d' % (2 + i * 2))
    for i, lbl in enumerate(['7.4', '14.8', '22.2', '29.6']):
        px, py = pt(-108 + i * 72, 108 - i * 72, -22, O)
        s += A('<text x="%.0f" y="%.0f" text-anchor="middle" font-family="IBM Plex Mono, monospace" '
               'font-size="13" font-weight="600" fill="%s">%s</text>' % (px, py, P['paper'], lbl), 'a a-in d%d' % (2 + i * 2))
    s += A(stack(150, 150, O, 4, P['gold'], 11, 28), 'a a-up d9')
    s += A(plate(408, 48, 288, 106, 'FOUR CYCLES, q8 WEEKS',
                 ['7.4 GBq each', '29.6 GBq cumulative', 'counts checked before each'], P['gold']), 'a a-r d3')
    s += A(plate(20, 296, 268, 90, 'SPECT/CT AT 24 HOURS', ['on the 208 keV gamma', 'confirms where dose landed'], P['teal']), 'a a-up d10')
    return frame('s10', s, 'SCENE 10 / FOUR CYCLES, EIGHT WEEKS APART')

# ===================================================================== 11
def s11():
    O = (352, 300); s = ''
    s += floor(-160, -160, 320, 2, P['navy'], O, 9)
    def tower(x, y, pct, col, colD, label):
        h = pct * 1.9                      # one scale for both towers, so the ratio is honest
        g = cylinder(x, y, 30, 0, h, col, colD, O)
        g += disc(x, y, 30, shade(col, 1.2), h, O)
        g += ring(x, y, 30, h, P['paper'], 1.5, O, ' opacity=".7"')
        for k in range(1, int(h // 26) + 1):
            g += ring(x, y, 30, k * 26, P['paper'], 1.0, O, ' opacity=".35"')
        px, py = pt(x, y, h, O)
        ty = py - 30 * EY - 16             # clear of the cap ellipse
        g += ('<rect x="%.0f" y="%.0f" width="86" height="30" fill="%s" stroke="%s" stroke-width="1.5"/>'
              % (px - 43, ty - 21, P['cream'], P['ink']))
        g += ('<text x="%.0f" y="%.0f" text-anchor="middle" font-family="IBM Plex Mono, monospace" '
              'font-size="17" font-weight="600" fill="%s">%s</text>' % (px, ty, P['ink'], label))
        return g
    s += A(tower(-58, 58, 65.2, P['gold'], P['goldD'], '65.2%'), 'a a-up d1')
    s += A(tower(76, -76, 10.8, P['navyXL'], P['navyL'], '10.8%'), 'a a-up d3')
    s += A(figure(-6, 6, 0, O, P['rust'], P['cream'], .95)
           + figure(14, 26, 0, O, P['teal'], P['cream'], .95), 'a a-in d5')
    s += A(plate(18, 54, 236, 70, 'Lu-177 DOTATATE', ['progression-free, month 20'], P['gold']), 'a a-l d2')
    s += A(plate(470, 54, 226, 70, 'OCTREOTIDE 60 mg', ['same endpoint'], P['navyL']), 'a a-r d4')
    s += A(plate(20, 300, 210, 84, 'HAZARD RATIO', ['0.21 (0.13-0.33)'], P['gold']), 'a a-up d6')
    s += A(plate(244, 300, 210, 84, 'RESPONSE', ['18% vs 3% shrank'], P['teal']), 'a a-up d7')
    s += A(plate(468, 300, 228, 84, 'SURVIVAL', ['48.0 vs 36.3 months', 'not significant'], P['rust']), 'a a-up d8')
    return frame('s11', s, 'SCENE 11 / NETTER-1, 229 PATIENTS')

# ===================================================================== 12
def s12():
    O = (338, 196); s = ''
    s += floor(-176, -176, 352, 2, P['navy'], O, 9)
    s += contours(-176, -176, 352, O, 8)
    for i, (r, lbl) in enumerate([(40, 'baseline'), (33, 'month 3'), (25, 'month 6'), (17, 'month 12')]):
        x, y = -105 + i * 70, 105 - i * 70
        s += A(cylinder(x, y, r, 0, 12, P['plumD'], shade(P['plum'], .6), O)
               + dome(x, y, r, 12, r * .85, P['plum'], O, rim=P['plumD']), 'a a-pop d%d' % (1 + i * 2))
        px, py = pt(x, y, 12 + r * 0.85 + 16, O)
        s += A('<text x="%.0f" y="%.0f" text-anchor="middle" font-family="IBM Plex Mono, monospace" '
               'font-size="10.5" fill="%s">%s</text>' % (px, py, P['paper'], lbl), 'a a-in d%d' % (2 + i * 2))
        if i < 3:
            s += A(arrow((x + r + 8, y - r - 8, 2), (x + 58, y - 58, 2), O, P['paper'], 1.8), 'a a-in d%d' % (2 + i * 2))
    s += A(room(-238, 58, 74, 74, O, P['blush'], P['blushD'], 26)
           + box(-220, 76, 0, 17, 12, 15, P['navyL'], shade(P['navy'], .8), P['navy'], O)
           + figure(-198, 100, 0, O, P['teal'], P['cream'], .9), 'a a-l d9')
    s += A(plate(20, 292, 258, 90, 'EARLY . WEEKS', ['fatigue, nausea', 'counts dip'], P['teal']), 'a a-up d10')
    s += A(plate(292, 292, 194, 90, 'LATE . YEARS', ['~2% MDS or AML'], P['rust']), 'a a-up d11')
    s += A(plate(500, 292, 196, 90, 'SUCCESS', ['disease held still'], P['gold']), 'a a-up d12')
    return frame('s12', s, 'SCENE 12 / READING THE RESULT TAKES MONTHS')

# ===================================================================== 13
def s13():
    O = (360, 300); s = ''
    s += floor(-150, -150, 300, 2, P['navy'], O, 9)
    s += contours(-150, -150, 300, O, 9)
    hero = cylinder(0, 0, 44, 0, 8, P['navyL'], shade(P['navy'], .78), O)
    hero += glass_drum(0, 0, 32, 8, 26, O)
    hero += cylinder(0, 0, 10, 10, 16, P['gold'], P['goldD'], O)
    hero += dome(0, 0, 34, 34, 30, P['teal'], O, rim=P['tealD'])
    s += A(hero, 'a a-pop d1')
    s += A(lightcone(0, 0, 40, O, -86, -86, 52, P['paper']), 'a a-in d3')
    s += A(plate(96, 58, 528, 148, 'EDUCATIONAL MATERIAL',
                 ['This explains a mechanism. It is not medical advice, not a',
                  'treatment protocol, and not a substitute for a neuroendocrine',
                  'tumour multidisciplinary team.', '',
                  'Strosberg, NEJM 2017;376:125-135 . Lancet Oncol 2021;22:1752-63',
                  'Lutathera prescribing information . WHO 2022 classification'], P['gold'], fs=11), 'a a-up d2')
    return frame('s13', s, 'Lu-177 DOTATATE / GRADE 1, STAGE 4 NET')

ALL = [s01, s02, s03, s04, s05, s06, s07, s08, s09, s10, s11, s12, s13]
