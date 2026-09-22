# -*- coding: utf-8 -*-
"""Synthesise the reel's soundtrack from the renderer's own event timeline.

Nothing is sampled: every sound is built here from oscillators and filtered noise,
so there is nothing to license and nothing to download. Foley lands on the exact
pose where each event becomes visible, because the timeline is read from the
browser's animation engine rather than re-derived from the CSS.

    python3 soundtrack.py timeline.json out.wav [--voice narration.wav]

With --voice, the music ducks under the narration.
"""
import json, math, sys
import numpy as np
from scipy.signal import butter, sosfilt
from scipy.io import wavfile

SR, STOP = 48000, 12
rng = np.random.default_rng(177)

def n_(t): return int(round(t * SR))
def ts(n): return np.arange(n) / SR
def hz(m): return 440.0 * 2 ** ((m - 69) / 12)
def pose(t): return math.ceil(t * STOP - 1e-9) / STOP        # first pose at or after t
def noise(n): return rng.standard_normal(n)

def filt(x, kind, f, order=2):
    sos = butter(order, list(f) if kind == 'band' else f, btype=kind, fs=SR, output='sos')
    return sosfilt(sos, x)

def unit(x):
    """Scale to a peak of 1. Gaussian noise peaks near 3x its RMS, so without this a
    5 ms click out-shouts a sine knock and the limiter flattens the whole mix to it."""
    return x / (np.abs(x).max() + 1e-12)

def env(n, tau, attack=0.002):
    e = np.exp(-ts(n) / tau)
    a = max(1, int(attack * SR)); e[:a] *= np.linspace(0, 1, a)
    return e

class Bus:
    def __init__(self, dur):
        self.L = np.zeros(n_(dur) + SR); self.R = np.zeros_like(self.L)
    def add(self, x, t, gain=1.0, pan=0.0):
        i = n_(t)
        if i < 0: x, i = x[-i:], 0
        j = min(len(self.L), i + len(x))
        if j <= i: return
        x = x[:j - i] * gain
        a = (max(-1, min(1, pan)) + 1) * math.pi / 4          # equal-power pan
        self.L[i:j] += x * math.cos(a); self.R[i:j] += x * math.sin(a)

# ------------------------------------------------------------------ foley
def thock(freq):
    """A cut-out piece landing on the board: a woody knock, tuned to the music's key."""
    n = n_(0.26); t = ts(n)
    f = freq * (1 + 0.8 * np.exp(-t / 0.010))                   # pitch drops as it hits
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * env(n, 0.07)
    body += 0.25 * np.sin(2 * np.pi * np.cumsum(f * 2.02) / SR) * env(n, 0.03)
    click = filt(noise(n), 'band', (700, 4000)) * env(n, 0.005, 0.0005)
    return unit(0.8 * body + 0.3 * click)

def slap():
    """A card stamped down onto paper."""
    n = n_(0.28)
    paper = filt(noise(n), 'band', (450, 5200)) * env(n, 0.030, 0.0008)
    thump = np.sin(2 * np.pi * 92 * ts(n)) * env(n, 0.05)
    return unit(0.75 * paper + 0.55 * thump)

def scribble(dur):
    """A pencil drawing a line across paper."""
    n = n_(dur); t = ts(n)
    x = filt(noise(n), 'band', (2000, 7500))
    strokes = 0.5 + 0.5 * np.sin(2 * np.pi * rng.uniform(11, 16) * t + rng.uniform(0, 6)) ** 2
    shape = np.minimum(1, t / 0.03) * np.clip((dur - t) / 0.09, 0, 1)
    return unit(x * strokes * shape * 0.55)

def tick(freq=2400.0):
    n = n_(0.02)
    return unit(np.sin(2 * np.pi * freq * ts(n)) * env(n, 0.004, 0.0003) + 0.25 * filt(noise(n), 'highpass', 3000) * env(n, 0.0015, 0.0002))

def plip():
    """A drop falling through the IV line."""
    n = n_(0.13); t = ts(n)
    f = 650 + 1400 * (1 - np.exp(-t / 0.018))
    return unit(np.sin(2 * np.pi * np.cumsum(f) / SR) * env(n, 0.032, 0.0008) * 0.7)

def footstep():
    n = n_(0.09)
    return unit(filt(noise(n), 'band', (140, 950)) * env(n, 0.02, 0.001))

def geiger():
    n = n_(0.005)
    return unit(filt(noise(n), 'highpass', 1400) * env(n, 0.0009, 0.0001))

