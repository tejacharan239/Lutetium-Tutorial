/* SuperImpress promo: the paper props shared by the scenes. Each builder returns
   DOM built at a base size; scenes place, scale and animate it with SP.put. */
(function () {
'use strict';
const { h, css, piece, svg, put, seg, lerp, E, setText, setAttr, f } = SP;

/* Fictional employers for the mock interface. None of them is a real company, so the
   promo never implies that a real employer lists with, or endorses, SuperImpress. */
const CO = {
  kitebird: { name: 'Kitebird', color: '#EE6F4E', mark: 'kite',  role: 'Product Designer',     where: 'Remote · Europe' },
  quillon:  { name: 'Quillon',  color: '#8A72DC', mark: 'quill', role: 'Senior UX Researcher', where: 'Remote' },
  harborly: { name: 'Harborly', color: '#3D57A6', mark: 'sun',   role: 'Frontend Engineer',    where: 'Berlin · On-site' },
  fernwood: { name: 'Fernwood', color: '#2F9B70', mark: 'leaf',  role: 'Data Analyst',         where: 'London · Hybrid' },
  tallwave: { name: 'Tallwave', color: '#F0AE2A', mark: 'wave',  role: 'Growth Marketer',      where: 'Amsterdam' },
  oakmint:  { name: 'Oakmint',  color: '#2B9DB3', mark: 'ring',  role: 'Staff Engineer',       where: 'Toronto · Hybrid' },
};

function markSVG(kind, fill) {
  const F = fill || '#FCFAF4', S = 'rgba(30,20,40,.16)';
  switch (kind) {
    case 'kite':  return '<path d="M50 13 L79 45 L50 87 L21 45 Z" fill="' + F + '"/><path d="M50 13 L50 87 M21 45 L79 45" stroke="' + S + '" stroke-width="4"/>';
    case 'quill': return '<path d="M27 80 C33 52 52 30 80 19 C76 45 57 67 27 80 Z" fill="' + F + '"/><path d="M22 86 L58 44" stroke="' + S + '" stroke-width="4" stroke-linecap="round"/>';
    case 'sun':   return '<path d="M19 60 A31 31 0 0 1 81 60 Z" fill="' + F + '"/><path d="M15 73 q8.75 -8 17.5 0 t17.5 0 t17.5 0 t17.5 0" fill="none" stroke="' + F + '" stroke-width="6" stroke-linecap="round"/>';
    case 'leaf':  return '<path d="M24 76 C22 42 46 22 78 22 C80 54 58 78 24 76 Z" fill="' + F + '"/><path d="M28 72 L64 36" stroke="' + S + '" stroke-width="4" stroke-linecap="round"/>';
    case 'wave':  return '<path d="M14 42 q9 -13 18 0 t18 0 t18 0 t18 0" fill="none" stroke="' + F + '" stroke-width="9" stroke-linecap="round"/><path d="M14 64 q9 -13 18 0 t18 0 t18 0 t18 0" fill="none" stroke="' + F + '" stroke-width="9" stroke-linecap="round"/>';
    default:      return '<circle cx="50" cy="50" r="23" fill="none" stroke="' + F + '" stroke-width="12"/>';
  }
}
function logo(parent, co, size, x, y) {
  const e = h('div', 'logo', parent);
  css(e, { width: size, height: size, left: x, top: y, backgroundColor: co.color });
  e.innerHTML = '<svg viewBox="0 0 100 100">' + markSVG(co.mark) + '</svg>';
  return e;
}
/* A zero-size anchor; children with .ctr centre on it. */
function anchor(parent) { const a = h('div', 'abs', parent); a.style.width = a.style.height = '0'; return a; }
function centred(parent, cls, text) {
  const a = anchor(parent), e = h('div', cls, a, text);
  e.style.position = 'absolute'; e.style.left = '0'; e.style.top = '0'; e.style.transform = 'translate(-50%,-50%)';
  return { a, e };
}

/* A job listing printed on card stock, 440 x 280 at scale 1. */
function jobCard(parent, co, o) {
  o = Object.assign({ w: 440, h: 280, posted: null, apply: false, dial: null }, o);
  const H = o.apply ? 340 : o.h;
  const el = piece(parent, o.w, H, 'var(--paper)', 'jc');
  el.style.borderRadius = '16px';
  logo(el, co, 66, 28, 28);
  const t = h('div', 't', el, co.role); css(t, { left: 112, top: 29, fontSize: co.role.length > 17 ? 23 : 27 });
  const s = h('div', 's', el, co.name + ' · ' + co.where); css(s, { left: 112, top: 66, fontSize: 18 });
  [[128, 330], [154, 262], [180, 298]].forEach(([y, w]) => css(h('div', 'bar', el), { left: 28, top: y, width: w }));
  if (o.posted) {
    const c = h('div', 'chip', el);
    css(c, { left: 28, top: 214, height: 38, padding: '0 16px', fontSize: 17, backgroundColor: '#FBE9B9', color: '#6D5418', transform: 'none' });
    c.innerHTML = '<svg width="18" height="18" viewBox="0 0 20 20"><circle cx="10" cy="10" r="8" fill="none" stroke="#6D5418" stroke-width="2.2"/><path d="M10 5.5 V10 L13 12" fill="none" stroke="#6D5418" stroke-width="2.2" stroke-linecap="round"/></svg>' + o.posted;
  }
  let btn = null;
  if (o.apply) {
    btn = h('div', 'pp', el);
    css(btn, { left: 28, top: 262, width: o.w - 56, height: 56, borderRadius: 14, backgroundColor: 'var(--ink)', color: '#FCFAF4',
               fontFamily: 'var(--f-ui)', fontWeight: 700, fontSize: 21, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', transformOrigin: '50% 50%' });
    btn.innerHTML = 'Apply on ' + co.name + '’s site <svg width="18" height="18" viewBox="0 0 20 20"><path d="M6 14 L14 6 M7 6 H14 V13" fill="none" stroke="#FCFAF4" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  }
  let dial = null;
  if (o.dial) {
    const r = 30, c = 2 * Math.PI * r;
    const d = svg(el, 84, 84, '<circle cx="42" cy="42" r="' + r + '" fill="#FCFAF4" stroke="#ECE5D6" stroke-width="9"/>' +
      '<circle class="arc" cx="42" cy="42" r="' + r + '" fill="none" stroke="' + o.dial + '" stroke-width="9" stroke-linecap="round" transform="rotate(-90 42 42)" stroke-dasharray="' + f(c) + '" stroke-dashoffset="' + f(c) + '"/>' +
      '<text x="42" y="51" text-anchor="middle" font-family="DM Sans" font-weight="800" font-size="25" fill="#1F2542">0</text>');
    css(d, { left: o.w - 104, top: 178, marginLeft: 0, marginTop: 0 });
    dial = { el: d, arc: d.querySelector('.arc'), txt: d.querySelector('text'), c };
  }
  const dim = h('div', 'abs', null);
  css(dim, { left: 0, top: 0, width: o.w, height: H, borderRadius: 16, background: '#161A33', opacity: 0, zIndex: 5 });
  return { el, co, btn, dial, dim, w: o.w, h: H, shade() { el.appendChild(dim); return dim; } };
}
function setDial(d, v) { setAttr(d.arc, 'stroke-dashoffset', String(f(d.c * (1 - v / 100)))); setText(d.txt, String(Math.round(v))); }

/* A compact listing, as it appears in the "new for you" tray: 360 x 96. */
function jobRow(parent, co, ago) {
  const el = piece(parent, 360, 96, 'var(--paper)', 'jc');
  el.style.borderRadius = '14px';
  logo(el, co, 54, 20, 21);
  const t = h('div', 't', el, co.role); css(t, { left: 90, top: 20, fontSize: co.role.length > 17 ? 19 : 21 });
  const s = h('div', 's', el, co.name); css(s, { left: 90, top: 51, fontSize: 16 });
  const c = h('div', 'chip', el, ago);
  css(c, { right: 16, left: 'auto', top: 52, height: 28, padding: '0 11px', fontSize: 14, backgroundColor: '#FBE9B9', color: '#6D5418' });
  return el;
}

/* A browser window cut from card: title strip, three dots, a title pill, and a body. */
function browser(parent, w, h_, title) {
  const el = piece(parent, w, h_, 'var(--paper)', 'win');
  h('div', 'bar0', el);
  ['#F08A6E', '#F3C35B', '#7CC49A'].forEach((c, i) => css(h('div', 'dot', el), { left: 24 + i * 24, backgroundColor: c }));
  const url = h('div', 'url', el, title); css(url, { left: 110 });
  const body = h('div', 'abs', el); css(body, { left: 0, top: 58, width: w, height: h_ - 58 });
  return { el, url, body };
}

/* The pointer, cut from paper: its origin is the tip. */
function cursor(parent) {
  const el = svg(parent, 56, 68,
    '<path d="M9 5 L9 52 L21 41 L30 60 L39 56 L30 37 L47 37 Z" fill="#FCFAF4" stroke="#1F2542" stroke-width="4" stroke-linejoin="round"/>', [9 / 56, 5 / 68]);
  return el;
}
/* Where the pointer is at t, moving through [t, x, y] keys in slight arcs, as a hand does. */
function along(t, keys) {
  if (t <= keys[0][0]) return { x: keys[0][1], y: keys[0][2] };
  for (let i = 0; i < keys.length - 1; i++) {
    const [t0, x0, y0] = keys[i], [t1, x1, y1] = keys[i + 1];
    if (t <= t1) {
      const u = E.inOutCubic((t - t0) / (t1 - t0)), dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy) || 1;
      const arc = Math.sin(u * Math.PI) * L * .08;
      return { x: lerp(x0, x1, u) - dy / L * arc, y: lerp(y0, y1, u) + dx / L * arc };
    }
  }
  const k = keys[keys.length - 1];
  return { x: k[1], y: k[2] };
}
function pressAt(t, clicks) {
  let p = 0;
  for (const c of clicks) { const u = t - c + .07; if (u > 0 && u < .22) p = Math.max(p, Math.sin(Math.PI * u / .22)); }
  return p;
}
/* A pointer with click ripples. keys: [[t, x, y], ...]; clicks: [t, ...]. */
function pointer(parent, keys, clicks, show) {
  const rings = clicks.map(() => {
    const r = h('div', 'abs', parent);
    css(r, { width: 70, height: 70, marginLeft: -35, marginTop: -35, borderRadius: '50%', border: '5px solid var(--ver)', boxSizing: 'border-box' });
    return r;
  });
  const el = cursor(parent);
  return {
    el,
    update(t) {
      const p = along(t, keys), pr = pressAt(t, clicks);
      const o = show ? show(t) : 1;
      put(el, { x: p.x, y: p.y, s: 1 - .16 * pr, z: 16 - 12 * pr, drop: true, o });
      clicks.forEach((c, i) => {
        const u = (t - c) / .5, at = along(c, keys);
        put(rings[i], { x: at.x, y: at.y, s: .25 + 1.25 * E.outCubic(seg(u, 0, 1)), o: u > 0 && u < 1 ? (1 - u) * .9 : 0 });
      });
    },
  };
}

/* A paper plane pointing right; origin at its centre of gravity. */
function plane(parent, c) {
  c = c || ['#FCFAF4', '#E4DACA', '#CDBFA8'];
  return svg(parent, 124, 72,
    '<polygon points="4,24 122,33 42,41" fill="' + c[0] + '"/>' +
    '<polygon points="42,41 122,33 30,64" fill="' + c[1] + '"/>' +
    '<polygon points="42,41 122,33 52,51" fill="' + c[2] + '"/>', [.45, .5]);
}
/* A flight along a cubic Bezier with a dashed pencil trail behind it. */
function flight(parent, pts, color) {
  const trail = svg(parent, 1920, 1080, '<path d="" fill="none" stroke="' + (color || 'rgba(31,37,66,.45)') + '" stroke-width="3.2" stroke-dasharray="3 13" stroke-linecap="round"/>', [0, 0]);
  const path = trail.querySelector('path');
  return {
    trail, path,
    at(u) { return SP.bez(pts[0], pts[1], pts[2], pts[3], u); },
    /* The trail runs `len` behind the plane; once the plane is through (`gone` 0..1), the tail reels in. */
    follow(u, len, gone) { this.draw(Math.min(u, Math.max(0, u - len) + len * (gone || 0)), u); },
    draw(u0, u1) {
      if (u1 <= u0) { setAttr(path, 'd', ''); return; }
      let d = '';
      for (let k = 0; k <= 48; k++) { const p = this.at(lerp(u0, u1, k / 48)); d += (k ? 'L' : 'M') + f(p.x) + ',' + f(p.y); }
      setAttr(path, 'd', d);
    },
  };
}

/* An ink stamp impression; its colour is the ink. */
function stampMark(parent, text, color, size) {
  const c = centred(parent, 'stamp', text);
  css(c.e, { color, fontSize: size });
  return c.a;
}

/* A hand-drawn loop in pencil, drawn on from 0 to 1. */
function scribble(parent, cx, cy, rx, ry, color, seed, width) {
  const R = SP.rng(seed || 5);
  let d = '';
  const n = 64, turns = 1.12;
  for (let i = 0; i <= n; i++) {
    const a = -2.2 + i / n * Math.PI * 2 * turns, wob = 1 + (R() - .5) * .035 + .03 * Math.sin(i * .4);
    d += (i ? 'L' : 'M') + f(cx + Math.cos(a) * rx * wob) + ',' + f(cy + Math.sin(a) * ry * wob);
  }
  const e = svg(parent, 1920, 1080, '<path d="' + d + '" pathLength="1" fill="none" stroke="' + color + '" stroke-width="' + (width || 5) + '" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="1 1" stroke-dashoffset="1"/>', [0, 0]);
  const p = e.querySelector('path');
  return { el: e, set(u) { setAttr(p, 'stroke-dashoffset', String(f(1 - u))); } };
}

/* Confetti: cut paper bits thrown from a point, falling and fluttering. */
function confetti(parent, n, seed, colors) {
  const R = SP.rng(seed), bits = [];
  for (let i = 0; i < n; i++) {
    const w = 10 + R() * 14, hh = R() < .4 ? w : 6 + R() * 8;
    const e = piece(parent, w, hh, colors[i % colors.length]);
    e.style.borderRadius = R() < .3 ? '50%' : '2px';
    const ang = -Math.PI / 2 + (R() - .5) * 2.4, sp = 520 + R() * 700;
    bits.push({ e, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, spin: (R() - .5) * 900, ph: R() * 6, fl: 3 + R() * 5 });
  }
  return {
    update(t, t0, x, y) {
      for (const b of bits) {
        const u = t - t0;
        if (u < 0 || u > 2.6) { put(b.e, { o: 0 }); continue; }
        const drag = 1 - Math.exp(-u * 2.2);                    // air brakes the throw, then gravity wins
        const px = x + b.vx / 2.2 * drag + Math.sin(u * b.fl + b.ph) * 18;
        const py = y + b.vy / 2.2 * drag + 380 * u * u * .5 + 60 * u;
        put(b.e, { x: px, y: py, r: b.spin * u, sx: Math.cos(u * b.fl * 2 + b.ph), z: 14, o: 1 - seg(u, 2.0, 2.6) });
      }
    },
  };
}

Object.assign(SP, { CO, logo, anchor, centred, jobCard, setDial, jobRow, browser, pointer, along, plane, flight, stampMark, scribble, confetti, markSVG });
})();
