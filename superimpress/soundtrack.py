# -*- coding: utf-8 -*-
"""Synthesise the promo's soundtrack from the composition's own event log.

Nothing is sampled: music and foley are built from oscillators and filtered noise, so
there is nothing to license or download. Every sound effect lands on the instant its
event happens on screen, because the times come from the scenes (timeline.mjs exports
window.EVENTS) rather than being re-typed here.

    python3 soundtrack.py build/timeline.json build/soundtrack.wav

The score runs at 120 BPM in D major, so every sheet of paper lands on a beat:
a muted, ticking intro while job cards pile up; a breath as the stamp comes down and
the groove dropping in with it; a lighter breakdown under Autopilot; a build back into
the end card, which resolves on D.
"""
import importlib.util, json, math, os, sys
import numpy as np
from scipy.signal import lfilter
from scipy.ndimage import minimum_filter1d
from scipy.io import wavfile

HERE = os.path.dirname(os.path.abspath(__file__))
# oscillators, filters and paper foley shared with the Lu-177 reel's soundtrack
_spec = importlib.util.spec_from_file_location('paper_foley', os.path.join(HERE, '..', 'tools', 'soundtrack.py'))
PF = importlib.util.module_from_spec(_spec); _spec.loader.exec_module(PF)
SR, Bus, filt, unit, env, n_, ts, hz = PF.SR, PF.Bus, PF.filt, PF.unit, PF.env, PF.n_, PF.ts, PF.hz
noise, slap, scribble, tick, swish, tap, marimba, bass, pad, glock, shaker = (
    PF.noise, PF.slap, PF.scribble, PF.tick, PF.swish, PF.tap, PF.marimba, PF.bass, PF.pad, PF.glock, PF.shaker)

rng = np.random.default_rng(2609)
BPM = 120.0; BEAT = 60 / BPM; BAR = 4 * BEAT

def fin(x, r=.04):
    """Release: fade the last r seconds, so a voice cut off while still ringing does not click."""
    x = np.array(x, dtype=np.float64); k = min(len(x), n_(r))
    x[-k:] *= np.linspace(1, 0, k) ** 2
    return x
# the shared voices ring past the end of their buffers; give each a release
_marimba, _bass, _glock = marimba, bass, glock
marimba = lambda f, vel, dur=1.8: fin(_marimba(f, vel, dur), .25)
bass = lambda f, vel, dur=2.2: fin(_bass(f, vel, dur), .12)
glock = lambda f, vel: fin(_glock(f, vel), .2)

# ------------------------------------------------------------------ instruments
def pluck(f, vel, dur=1.2, bright=.55, decay=.9965):
    """Karplus-Strong string: a burst of noise circulating through a damped delay line."""
    n = n_(dur); N = max(2, int(round(SR / f)))
    x = np.zeros(n); x[:N] = filt(rng.standard_normal(N), 'lowpass', 1200 + 7000 * bright)
    a = np.zeros(N + 2); a[0] = 1; a[N] = a[N + 1] = -decay / 2
    y = lfilter([1.0], a, x)
    y *= np.clip((dur - ts(n)) / .05, 0, 1)
    return unit(y) * vel

def kick(vel=1.0):
    n = n_(.5); t = ts(n)
    f = 44 + 100 * np.exp(-t / .03)
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / .2)
    click = filt(noise(n), 'band', (1800, 7000)) * env(n, .003, .0002)
    return fin(unit(body + .12 * click) * vel, .08)

def clap(vel=1.0):
    n = n_(.32); t = ts(n); x = filt(noise(n), 'band', (900, 3400))
    e = sum(np.exp(-np.clip(t - d, 0, None) / .006) * (t >= d) for d in (0, .011, .023)) * np.minimum(1, t / .001)
    e = e + .55 * np.exp(-np.clip(t - .03, 0, None) / .075) * (t >= .03)
    return unit(x * e) * vel

def hat(vel, open_=False):
    n = n_(.25 if open_ else .06)
    return unit(filt(noise(n), 'highpass', 7000) * env(n, .07 if open_ else .014, .0005)) * vel

def crash(vel=1.0):
    n = n_(2.4); t = ts(n)
    x = filt(noise(n), 'highpass', 4500) * np.exp(-t / .7) + .4 * filt(noise(n), 'band', (2500, 6000)) * np.exp(-t / .25)
    return fin(unit(x) * vel, .3)

