// Renders the reel as a real 3D papercraft diorama.
//
// The scene generator's 3D backend emits world-space nodes (<m3>) inside the same
// group hierarchy the 2D reel uses, so every placement, delay and loop is shared.
// This engine turns those nodes into meshes, replays the same motion vocabulary on
// the same stepped clock (so the existing soundtrack stays in sync), and prints the
// frame through a riso/tilt-shift shader.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { FXAAShader } from 'three/addons/shaders/FXAAShader.js';

window.READY = false;
const Q = new URLSearchParams(location.search);            // profiling switches: ?msaa=&shadow=&tilt=
const W = 1280, H = 720, K = 1.543, X0 = (W - 720 * K) / 2;       // 720x420 scene space -> frame
const STOP = 12, ENTER = 5 / 12;
const SX = x => X0 + x * K, SY = y => y * K;
const V = (x, y, z) => new THREE.Vector3(x, z, y);                  // iso world (z up) -> three (y up)
const DL = { d1: .3, d2: .6, d3: .9, d4: 1.2, d5: 1.55, d6: 1.9, d7: 2.25, d8: 2.6, d9: 2.95, d10: 3.3, d11: 3.7, d12: 4.1 };
const ENTER_CLS = { 'a-drop': 'drop', 'a-stamp': 'stamp', 'a-in': 'in', 'a-up': 'up', 'a-dn': 'dn', 'a-l': 'l', 'a-r': 'r', 'a-pop': 'pop' };
const LOOP_CLS = ['bob', 'pulse', 'ripple', 'wave', 'drift', 'flicker', 'spin', 'jit', 'flow', 'grow', 'walk'];
const hash = (a, b) => { const x = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return x - Math.floor(x); };
const clamp = (v, a, b) => v < a ? a : (v > b ? b : v);
const fract = x => x - Math.floor(x);

// ---------------------------------------------------------------- easing, identical to the CSS
function bez(x1, y1, x2, y2) {
  const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx, cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
  const sx = t => ((ax * t + bx) * t + cx) * t, sy = t => ((ay * t + by) * t + cy) * t, d = t => (3 * ax * t + 2 * bx) * t + cx;
  return x => {
    if (x <= 0) return 0; if (x >= 1) return 1;
    let t = x;
    for (let i = 0; i < 8; i++) { const e = sx(t) - x, dd = d(t); if (Math.abs(e) < 1e-6 || Math.abs(dd) < 1e-6) break; t -= e / dd; }
    if (Math.abs(sx(t) - x) > 1e-4) { let lo = 0, hi = 1; t = x; for (let i = 0; i < 30; i++) { if (sx(t) < x) lo = t; else hi = t; t = (lo + hi) / 2; } }
    return sy(clamp(t, 0, 1));
  };
}
const E = {
  drop1: bez(.55, 0, .95, .45), drop2: bez(.2, .7, .35, 1), drop3: bez(.55, 0, .8, .5), dropD: bez(.3, .6, .35, 1),
  st1: bez(.6, 0, .95, .5), st2: bez(.2, .7, .3, 1), stD: bez(.3, .7, .3, 1),
  a: bez(.2, .82, .25, 1), grow: bez(.22, .8, .25, 1), draw: bez(.35, .65, .3, 1), ease: bez(.25, .1, .25, 1),
  io: bez(.42, 0, .58, 1), out: bez(0, 0, .58, 1), lin: t => t,
};
const lerp = (a, b, u) => Array.isArray(a) ? a.map((x, i) => x + (b[i] - x) * u) : a + (b - a) * u;
function track(kf, p) {                                   // [[at, value, easeToNext], ...]
  if (p <= kf[0][0]) return kf[0][1];
  for (let i = 0; i < kf.length - 1; i++) {
    const [a0, v0, e] = kf[i], [a1, v1] = kf[i + 1];
    if (p <= a1) return lerp(v0, v1, (e || E.lin)((p - a0) / (a1 - a0)));
  }
  return kf[kf.length - 1][1];
}
// entrances: `up` is world height, tx/ty screen px (ty positive = down), sq = [horizontal, vertical]
const ENT = {
  drop: { dur: 1.05, f: p => ({ up: track([[0, 84, E.drop1], [.46, 0, E.drop2], [.64, 11, E.drop3], [.82, 0, E.dropD], [1, 0]], p),
                                sq: track([[0, [1, 1], E.drop1], [.46, [1.07, .88], E.drop2], [.64, [.96, 1.05], E.drop3], [.82, [1.02, .97], E.dropD], [1, [1, 1]]], p) }) },
  stamp: { dur: .72, f: p => ({ op: track([[0, 0, E.st1], [.18, 1], [1, 1]], p),
                                sc: track([[0, 1.28, E.st1], [.48, .95, E.st2], [.70, 1.025, E.stD], [1, 1]], p),
                                rot: track([[0, -4.5, E.st1], [.48, .9, E.st2], [.70, -.4, E.stD], [1, 0]], p) }) },
  in: { dur: .78, f: p => ({ op: E.a(p) }) },
  up: { dur: .78, f: p => { const u = E.a(p); return { op: u, ty: 14 * (1 - u) }; } },
  dn: { dur: .78, f: p => { const u = E.a(p); return { op: u, ty: -14 * (1 - u) }; } },
  l:  { dur: .78, f: p => { const u = E.a(p); return { op: u, tx: -30 * (1 - u) }; } },
  r:  { dur: .78, f: p => { const u = E.a(p); return { op: u, tx: 30 * (1 - u) }; } },
  pop: { dur: .78, f: p => { const u = E.a(p); return { op: u, sc: .8 + .2 * u }; } },
};
const growS = p => track([[0, 0, E.grow], [.68, 1.06, E.grow], [.84, .98, E.grow], [1, 1]], p);
const hop = p => p < .45 ? E.ease(p / .45) : E.ease(1 - (p - .45) / .55);
const swing = p => p < .5 ? E.io(p / .5) : E.io(1 - (p - .5) / .5);
const flickerOp = p => track([[0, 1], [.18, .62], [.30, 1], [.57, .8], [.74, 1], [.88, .7], [1, 1]], p);