def whum():
    """The dose front rippling out to the range ring."""
    n = n_(1.0); t = ts(n)
    x = 0.6 * np.sin(2 * np.pi * 68 * t) + 0.25 * np.sin(2 * np.pi * 136 * t) + 0.4 * filt(noise(n), 'lowpass', 320)
    return unit(x * np.sin(np.pi * np.minimum(1, t / 1.0)) ** 2)

def hum(dur):
    """The PET scanner running, with the detector's whir tracking its 2.2 s orbit."""
    n = n_(dur); t = ts(n)
    x = 0.5 * np.sin(2 * np.pi * 110 * t) + 0.25 * np.sin(2 * np.pi * 220 * t) + 0.1 * np.sin(2 * np.pi * 330 * t)
    x += 0.35 * filt(noise(n), 'band', (900, 1500)) * (0.5 + 0.5 * np.sin(2 * np.pi * t / 2.2))
    return unit(x * np.minimum(1, t / 0.9) * np.clip((dur - t) / 0.9, 0, 1))

def swish(dur, rising=True):
    """Paper sliding: filtered noise whose band sweeps with the motion."""
    n = n_(dur); t = ts(n); x = noise(n)
    lo, hi = filt(x, 'band', (280, 1500)), filt(x, 'band', (1500, 6500))
    p = t / dur if rising else 1 - t / dur
    return unit((lo * (1 - p) + hi * p) * np.sin(np.pi * t / dur) ** 1.4)

def tap():
    n = n_(0.018)
    return unit(filt(noise(n), 'band', (900, 6500)) * env(n, 0.0035, 0.0003))

# ------------------------------------------------------------------ instruments
def marimba(f, vel, dur=1.8):
    n = n_(dur); t = ts(n)
    x = np.sin(2 * np.pi * f * t) * np.exp(-t / 0.85)
    x += 0.32 * np.sin(2 * np.pi * f * 3.93 * t) * np.exp(-t / 0.11)
    x += 0.10 * np.sin(2 * np.pi * f * 9.2 * t) * np.exp(-t / 0.028)
    return x * np.minimum(1, t / 0.003) * vel

def bass(f, vel, dur=2.2):
    n = n_(dur); t = ts(n)
    x = np.sin(2 * np.pi * f * t) + 0.35 * np.sin(2 * np.pi * 2 * f * t) + 0.12 * np.sin(2 * np.pi * 3 * f * t)
    return x * np.exp(-t / 1.0) * np.minimum(1, t / 0.012) * vel

def pad(fs, dur, vel):
    n = n_(dur); t = ts(n)
    x = sum(np.sin(2 * np.pi * f * t + 0.6 * np.sin(2 * np.pi * (0.21 + 0.07 * k) * t)) for k, f in enumerate(fs))
    return filt(x, 'lowpass', 1600) * np.minimum(1, t / 0.9) * np.clip((dur - t) / 0.9, 0, 1) * vel

def glock(f, vel):
    n = n_(1.6); t = ts(n)
    x = np.sin(2 * np.pi * f * t) * np.exp(-t / 0.55) + 0.28 * np.sin(2 * np.pi * f * 2.76 * t) * np.exp(-t / 0.12)
    return x * np.minimum(1, t / 0.001) * vel

def shaker(vel):
    n = n_(0.07)
    return filt(noise(n), 'band', (5000, 11500)) * env(n, 0.014, 0.005) * vel

# ------------------------------------------------------------------ score
BPM = 100.0; BEAT = 60 / BPM; BAR = 4 * BEAT
F, C, Dm, Bb = 'F', 'C', 'Dm', 'Bb'
ARP  = {F: [65, 69, 72, 77], C: [64, 67, 72, 76], Dm: [65, 69, 74, 77], Bb: [65, 70, 74, 77]}
BASS = {F: 53, C: 48, Dm: 50, Bb: 46}
PAD  = {F: [53, 57, 60], C: [48, 52, 55], Dm: [50, 53, 57], Bb: [46, 50, 53]}
PENTA = [53, 55, 57, 60, 62, 65, 67, 69]               # F major pentatonic, for tuned foley