def impact(vel=1.0):
    """A low boom under the stamp: sub drop plus a dark burst."""
    n = n_(1.8); t = ts(n)
    sub = np.sin(2 * np.pi * np.cumsum(36 + 70 * np.exp(-t / .07)) / SR) * np.exp(-t / .55)
    burst = filt(noise(n), 'lowpass', 1800) * env(n, .1, .001)
    return fin(unit(sub + .45 * burst) * vel, .3)

def riser(dur, vel=1.0):
    """Noise that climbs through four bands, with a rising tone, swelling into the downbeat."""
    n = n_(dur); t = ts(n); p = t / dur; x = noise(n)
    bands = [(200, 700), (700, 2000), (2000, 5500), (5500, 12000)]
    out = np.zeros(n)
    for k, b in enumerate(bands):
        c = k / (len(bands) - 1)
        out += unit(filt(x, 'band', b)) * np.clip(1 - np.abs(p - c) * 2.6, 0, 1)
    tone = .22 * np.sin(2 * np.pi * np.cumsum(260 * 2 ** (2.2 * p)) / SR)
    return fin(unit((out + tone) * p ** 2.4) * vel, .03)

# ------------------------------------------------------------------ foley
def popf(freq):
    """A pop-up piece flicking upright: a quick upward chirp over a paper flick."""
    n = n_(.18); t = ts(n)
    f = freq * (1.55 - .55 * np.exp(-t / .018))
    tone = np.sin(2 * np.pi * np.cumsum(f) / SR) * env(n, .05, .002)
    flick = filt(noise(n), 'band', (1500, 7500)) * env(n, .01, .0004)
    return unit(.8 * tone + .35 * flick)

def flap():
    """A card turned over: two quick paper flaps."""
    n = n_(.24); out = np.zeros(n)
    for d, g in ((0, 1), (.075, .55)):
        i, m = n_(d), n_(.09)
        out[i:i + m] += filt(noise(m), 'band', (450, 4800)) * np.sin(np.pi * np.linspace(0, 1, m)) ** 2 * g
    return unit(out)

def ding(k):
    """A notification: two bell notes, rising through the chord as the tray fills."""
    a, b = [(81, 86), (83, 88), (86, 90), (88, 93)][k % 4]
    n = n_(1.8); out = np.zeros(n)
    g1 = glock(hz(a), 1.0); out[:len(g1)] += g1
    g2 = glock(hz(b), .8); i = n_(.09); out[i:i + len(g2)] += g2[:n - i]
    return unit(out)

def click():
    n = n_(.05); t = ts(n); k = tick(3400)
    return unit(np.pad(k, (0, n - len(k))) + .35 * np.sin(2 * np.pi * 950 * t) * env(n, .006, .0002))

def tear(dur=.6):
    n = n_(dur); t = ts(n)
    x = .6 * filt(noise(n), 'band', (700, 6500))
    imp = np.zeros(n); k = rng.integers(0, n, int(dur * 260)); imp[k] = rng.standard_normal(len(k)) * 3
    return unit((x + filt(imp, 'band', (1500, 8500))) * np.sin(np.pi * t / dur) ** .6)

def crinkle(dur=.42):
    n = n_(dur); imp = np.zeros(n); k = rng.integers(0, n, 70); imp[k] = rng.standard_normal(70)
    x = filt(imp, 'band', (1200, 7500)) + .25 * filt(noise(n), 'band', (700, 3000)) * env(n, dur / 3)
    return unit(x * np.sin(np.pi * ts(n) / dur))

def typing(dur):
    """Keys: short clicks at a typing rate, each with a little body."""
    n = n_(dur + .05); out = np.zeros(n); t = 0.0
    while t < dur:
        m = n_(.03); i = n_(t)
        k = filt(noise(m), 'band', (1800, 6500)) * env(m, .004, .0003) + .3 * np.sin(2 * np.pi * rng.uniform(420, 560) * ts(m)) * env(m, .008)
        out[i:i + m] += k * rng.uniform(.6, 1.0)
        t += rng.uniform(.055, .095)
    return unit(out)

