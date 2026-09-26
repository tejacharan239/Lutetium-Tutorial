/* SuperImpress promo: the eight scenes.
 *
 * Times are local to each scene: 0 is the moment its sheet lies flat on the desk
 * (negative while it is still sliding in). Global landing times sit on the music's
 * beat grid at 120 BPM, so every sheet lands on a beat.
 *
 * Copy follows superimpress.com: you pick companies; it reads their careers pages
 * every day; each new job gets Strong / Stretch / Skip, a score out of 100 and the
 * reasons; you choose and apply on the company's own page (it never applies for you);
 * Autopilot writes a resume, cover letter or message when asked; Claude or another
 * AI assistant can be connected with no credits; free to start, no card needed.
 */
(function () {
'use strict';
const { h, css, piece, svg, put, seg, lerp, clamp, E, spring, rng, hash, drop, setText, setStyle, KT, f,
        CO, logo, anchor, centred, jobCard, setDial, jobRow, browser, pointer, plane, flight, stampMark, scribble, confetti } = SP;

SP.total(56);

/* A small mono label with a swatch of coloured paper, sliding in from the left. */
function tag(ct, text, swatch, x, y, color) {
  const e = h('div', 'tag', ct);
  e.innerHTML = '<i style="background-color:' + swatch + '"></i>' + text;
  if (color) e.style.color = color;
  return { e, update(t, tin, tout) {
    const p = seg(t, tin, tin + .5, E.outCubic), q = tout != null ? seg(t, tout, tout + .3, E.inCubic) : 0;
    put(e, { x: x - 24 * (1 - p), y, o: p * (1 - q) });
  } };
}
/* Content drifts toward the viewer across a scene: the camera leaning in. */
function push(S, lt, amount, dur) {
  const k = 1 + amount * E.inOutQuad(clamp(lt / dur, 0, 1));
  const tf = 'scale(' + k.toFixed(4) + ')';
  if (S.box._tf !== tf) { S.box.style.transform = tf; S.box._tf = tf; }
}
/* Tossed onto the heap from above the frame: it falls in, spinning a little, and slaps down. */
function toss(t, t0, dur, x, y, r0, r1, sx) {
  const p = seg(t, t0, t0 + dur, E.inQuad), k = t - (t0 + dur);
  let bump = 0, r = lerp(r0, r1, E.outCubic(p));
  if (k > 0) { bump = Math.exp(-k * 16) * Math.sin(k * 44); r = r1 + .8 * bump; }
  return { x: lerp(sx, x, E.outQuad(p)), y: lerp(-260, y, p), r, s: (1 + .3 * (1 - p)) * (1 - .02 * bump), z: 2 + 60 * (1 - p), o: t > t0 ? 1 : 0 };
}
const pop = (t, t0, freq, damp) => ({ s: spring(t, t0, freq || 2.3, damp || 8), o: seg(t, t0, t0 + .06) });

// ======================================================================== 1. the pile
SP.scene({
  id: 'pile', land: 0, bg: '#E7DECB',
  build(ct, S) {
    const R = rng(101), cos = [CO.kitebird, CO.fernwood, CO.harborly, CO.tallwave, CO.quillon, CO.oakmint];
    const ago = ['1h ago', '3h ago', '20m ago', '5h ago', '2h ago', '8h ago', '1d ago'];
    S.cards = [];
    const N = 30;
    for (let i = 0; i < N; i++) {
      const c = jobCard(ct, cos[(i * 5 + 2) % cos.length], { posted: ago[i % ago.length] });
      // four are already down when the film opens; the rest land faster and faster
      const tl = i < 4 ? -1.2 + i * .25 : .3 + 4.5 * Math.pow((i - 4) / (N - 5), .74), u = i / (N - 1);
      let px, py;
      do {                                                         // a heap right of the headline, spreading as it grows
        const a = R() * Math.PI * 2, rad = Math.sqrt(R()) * (120 + 300 * u);
        px = 1395 + Math.cos(a) * rad * 1.15; py = 560 + Math.sin(a) * rad * .9;
      } while (px < 1110 || px > 1700 || py < 250 || py > 860);
      S.cards.push({ el: c.el, tl, px, py, r0: (R() - .5) * 80, r1: (R() - .5) * 38, dur: .42 + R() * .1, s: .74 + R() * .06, sx: px + (R() - .3) * 360 });
      const v = .5 + .35 * R();
      if (tl > 0) S.ev(tl, 'land', { x: px, v });
    }
    // a counter sticker, stuck on top of the heap
    S.ctr = piece(ct, 300, 118, 'var(--ver)');
    S.ctr.style.borderRadius = '18px';
    css(S.ctr, { color: '#FCFAF4', fontFamily: 'var(--f-ui)', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 30px', boxSizing: 'border-box' });
    S.num = h('div', null, S.ctr, '0'); css(S.num, { fontWeight: 800, fontSize: 52, lineHeight: '1', letterSpacing: '-.02em' });
    css(h('div', null, S.ctr, 'new listings today'), { fontWeight: 600, fontSize: 21, opacity: .9, marginTop: 6 });
    S.ev(3.8, 'strip', { x: 400 });
    S.a = new KT(ct, ['Hundreds of', 'new jobs.', 'Every single day.'], { x: 140, y: 372, cls: 'h1' });
    S.b = new KT(ct, ['Which ones', 'are *worth*', 'applying to?'], { x: 140, y: 372, cls: 'h1', hlAt: .75 });
  },
  update(lt, S) {
    push(S, lt, .05, 6);
    for (const c of S.cards) { const d = toss(lt, c.tl - c.dur, c.dur, c.px, c.py, c.r0, c.r1, c.sx); d.s *= c.s; put(c.el, d); }
    put(S.ctr, { x: 1640, y: 180, r: 5, z: 10 });
    setText(S.num, Math.round(lerp(214, 847, E.outCubic(seg(lt, .3, 4.9)))).toLocaleString('en-US'));
    S.a.update(lt, .05, 2.75);
    S.b.update(lt, 3.05);
  },
});

// ======================================================================== 2. the impression
SP.scene({
  id: 'brand', land: 6, inDur: .6, enter: 'up', torn: true, bg: '#F7F2E8', inEase: E.inOutQuad,
  build(ct, S) {
    // the wordmark, printed in vermilion ink by the stamp
    const wm = centred(ct, null, 'SuperImpress');
    css(wm.e, { fontFamily: 'var(--f-display)', fontWeight: 760, fontSize: 178, letterSpacing: '-.025em', color: 'var(--ver)', whiteSpace: 'nowrap',
                fontVariationSettings: "'opsz' 144, 'SOFT' 100", WebkitMaskImage: 'var(--inkfine)', WebkitMaskSize: '256px', maskImage: 'var(--inkfine)', maskSize: '256px', lineHeight: '1.25', padding: '0 .05em' });
    S.wm = wm.a;
    // the stamp: a long rubber stamp seen from the front
    S.stamp = svg(ct, 1300, 580,
      '<defs><linearGradient id="wd" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#E6A96A"/><stop offset="1" stop-color="#C98647"/></linearGradient>' +
      '<linearGradient id="kn" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#E9AE70"/><stop offset="1" stop-color="#B8733A"/></linearGradient></defs>' +
      '<ellipse cx="650" cy="92" rx="128" ry="84" fill="url(#kn)"/><ellipse cx="610" cy="66" rx="46" ry="20" fill="#F6D2A6" opacity=".7"/>' +
      '<path d="M586 150 L714 150 L730 318 L570 318 Z" fill="#C07C43"/><path d="M586 150 L612 150 L600 318 L570 318 Z" fill="#D8975A"/>' +
      '<rect x="0" y="314" width="1300" height="186" rx="18" fill="url(#wd)"/>' +
      '<path d="M40 360 C300 350 700 372 1260 356 M40 410 C420 402 820 420 1260 404 M40 456 C360 450 860 462 1260 452" stroke="#B97A40" stroke-width="3" fill="none" opacity=".55"/>' +
      '<rect x="0" y="470" width="1300" height="30" rx="8" fill="#A96A34"/>' +
      '<rect x="22" y="498" width="1256" height="64" rx="10" fill="#242A4B"/><rect x="22" y="498" width="1256" height="10" fill="#3A4170"/>',
      [.5, 1]);
    S.ev(.12, 'whoosh', { x: 960, d: .38 });
    S.ev(.5, 'stamp', { x: 960, v: 1 });
    S.shake(.5, 13);
    S.tag = new KT(ct, ['Find the jobs *worth* applying to.'], { x: 960, y: 610, cls: 'h1', size: 58, center: true, hlAt: .8 });
    S.tag.box.style.fontWeight = '480'; S.tag.box.style.fontStyle = 'italic';
    // a paper plane loops past, trailing pencil dashes
    S.fl = flight(ct, [[-160, 930], [520, 700], [1180, 1080], [2100, 800]]);
    S.pl = plane(ct);
    S.ev(2.35, 'plane', { x: 960, d: 2.2 });
    S.ev(2.15, 'strip', { x: 960 });
  },
  update(lt, S) {
    push(S, lt, .035, 5.5);
    // down it comes, accelerating; squash on contact; then it lifts away
    const down = seg(lt, .12, .5, E.inQuad), up = seg(lt, .74, 1.22, E.inOutCubic);
    const y = lerp(-760, 0, down) - 1100 * up, contact = lt >= .5 && lt < .74;
    const k = lt - .5, sq = contact ? 1 - .05 * Math.exp(-k * 18) * Math.cos(k * 50) : 1;
    put(S.stamp, { x: 960, y: 590 + y, sy: sq, r: lerp(4, 0, down) - 3 * up, z: contact ? 3 : 30, drop: true, o: lt > .1 && lt < 1.32 ? 1 : 0 });
    const inked = lt >= .5 ? 1 : 0;
    put(S.wm, { x: 960, y: 488, s: 1 + .012 * Math.exp(-Math.max(0, k) * 9), o: inked });
    S.tag.update(lt, 1.35);
    const u = seg(lt, 2.35, 4.55, E.inOutQuad);
    const p = S.fl.at(u);
    put(S.pl, { x: p.x, y: p.y, r: p.a, z: 26, drop: true, o: lt > 2.3 && lt < 4.6 ? 1 : 0 });
    S.fl.follow(u, .45, seg(lt, 4.55, 5.2, E.inOutQuad));
  },
});

// ======================================================================== 3. pick your companies
const TOWN = [
  { co: 'kitebird', x: 600, w: 150, h: 400, roof: 'mast' },
  { co: 'harborly', x: 800, w: 196, h: 250, roof: 'saw' },
  { co: 'fernwood', x: 1000, w: 160, h: 330, roof: 'gable' },
  { co: 'quillon', x: 1186, w: 138, h: 450, roof: 'dome' },
  { co: 'tallwave', x: 1375, w: 176, h: 290, roof: 'wave' },
  { co: 'oakmint', x: 1572, w: 156, h: 370, roof: 'step' },
];
const GROUND = 930;
function roofSVG(kind, w, c) {
  const d = 'rgba(30,20,40,.18)';
  switch (kind) {
    case 'mast':  return [70, '<rect x="' + (w / 2 - 3) + '" y="4" width="6" height="56" fill="' + c + '"/><circle cx="' + w / 2 + '" cy="6" r="8" fill="var(--ver)"/><rect x="8" y="56" width="' + (w - 16) + '" height="14" rx="3" fill="' + c + '"/>'];
    case 'saw':   return [46, '<path d="M0 46 L0 10 L' + w / 3 + ' 46 L' + w / 3 + ' 10 L' + 2 * w / 3 + ' 46 L' + 2 * w / 3 + ' 10 L' + w + ' 46 Z" fill="' + c + '"/><path d="M0 10 L' + w / 3 + ' 46 M' + w / 3 + ' 10 L' + 2 * w / 3 + ' 46 M' + 2 * w / 3 + ' 10 L' + w + ' 46" stroke="' + d + '" stroke-width="3"/>'];
    case 'gable': return [64, '<path d="M-10 64 L' + w / 2 + ' 4 L' + (w + 10) + ' 64 Z" fill="' + c + '"/><path d="M' + w / 2 + ' 4 L' + (w + 10) + ' 64 L' + w / 2 + ' 64 Z" fill="' + d + '"/>'];
    case 'dome':  return [62, '<path d="M4 62 A' + (w / 2 - 4) + ' 58 0 0 1 ' + (w - 4) + ' 62 Z" fill="' + c + '"/><path d="M' + w / 2 + ' 4 A' + (w / 2 - 4) + ' 58 0 0 1 ' + (w - 4) + ' 62 L' + w / 2 + ' 62 Z" fill="' + d + '"/>'];
    case 'wave':  return [34, '<path d="M0 34 L0 16 q' + w / 8 + ' -16 ' + w / 4 + ' 0 t' + w / 4 + ' 0 t' + w / 4 + ' 0 t' + w / 4 + ' 0 L' + w + ' 34 Z" fill="' + c + '"/>'];
    default:      return [56, '<rect x="' + w * .18 + '" y="0" width="' + w * .64 + '" height="30" fill="' + c + '"/><rect x="' + w * .06 + '" y="26" width="' + w * .88 + '" height="30" fill="' + c + '"/><rect x="' + w * .5 + '" y="0" width="' + w * .32 + '" height="56" fill="' + d + '"/>'];
  }
}
function building(ct, b) {
  const co = CO[b.co], [rh, roof] = roofSVG(b.roof, b.w, co.color);
  const box = h('div', 'abs', ct);
  const H = b.h + rh;
  css(box, { width: b.w, height: H, marginLeft: -b.w / 2, marginTop: -H, transformOrigin: '50% 100%' });
  const r = svg(box, b.w, rh, roof, [0, 0]); css(r, { left: 0, top: 0, marginLeft: 0, marginTop: 0 });
  const body = h('div', 'pp', box);
  css(body, { left: 0, top: rh, width: b.w, height: b.h, borderRadius: '4px 4px 0 0', backgroundColor: co.color });
  body.style.boxShadow = 'inset 0 1.5px 0 rgba(255,255,255,.35)';
  const cols = Math.max(2, Math.round(b.w / 48)), gx = b.w / cols;
  for (let y = 22; y < b.h - 150; y += 46)
    for (let i = 0; i < cols; i++)
      css(h('div', 'abs', body), { left: i * gx + gx * .26, top: y, width: gx * .48, height: 26, borderRadius: 3, background: 'rgba(255,253,246,' + (hash(i + b.x, y) > .3 ? .5 : .22) + ')' });
  css(h('div', 'abs', body), { left: b.w / 2 - 20, top: b.h - 62, width: 40, height: 62, borderRadius: '6px 6px 0 0', background: 'rgba(30,20,40,.28)' });
  const sign = h('div', 'chip', box);
  css(sign, { left: '50%', top: rh + b.h - 118, transform: 'translateX(-50%)', height: 40, padding: '0 14px 0 8px', fontSize: 19, backgroundColor: '#FCFAF4', color: 'var(--ink)', boxShadow: SP.shadow(3) });
  sign.innerHTML = '<span style="position:relative;width:26px;height:26px;display:inline-block"></span>' + co.name;
  logo(sign.firstChild, co, 26, 0, 0);
  const shade = h('div', 'abs', box); css(shade, { left: 0, top: rh, width: b.w, height: b.h, background: '#20182E', opacity: 0 });
  return { box, shade, sign, top: GROUND - H, b };
}
SP.scene({
  id: 'pick', land: 11.5, inDur: .7, enter: 'left', bg: '#CFE3F2',
  build(ct, S) {
    const cloud = '<path d="M30 92 C6 92 4 60 30 56 C28 26 70 18 84 42 C96 14 150 18 150 54 C178 52 184 92 156 92 Z" fill="#FCFAF4"/>';
    S.clouds = [[1060, 170, .9], [1420, 470, .7], [760, 520, .55]].map(([x, y, s]) => ({ e: svg(ct, 190, 100, cloud), x, y, s }));
    const hills = svg(ct, 2080, 420,
      '<path d="M0 160 C300 96 600 150 840 120 C1120 84 1380 170 1640 118 C1800 90 1940 110 2080 130 L2080 420 L0 420 Z" fill="#B9DEC7"/>' +
      '<path d="M0 246 C340 200 720 262 1060 226 C1380 194 1680 250 2080 214 L2080 420 L0 420 Z" fill="#9BD1B2"/>', [0, 0]);
    css(hills, { left: -80, top: 660, marginLeft: 0, marginTop: 0 });
    S.back = [[700, 120, 330, '#B4D2EA'], [905, 104, 390, '#A9C9E4'], [1090, 118, 300, '#BDD8EE'], [1290, 110, 360, '#AECDE6'], [1480, 124, 320, '#B8D4EB']].map(([x, w, hh, c]) => {
      const e = piece(ct, w, hh, c, null, [.5, 1]); e.style.borderRadius = '6px 6px 0 0'; return { e, x };
    });
    const road = piece(ct, 2080, 170, '#E9E1CF', null, [0, 0]); css(road, { left: -80, top: GROUND - 6, marginLeft: 0, marginTop: 0, borderRadius: 0 });
    for (let x = 0; x < 1920; x += 120) css(h('div', 'abs', road), { left: x + 100, top: 78, width: 60, height: 8, borderRadius: 4, background: '#FCFAF4' });
    S.bld = TOWN.map(b => building(ct, b));
    S.bld.forEach((B, i) => S.ev(.55 + i * .13, 'pop', { x: B.b.x, n: i }));
    // your list
    S.list = piece(ct, 440, 300, 'var(--paper)');
    S.list.style.borderRadius = '20px';
    const hd = h('div', 'abs', S.list, 'Your companies');
    css(hd, { left: 30, top: 26, fontFamily: 'var(--f-ui)', fontWeight: 700, fontSize: 25, color: 'var(--ink)' });
    S.count = h('div', 'abs', S.list, '0');
    css(S.count, { left: 372, top: 20, width: 42, height: 42, borderRadius: '50%', background: 'var(--ver)', color: '#FCFAF4', fontFamily: 'var(--f-ui)', fontWeight: 800, fontSize: 22, lineHeight: '42px', textAlign: 'center' });
    for (let i = 0; i < 3; i++) css(h('div', 'abs', S.list), { left: 28, top: 80 + i * 66, width: 384, height: 54, borderRadius: 14, border: '2.5px dashed #D8CDB9', boxSizing: 'border-box' });
    S.ev(.9, 'land', { x: 1590, v: .6 });
    // picking: Quillon, Harborly, Kitebird
    const picks = [3, 1, 0], clicks = [2.0, 3.0, 4.0];
    S.picks = picks.map((bi, k) => {
      const B = S.bld[bi], co = CO[B.b.co];
      B.pin = svg(ct, 56, 56, '<circle cx="28" cy="28" r="25" fill="var(--ver)"/><path d="M16 29 L25 37 L41 20" fill="none" stroke="#FCFAF4" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>');
      const chip = h('div', 'chip', ct);
      css(chip, { height: 54, width: 384, padding: '0 16px', fontSize: 23, backgroundColor: '#FCFAF4', color: 'var(--ink)', borderRadius: '14px', boxSizing: 'border-box', marginLeft: -192, marginTop: -27 });
      chip.innerHTML = '<span style="position:relative;width:34px;height:34px;display:inline-block"></span><span style="flex:1">' + co.name + '</span>' +
        '<svg width="26" height="26" viewBox="0 0 26 26"><circle cx="13" cy="13" r="12" fill="var(--ver)"/><path d="M7 13.5 L11.5 17.5 L19 9.5" fill="none" stroke="#FCFAF4" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
      logo(chip.firstChild, co, 34, 0, 0);
      S.ev(clicks[k], 'click', { x: B.b.x });
      S.ev(clicks[k] + .05, 'pop', { x: B.b.x, n: 6 + k });
      S.ev(clicks[k] + .62, 'chip', { x: 1590 });
      return { B, chip, t: clicks[k], k };
    });
    S.ptr = pointer(ct, [[1.3, 2020, 760], [1.95, 1195, 650], [2.95, 812, 790], [3.95, 606, 640], [4.9, 720, 700]], clicks);
    S.h = new KT(ct, ['Pick the companies', 'you want to work for.'], { x: 140, y: 150, cls: 'h1' });
    S.sub = new KT(ct, ['Their new jobs come to you.'], { x: 140, y: 336, cls: 'h2', stagger: .04 });
  },
  update(lt, S) {
    push(S, lt, .03, 7);
    S.clouds.forEach((c, i) => put(c.e, { x: c.x - lt * (9 + 5 * i), y: c.y, s: c.s, z: 6, drop: true }));
    S.back.forEach((b, i) => { const r = seg(lt, .2 + i * .07, .75 + i * .07, E.outBack); put(b.e, { x: b.x, y: GROUND, rx: 90 * (1 - r), p: 1200, o: r > 0 ? 1 : 0 }); });
    S.bld.forEach((B, i) => {
      const t0 = .3 + i * .13, u = seg(lt, t0, t0 + .6, E.outBack);
      const ang = 90 * (1 - u);
      put(B.box, { x: B.b.x, y: GROUND, rx: ang, p: 1300, o: lt > t0 ? 1 : 0 });
      B.shade.style.opacity = (clamp(ang, 0, 90) / 90 * .5).toFixed(3);
    });
    const lp = SP.drop(lt, .45, .45, 1590, 250, 8, 2);
    put(S.list, lp);
    let n = 0;
    S.picks.forEach(P => {
      const t = lt - P.t, B = P.B, pp = pop(lt, P.t + .03, 2.6, 9);
      put(B.pin, { x: B.b.x, y: B.top - 34, s: pp.s, o: pp.o, z: 8, drop: true });
      // the sign is copied to your list: lifts, arcs over, settles into its slot
      const u = seg(t, .1, .62, E.inOutCubic);
      const sx = B.b.x, sy = GROUND - 98, ex = 1590, ey = 250 - 150 + 107 + P.k * 66;
      const x = lerp(sx, ex, u), y = lerp(sy, ey, u) - Math.sin(u * Math.PI) * 170;
      put(P.chip, { x, y, s: lerp(.55, 1, u) * (1 + .06 * Math.sin(u * Math.PI)), r: -6 * Math.sin(u * Math.PI), z: 4 + 34 * Math.sin(u * Math.PI), o: t > .1 ? 1 : 0 });
      if (t >= .62) n++;
    });
    setText(S.count, String(n));
    S.ptr.update(lt);
    S.h.update(lt, .05);
    S.sub.update(lt, 4.6);
  },
});

// ======================================================================== 4. we find
const FIND = [
  { co: 'kitebird', row: 2, ago: '2h ago' },
  { co: 'quillon', row: 4, ago: '4h ago' },
  { co: 'harborly', row: 1, ago: '1h ago' },
];
SP.scene({
  id: 'find', land: 18.5, inDur: .7, enter: 'up', bg: '#F6F0E4',
  build(ct, S) {
    S.tg = tag(ct, '01 · We find', 'var(--ver)', 140, 116);
    // the careers page, one company after another
    const W = browser(ct, 700, 560, '');
    S.win = W;
    S.pages = FIND.map((F, k) => {
      const co = CO[F.co], pg = h('div', 'abs', W.body);
      css(pg, { left: 0, top: 0, width: 700, height: 502, backgroundColor: 'var(--paper)', backgroundImage: 'var(--grain)' });
      logo(pg, co, 58, 36, 30);
      css(h('div', 'abs', pg, 'Open roles at ' + co.name), { left: 112, top: 34, fontFamily: 'var(--f-ui)', fontWeight: 700, fontSize: 27, color: 'var(--ink)', whiteSpace: 'nowrap' });
      css(h('div', 'abs', pg, 'Careers · updated today'), { left: 112, top: 68, fontFamily: 'var(--f-ui)', fontWeight: 500, fontSize: 17, color: 'var(--ink3)', whiteSpace: 'nowrap' });
      const rows = [];
      for (let i = 0; i < 6; i++) {
        const r = h('div', 'abs', pg);
        css(r, { left: 30, top: 118 + i * 62, width: 640, height: 50, borderRadius: 12 });
        const hl = h('div', 'abs', r); css(hl, { left: 0, top: 0, width: 640, height: 50, borderRadius: 12, background: 'var(--butterL)', transformOrigin: '0 50%', transform: 'scaleX(0)' });
        if (i === F.row) {
          css(h('div', 'abs', r, co.role), { left: 18, top: 12, fontFamily: 'var(--f-ui)', fontWeight: 700, fontSize: 21, color: 'var(--ink)', whiteSpace: 'nowrap' });
        } else {
          css(h('div', 'abs', r), { left: 18, top: 19, width: 180 + hash(i, k) * 190, height: 13, borderRadius: 7, background: '#E4DCCC' });
        }
        css(h('div', 'abs', r), { left: 520, top: 17, width: 96, height: 17, borderRadius: 9, background: '#EEE7D9' });
        rows.push({ r, hl });
      }
      const nw = h('div', 'abs', pg, 'NEW');
      css(nw, { left: 540, top: 118 + F.row * 62 + 9, height: 32, lineHeight: '32px', padding: '0 12px', borderRadius: 9, background: 'var(--ver)', color: '#FCFAF4', fontFamily: 'var(--f-mono)', fontWeight: 600, fontSize: 16, letterSpacing: '.08em', transformOrigin: '50% 50%' });
      return { pg, rows, nw, F, co };
    });
    // the tray the new ones land in
    S.tray = piece(ct, 400, 560, 'var(--paper)');
    S.tray.style.borderRadius = '22px';
    css(h('div', 'abs', S.tray, 'New for you'), { left: 30, top: 26, fontFamily: 'var(--f-ui)', fontWeight: 700, fontSize: 26, color: 'var(--ink)' });
    S.tray.insertAdjacentHTML('beforeend', '<svg style="position:absolute;left:338px;top:24px" width="34" height="34" viewBox="0 0 24 24"><path d="M6 17 V11 a6 6 0 0 1 12 0 V17 L19.5 18.5 H4.5 Z" fill="var(--butter)" stroke="#1F2542" stroke-width="1.8" stroke-linejoin="round"/><path d="M10 20.5 a2 2 0 0 0 4 0" fill="none" stroke="#1F2542" stroke-width="1.8"/></svg>');
    for (let i = 0; i < 4; i++) css(h('div', 'abs', S.tray), { left: 20, top: 84 + i * 112, width: 360, height: 96, borderRadius: 14, border: '2.5px dashed #DDD3C1', boxSizing: 'border-box' });
    S.rows = FIND.map(F => jobRow(ct, CO[F.co], F.ago));
    // the scanner
    S.lens = svg(ct, 150, 150, '<circle cx="58" cy="58" r="44" fill="rgba(255,253,246,.28)" stroke="#1F2542" stroke-width="11"/><circle cx="58" cy="58" r="44" fill="none" stroke="#FCFAF4" stroke-width="3" opacity=".6" transform="translate(-3 -3)"/><path d="M92 92 L136 136" stroke="#1F2542" stroke-width="18" stroke-linecap="round"/><path d="M92 92 L136 136" stroke="var(--ver)" stroke-width="10" stroke-linecap="round"/>', [58 / 150, 58 / 150]);
    // a tear-off day calendar
    S.cal = piece(ct, 230, 250, 'var(--paper)');
    S.cal.style.borderRadius = '16px';
    css(h('div', 'abs', S.cal), { left: 0, top: 0, width: 230, height: 58, borderRadius: '16px 16px 0 0', backgroundColor: 'var(--ink)' });
    [60, 160].forEach(x => css(h('div', 'abs', S.cal), { left: x, top: 20, width: 12, height: 12, borderRadius: '50%', background: '#FCFAF4' }));
    const day = (d, n) => '<div style="position:absolute;left:0;right:0;top:78px;text-align:center;font:700 26px/1 var(--f-mono);letter-spacing:.14em;color:var(--ver)">' + d + '</div>' +
                          '<div style="position:absolute;left:0;right:0;top:112px;text-align:center;font:700 96px/1 var(--f-display);color:var(--ink)">' + n + '</div>';
    const under = h('div', 'abs', S.cal); css(under, { width: 230, height: 250 }); under.innerHTML = day('TUE', '15');
    S.leaf = piece(S.cal, 230, 192, 'var(--paper)', null, [.5, 0]);
    S.leaf.style.borderRadius = '0 0 16px 16px';
    S.leaf.innerHTML = day('MON', '14').replace(/top:78px/, 'top:20px').replace(/top:112px/, 'top:54px');
    S.flash = [];
    FIND.forEach((F, k) => {
      const P = 1.2 + k * 1.25;
      if (k) S.ev(P - .35, 'flip', { x: 1030 });
      S.ev(P + .6, 'ding', { x: 1030, n: k });
      S.ev(P + .78, 'lift', { x: 1100 });
      S.ev(P + 1.32, 'land', { x: 1620, v: .55 });
    });
    S.ev(1.2, 'scan', { x: 1030, d: .55 });
    S.ev(2.45, 'scan', { x: 1030, d: .55 });
    S.ev(3.7, 'scan', { x: 1030, d: .55 });
    S.ev(5.25, 'tear', { x: 300 });
    S.h = new KT(ct, ['We read their', 'careers pages.', '*Every day.*'], { x: 140, y: 162, cls: 'h1', hlAt: .8 });
    S.ev(.88, 'strip', { x: 300 });
    S.sub = new KT(ct, ['New jobs reach you within', 'hours of going up.'], { x: 140, y: 452, cls: 'h2', stagger: .04 });
  },
  update(lt, S) {
    push(S, lt, .03, 7.5);
    S.tg.update(lt, .02);
    S.h.update(lt, .08);
    S.sub.update(lt, 3.2);
    put(S.win.el, drop(lt, .15, .45, 1030, 650, -6, -1.2));
    put(S.tray, drop(lt, .35, .45, 1630, 650, 6, 1.4));
    put(S.cal, drop(lt, .5, .45, 300, 800, -8, -3));
    // the pages sit side by side and slide as one strip, so the next page pushes the last one out
    let pos = 0;
    for (let i = 1; i < FIND.length; i++) { const ts = 1.2 + i * 1.25 - .35; pos += E.inOutCubic(seg(lt, ts, ts + .35)); }
    const k = Math.min(FIND.length - 1, Math.floor(pos + .5));
    S.pages.forEach((P, i) => {
      const d = i - pos;
      setStyle(P.pg, 'visibility', Math.abs(d) < 1 ? 'visible' : 'hidden');
      setStyle(P.pg, 'transform', 'translateX(' + f(d * 700) + 'px)');
      const Pk = 1.2 + i * 1.25;
      setStyle(P.rows[P.F.row].hl, 'transform', 'scaleX(' + seg(lt, Pk + .58, Pk + .9, E.outCubic).toFixed(3) + ')');
      setStyle(P.nw, 'transform', 'scale(' + spring(lt, Pk + .6, 2.8, 9).toFixed(3) + ') rotate(-4deg)');
      setStyle(P.nw, 'visibility', lt > Pk + .6 ? 'visible' : 'hidden');
    });
    setText(S.win.url, 'Careers · ' + CO[FIND[k].co].name);
    // the lens reads down each page to the new listing, then goes back to the top for the next
    const winX = 1030 - 350, winY = 650 - 280 + 58, rowY = r => winY + 118 + 25 + r * 62;
    let ly = rowY(0);
    FIND.forEach((F, i) => {
      const P = 1.2 + i * 1.25;
      if (lt >= P) ly = lerp(rowY(0), rowY(F.row), seg(lt, P, P + .55, E.inOutCubic));
      if (i < FIND.length - 1 && lt >= P + .9) ly = lerp(rowY(F.row), rowY(0), seg(lt, P + .9, P + 1.25, E.inOutCubic));
    });
    put(S.lens, { x: winX + 300 + 80 * Math.sin(lt * 3.1), y: ly, r: -8, z: 22, drop: true, o: seg(lt, 1.0, 1.2) * (1 - seg(lt, 5.0, 5.3)) });
    S.rows.forEach((row, i) => {
      const P = 1.2 + i * 1.25, u = seg(lt, P + .78, P + 1.32, E.inOutCubic);
      const sx = winX + 30 + 330, sy = winY + 118 + FIND[i].row * 62 + 25;
      const ex = 1630, ey = 650 - 280 + 84 + i * 112 + 48;
      const arc = Math.sin(u * Math.PI);
      put(row, { x: lerp(sx, ex, u), y: lerp(sy, ey, u) - 120 * arc, s: lerp(.9, 1, u) + .05 * arc, r: -5 * arc, z: 3 + 40 * arc, o: lt > P + .78 ? 1 : 0 });
    });
    // tearing off Monday
    const tu = seg(lt, 5.25, 6.1, E.inQuad), lift = seg(lt, 5.25, 5.4, E.outQuad);
    put(S.leaf, { x: 115 + 60 * lift + 520 * tu, y: 58 + 30 * lift + 460 * tu * tu, r: 14 * lift + 70 * tu, z: lt < 5.25 ? 1 : 6 + 30 * lift, o: 1 - seg(lt, 5.9, 6.2) });
  },
});

// ======================================================================== 5. we rate
const RATE = [
  { co: 'kitebird', x: 400, r: -2, st: 'Strong', col: '#23935E', score: 86, why: 'Your level · most of it familiar', icon: 'tick' },
  { co: 'quillon', x: 960, r: 1.2, st: 'Stretch', col: '#E08F1E', score: 63, why: 'A step up · about half is new', icon: 'up' },
  { co: 'harborly', x: 1520, r: 2.4, st: 'Skip', col: '#7F879C', score: 24, why: 'Not open where you can work', icon: 'x' },
];
SP.scene({
  id: 'rate', land: 26, inDur: .7, enter: 'left', bg: '#262C4E',
  build(ct, S) {
    S.tg = tag(ct, '02 · We rate', 'var(--butter)', 140, 116, '#C5C9E0');
    S.h = new KT(ct, ['Every new job', 'gets a *rating.*'], { x: 140, y: 162, cls: 'h1', color: '#F7F2E8', hl: 'var(--ver)', hlAt: .7 });
    S.ev(.78, 'strip', { x: 400 });
    S.sub = new KT(ct, ['A score out of 100, and the reasons why.'], { x: 140, y: 352, cls: 'h2', color: '#C5C9E0', stagger: .035 });
    S.cards = RATE.map((R, i) => {
      const back = piece(ct, 440, 280, '#F2542D');
      back.style.borderRadius = '16px';
      back.innerHTML = '<svg width="440" height="280" style="position:absolute;inset:0"><defs><pattern id="bk' + i + '" width="26" height="26" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="13" height="26" fill="rgba(255,253,246,.16)"/></pattern></defs><rect x="14" y="14" width="412" height="252" rx="10" fill="url(#bk' + i + ')" stroke="rgba(255,253,246,.5)" stroke-width="3"/><text x="220" y="158" text-anchor="middle" font-family="Fraunces" font-weight="700" font-size="52" fill="#FCFAF4">S</text></svg>';
      const c = jobCard(ct, CO[R.co], { dial: R.col });
      const st = stampMark(c.el, R.st, R.col, 50);
      c.shade();
      const why = h('div', 'abs', ct);
      css(why, { fontFamily: 'var(--f-ui)', fontWeight: 600, fontSize: 25, color: '#EDEEF6', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '12px' });
      const ic = R.icon === 'tick' ? '<path d="M8 15 L13 20 L22 10" />' : R.icon === 'up' ? '<path d="M15 22 V9 M9 14 L15 8 L21 14" />' : '<path d="M10 10 L20 20 M20 10 L10 20" />';
      why.innerHTML = '<svg width="30" height="30" viewBox="0 0 30 30"><circle cx="15" cy="15" r="14" fill="' + R.col + '"/><g fill="none" stroke="#FCFAF4" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round">' + ic + '</g></svg>' + R.why;
      const t0 = .3 + i * .15, ts = 1.34 + i * .5;
      S.ev(t0 + .5, 'flip', { x: R.x });
      S.ev(ts + .16, 'stamp', { x: R.x, v: .7 });
      S.shake(ts + .16, 4);
      S.ev(ts + .2, 'count', { x: R.x, d: .6, n: R.score });
      S.ev(3.55 + i * .25, 'tick', { x: R.x });
      return { R, back, card: c, st, why, t0, ts };
    });
    S.loop = scribble(ct, 400, 676, 262, 174, '#FFD36B', 12, 6);
    S.note = h('div', 'hand', ct, 'worth applying to!');
    css(S.note, { fontSize: 46, color: '#FFD36B' });
    S.arrow = svg(ct, 120, 90, '<path d="M106 8 C72 8 34 28 16 74" fill="none" stroke="#FFD36B" stroke-width="5" stroke-linecap="round"/><path d="M6 56 L15 76 L35 67" fill="none" stroke="#FFD36B" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>', [0, 0]);
    S.ev(5.0, 'scribble', { x: 400, d: .7 });
  },
  update(lt, S) {
    push(S, lt, .03, 8.5);
    S.tg.update(lt, .02);
    S.h.update(lt, .08);
    S.sub.update(lt, 4.3);
    S.cards.forEach((C, i) => {
      const R = C.R, y = 680;
      // dropped face down, turned over as it lands
      const d = drop(lt, C.t0, .45, R.x, y, R.r * 3, R.r);
      const turn = seg(lt, C.t0 + .35, C.t0 + .85, E.inOutCubic), ang = 180 * (1 - turn);
      const chosen = i === 0 ? seg(lt, 5.0, 5.5, E.outCubic) : 0, dim = i === 0 ? 0 : seg(lt, 5.0, 5.5);
      const hit = Math.max(0, lt - C.ts - .16), jolt = lt > C.ts + .16 ? Math.exp(-hit * 14) * Math.sin(hit * 46) : 0;
      const base = Object.assign({}, d, { y: d.y + 5 * jolt - 16 * chosen, s: d.s * (1 + .04 * chosen), z: d.z + 16 * chosen, p: 1400 });
      put(C.card.el, Object.assign({}, base, { ry: ang < 90 ? ang : 0, o: ang < 90 ? d.o : 0 }));
      setStyle(C.card.dim, 'opacity', (.38 * dim).toFixed(3));
      put(C.back, Object.assign({}, base, { ry: ang >= 90 ? ang - 180 : 0, o: ang >= 90 ? d.o : 0 }));
      // the stamp comes down hard, slightly larger than life, and bites
      const sd = seg(lt, C.ts, C.ts + .16, E.inQuad);
      put(C.st, { x: 190, y: 162, r: -12 + 3 * (1 - sd), s: lerp(2.3, 1, sd), o: sd > 0 ? Math.min(1, sd * 3) : 0 });
      setDial(C.card.dial, R.score * E.outCubic(seg(lt, C.ts + .2, C.ts + .8)));
      const w = seg(lt, 3.55 + i * .25, 3.95 + i * .25, E.outCubic);
      put(C.why, { x: R.x - 205 + 20 * (1 - w), y: 866, o: w * (1 - .4 * dim) });
    });
    S.loop.set(seg(lt, 5.0, 5.7, E.inOutQuad));
    const n = seg(lt, 5.45, 5.9, E.outCubic);
    put(S.note, { x: 668 + 20 * (1 - n), y: 432, r: -5, o: n });
    put(S.arrow, { x: 560, y: 484, o: n, s: .9 + .1 * n });
  },
});

// ======================================================================== 6. you choose, you apply
SP.scene({
  id: 'apply', land: 34.5, inDur: .7, enter: 'down', bg: '#F8DCCB',
  build(ct, S) {
    S.tgA = tag(ct, '03 · You choose', 'var(--green)', 140, 116);
    S.tgB = tag(ct, '04 · You apply', 'var(--ver)', 140, 116);
    S.hA = new KT(ct, ['You choose.'], { x: 140, y: 162, cls: 'h1' });
    S.hB = new KT(ct, ['You apply on the', 'company’s own page.'], { x: 140, y: 248, cls: 'h1' });
    S.sub = new KT(ct, ['SuperImpress never applies for you.'], { x: 196, y: 440, cls: 'h2', stagger: .04 });
    S.sub.box.style.color = 'var(--ink)';
    S.shield = svg(ct, 40, 46, '<path d="M20 2 L37 9 V22 C37 33 29 41 20 44 C11 41 3 33 3 22 V9 Z" fill="var(--green)"/><path d="M12 23 L18 29 L28 17" fill="none" stroke="#FCFAF4" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>', [0, 0]);
    // the company's own careers page, with its own form
    const W = browser(ct, 760, 540, 'Careers · Kitebird');
    S.win = W;
    const b = W.body;
    logo(b, CO.kitebird, 56, 36, 28);
    css(h('div', 'abs', b, 'Product Designer'), { left: 108, top: 26, fontFamily: 'var(--f-ui)', fontWeight: 700, fontSize: 30, color: 'var(--ink)', whiteSpace: 'nowrap' });
    css(h('div', 'abs', b, 'Kitebird · Remote · Europe'), { left: 108, top: 64, fontFamily: 'var(--f-ui)', fontWeight: 500, fontSize: 18, color: 'var(--ink3)', whiteSpace: 'nowrap' });
    css(h('div', 'abs', b), { left: 36, top: 112, width: 688, height: 2, background: '#ECE4D5' });
    css(h('div', 'abs', b, 'Apply for this job'), { left: 36, top: 134, fontFamily: 'var(--f-ui)', fontWeight: 700, fontSize: 22, color: 'var(--ink)' });
    S.fields = ['Full name', 'Email', 'Resume'].map((lab, i) => {
      css(h('div', 'abs', b, lab), { left: 36, top: 182 + i * 82, fontFamily: 'var(--f-ui)', fontWeight: 600, fontSize: 16, color: 'var(--ink2)' });
      const box = h('div', 'abs', b); css(box, { left: 36, top: 206 + i * 82, width: 460, height: 44, borderRadius: 10, border: '2.5px solid #E2D9C8', boxSizing: 'border-box', background: '#FFFEFA' });
      const fill = h('div', 'abs', box); css(fill, { left: 14, top: 13, height: 13, width: [190, 250, 0][i], borderRadius: 7, background: '#C9C0B0', transformOrigin: '0 50%', transform: 'scaleX(0)' });
      return { box, fill };
    });
    S.pdf = h('div', 'chip', S.fields[2].box);
    css(S.pdf, { left: 8, top: 5, height: 30, padding: '0 12px', fontSize: 15, backgroundColor: 'var(--butterL)', color: '#6D5418', transformOrigin: '0 50%' });
    S.pdf.textContent = 'resume.pdf';
    S.submit = h('div', 'pp', b);
    css(S.submit, { left: 520, top: 402, width: 204, height: 56, borderRadius: 14, backgroundColor: 'var(--ver)', color: '#FCFAF4', fontFamily: 'var(--f-ui)', fontWeight: 700, fontSize: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', transformOrigin: '50% 50%' });
    S.submitTxt = h('span', null, S.submit, 'Submit');
    // the Strong listing, carried over from the ratings
    S.card = jobCard(ct, CO.kitebird, { apply: true });
    S.cardSt = stampMark(ct, 'Strong', '#23935E', 34);
    S.pl = plane(ct, ['#FF8C6B', '#E0582F', '#BD4220']);
    S.fl = flight(ct, [[470, 700], [700, 470], [1040, 420], [1300, 600]], 'rgba(31,37,66,.4)');
    S.ptr = pointer(ct, [[.6, 330, 1180], [1.25, 500, 826], [2.0, 580, 960], [3.1, 1220, 1020], [3.6, 1240, 690], [4.5, 1250, 712], [5.25, 1557, 878], [6.4, 1600, 930]], [1.35, 5.4],
      t => seg(t, .6, .75) * (1 - seg(t, 1.8, 2.0)) + seg(t, 3.1, 3.3));
    S.ev(1.35, 'click', { x: 480 });
    S.ev(1.5, 'fold', { x: 470 });
    S.ev(1.95, 'plane', { x: 900, d: 1.25 });
    S.ev(3.22, 'land', { x: 1300, v: .7 });
    [[3.6, .5], [4.2, .55]].forEach(([t, d]) => S.ev(t, 'type', { x: 1100, d }));
    S.ev(4.8, 'pop', { x: 1100, n: 3 });
    S.ev(5.4, 'click', { x: 1300 });
    S.ev(5.45, 'ding', { x: 1300, n: 3 });
  },
  update(lt, S) {
    push(S, lt, .03, 7.5);
    S.tgA.update(lt, .02, 1.8);
    S.tgB.update(lt, 2.0);
    S.hA.update(lt, .08);
    S.hB.update(lt, 1.95);
    S.sub.update(lt, 4.6);
    const sh = seg(lt, 4.55, 4.9, E.outBack);
    put(S.shield, { x: 140, y: 440 + 4, s: sh, o: sh > 0 ? 1 : 0 });
    const fwd = seg(lt, 3.3, 4.1, E.inOutCubic), wd = drop(lt, .2, .45, 1360, 640, 5, 1.2);
    put(S.win.el, Object.assign(wd, { x: wd.x - 70 * fwd, y: wd.y + 10 * fwd, s: wd.s * (1 + .08 * fwd), r: lerp(1.2, .4, fwd), z: wd.z + 8 * fwd }));
    // pressed, then folded into a plane
    const pr = lt > 1.28 && lt < 1.55 ? Math.sin(Math.PI * (lt - 1.28) / .27) : 0;
    setStyle(S.card.btn, 'transform', 'scale(' + (1 - .05 * pr).toFixed(3) + ')');
    const fold = seg(lt, 1.5, 1.95, E.inOutCubic);
    const cardState = { x: 470, y: 700, r: -1.5 - 14 * fold, sx: 1 - .8 * fold, sy: 1 - .72 * fold, z: 16 - 6 * pr, o: 1 - seg(lt, 1.8, 1.95) };
    put(S.card.el, cardState);
    put(S.cardSt, { x: 470 + 105 * (1 - .8 * fold), y: 700 + 40 * (1 - .72 * fold), r: -12 - 14 * fold, s: 1 - .75 * fold, o: 1 - seg(lt, 1.7, 1.9) });
    const u = seg(lt, 1.95, 3.2, E.inOutQuad), p = S.fl.at(u);
    const arrive = seg(lt, 3.2, 3.36, E.inQuad);
    put(S.pl, { x: p.x, y: p.y, r: p.a, s: (lt < 1.95 ? seg(lt, 1.75, 1.95, E.outBack) : 1 + .25 * Math.sin(u * Math.PI)) * (1 - .8 * arrive), z: 30, drop: true, o: lt > 1.75 && lt < 3.36 ? 1 : 0 });
    S.fl.follow(u, .5, seg(lt, 3.2, 3.9, E.inOutQuad));
    // the form fills in: that part is yours
    S.fields.forEach((F, i) => { if (i < 2) setStyle(F.fill, 'transform', 'scaleX(' + E.outQuad(seg(lt, 3.6 + i * .6, 4.1 + i * .6)).toFixed(3) + ')'); });
    const pdf = spring(lt, 4.8, 2.6, 9);
    setStyle(S.pdf, 'transform', 'scale(' + pdf.toFixed(3) + ')'); setStyle(S.pdf, 'visibility', lt > 4.8 ? 'visible' : 'hidden');
    const sp = lt > 5.33 && lt < 5.6 ? Math.sin(Math.PI * (lt - 5.33) / .27) : 0, sent = lt >= 5.42;
    setStyle(S.submit, 'transform', 'scale(' + (1 - .06 * sp).toFixed(3) + ')');
    setStyle(S.submit, 'backgroundColor', sent ? 'var(--green)' : 'var(--ver)');
    setText(S.submitTxt, sent ? 'Applied ✓' : 'Submit');
    S.ptr.update(lt);
  },
});

// ======================================================================== 7. autopilot
SP.scene({
  id: 'autopilot', land: 42, inDur: .7, enter: 'left', bg: '#E4DDF5',
  build(ct, S) {
    S.tg = tag(ct, 'Autopilot', 'var(--ver)', 140, 116);
    S.h = new KT(ct, ['Need a resume or', 'a cover letter?'], { x: 140, y: 162, cls: 'h1' });
    S.sub = new KT(ct, ['Autopilot writes it when you ask.'], { x: 140, y: 352, cls: 'h2', stagger: .04 });
    S.sub.box.style.color = 'var(--ink)'; S.sub.box.style.fontWeight = '600';
    S.sub2 = new KT(ct, ['Or connect Claude or another AI assistant.', 'Same ratings, no credits.'], { x: 140, y: 790, cls: 'h2', stagger: .03 });
    // the resume, writing itself
    S.cv = piece(ct, 440, 590, 'var(--paper)');
    S.cv.style.borderRadius = '10px';
    S.lines = [];
    const L = (x, y, w, hh, c) => { const e = h('div', 'abs', S.cv); css(e, { left: x, top: y, width: w, height: hh, borderRadius: hh / 2, background: c, transformOrigin: '0 50%', transform: 'scaleX(0)' }); S.lines.push(e); return e; };
    L(40, 46, 210, 24, 'var(--ink)'); L(40, 84, 140, 14, 'var(--ver)');
    const rule = h('div', 'abs', S.cv); css(rule, { left: 40, top: 122, width: 360, height: 2.5, background: '#E5DDCD', transformOrigin: '0 50%' }); S.lines.push(rule);
    [[150, [330, 300, 250]], [276, [340, 280, 310]], [402, [300, 330, 220]]].forEach(([y, ws]) => {
      L(40, y, 110, 12, 'var(--ink2)');
      ws.forEach((w, j) => L(40, y + 30 + j * 24, w, 10, '#D5CDBE'));
    });
    S.pdfChip = h('div', 'chip', ct, '1 page · PDF');
    css(S.pdfChip, { height: 46, padding: '0 20px', fontSize: 21, backgroundColor: 'var(--ink)', color: '#FCFAF4', marginLeft: -80, marginTop: -23 });
    // a letter coming out of its envelope
    S.envB = piece(ct, 300, 190, '#E9C79A'); S.envB.style.borderRadius = '10px';
    S.letter = piece(ct, 260, 200, 'var(--paper)'); S.letter.style.borderRadius = '6px';
    [[26, 150], [58, 206], [84, 190], [110, 200], [136, 120]].forEach(([y, w]) => css(h('div', 'abs', S.letter), { left: 24, top: y, width: w, height: 9, borderRadius: 5, background: '#D5CDBE' }));
    S.envF = svg(ct, 300, 190, '<path d="M0 60 L150 128 L300 60 L300 180 Q300 190 290 190 L10 190 Q0 190 0 180 Z" fill="#F2D6AE"/><path d="M0 190 L128 100 M300 190 L172 100" stroke="rgba(120,80,40,.18)" stroke-width="3"/>');
    S.flap = svg(ct, 300, 110, '<path d="M0 0 L300 0 L160 104 Q150 110 140 104 Z" fill="#E4BD8B"/>', [.5, 0]);
    // a message
    S.msg = piece(ct, 330, 150, 'var(--paper)'); S.msg.style.borderRadius = '24px 24px 24px 6px';
    S.dots = [0, 1, 2].map(i => { const d = h('div', 'abs', S.msg); css(d, { left: 128 + i * 28, top: 64, width: 18, height: 18, borderRadius: '50%', background: 'var(--ink3)' }); return d; });
    S.msgLines = [[30, 36, 250], [30, 66, 270], [30, 96, 180]].map(([x, y, w]) => { const e = h('div', 'abs', S.msg); css(e, { left: x, top: y, width: w, height: 12, borderRadius: 6, background: '#D5CDBE', transformOrigin: '0 50%', transform: 'scaleX(0)' }); return e; });
    // a plug, for bringing your own assistant
    S.plugA = svg(ct, 150, 70, '<rect x="0" y="12" width="96" height="46" rx="12" fill="var(--ink)"/><rect x="96" y="20" width="22" height="30" rx="4" fill="#394068"/><rect x="118" y="24" width="30" height="7" rx="3" fill="#B9BED6"/><rect x="118" y="40" width="30" height="7" rx="3" fill="#B9BED6"/>', [1, .5]);
    S.plugB = svg(ct, 130, 70, '<rect x="30" y="8" width="100" height="54" rx="14" fill="var(--ver)"/><rect x="0" y="18" width="36" height="34" rx="6" fill="#D8431F"/><rect x="6" y="25" width="20" height="5" rx="2" fill="#7A2410"/><rect x="6" y="40" width="20" height="5" rx="2" fill="#7A2410"/>', [0, .5]);
    S.labA = h('div', 'abs', ct, 'Your AI assistant'); S.labB = h('div', 'abs', ct, 'SuperImpress');
    [S.labA, S.labB].forEach(e => css(e, { fontFamily: 'var(--f-mono)', fontWeight: 600, fontSize: 17, letterSpacing: '.08em', color: 'var(--ink2)', whiteSpace: 'nowrap' }));
    S.spark = svg(ct, 80, 80, '<g stroke="var(--butter)" stroke-width="6" stroke-linecap="round"><path d="M40 6 V22"/><path d="M40 58 V74"/><path d="M8 18 L20 28"/><path d="M72 18 L60 28"/><path d="M8 62 L20 52"/><path d="M72 62 L60 52"/></g>');
    S.ev(.4, 'land', { x: 1180, v: .6 });
    S.lines.forEach((e, i) => { if (i % 2 === 0) S.ev(.8 + i * .09, 'type', { x: 1180, d: .16 }); });
    S.ev(2.75, 'stamp', { x: 1330, v: .35 });
    S.ev(2.4, 'land', { x: 1640, v: .45 });
    S.ev(2.75, 'flip', { x: 1640 });
    S.ev(3.05, 'lift', { x: 1640 });
    S.ev(3.5, 'pop', { x: 1640, n: 5 });
    S.ev(4.35, 'type', { x: 1640, d: .4 });
    S.ev(4.4, 'pop', { x: 420, n: 4 });
    S.ev(4.5, 'lift', { x: 200 });
    S.ev(5.1, 'snap', { x: 340 });
  },
  update(lt, S) {
    push(S, lt, .03, 7.5);
    S.tg.update(lt, .02);
    S.h.update(lt, .08);
    S.sub.update(lt, .95);
    S.sub2.update(lt, 4.55);
    put(S.cv, drop(lt, .0, .42, 1180, 590, 7, 2));
    S.lines.forEach((e, i) => setStyle(e, 'transform', 'scaleX(' + E.outQuad(seg(lt, .8 + i * .09, 1.05 + i * .09)).toFixed(3) + ')'));
    const pc = pop(lt, 2.75, 2.4, 8);
    put(S.pdfChip, { x: 1330, y: 850, r: -6, s: pc.s, o: pc.o, z: 8 });
    // envelope: lands, flap swings open, letter rises out
    const ed = drop(lt, 2.0, .4, 1640, 790, 10, 4);
    put(S.envB, ed);
    const fo = seg(lt, 2.75, 3.05, E.inOutCubic), up = seg(lt, 3.05, 3.5, E.outBack);
    put(S.flap, Object.assign({}, ed, { y: ed.y - 95 * ed.s, rx: 178 * fo, p: 900, z: undefined, drop: false }));
    setStyle(S.flap, 'zIndex', fo > .5 ? '-1' : '2');
    put(S.letter, Object.assign({}, ed, { y: ed.y + 10 - 120 * up, r: 4 - 3 * up, z: 2 + 8 * up, o: fo > .5 ? 1 : 0 }));
    put(S.envF, Object.assign({}, ed, { z: undefined }));
    // message: typing dots, then text
    const mp = pop(lt, 3.5, 2.2, 8);
    put(S.msg, { x: 1640, y: 410, s: mp.s, o: mp.o, z: 10, r: -2 });
    const typing = lt < 4.35;
    S.dots.forEach((d, i) => { setStyle(d, 'transform', 'translateY(' + f(-8 * Math.max(0, Math.sin((lt * 7) - i * .9))) + 'px)'); setStyle(d, 'visibility', typing ? 'visible' : 'hidden'); });
    S.msgLines.forEach((e, i) => setStyle(e, 'transform', 'scaleX(' + E.outQuad(seg(lt, 4.35 + i * .13, 4.6 + i * .13)).toFixed(3) + ')'));
    // plug in
    const pb = pop(lt, 4.4, 2.4, 8), pin = seg(lt, 4.5, 4.85, E.outCubic), snap = seg(lt, 4.9, 5.1, E.inQuad);
    put(S.plugB, { x: 420 - 10 * snap, y: 660, s: pb.s, o: pb.o, z: 6, drop: true });
    put(S.plugA, { x: lerp(-120, 330, pin) + 40 * snap, y: 660, z: 6, drop: true, o: lt > 4.5 ? 1 : 0 });
    const la = seg(lt, 4.7, 5.0, E.outCubic);
    put(S.labA, { x: 190, y: 712 + 8 * (1 - la), o: la });
    put(S.labB, { x: 430, y: 712 + 8 * (1 - la), o: la });
    const sk = seg(lt, 5.1, 5.5);
    put(S.spark, { x: 375, y: 660, s: .6 + .8 * sk, o: sk > 0 && sk < 1 ? 1 - sk : 0 });
  },
});

// ======================================================================== 8. start free
SP.scene({
  id: 'cta', land: 49.5, inDur: .75, enter: 'down', bg: '#F2542D',
  build(ct, S) {
    S.flA = flight(ct, [[-200, 180], [700, -40], [1400, 420], [2150, 120]], 'rgba(255,253,246,.55)');
    S.flB = flight(ct, [[2150, 980], [1500, 1140], [700, 760], [-200, 1000]], 'rgba(255,253,246,.55)');
    S.plA = plane(ct); S.plB = plane(ct);
    S.conf = confetti(ct, 54, 7, ['#FFD36B', '#FCFAF4', '#8A72DC', '#2B9DB3', '#23935E', '#1F2542', '#FFB199']);
    S.card = piece(ct, 1220, 640, 'var(--paper)');
    S.card.style.borderRadius = '30px';
    S.letters = 'SuperImpress'.split('').map((ch, i) => {
      const c = centred(ct, null, ch);
      css(c.e, { fontFamily: 'var(--f-display)', fontWeight: 760, fontSize: 150, letterSpacing: '-.02em', color: 'var(--ver)', fontVariationSettings: "'opsz' 144, 'SOFT' 100", lineHeight: '1.25' });
      return c;
    });
    S.tagline = new KT(ct, ['Find the jobs *worth* applying to.'], { x: 960, y: 486, cls: 'h1', size: 54, center: true, hlAt: .7 });
    S.tagline.box.style.fontWeight = '480'; S.tagline.box.style.fontStyle = 'italic';
    S.btn = piece(ct, 540, 100, 'var(--ink)');
    S.btn.style.borderRadius = '50px';
    css(S.btn, { color: '#FCFAF4', fontFamily: 'var(--f-ui)', fontWeight: 700, fontSize: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '14px' });
    S.btn.innerHTML = 'Start free <svg width="30" height="30" viewBox="0 0 30 30"><path d="M5 15 H24 M16 7 L24 15 L16 23" fill="none" stroke="#FCFAF4" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    S.note = centred(ct, 'h2', 'Free to start. No card needed.');
    css(S.note.e, { fontSize: 30, whiteSpace: 'nowrap', color: 'var(--ink2)' });
    S.url = centred(ct, 'mono', '');
    css(S.url.e, { fontSize: 34, fontWeight: 600, color: 'var(--ink)', whiteSpace: 'nowrap', letterSpacing: '.02em' });
    S.ptr = pointer(ct, [[2.2, 1500, 1160], [2.85, 1070, 668], [4.3, 1260, 900], [5.0, 1560, 1180]], [3.0], t => seg(t, 2.2, 2.4) * (1 - seg(t, 4.4, 4.9)));
    S.ev(.55, 'land', { x: 960, v: 1 });
    S.letters.forEach((c, i) => { if (i % 3 === 0) S.ev(.62 + i * .045, 'pop', { x: 560 + i * 70, n: i / 3 }); });
    S.ev(1.75, 'pop', { x: 960, n: 7 });
    S.ev(2.25, 'type', { x: 960, d: .7 });
    S.ev(3.0, 'click', { x: 1000 });
    S.ev(3.05, 'confetti', { x: 1000 });
    S.ev(.9, 'plane', { x: 600, d: 3.2 });
    S.ev(2.4, 'plane', { x: 1300, d: 3.4, v: .6 });
    S.ev(1.7, 'strip', { x: 960 });
  },
  update(lt, S) {
    push(S, lt, .025, 6.5);
    // two planes cross behind the card; each trail reels in once its plane is out of frame
    [[S.flA, S.plA, .6, 4.2], [S.flB, S.plB, 1.8, 5.6]].forEach(([fl, pl, t0, t1]) => {
      const u = seg(lt, t0, t1, E.inOutQuad), p = fl.at(u);
      put(pl, { x: p.x, y: p.y, r: p.a, s: 1.1, z: 30, drop: true, o: u > 0 && u < 1 ? 1 : 0 });
      fl.follow(u, .4, seg(lt, t1, t1 + .7, E.inOutQuad));
    });
    put(S.card, drop(lt, .05, .5, 960, 548, -5, -.6));
    const cs = drop(lt, .05, .5, 960, 548, -5, -.6);
    // the wordmark rises letter by letter, riding the card
    const widths = S._w || (S._w = S.letters.map(c => c.e.offsetWidth));
    const total = widths.reduce((s, w) => s + w, 0) - 3 * (widths.length - 1);
    let x = 960 - total / 2;
    S.letters.forEach((c, i) => {
      const w = widths[i], cx = x + w / 2; x += w - 3;
      const p = spring(lt, .55 + i * .045, 2.2, 7.5);
      put(c.a, { x: cx + (cs.x - 960), y: 372 + 26 * (1 - p) + (cs.y - 548), s: .4 + .6 * p, r: (cs.r || 0) * .6, o: seg(lt, .55 + i * .045, .6 + i * .045) });
    });
    S.tagline.update(lt, 1.0);
    const bp = pop(lt, 1.75, 2.3, 8), pr = lt > 2.93 && lt < 3.2 ? Math.sin(Math.PI * (lt - 2.93) / .27) : 0;
    put(S.btn, { x: 960, y: 648, s: bp.s * (1 - .05 * pr), o: bp.o, z: 12 - 9 * pr });
    const np = seg(lt, 2.0, 2.4, E.outCubic);
    put(S.note.a, { x: 960, y: 740 + 10 * (1 - np), o: np });
    const url = 'superimpress.com', n = Math.floor(clamp((lt - 2.25) / .7, 0, 1) * url.length);
    setText(S.url.e, url.slice(0, n) + (lt > 2.2 && (lt < 3.0 || Math.floor(lt * 2) % 2 === 0) ? '|' : ''));
    put(S.url.a, { x: 960, y: 800, o: lt > 2.2 ? 1 : 0 });
    S.conf.update(lt, 3.05, 960, 300);
    S.ptr.update(lt);
  },
});
})();