def compose(total, OFF):
    """A gentle, plucky score whose sections follow the story."""
    mus = Bus(total + 4)
    def section(t):
        s = max(k for k in range(len(OFF)) if OFF[k] <= t + 1e-9)
        return s
    nbars = int(math.ceil((total - 4.5) / BAR))
    for b in range(nbars):
        t0 = b * BAR; s = section(t0)
        minor = s in (7, 8)                                 # the radiation scenes lean minor
        prog = [Dm, Bb, F, C] if minor else [F, C, Dm, Bb]
        ch = prog[(b // 2) % 4]
        intro = t0 < OFF[1] - 1e-6
        # rolling arpeggio, eight to the bar
        for k, idx in enumerate([0, 2, 1, 2, 3, 2, 1, 2]):
            if intro and b == 0 and k < 2: continue
            vel = (0.20 if minor else 0.26) * (1.0 if k % 2 == 0 else 0.78) * rng.uniform(0.9, 1.08)
            if minor and k % 2: continue                    # thinner texture under the radiation scenes
            mus.add(marimba(hz(ARP[ch][idx]), vel), t0 + k * BEAT / 2 + rng.normal(0, 0.005), pan=-0.25 + 0.5 * (idx / 3))
        if not intro or b >= 1:
            for beat in (0, 2):
                mus.add(bass(hz(BASS[ch]), 0.30), t0 + beat * BEAT)
        mus.add(pad([hz(m) for m in PAD[ch]], BAR + 0.9, 0.055), t0 - 0.3)
        if s in (1, 2, 3, 4, 5, 6, 9, 10) and not minor:
            for e in range(8):
                mus.add(shaker(0.05 if e % 2 else 0.025), t0 + e * BEAT / 2 + BEAT / 4, pan=0.35)
        if s in (4, 5, 6, 9, 10):                           # a glockenspiel line where the story builds
            top = [m + 12 for m in ARP[ch]]
            mus.add(glock(hz(top[(b + 1) % 4]), 0.09), t0, pan=0.3)
            if b % 2: mus.add(glock(hz(top[(b + 3) % 4]), 0.07), t0 + 2.5 * BEAT, pan=0.3)
    # resolve: a final F chord that rings out under the end card
    tf = nbars * BAR
    for m in (41, 53): mus.add(bass(hz(m), 0.32, 4.5), tf)
    for k, m in enumerate([65, 69, 72, 77, 81]): mus.add(marimba(hz(m), 0.22, 3.0), tf + k * 0.07)
    mus.add(glock(hz(89), 0.10), tf + 0.4, pan=0.3)
    mus.add(pad([hz(m) for m in PAD[F]], 5.0, 0.06), tf)
    return mus

# ------------------------------------------------------------------ foley from the timeline
def foley(TL):
    OFF, TOTAL, ENTER = TL['OFF'], TL['TOTAL'], TL['ENTER']
    fx = Bus(TOTAL + 4)
    placed = []                                            # merge near-simultaneous hits
    def once(kind, t, win=0.035):
        for (k, u) in placed:
            if k == kind and abs(u - t) < win: return False
        placed.append((kind, t)); return True

    for i, sc in enumerate(TL['scenes']):
        base = OFF[i] + ENTER
        end = (OFF[i + 1] if i + 1 < len(OFF) else TOTAL) - 0.5
        drops = sorted([e for e in sc['ev'] if e['name'] == 'dropIn'], key=lambda e: e['delay'])
        for k, e in enumerate(drops):
            t = pose(base + e['delay'] + 0.46 * e['dur'])
            if t < end and once('drop', t):
                fx.add(thock(hz(PENTA[k % len(PENTA)])), t + rng.normal(0, 0.004), 0.50, e['pan'] * 0.7)
        for e in sc['ev']:
            nm = e['name']
            if nm == 'stamp':
                t = pose(base + e['delay'] + 0.48 * e['dur'])
                if t < end and once('stamp', t): fx.add(slap(), t, 0.42, e['pan'] * 0.75)
            elif nm == 'drawOn':
                t = pose(base + e['delay'])
                if t < end: fx.add(scribble(e['dur']), t, 0.16, e['pan'] * 0.6)
            elif nm in ('slideL', 'slideR'):
                t = pose(base + e['delay'])
                if t < end and once('slide', t, 0.2): fx.add(swish(0.7, nm == 'slideR'), t, 0.12, -0.6 if nm == 'slideL' else 0.6)
            elif nm == 'growUp':                           # a ratchet click per pose, rising with the bar
                t0 = base + e['delay']; p = 0
                while p * (1 / STOP) < e['dur']:
                    q = p / STOP / e['dur']; prog = 1 - (1 - q) ** 3
                    if q < 0.9: fx.add(tick(700 + 1100 * prog), pose(t0) + p / STOP, 0.16, e['pan'] * 0.6)
                    p += 1
            elif nm == 'walkIn':
                t0 = pose(base + e['delay'])
                for s in range(int(e['dur'] * 3)):
                    fx.add(footstep(), t0 + s / 3.0, 0.20, e['pan'] * 0.6 + (0.06 if s % 2 else -0.06))
            elif nm == 'drip':                             # a plip each time a drop reaches the bottom
                per = e['dur']; ph = -e['delay']
                q = e['vis']
                while base + q < end:
                    if ((q + ph) % per) > per - 1 / STOP:
                        fx.add(plip(), base + q, 0.22, e['pan'])
                        q += per - 0.2
                    q += 1 / STOP
            elif nm == 'flowOut':                          # a Geiger click as each particle leaves the core
                per = e['dur']; ph = -e['delay']
                q = e['vis'] + ((per - (e['vis'] + ph) % per) % per)
                while base + q < end:
                    fx.add(geiger(), base + q, 0.20, e['pan'] * 0.8)
                    q += per
            elif nm == 'wave':
                q = e['vis']
                while base + q < end:
                    fx.add(whum(), base + q, 0.20); q += e['dur']
            elif nm == 'spin':
                t0 = base + e['vis']; fx.add(hum(end - t0), t0, 0.06, -0.3)
        # background counts between the synced clicks, in the radiation scenes only
        if any(e['name'] == 'flowOut' for e in sc['ev']):
            t = base + min(e['vis'] for e in sc['ev'] if e['name'] == 'flowOut')
            while t < end:
                t += rng.exponential(1 / 1.5)
                fx.add(geiger(), t, rng.uniform(0.07, 0.14), rng.uniform(-0.8, 0.8))
        for c in sc['counters']:                           # the figures tick as they count
            q = c['t0']
            while q < c['t1'] - 1e-6:
                fx.add(tick(2200 + 900 * (q - c['t0']) / (c['t1'] - c['t0'])), pose(base + q), 0.08, 0.1)
                q += 1 / STOP

    # the tile sweep between scenes: a riffle of cards, panned with the lattice
    tiles = []
    for r in range(-1, 23):
        for c in range(-1, 13):
            cx, cy = c * 160 + (80 if r & 1 else 0), r * 46
            if -80 < cx < 2000 and -46 < cy < 1030:
                tiles.append((cx, 0.28 * min(1, max(0, (cx / 1920) * 0.62 + (cy / 984) * 0.38))))
    def sweep(b, cover):
        for (cx, d) in tiles:
            t = (b - 0.5 + d + 0.2) if cover else (b + d)
            fx.add(tap(), t + rng.normal(0, 0.03), 0.030 if cover else 0.018, (cx / 1920) * 2 - 1)
        fx.add(swish(0.55, cover), b - 0.5 if cover else b, 0.16 if cover else 0.10)
    sweep(0.0, False)
    for b in OFF[1:]: sweep(b, True); sweep(b, False)
    sweep(TOTAL, True)
    return fx

def main():
    TL = json.load(open(sys.argv[1])); out = sys.argv[2]
    voice = sys.argv[sys.argv.index('--voice') + 1] if '--voice' in sys.argv else None
    TOTAL = TL['TOTAL']
    mus, fx = compose(TOTAL, TL['OFF']), foley(TL)
    N = n_(TOTAL)
    mL, mR = mus.L[:N], mus.R[:N]
    m_rms = math.sqrt(np.mean(mL ** 2 + mR ** 2) / 2); g = 10 ** (-24 / 20) / (m_rms + 1e-9)
    mL, mR = mL * g, mR * g                                # music bed sits at -24 dBFS RMS
    vL = vR = 0
    if voice:
        sr, v = wavfile.read(voice); v = v.astype(np.float64)
        if v.ndim > 1: v = v.mean(axis=1)
        v = v / (np.abs(v).max() + 1e-9) * 0.5
        v = np.pad(v, (0, max(0, N - len(v))))[:N]
        # duck the music by 9 dB wherever the voice is present
        lvl = filt(np.abs(v), 'lowpass', 6)
        duck = 1 - (1 - 10 ** (-9 / 20)) * np.clip(lvl / 0.02, 0, 1)
        mL, mR, vL, vR = mL * duck, mR * duck, v, v
    L = mL + fx.L[:N] + vL; R = mR + fx.R[:N] + vR
    # fade the tail, then a gentle limiter so nothing clips before loudness normalisation
    fade = np.ones(N); k = n_(1.8); fade[-k:] = np.linspace(1, 0, k) ** 1.5
    L, R = L * fade, R * fade
    pk = max(np.abs(L).max(), np.abs(R).max())
    L, R = L / pk * 0.89, R / pk * 0.89                   # headroom only; loudnorm sets the final level
    wavfile.write(out, SR, np.stack([L, R], 1).astype(np.float32))
    print('wrote %s: %.1f s, %d Hz stereo' % (out, N / SR, SR))

if __name__ == '__main__':
    main()