def snap():
    n = n_(.3); t = ts(n)
    x = filt(noise(n), 'band', (2000, 9000)) * env(n, .004, .0002) + .45 * np.sin(2 * np.pi * 170 * t) * env(n, .03)
    x += .3 * filt(noise(n) * (rng.random(n) < .25), 'highpass', 5000) * env(n, .07)
    return unit(x)

def popper():
    """A party popper: a cork-ish pop, a paper burst, then confetti pattering down."""
    n = n_(2.0); t = ts(n); out = np.zeros(n)
    out += .9 * unit(np.sin(2 * np.pi * np.cumsum(260 + 500 * np.exp(-t / .01)) / SR) * env(n, .03, .0005))
    out += .6 * unit(filt(noise(n), 'band', (600, 5000)) * env(n, .05, .001))
    for _ in range(46):
        i = n_(.15 + rng.exponential(.45)); m = n_(.018)
        if i + m < n: out[i:i + m] += filt(noise(m), 'band', (2500, 9000)) * env(m, .004, .0003) * rng.uniform(.06, .2)
    return unit(out)

def strip():
    """A strip of paper laid down behind a word."""
    return unit(swish(.34, True) * .8 + .2 * filt(noise(n_(.34)), 'band', (3000, 8000)) * env(n_(.34), .12))

def plane(dur):
    """A paper plane passing: filtered air with a soft whistle that bends as it goes by."""
    n = n_(dur); t = ts(n); p = t / dur
    air = swish(dur, True)
    whistle = np.sin(2 * np.pi * np.cumsum(1400 * (1.25 - .5 * p)) / SR) * .06
    return unit((air + whistle) * np.sin(np.pi * p) ** 1.2)

def counter(dur):
    n = n_(dur + .05); out = np.zeros(n); t = 0.0
    while t < dur:
        k = tick(2000 + 1800 * t / dur); i = n_(t); out[i:i + len(k)] += k[:max(0, n - i)] * .8
        t += .045
    return unit(out)

# ------------------------------------------------------------------ score
CH = {'D': [62, 66, 69], 'A': [61, 64, 69], 'Bm': [62, 66, 71], 'G': [62, 67, 71]}
ROOT = {'D': 38, 'A': 33, 'Bm': 35, 'G': 31}
INTRO = ['Bm', 'G', 'A']
PROG = ['D', 'A', 'Bm', 'G']
PENTA = [74, 76, 78, 81, 83, 86, 88, 90]            # D major pentatonic, for tuned pops

def chord_at(bar):
    return INTRO[bar] if bar < 3 else PROG[(bar - 3) % 4]