// ---------------------------------------------------------------- renderer, lights, print pass
const renderer = new THREE.WebGLRenderer({ antialias: false, preserveDrawingBuffer: true });
renderer.setSize(W, H); renderer.setPixelRatio(1);
renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.NoToneMapping;
renderer.shadowMap.enabled = Q.get('shadow') !== '0'; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.getElementById('gl').appendChild(renderer.domElement);
const scene = new THREE.Scene(); scene.background = new THREE.Color('#FAF5E9');
const camera = new THREE.PerspectiveCamera(24, W / H, 20, 5000);
scene.add(new THREE.HemisphereLight('#FFF6E6', '#8E95B8', 1.85));
const sun = new THREE.DirectionalLight('#FFF1D8', 1.9);
sun.position.set(-140, 460, 300); sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, { left: -340, right: 340, top: 340, bottom: -340, near: 50, far: 1400 });
sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.6; scene.add(sun); scene.add(sun.target);
const table = new THREE.Mesh(new THREE.PlaneGeometry(6000, 6000), new THREE.MeshLambertMaterial({ color: '#F4EDDC' }));
table.rotation.x = -Math.PI / 2; table.position.y = -1.7; table.receiveShadow = true; scene.add(table);

const PRINT = {
  uniforms: { tDiffuse: { value: null }, res: { value: new THREE.Vector2(W, H) }, focus: { value: .55 }, flick: { value: 0 } },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }`,
  fragmentShader: `
    #define TILT ${Q.get('tilt') === '0' ? '0.0' : '5.5'}
    uniform sampler2D tDiffuse; uniform vec2 res; uniform float focus; uniform float flick; varying vec2 vUv;
    float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
    float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.-2.*f);
      return mix(mix(h(i), h(i+vec2(1,0)), f.x), mix(h(i+vec2(0,1)), h(i+vec2(1,1)), f.x), f.y); }
    void main(){
      // tilt-shift: a sharp band through the subject, softening towards top and bottom, as a macro lens on a miniature
      float r = TILT * smoothstep(.16, .52, abs(vUv.y - focus));
      vec3 c = texture2D(tDiffuse, vUv).rgb;
      if (r > .25) {
        vec2 px = r / res; vec3 acc = c; float n = 1.;
        for (int i = 0; i < 12; i++) { float a = float(i) * 2.39996; float d = sqrt(float(i) + .5) / 3.5;
          acc += texture2D(tDiffuse, vUv + vec2(cos(a), sin(a)) * d * px).rgb; n += 1.; }
        c = acc / n;
      }
      vec2 p = vUv * res;
      // riso screen: paper-coloured dots punched out of the ink, sized by how much ink is there
      float ang = .26; mat2 R = mat2(cos(ang), -sin(ang), sin(ang), cos(ang));
      vec2 f = fract(R * p / 5.0) - .5;
      float ink = 1. - dot(c, vec3(.299, .587, .114));
      float rad = .40 * smoothstep(.10, .80, ink);
      float dotm = smoothstep(rad, rad - .09, length(f));
      c = mix(c, vec3(.98, .96, .91), dotm * .34 * step(.14, ink));
      // paper: fine grain, soft mottling, and a vignette
      c *= .935 + .065 * h(floor(p));
      float m = vn(p / 190.) * .6 + vn(p / 70.) * .4;
      c *= 1. - .07 * smoothstep(.45, .95, m);
      c *= 1. - .20 * smoothstep(.42, .92, distance(vUv, vec2(.5, .48)));
      c *= 1. - flick;
      gl_FragColor = vec4(c, 1.);
    }` };
// Multisampling costs ~40% of the frame in software WebGL (2x costs the same as 4x), so
// edges are smoothed by one FXAA pass on the finished image instead.
const rt = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, samples: +(Q.get('msaa') ?? 0) });
const composer = new EffectComposer(renderer, rt);
composer.addPass(new RenderPass(scene, camera));
composer.addPass(new OutputPass());
const fxaa = new ShaderPass(FXAAShader); fxaa.material.uniforms.resolution.value.set(1 / W, 1 / H);
if (Q.get('fxaa') !== '0') composer.addPass(fxaa);
const printPass = new ShaderPass(PRINT); composer.addPass(printPass);

// ---------------------------------------------------------------- mesh builders
function mat(c, op = 1) {
  const m = new THREE.MeshLambertMaterial({ color: c });
  m.userData.base = op; m.transparent = op < 1; m.opacity = op;
  return m;
}
function solid(geo, material, pos, cast = true) {
  const m = new THREE.Mesh(geo, material); m.position.copy(pos);
  m.castShadow = cast; m.receiveShadow = true; return m;
}
function beam(a, b, rad, material) {                      // a cylinder from world point a to b
  const A = V(...a), B = V(...b), d = B.clone().sub(A), len = Math.max(d.length(), .01);
  const m = solid(new THREE.CylinderGeometry(rad, rad, len, 7), material, A.clone().add(B).multiplyScalar(.5));
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()); return m;
}

function buildItem(j, parent, ctx, S) {
  const g = new THREE.Group(); parent.add(g);
  const op = j.op ?? 1;
  switch (j.t) {
    case 'box': g.add(solid(new THREE.BoxGeometry(j.w, Math.max(j.h, .5), j.d), mat(j.c, op), V(j.x + j.w / 2, j.y + j.d / 2, j.z + Math.max(j.h, .5) / 2))); break;
    case 'plane': g.add(solid(new THREE.BoxGeometry(j.w, 1.6, j.d), mat(j.c, op), V(j.x + j.w / 2, j.y + j.d / 2, j.z - .8), j.z > 1)); break;
    case 'disc': g.add(solid(new THREE.CylinderGeometry(j.r, j.r, 1.4, 48), mat(j.c, op), V(j.x, j.y, j.z + .7))); break;
    case 'cyl': g.add(solid(new THREE.CylinderGeometry(j.r, j.r, Math.max(j.h, .5), 48), [mat(j.c, op), mat(j.top, op), mat(j.c, op)], V(j.x, j.y, j.z + Math.max(j.h, .5) / 2))); break;
    case 'dome': {
      // a cutaway removes the quarter facing the camera (+X,+Z), as in a cut-open model
      const geo = j.cut ? new THREE.SphereGeometry(j.r, 44, 16, Math.PI, Math.PI * 1.5, 0, Math.PI / 2)
                        : new THREE.SphereGeometry(j.r, 44, 16, 0, Math.PI * 2, 0, Math.PI / 2);
      const material = mat(j.c, op); if (j.cut) material.side = THREE.DoubleSide;
      const m = solid(geo, material, V(j.x, j.y, j.z)); m.scale.y = Math.max(.2, .82 * j.h / j.r); g.add(m);
      if (j.cut) {                                          // the paper edge of the cut
        for (const a of [Math.PI / 2, Math.PI]) {
          const e = new THREE.Mesh(new THREE.TorusGeometry(j.r, .9, 5, 24, Math.PI / 2), mat('#FAF5E9'));
          e.position.copy(V(j.x, j.y, j.z)); e.rotation.set(0, a - Math.PI / 2, 0); e.scale.set(1, Math.max(.2, .82 * j.h / j.r), 1); g.add(e);
        }
      }
      break; }
    case 'ring': {
      const tube = Math.max(.55, j.w * .42), material = mat(j.c, op);
      if (j.dash) { for (let k = 0; k < 28; k++) { const m = new THREE.Mesh(new THREE.TorusGeometry(j.r, tube, 5, 6, (Math.PI * 2 / 28) * .55), material);
                     m.rotation.set(Math.PI / 2, 0, k * Math.PI * 2 / 28); m.position.copy(V(j.x, j.y, j.z)); m.castShadow = true; g.add(m); } }
      else { const m = solid(new THREE.TorusGeometry(j.r, tube, 8, 72), material, V(j.x, j.y, j.z)); m.rotation.x = Math.PI / 2; g.add(m); }
      break; }
    case 'line': g.add(beam(j.a, j.b, Math.max(.45, j.w * .38), mat(j.c, op))); break;
    case 'fig': {
      const s = j.s || 1, inner = new THREE.Group(), f = new THREE.Group();
      f.position.copy(V(j.x, j.y, j.z)); g.add(f); f.add(inner);
      inner.add(solid(new THREE.CapsuleGeometry(2.15 * s, 5.2 * s, 4, 12), mat(j.c), new THREE.Vector3(0, 4.8 * s, 0)));
      inner.add(solid(new THREE.SphereGeometry(2.7 * s, 16, 12), mat(j.head), new THREE.Vector3(0, 12.2 * s, 0)));
      S.figs.push({ inner, ph: j.ph || 0 }); break; }
    case 'glass': {
      const m = new THREE.Mesh(new THREE.CylinderGeometry(j.r, j.r, j.h, 56, 1, true), mat(j.c, .30));
      m.material.side = THREE.DoubleSide; m.material.depthWrite = false; m.material.userData.glass = true;
      m.position.copy(V(j.x, j.y, j.z + j.h / 2)); m.receiveShadow = true; g.add(m);
      for (const zz of [j.z, j.z + j.h]) { const rim = solid(new THREE.TorusGeometry(j.r, .7, 6, 72), mat('#FAF5E9', .85), V(j.x, j.y, zz)); rim.rotation.x = Math.PI / 2; g.add(rim); }
      break; }
    case 'arrow': {
      const A = V(...j.a), B = V(...j.b), d = B.clone().sub(A), len = d.length(), hl = Math.min(9, len * .3), rad = Math.max(.7, j.w * .4);
      const grp = new THREE.Group(); grp.position.copy(A); grp.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().normalize()); g.add(grp);
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(rad, rad, 1, 8), mat(j.c)); shaft.castShadow = true;
      const head = new THREE.Mesh(new THREE.ConeGeometry(rad * 2.8, hl, 12), mat(j.c)); head.castShadow = true;
      grp.add(shaft); grp.add(head);
      S.arrows.push({ grp, shaft, head, len, hl, flow: ctx.flow, dl: ctx.dl }); break; }
    case 'cone': {
      const apex = V(j.x, j.y, j.z), base = V(j.x + j.dx - j.spread / 2, j.y + j.dy - j.spread / 2, 0), d = base.clone().sub(apex);
      const m = new THREE.Mesh(new THREE.ConeGeometry(j.spread * .62, d.length(), 28, 1, true),
                               new THREE.MeshBasicMaterial({ color: j.c, transparent: true, opacity: .26, depthWrite: false, side: THREE.DoubleSide }));
      m.material.userData.base = .26;
      m.position.copy(apex.clone().add(base).multiplyScalar(.5)); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), d.normalize()); g.add(m); break; }
    case 'orbit': {
      const o = new THREE.Group(); o.position.copy(V(j.x, j.y, j.z)); g.add(o);
      o.add(solid(new THREE.SphereGeometry(4, 14, 10), mat(j.c), new THREE.Vector3(j.r, 0, 0)));
      o.add(solid(new THREE.SphereGeometry(3, 14, 10), mat(j.c2), new THREE.Vector3(-j.r, 0, 0)));
      S.orbits.push(o); break; }
    case 'drip': {
      const m = solid(new THREE.SphereGeometry(2.4, 12, 8), mat(j.c), V(...j.a)); g.add(m);
      S.drips.push({ m, a: V(...j.a), b: V(...j.b), ph: j.ph }); break; }
    default: {                                            // overlay items: plates, headings, counters, labels, tags
      const el = document.createElement('div'); S.hudLayer.appendChild(el);
      const it = { j, el, chain: ctx.chain.slice(), dl: ctx.dl };
      if (j.t === 'plate') {
        el.className = 'card'; Object.assign(el.style, { left: SX(j.x) + 'px', top: SY(j.y) + 'px', width: j.w * K + 'px', height: j.h * K + 'px', '--acc': j.accent });
        el.innerHTML = '<div class="bg"></div><div class="mis"></div><div class="acc"></div><div class="tx"><div class="t">' + j.title + '</div>' +
                       j.lines.map(l => '<div class="l" style="font-size:' + (j.fs * K).toFixed(1) + 'px">' + (l || '&nbsp;') + '</div>').join('') + '</div>';
      } else if (j.t === 'heading') {
        el.className = 'heading'; el.textContent = j.text; Object.assign(el.style, { left: SX(j.x) + 'px', top: (SY(j.y) - 13 * K) + 'px', color: j.fill });
      } else {
        el.className = j.t === 'tag' ? 'tag' : 'anchored'; el.style.color = j.fill || '#1E2647';
        if (j.size) el.style.fontSize = (j.size * K * (j.t === 'label' ? 1 : 1.05)).toFixed(1) + 'px';
        el.textContent = j.t === 'label' ? j.text : '';
      }
      S.huds.push(it);
    }
  }
  return g;
}

// ---------------------------------------------------------------- scene graph from the generator's XML
function buildScene(xml, idx) {
  const doc = new DOMParser().parseFromString('<svg xmlns="http://www.w3.org/2000/svg">' + xml + '</svg>', 'image/svg+xml');
  const top = doc.documentElement.firstElementChild;
  const S = { idx, root: new THREE.Group(), nodes: [], huds: [], figs: [], arrows: [], orbits: [], drips: [],
              ox: +top.getAttribute('data-ox'), oy: +top.getAttribute('data-oy') };
  S.hudLayer = document.createElement('div'); S.hudLayer.className = 'hudscene'; document.getElementById('hud').appendChild(S.hudLayer);
  scene.add(S.root); S.root.visible = false;
  let boilN = 0;
  (function visit(el, parent, ctx) {
    for (const ch of el.children) {
      if (ch.localName === 'g') {
        const cls = (ch.getAttribute('class') || '').split(/\s+/).filter(Boolean);
        const st = {}; (ch.getAttribute('style') || '').split(';').forEach(kv => { const i = kv.indexOf(':'); if (i > 0) st[kv.slice(0, i).trim()] = kv.slice(i + 1).trim(); });
        const g = new THREE.Group(); g.matrixAutoUpdate = false; parent.add(g);
        const d = cls.find(c => /^d\d+$/.test(c));
        const n = { g, cls, dl: d ? DL[d] : ctx.dl, ent: null, loops: cls.filter(c => LOOP_CLS.includes(c)),
                    ph: parseFloat(st['animation-delay'] || '0') || 0, fd: parseFloat(st['--fd'] || '0') || 0,
                    wx: parseFloat(st['--wx'] || '0'), wy: parseFloat(st['--wy'] || '0'), boil: cls.includes('bl') ? boilN++ : null };
        if (cls.includes('a')) { const e = cls.find(c => ENTER_CLS[c]); if (e) n.ent = { type: ENTER_CLS[e], delay: d ? DL[d] : 0 }; }
        S.nodes.push(n);
        visit(ch, g, { dl: n.dl, flow: n.loops.includes('flow') ? n : ctx.flow, chain: [n].concat(ctx.chain), node: n });
        if (n.loops.includes('spin')) n.spinTargets = S.orbits.slice(-1);
      } else if (ch.localName === 'm3') {
        buildItem(JSON.parse(ch.getAttribute('j')), parent, ctx, S);
      }
    }
  })(top, S.root, { dl: 0, flow: null, chain: [], node: null });
  // pivots: squash and growth hinge on the base, pulses and ripples on the centre
  S.root.updateMatrixWorld(true);
  for (const n of S.nodes) {
    const b = new THREE.Box3().setFromObject(n.g); if (b.isEmpty()) { n.pivot = new THREE.Vector3(); continue; }
    const c = b.getCenter(new THREE.Vector3());
    n.pivot = (n.ent && n.ent.type === 'drop') || n.loops.includes('grow') ? new THREE.Vector3(c.x, b.min.y, c.z) : c;
  }
  // per-mesh materials so each group can fade on its own
  S.root.traverse(o => { if (o.isMesh) { o.material = Array.isArray(o.material) ? o.material.map(m => m.clone()) : o.material.clone(); } });
  return S;
}

// ---------------------------------------------------------------- per-frame state
const M = new THREE.Matrix4(), Mt = new THREE.Matrix4(), Ms = new THREE.Matrix4();
function place(S, q, sf) {
  for (const n of S.nodes) {
    let vis = true, op = 1, sx = 1, sy = 1, sz = 1; const tr = new THREE.Vector3();
    if (n.ent) {
      const t = q - n.ent.delay;
      if (t < 0) vis = false;
      else {
        const d = ENT[n.ent.type], s = d.f(Math.min(1, t / d.dur));
        if (s.op !== undefined) op *= s.op;
        if (s.up) tr.y += s.up;
        if (s.sq) { sx = sz = s.sq[0]; sy = s.sq[1]; }
        if (s.ty) tr.y -= s.ty;
        if (s.tx) { const k = s.tx / 1.2247 * .7071; tr.x += k; tr.z -= k; }
        if (typeof s.sc === 'number') { sx *= s.sc; sy *= s.sc; sz *= s.sc; }
      }
    }
    for (const L of n.loops) {
      if (L === 'bob') tr.y += 3.2 * swing(fract((q - n.ph) / 1.1));
      else if (L === 'pulse') { const u = swing(fract(q / 1.7)); sx *= 1 + .08 * u; sy *= 1 + .08 * u; sz *= 1 + .08 * u; op *= .82 + .18 * u; }
      else if (L === 'ripple') { const p = E.out(fract((q - n.ph) / 2.1)); const k = .55 + 1.35 * p; sx *= k; sz *= k; op *= .95 * (1 - p); }
      else if (L === 'wave') { const p = fract(q / 2.4), e = E.out(p); const k = .28 + .72 * e; sx *= k; sz *= k; op *= p < .8 ? .95 - .45 * (p / .8) : .5 * (1 - (p - .8) / .2); }
      else if (L === 'drift') { const p = q / 3.4, k = Math.floor(p); let f = p - k; if (k % 2) f = 1 - f; tr.x += -6.9 + 13.8 * E.io(f); }
      else if (L === 'flicker') op *= flickerOp(fract(q / 1.45));
      else if (L === 'jit') { const k = Math.floor(fract((q - n.ph) / .5) * 3); const o = [[0, 0], [2, -1.4], [-1.5, 1.2]][k]; tr.x += o[0] * .8; tr.z -= o[0] * .8; tr.y -= o[1]; }
      else if (L === 'grow') { const t = q - n.dl; sy *= t < 0 ? 0.001 : Math.max(.001, growS(Math.min(1, t / 1.5))); }
      else if (L === 'walk') { const t = q - n.dl, f = t < 0 ? 1 : Math.max(0, 1 - t / 2.7); tr.x += n.wx * f; tr.z += n.wy * f; }
      else if (L === 'spin' && n.spinTargets) n.spinTargets.forEach(o => o.rotation.y = -Math.PI * 2 * fract(q / 2.2));
    }
    if (n.boil !== null) { tr.x += (hash(sf, n.boil) - .5) * 1.1; tr.z += (hash(sf, n.boil + 71) - .5) * 1.1; tr.y += (hash(sf, n.boil + 13) - .5) * .5; }
    const P = n.pivot;
    M.makeTranslation(P.x + tr.x, P.y + tr.y, P.z + tr.z).multiply(Ms.makeScale(sx, sy, sz)).multiply(Mt.makeTranslation(-P.x, -P.y, -P.z));
    n.g.matrix.copy(M); n.g.matrixWorldNeedsUpdate = true; n.g.visible = vis; n.op = op;
  }
  for (const f of S.figs) f.inner.position.y = 4 * hop(fract((q - f.ph) / .68));
  for (const d of S.drips) { const p = fract((q + d.ph) / 1.1); d.m.position.lerpVectors(d.a, d.b, p); d.m.userData.opf = p < .12 ? p / .12 : (p > .86 ? (1 - p) / .14 : 1); }
  for (const a of S.arrows) {
    let frac, head;
    if (a.flow) { const p = fract((q - a.flow.fd) / 1.35); frac = p < .68 ? p / .68 : 1; a.grp.userData.opf = p < .68 ? 1 : 1 - (p - .68) / .32;
                  head = p < .52 ? 0 : (p < .66 ? (p - .52) / .14 : 1 - (p - .66) / .34); }
    else { const t = q - a.dl; frac = t <= 0 ? 0 : E.draw(Math.min(1, t / .72)); head = t < .6 ? 0 : Math.min(1, (t - .6) / .2); a.grp.userData.opf = 1; }
    const sl = Math.max(.001, (a.len - a.hl) * frac);
    a.shaft.scale.y = sl; a.shaft.position.y = sl / 2; a.head.position.y = sl + a.hl / 2;
    a.shaft.visible = frac > .01; a.head.visible = head > .02; a.head.userData.opf = head;
  }
  // opacity flows down the hierarchy; a mesh is transparent only while it is fading
  const nodeOf = new Map(S.nodes.map(n => [n.g, n]));
  (function walk(o, acc) {
    const n = nodeOf.get(o); if (n) acc *= n.op;
    if (o.userData.opf !== undefined) acc *= o.userData.opf;
    if (o.isMesh) {
      for (const m of (Array.isArray(o.material) ? o.material : [o.material])) {
        const base = m.userData.base ?? 1, eff = base * acc;
        const tr = eff < .995 || m.userData.glass;
        if (m.transparent !== tr) { m.transparent = tr; m.needsUpdate = true; }
        m.opacity = eff;
      }
      o.castShadow = acc > .5 && !(o.material.userData && o.material.userData.glass);
    }
    for (const c of o.children) walk(c, acc);
  })(S.root, 1);
}

const proj = new THREE.Vector3();
function project(x, y, z) { proj.copy(V(x, y, z)).project(camera); return [(proj.x * .5 + .5) * W, (-proj.y * .5 + .5) * H]; }
function hud(S, q, sf) {
  for (const it of S.huds) {
    let vis = true, op = 1, tx = 0, ty = 0, sc = 1, rot = 0;
    for (const n of it.chain) {
      if (n.ent) { const t = q - n.ent.delay; if (t < 0) { vis = false; break; }
        const d = ENT[n.ent.type], s = d.f(Math.min(1, t / d.dur));
        if (s.op !== undefined) op *= s.op; tx += s.tx || 0; ty += (s.ty || 0) - (s.up || 0); if (typeof s.sc === 'number') sc *= s.sc; rot += s.rot || 0; }
      if (n.boil !== null) { tx += (hash(sf, n.boil) - .5) * 1.25; ty += (hash(sf, n.boil + 71) - .5) * 1.25; }
      if (n.loops.includes('flicker')) op *= flickerOp(fract(q / 1.45));
    }
    const el = it.el, j = it.j;
    if (!vis || op < .01) { el.style.display = 'none'; continue; }
    el.style.display = ''; el.style.opacity = op.toFixed(3);
    let base = '';
    if (j.t === 'count' || j.t === 'label' || j.t === 'tag') {
      let x, y;
      if (j.t === 'tag') { const t = q - it.dl, g = t < 0 ? 0 : growS(Math.min(1, t / 1.5)); [x, y] = project(j.x, j.y, j.h * g); x += 36 * K; y -= 4 * K; }
      else if (j.w) [x, y] = project(...j.w); else { x = SX(j.sx); y = SY(j.sy) - 10; }
      if (j.t !== 'label') {
        const t0 = j.t0, t1 = j.t1; const p = 1 - Math.pow(1 - clamp((q - t0) / (t1 - t0), 0, 1), 3);
        const from = j.frm || 0, to = j.t === 'tag' ? j.pct : j.to, dec = j.t === 'tag' ? 1 : j.dec, suf = j.t === 'tag' ? '%' : (j.suf || '');
        el.textContent = (from + (to - from) * p).toFixed(dec) + suf;
      }
      base = 'translate(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px) ' + (j.t === 'tag' ? 'translate(0,-50%) ' : 'translate(-50%,-60%) ');
    }
    el.style.transform = base + 'translate(' + (tx * K).toFixed(2) + 'px,' + (ty * K).toFixed(2) + 'px) rotate(' + rot.toFixed(2) + 'deg) scale(' + sc.toFixed(4) + ')';
  }
}

// ---------------------------------------------------------------- camera: aligned with the isometric layout, then moved
function aim(S, i, pu, sf) {
  const e = pu < .5 ? 2 * pu * pu : 1 - Math.pow(-2 * pu + 2, 2) / 2, dir = (i % 2) ? -1 : 1;
  let az = 45 + dir * (-8 + 16 * e) + (hash(sf, 13) - .5) * .35;
  let el = 35.26 - 5 * e + (hash(sf, 5) - .5) * .25;
  let D = 896 * (1 - .07 * e);
  if (i === 0) { const u = E.io(pu); el = 64 - 28 * u; D = 896 * (1.28 - .32 * u); az = 45 - 18 + 26 * u; }   // the opening crane-down
  const r = Math.PI / 180, cx = D * Math.cos(el * r) * Math.sin(az * r), cy = D * Math.sin(el * r), cz = D * Math.cos(el * r) * Math.cos(az * r);
  camera.position.set(cx, cy, cz); camera.lookAt(0, 0, 0);
  const fx = SX(S.ox), fy = SY(S.oy);                      // put the world origin where the isometric drawing put it
  camera.setViewOffset(W, H, -(fx - W / 2), -(fy - H / 2), W, H);
  camera.updateMatrixWorld(); camera.updateProjectionMatrix();
  printPass.uniforms.focus.value = 1 - fy / H;
  sun.target.position.set(0, 0, 0);
}

// ---------------------------------------------------------------- boot
const DATA = JSON.parse(document.getElementById('data').textContent);
const SCENES = DATA.scenes.map((x, i) => buildScene(x, i));
const CUES = DATA.cues, OFF = []; let acc = 0; for (const c of CUES) { OFF.push(acc); acc += c[0]; }
window.TOTAL = acc;
const pad = n => n < 10 ? '0' + n : '' + n;
let last = -1;
window.seek = function (t) {
  if (t > window.TOTAL) t = window.TOTAL;
  const sf = Math.floor(t * STOP + 1e-6), tq = sf / STOP;
  let i = CUES.length - 1; while (i > 0 && t < OFF[i]) i--;
  const lt = t - OFF[i], dur = CUES[i][0], q = Math.max(0, tq - OFF[i] - ENTER), S = SCENES[i];
  if (i !== last) { SCENES.forEach((s, k) => { s.root.visible = k === i; s.hudLayer.style.display = k === i ? '' : 'none'; }); last = i; }
  place(S, q, sf);
  aim(S, i, clamp((tq - OFF[i]) / dur, 0, 1), sf);
  hud(S, q, sf);
  printPass.uniforms.flick.value = .010 + hash(sf, 999) * .034;
  window.overlay(t, tq, i, lt, dur);
  composer.render();
};
window.READY = true;
