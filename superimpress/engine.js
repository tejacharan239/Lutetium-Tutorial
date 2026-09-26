/* SuperImpress promo: motion engine.
 *
 * Every frame is a pure function of its timestamp. seek(t) recomputes the state of
 * every element from the timeline, so frames can be rendered in any order and by
 * several browsers at once. Nothing reads the wall clock and nothing uses
 * Math.random: textures, scatter and wobble all come from seeded generators.
 *
 * Scenes are sheets of paper laid on a desk. Each is registered with the time it
 * lands (fully covers the previous sheet) and how it enters; while a sheet slides
 * in, the one beneath keeps animating. Scenes also log sound events (a card landing,
 * a stamp, a pop) against the same timings, and soundtrack.py builds foley from them.
 */
(function () {
'use strict';
const SP = window.SP = {};

// ------------------------------------------------------------------ maths
function rng(seed) {                         // mulberry32
  let a = seed >>> 0;
  return function () {
    a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
const E = {
  lin: u => u,
  inQuad: u => u * u,
  outQuad: u => 1 - (1 - u) * (1 - u),
  inOutQuad: u => u < .5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2,
  inCubic: u => u * u * u,
  outCubic: u => 1 - Math.pow(1 - u, 3),
  inOutCubic: u => u < .5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2,
  outQuart: u => 1 - Math.pow(1 - u, 4),
  inOutQuart: u => u < .5 ? 8 * u * u * u * u : 1 - Math.pow(-2 * u + 2, 4) / 2,
  outExpo: u => u >= 1 ? 1 : 1 - Math.pow(2, -10 * u),
  inOutExpo: u => u <= 0 ? 0 : u >= 1 ? 1 : u < .5 ? Math.pow(2, 20 * u - 10) / 2 : (2 - Math.pow(2, -20 * u + 10)) / 2,
  outBack: u => { const c1 = 1.55, c3 = c1 + 1; return 1 + c3 * Math.pow(u - 1, 3) + c1 * Math.pow(u - 1, 2); },
  outBackSoft: u => { const c1 = .9, c3 = c1 + 1; return 1 + c3 * Math.pow(u - 1, 3) + c1 * Math.pow(u - 1, 2); },
};
function seg(t, a, b, e) {
  if (t <= a) return 0;
  if (t >= b) return 1;
  const u = (t - a) / (b - a);
  return e ? e(u) : u;
}
const lerp = (a, b, u) => a + (b - a) * u;
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const f = v => Math.round(v * 100) / 100;
const f4 = v => Math.round(v * 10000) / 10000;
/* A damped spring from 0 to 1 released at t0: it overshoots, rings once or twice and settles.
   freq is in Hz; damp is the decay rate per second. */
function spring(t, t0, freq, damp) {
  if (t <= t0) return 0;
  const x = t - t0;
  return 1 - Math.exp(-(damp || 7) * x) * Math.cos(2 * Math.PI * (freq || 2.2) * x);
}
function hash(a, b) { const x = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return x - Math.floor(x); }
function bez(p0, p1, p2, p3, u) {           // cubic Bezier point and tangent angle
  const v = 1 - u;
  const x = v * v * v * p0[0] + 3 * v * v * u * p1[0] + 3 * v * u * u * p2[0] + u * u * u * p3[0];
  const y = v * v * v * p0[1] + 3 * v * v * u * p1[1] + 3 * v * u * u * p2[1] + u * u * u * p3[1];
  const dx = 3 * v * v * (p1[0] - p0[0]) + 6 * v * u * (p2[0] - p1[0]) + 3 * u * u * (p3[0] - p2[0]);
  const dy = 3 * v * v * (p1[1] - p0[1]) + 6 * v * u * (p2[1] - p1[1]) + 3 * u * u * (p3[1] - p2[1]);
  return { x, y, a: Math.atan2(dy, dx) * 180 / Math.PI };
}
Object.assign(SP, { rng, E, seg, lerp, clamp, f, spring, hash, bez });

// ------------------------------------------------------------------ paper
/* A tileable sheet of paper: cloudy mottling from three octaves of value noise, fine
   grain, flecks, and short fibres. Dark and light marks are kept in the alpha channel
   so the one tile textures every stock, from cream to navy, without a blend mode. */
function grainTile(seed) {
  const N = 512, R = rng(seed);
  const c = document.createElement('canvas'); c.width = c.height = N;
  const g = c.getContext('2d'), img = g.createImageData(N, N), d = img.data;
  const lattice = n => { const a = new Float32Array(n * n); for (let i = 0; i < a.length; i++) a[i] = R(); return a; };
  const oct = [[lattice(4), 4, .35], [lattice(16), 16, .35], [lattice(64), 64, .3]];
  function sample(a, n, x, y) {
    const gx = x / N * n, gy = y / N * n, x0 = Math.floor(gx), y0 = Math.floor(gy);
    const fx = gx - x0, fy = gy - y0, sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
    const X0 = x0 % n, X1 = (x0 + 1) % n, Y0 = y0 % n, Y1 = (y0 + 1) % n;
    const top = a[Y0 * n + X0] + (a[Y0 * n + X1] - a[Y0 * n + X0]) * sx;
    const bot = a[Y1 * n + X0] + (a[Y1 * n + X1] - a[Y1 * n + X0]) * sx;
    return top + (bot - top) * sy;
  }
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    let m = 0;
    for (const [a, n, w] of oct) m += sample(a, n, x, y) * w;
    const v = (m - .5) * 2, i = (y * N + x) * 4, r = R(), tooth = (R() - .5) * 26;
    if (r < .0025) { d[i] = 70; d[i + 1] = 56; d[i + 2] = 44; d[i + 3] = 40 + R() * 50; continue; }
    if (r > .997) { d[i] = 255; d[i + 1] = 253; d[i + 2] = 246; d[i + 3] = 50 + R() * 40; continue; }
    const a = v * 7 + tooth;                              // faint cloud under a fine tooth
    if (a > 0) { d[i] = 70; d[i + 1] = 56; d[i + 2] = 44; d[i + 3] = clamp(a, 0, 255); }
    else { d[i] = 255; d[i + 1] = 252; d[i + 2] = 244; d[i + 3] = clamp(-a * 1.1, 0, 255); }
  }
  g.putImageData(img, 0, 0);
  for (let k = 0; k < 110; k++) {            // fibres, drawn on every wrap so the tile has no seam
    const x = R() * N, y = R() * N, len = 6 + R() * 20, ang = R() * Math.PI * 2, bend = (R() - .5) * 8;
    g.strokeStyle = R() < .6 ? 'rgba(255,253,246,.15)' : 'rgba(80,62,46,.10)';
    g.lineWidth = .5 + R() * .7;
    const x2 = x + Math.cos(ang) * len, y2 = y + Math.sin(ang) * len;
    for (const [ox, oy] of [[0, 0], [N, 0], [-N, 0], [0, N], [0, -N]]) {
      g.beginPath(); g.moveTo(x + ox, y + oy);
      g.quadraticCurveTo((x + x2) / 2 + bend + ox, (y + y2) / 2 - bend + oy, x2 + ox, y2 + oy); g.stroke();
    }
  }
  return c.toDataURL('image/png');
}
/* Rubber-stamp ink: mostly solid, thinning to bare paper in blotches, with pinholes.
   `soft` keeps only a faint unevenness and fine pinholes, for type that must stay legible. */
function inkTile(seed, soft) {
  const N = 256, R = rng(seed), n = soft ? 40 : 18;
  const c = document.createElement('canvas'); c.width = c.height = N;
  const g = c.getContext('2d'), img = g.createImageData(N, N), d = img.data;
  const a = new Float32Array(n * n); for (let i = 0; i < a.length; i++) a[i] = R();
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const gx = x / N * n, gy = y / N * n, x0 = Math.floor(gx), y0 = Math.floor(gy);
    const fx = gx - x0, fy = gy - y0, sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
    const X0 = x0 % n, X1 = (x0 + 1) % n, Y0 = y0 % n, Y1 = (y0 + 1) % n;
    const v = lerp(lerp(a[Y0 * n + X0], a[Y0 * n + X1], sx), lerp(a[Y1 * n + X0], a[Y1 * n + X1], sx), sy);
    let al = soft ? .86 + v * .14 : v < .2 ? Math.pow(v / .2, 2) * .75 : .82 + v * .18;
    if (R() < (soft ? .02 : .035)) al *= R() * .5;
    const i = (y * N + x) * 4; d[i] = d[i + 1] = d[i + 2] = 0; d[i + 3] = clamp(al * 255, 0, 255);
  }
  g.putImageData(img, 0, 0);
  return c.toDataURL('image/png');
}

// ------------------------------------------------------------------ DOM
function h(tag, cls, parent, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  if (parent) parent.appendChild(e);
  return e;
}
const PX = new Set(['left', 'top', 'right', 'bottom', 'width', 'height', 'fontSize', 'marginLeft', 'marginTop', 'borderRadius', 'padding']);
function css(e, o) { for (const k in o) e.style[k] = (typeof o[k] === 'number' && PX.has(k)) ? o[k] + 'px' : o[k]; return e; }
/* A paper piece of size w x h, positioned by its centre (or by `origin`) through transform. */
function piece(parent, w, h_, color, cls, origin) {
  const e = h('div', 'pp' + (cls ? ' ' + cls : ''), parent);
  const ox = origin ? origin[0] : .5, oy = origin ? origin[1] : .5;
  css(e, { width: w, height: h_, marginLeft: -w * ox, marginTop: -h_ * oy, backgroundColor: color || 'var(--paper)',
           transformOrigin: (ox * 100) + '% ' + (oy * 100) + '%', backgroundPosition: f(hash(w, h_) * 300) + 'px ' + f(hash(h_, w) * 300) + 'px' });
  return e;
}
/* Inline SVG wrapped in a positioned div. (w, h) is the drawing's box; it is placed by its centre. */
function svg(parent, w, h_, inner, origin, cls) {
  const d = h('div', 'svgw' + (cls ? ' ' + cls : ''), parent);
  const ox = origin ? origin[0] : .5, oy = origin ? origin[1] : .5;
  css(d, { width: w, height: h_, marginLeft: -w * ox, marginTop: -h_ * oy, transformOrigin: (ox * 100) + '% ' + (oy * 100) + '%' });
  d.innerHTML = '<svg width="' + w + '" height="' + h_ + '" viewBox="0 0 ' + w + ' ' + h_ + '">' + inner + '</svg>';
  return d;
}

// ------------------------------------------------------------------ light
/* The key light is up and to the left, so shadows fall down and to the right; the
   higher a piece is lifted off the sheet, the further and softer its shadow falls. */
const SHC = 'rgba(40,28,36,';
function shadow(z) {
  z = Math.max(0, z);
  return f(.4 + z * .22) + 'px ' + f(.9 + z * .42) + 'px ' + f(1.4 + z * .5) + 'px ' + SHC + (.26 - Math.min(.12, z * .004)).toFixed(3) + '),' +
         f(1.2 + z * .42) + 'px ' + f(3 + z * .8) + 'px ' + f(6 + z * 1.45) + 'px ' + SHC + (.12 + Math.min(.07, z * .0018)).toFixed(3) + '),' +
         'inset 0 1.5px 0 rgba(255,255,255,.42), inset 0 -1px 0 rgba(60,40,30,.06)';
}
function dshadow(z) {
  z = Math.max(0, z);
  return 'drop-shadow(' + f(.6 + z * .3) + 'px ' + f(1.3 + z * .55) + 'px ' + f(1.2 + z * .6) + 'px ' + SHC + (.30 - Math.min(.13, z * .0045)).toFixed(3) + '))';
}
/* Write a piece's state. x/y: centre in px; r: degrees; s/sx/sy: scale; rx/ry: 3D tilt with
   perspective p; z: elevation (drives the shadow; `drop` uses a filter for cut shapes); o: opacity. */
function put(e, s) {
  let tf = 'translate(' + f(s.x || 0) + 'px,' + f(s.y || 0) + 'px)';
  if (s.rx || s.ry) tf += ' perspective(' + (s.p || 1600) + 'px)' + (s.rx ? ' rotateX(' + f(s.rx) + 'deg)' : '') + (s.ry ? ' rotateY(' + f(s.ry) + 'deg)' : '');
  if (s.r) tf += ' rotate(' + f(s.r) + 'deg)';
  const k = s.s == null ? 1 : s.s, sx = k * (s.sx == null ? 1 : s.sx), sy = k * (s.sy == null ? 1 : s.sy);
  if (sx !== 1 || sy !== 1) tf += ' scale(' + f4(sx) + ',' + f4(sy) + ')';
  if (e._tf !== tf) { e.style.transform = tf; e._tf = tf; }
  const o = s.o == null ? 1 : clamp(s.o, 0, 1), vis = o > .002;
  if (e._vis !== vis) { e.style.visibility = vis ? 'visible' : 'hidden'; e._vis = vis; }
  const os = o.toFixed(3);
  if (e._o !== os) { e.style.opacity = os; e._o = os; }
  if (s.z != null && vis) {
    const sh = s.drop ? dshadow(s.z) : shadow(s.z), prop = s.drop ? 'filter' : 'boxShadow';
    if (e._sh !== sh) { e.style[prop] = sh; e._sh = sh; }
  }
}
function setText(e, s) { if (e._txt !== s) { e.textContent = s; e._txt = s; } }
function setStyle(e, k, v) { const key = '_s_' + k; if (e[key] !== v) { e.style[k] = v; e[key] = v; } }
function setAttr(e, k, v) { const key = '_a_' + k; if (e[key] !== v) { e.setAttribute(k, v); e[key] = v; } }
/* Dropped onto the desk from above: while high it is larger, displaced away from the
   frame centre, and its shadow is wide and soft; it converges and sharpens as it lands. */
function drop(t, t0, dur, x, y, r0, r1, extra) {
  const p = seg(t, t0, t0 + dur, E.inQuad), hgt = 1 - p;
  const s = 1 + .55 * hgt, dx = (x - 960) * .22 * hgt, dy = (y - 540) * .22 * hgt;
  const k = t - (t0 + dur);
  let bump = 0, rr = lerp(r0, r1, E.outCubic(p));
  if (k > 0) { bump = Math.exp(-k * 16) * Math.sin(k * 44); rr = r1 + .8 * bump; }
  return Object.assign({ x: x + dx, y: y + dy, r: rr, s: s * (1 - .02 * bump), z: 2 + 70 * hgt, o: seg(t, t0, t0 + dur * .25) }, extra || {});
}
Object.assign(SP, { h, css, piece, svg, put, shadow, dshadow, setText, setStyle, setAttr, drop, grainTile, inkTile });

// ------------------------------------------------------------------ type
/* Kinetic headline: each word rises out of its own mask, staggered. Words between stars,
   `*like this*`, get a strip of coloured paper laid behind them, swept on left to right. */
class KT {
  constructor(parent, lines, o) {
    this.o = Object.assign({ stagger: .055, dur: .6, hl: 'var(--butter)', hlAt: .5, hlDur: .4 }, o);
    this.box = h('div', 'kt ' + (o.cls || ''), parent);
    css(this.box, { left: o.x, top: o.y });
    if (o.center) { this.box.classList.add('center'); this.box.style.transform = 'translateX(-50%)'; }
    if (o.color) this.box.style.color = o.color;
    if (o.size) this.box.style.fontSize = o.size + 'px';
    this.words = []; this.hls = [];
    let open = false;
    lines.forEach(line => {
      const L = h('div', 'ln', this.box);
      line.split(' ').forEach(tok => {
        const w = h('span', 'w', L);
        let txt = tok, lit = open, close = false;
        if (txt.startsWith('*')) { txt = txt.slice(1); lit = open = true; }
        const ci = txt.indexOf('*');
        if (ci >= 0) { txt = txt.slice(0, ci) + txt.slice(ci + 1); close = true; open = false; }
        if (lit) {
          const hl = h('span', 'hl', w); hl.style.backgroundColor = this.o.hl;
          if (!close) hl.style.right = '-.4em';                // bridge the gap to the next word
          this.hls.push({ el: hl });
        }
        const mask = h('span', 'wm', w);
        h('span', 'wi', mask, txt);
        this.words.push({ el: mask.firstChild, w });
      });
    });
  }
  /* tin: when the words start to rise. tout: when they leave (optional). */
  update(t, tin, tout) {
    const o = this.o;
    this.words.forEach((w, i) => {
      const a = tin + i * o.stagger;
      let y = (1 - seg(t, a, a + o.dur, E.outCubic)) * 108;
      if (tout != null) y -= seg(t, tout + i * o.stagger * .45, tout + i * o.stagger * .45 + .42, E.inCubic) * 112;
      const tf = 'translateY(' + f(y) + '%)';
      if (w.el._tf !== tf) { w.el.style.transform = tf; w.el._tf = tf; }
    });
    this.hls.forEach((hl, j) => {
      const a = tin + o.hlAt + j * o.hlDur * .7;
      let p = seg(t, a, a + o.hlDur, E.inOutCubic);
      if (tout != null) p *= 1 - seg(t, tout, tout + .3, E.inCubic);
      const tf = 'rotate(-1.6deg) scaleX(' + f4(p) + ')';
      if (hl.el._tf !== tf) { hl.el.style.transform = tf; hl.el._tf = tf; hl.el.style.visibility = p > 0 ? 'visible' : 'hidden'; }
    });
  }
}
SP.KT = KT;

// ------------------------------------------------------------------ timeline
const SCENES = [], EVENTS = [], SHAKES = [];
let TOTAL = 0, cam = null;
SP.scene = def => SCENES.push(def);
SP.total = t => { TOTAL = t; };

/* Sound events, in global seconds; pan comes from the event's x on screen. */
function ev(t, k, o) {
  const e = Object.assign({ t: Math.round(t * 10000) / 10000, k }, o || {});
  if (e.x != null) { e.pan = f(clamp((e.x - 960) / 1100, -.85, .85)); delete e.x; }
  EVENTS.push(e);
}
function camera(t) {
  let x = Math.sin(t * .31) * 5 + Math.sin(t * .83 + 1.3) * 1.6;
  let y = Math.cos(t * .27) * 4 + Math.sin(t * .71 + .4) * 1.2;
  let r = Math.sin(t * .19 + .5) * .1;
  for (const s of SHAKES) {
    const u = t - s.t;
    if (u >= 0 && u < .7) { const a = s.a * Math.exp(-u * 8); x += a * Math.sin(u * 64); y += a * .8 * Math.cos(u * 77); r += a * .025 * Math.sin(u * 51); }
  }
  return 'translate(' + f(x) + 'px,' + f(y) + 'px) rotate(' + f4(r) + 'deg)';
}
function enter(S, t) {
  const start = S.land - (S.inDur || 0);
  const u = S.inDur ? seg(t, start, S.land, S.inEase || E.inOutCubic) : 1, v = 1 - u;
  let x = 0, y = 0, r = 0;
  if (S.enter === 'left') { x = v * 2200; r = v * 5; }
  else if (S.enter === 'right') { x = -v * 2200; r = -v * 5; }
  else if (S.enter === 'up') { y = v * 1350; r = -v * 2.5; }
  else if (S.enter === 'down') { y = -v * 1350; r = v * 3.5; }
  put(S.sheet, { x, y, r });
  // a sheet held above the stack casts a broad shadow onto it, gone the moment it lies flat
  const sh = v > 0 ? '0 0 ' + f(30 + 90 * v) + 'px ' + SHC + (Math.min(1, v * 5) * .38).toFixed(3) + ')' : 'none';
  if (S.sheet._sh !== sh) { S.sheet.style.boxShadow = sh; S.sheet._sh = sh; }
  if (S.tornEl) {
    const fl = v > 0 ? 'drop-shadow(0 -6px ' + f(10 + 30 * v) + 'px ' + SHC + (Math.min(1, v * 5) * .3).toFixed(3) + '))' : 'none';
    if (S.tornEl._sh !== fl) { S.tornEl.style.filter = fl; S.tornEl._sh = fl; }
  }
}
/* A torn top edge: the sheet's colour over a pale rim of exposed fibre. */
function tornEdge(S, color) {
  const R = rng(911), W = 2080;
  let pts = [], x = 0;
  while (x <= W) { pts.push([x, 14 + R() * 18 + Math.sin(x * .013) * 5]); x += 9 + R() * 16; }
  const d = (dy, jit) => 'M0,44 ' + pts.map(p => 'L' + f(p[0]) + ',' + f(p[1] + dy + (jit ? (R() - .5) * 4 : 0))).join(' ') + ' L' + W + ',44 Z';
  const e = h('div', 'torn', S.sheet);
  e.innerHTML = '<svg width="2080" height="44" viewBox="0 0 2080 44" preserveAspectRatio="none">' +
    '<path d="' + d(-5, true) + '" fill="#FFFDF7"/><path d="' + d(0, false) + '" fill="' + color + '"/></svg>';
  S.tornEl = e;
}

function seek(t) {
  t = clamp(t, 0, TOTAL);
  const tf = camera(t);
  if (cam._tf !== tf) { cam.style.transform = tf; cam._tf = tf; }
  for (let i = 0; i < SCENES.length; i++) {
    const S = SCENES[i], start = S.land - (S.inDur || 0), end = S.next ? S.next.land : Infinity;
    const vis = t >= start && t < end;
    if (vis !== S._vis) { S.sheet.style.display = vis ? 'block' : 'none'; S._vis = vis; }
    if (!vis) continue;
    enter(S, t);
    S.update(t - S.land, S);
  }
}

SP.boot = function () {
  const root = document.documentElement.style;
  root.setProperty('--grain', 'url(' + grainTile(2609) + ')');
  root.setProperty('--inkmask', 'url(' + inkTile(77) + ')');
  root.setProperty('--inkfine', 'url(' + inkTile(78, true) + ')');
  cam = document.getElementById('cam');
  SCENES.sort((a, b) => a.land - b.land);
  SCENES.forEach((S, i) => {
    S.next = SCENES[i + 1] || null;
    S.sheet = h('div', 'sheet', cam);
    S.sheet.style.backgroundColor = S.bg;
    S.sheet.style.zIndex = String(i + 1);
    S.sheet.style.display = 'none'; S._vis = false;
    if (S.torn) tornEdge(S, S.bg);
    S.box = h('div', 'clip', S.sheet);
    S.ct = h('div', 'ct', S.box);
    S.ev = (lt, k, o) => ev(S.land + lt, k, o);
    S.shake = (lt, a) => SHAKES.push({ t: S.land + lt, a });
    if (S.inDur) {
      S.ev(-S.inDur, 'sheet', { d: S.inDur, dir: S.enter });
      S.ev(0, 'settle', {});
    }
    S.build(S.ct, S);
  });
  EVENTS.sort((a, b) => a.t - b.t);
  window.TOTAL = TOTAL;
  window.EVENTS = EVENTS;
  window.SCENES = SCENES.map(S => ({ id: S.id, land: S.land, inDur: S.inDur || 0 }));
  window.seek = seek;
  seek(0);
  // preview in a browser: promo.html?play plays in real time; promo.html?t=12.5 holds a frame
  const q = new URLSearchParams(location.search);
  if (q.has('t')) seek(+q.get('t'));
  if (q.has('play')) {
    const t0 = performance.now() - (+q.get('play') || 0) * 1000;
    const loop = () => { seek(((performance.now() - t0) / 1000) % TOTAL); requestAnimationFrame(loop); };
    requestAnimationFrame(loop);
  }
  window.READY = true;
};
})();