def compose(total):
    m = Bus(total + 4)
    nbars = int(math.ceil(total / BAR))
    for b in range(nbars):
        t0 = b * BAR; ch = chord_at(b); arp = [x + 12 for x in CH[ch]] + [CH[ch][0] + 24]
        intro, brk, final = t0 < 6 - 1e-6, 42 <= t0 < 50 - 1e-6, t0 >= 54 - 1e-6
        if final: break
        # pad under everything; thicker under the break
        m.add(pad([hz(x) for x in CH[ch]], BAR + .9, .05 if not brk else .08), t0 - .3)
        if intro:
            # muted plucks on the chord root, opening up as the pile grows; a clock ticking every beat
            cut = 700 + 1800 * (t0 / 6)
            for k in range(8):
                x = marimba(hz(CH[ch][0] + (12 if k % 4 == 2 else 0)), .22 * (1 if k % 2 == 0 else .7))
                m.add(filt(x, 'lowpass', cut + 300 * k), t0 + k * BEAT / 2, pan=-.2 if k % 2 else .2)
            for k in range(4): m.add(tick(1500 if k % 2 else 2100), t0 + k * BEAT, .10, .3)
            if b >= 1: m.add(bass(hz(ROOT[ch] + 12), .16, 1.8), t0)
            continue
        # arpeggio, eight to the bar: marimba body, a plucked string on top for sparkle
        for k, idx in enumerate([0, 1, 2, 3, 2, 1, 2, 3]):
            tk = t0 + k * BEAT / 2 + rng.normal(0, .004)
            if tk < 6.5 - 1e-6: continue                       # the groove drops in with the stamp
            vel = (.2 if k % 2 == 0 else .15) * rng.uniform(.92, 1.06)
            x = marimba(hz(arp[idx]), vel)
            if brk: x = filt(x, 'lowpass', 2200)
            m.add(x, tk, pan=-.3 + .6 * idx / 3)
            if not brk and k % 2 == 0: m.add(pluck(hz(arp[idx] + 12), .07, .8, .6), tk + .002, pan=.35 - .7 * idx / 3)
        # bass: beat 1, the and of 2, beat 3
        for beat, L, v in ((0, 1.1, .42), (1.5, .45, .3), (2, 1.0, .36)):
            tb = t0 + beat * BEAT
            if tb >= 6.5 - 1e-6 and not (brk and beat != 0): m.add(bass(hz(ROOT[ch] + 12), v * (.7 if brk else 1), L + .4), tb)
        # drums
        if not brk:
            for beat in range(4):
                tb = t0 + beat * BEAT
                if tb < 6.5 - 1e-6: continue
                if beat in (0, 2): m.add(kick(.8), tb)
                if beat in (1, 3): m.add(clap(.42), tb, pan=.05)
                m.add(hat(.10), tb + BEAT / 2, pan=.25)
                for s in range(4): m.add(shaker(.05 if s % 2 else .025), tb + s * BEAT / 4, pan=-.35)
            if b % 4 == 3: m.add(kick(.6), t0 + 3.5 * BEAT)          # a pickup into each phrase
        else:
            for beat in range(4): m.add(hat(.07), t0 + beat * BEAT + BEAT / 2, pan=.25)
    # the stamp: a breath, then everything lands at once
    m.add(impact(.9), 6.5); m.add(crash(.35), 6.5, pan=.2)
    for k, x in enumerate([74, 78, 81, 86]): m.add(pluck(hz(x), .22, 1.8, .7), 6.5 + k * .008, pan=-.2 + .13 * k)
    for k, x in enumerate([86, 90, 93]): m.add(glock(hz(x), .16), 6.62 + k * .09, pan=.3)
    m.add(riser(1.5, .5), 4.5)
    # into the end card: claps roll, the riser climbs, the groove returns on the downbeat
    m.add(riser(1.9, .45), 48.1)
    for k in range(12): m.add(clap(.12 + .03 * k), 48.5 + k * (1 / 12) * (1.5 - .5 * k / 12), pan=.05)
    m.add(crash(.3), 50.0, pan=-.2)
    # a little tune over the end card
    for tt, x in ((50.0, 78), (50.5, 81), (51.0, 83), (51.5, 81), (52.0, 79), (52.5, 83), (53.0, 81), (53.5, 78)):
        m.add(glock(hz(x + 12), .12), tt, pan=.3)
    # resolve: a D chord that rings out under the last two seconds
    tf = 54.0
    for x in (26, 38): m.add(bass(hz(x), .42, 3.2), tf)
    for k, x in enumerate([62, 66, 69, 74, 78]): m.add(marimba(hz(x), .22, 2.5), tf + k * .06)
    for k, x in enumerate([74, 78, 81, 86]): m.add(pluck(hz(x), .16, 2.2, .6), tf + .01 + k * .05, pan=-.2 + .13 * k)
    m.add(glock(hz(90), .16), tf + .3, pan=.3)
    m.add(pad([hz(x) for x in CH['D']], 2.6, .07), tf)
    m.add(kick(.8), tf); m.add(crash(.28), tf, pan=.2)
    return m

# ------------------------------------------------------------------ foley from the event log
def foley(TL):
    fx = Bus(TL['TOTAL'] + 4)
    for e in TL['EVENTS']:
        t, k, pan, v = e['t'], e['k'], e.get('pan', 0.0), e.get('v', 1.0)
        n = e.get('n', 0)
        if k == 'land':       fx.add(slap(), t - .004, .36 * v, pan)
        elif k == 'settle':   fx.add(slap(), t - .01, .16, pan)
        elif k == 'sheet':    fx.add(swish(e['d'] + .15, True), t, .22, .3 if e.get('dir') == 'left' else -.3 if e.get('dir') == 'right' else 0)
        elif k == 'pop':      fx.add(popf(hz(PENTA[int(n) % len(PENTA)] - 12)), t, .30, pan)
        elif k == 'click':    fx.add(click(), t, .30, pan)
        elif k == 'chip':     fx.add(tap(), t, .16, pan); fx.add(tick(2600), t + .01, .10, pan)
        elif k == 'flip':     fx.add(flap(), t, .30, pan)
        elif k == 'lift':     fx.add(swish(.3, True), t, .12, pan)
        elif k == 'ding':     fx.add(ding(int(n)), t, .22, pan)
        elif k == 'scan':     fx.add(swish(e['d'], False), t, .06, pan)
        elif k == 'tear':     fx.add(tear(), t, .30, pan)
        elif k == 'stamp':
            fx.add(slap(), t - .004, .55 * max(v, .5), pan)
            fx.add(PF.thock(hz(38 if v >= 1 else 50)), t - .004, .35 * v, pan)
        elif k == 'whoosh':   fx.add(swish(e['d'] + .08, False), t, .18, pan)
        elif k == 'count':    fx.add(counter(e['d']), t, .07, pan)
        elif k == 'tick':     fx.add(tick(2400), t, .10, pan)
        elif k == 'scribble': fx.add(scribble(e['d']), t, .22, pan)
        elif k == 'fold':     fx.add(crinkle(), t, .26, pan)
        elif k == 'plane':    fx.add(plane(e['d']), t, .16 * v, pan)
        elif k == 'type':     fx.add(typing(e['d']), t, .20, pan)
        elif k == 'snap':     fx.add(snap(), t, .32, pan)
        elif k == 'confetti': fx.add(popper(), t, .34, pan)
        elif k == 'strip':    fx.add(strip(), t, .10, pan)
        else: raise ValueError('no sound for event kind %r' % k)
    return fx

def limit(L, R, reduce_db=3.0, look=.005, release=.08):
    """Look-ahead peak limiter. The loudest transients (the stamp's boom, the plug's click)
    come down by up to reduce_db, so loudness normalisation leaves true-peak headroom.
    Gain is computed on 1 ms blocks: it is already down when a peak arrives and recovers
    over `release` seconds."""
    peak = np.maximum(np.abs(L), np.abs(R)); thr = peak.max() * 10 ** (-reduce_db / 20)
    blk = n_(.001); nb = -(-len(peak) // blk)
    pk = np.pad(peak, (0, nb * blk - len(peak))).reshape(nb, blk).max(1)
    g = minimum_filter1d(np.minimum(1.0, thr / (pk + 1e-12)), size=2 * int(look / .001) + 1)
    a = 1 - math.exp(-.001 / release); s = np.empty_like(g); cur = 1.0
    for i, v in enumerate(g):
        cur = v if v < cur else cur + (v - cur) * a
        s[i] = cur
    gs = np.interp(np.arange(len(peak)), np.arange(nb) * blk + blk / 2, s)
    return L * gs, R * gs

def main():
    TL = json.load(open(sys.argv[1])); out = sys.argv[2]
    TOTAL = TL['TOTAL']; N = n_(TOTAL)
    mus, fx = compose(TOTAL), foley(TL)
    mL, mR = mus.L[:N], mus.R[:N]
    rms = math.sqrt(np.mean(mL ** 2 + mR ** 2) / 2); g = 10 ** (-20 / 20) / (rms + 1e-9)
    mL, mR = mL + .45 * filt(mL, 'highpass', 3000), mR + .45 * filt(mR, 'highpass', 3000)   # ~+3 dB of air on the music
    L = mL * g + fx.L[:N]; R = mR * g + fx.R[:N]            # music bed at -20 dBFS RMS, foley on top
    L, R = filt(L, 'highpass', 32), filt(R, 'highpass', 32)  # nothing useful lives below the kick's body
    fade = np.ones(N); k = n_(1.2); fade[-k:] = np.linspace(1, 0, k) ** 1.6
    L, R = limit(L * fade, R * fade)
    pk = max(np.abs(L).max(), np.abs(R).max())
    L, R = L / pk * .89, R / pk * .89                        # headroom only; loudnorm sets the final level
    wavfile.write(out, SR, np.stack([L, R], 1).astype(np.float32))
    print('wrote %s: %.1f s, %d Hz stereo, music gain %.1f dB' % (out, N / SR, SR, 20 * math.log10(g)))

if __name__ == '__main__':
    main()
