# -*- coding: utf-8 -*-
"""Compose the 1920x1080 video page from the same scenes the web page uses."""
import sys, os, json
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import scenes as SC

SCRATCH = sys.argv[1] if len(sys.argv) > 1 else '.'

CUES = [
 (11, [(0, "Lutetium-177 DOTATATE: how a radioactive molecule treats a grade 1, stage 4 neuroendocrine tumour."),
       (5.5, "A targeting peptide, a chelator cage, and a radioactive payload — bolted permanently together.")]),
 (13, [(0, "Grade 1 means a Ki-67 index of 2% or less. The tumour divides reluctantly."),
       (4.5, "Stage 4 means it has already spread, in most midgut cases to the liver."),
       (9, "Too slow to attack with chemotherapy. Too scattered for surgery to reach.")]),
 (13, [(0, "Well-differentiated NET cells keep the machinery of their normal ancestors."),
       (4.5, "Including somatostatin receptor 2 — ten to a hundred times more of it."),
       (9, "So the arithmetic runs backwards: the lower the grade, the better the target.")]),
 (13, [(0, "Three parts, three jobs. Octreotate is the address: it locks onto the receptor."),
       (4.5, "DOTA is the cage. Without it a loose lutetium ion would drift to bone."),
       (9, "Lutetium-177 is the payload — a beta emitter with a 6.65-day half-life.")]),
 (13, [(0, "Swap the payload for gallium-68 and the same peptide becomes a PET tracer."),
       (4.5, "So the scan predicts exactly where the therapy will deposit its dose."),
       (9, "Uptake must exceed normal liver — Krenning 3 or 4 — or there is nothing to treat.")]),
 (14, [(0, "Infusion day starts with amino acids: lysine and arginine, half an hour ahead."),
       (5, "They saturate the kidney's reabsorption route, so the tubule is spared."),
       (9.5, "Then the therapy itself: 7.4 gigabecquerel, over thirty minutes.")]),
 (14, [(0, "The peptide binds, and the receptor drags the whole pair inside the cell."),
       (5, "A lysosome digests the peptide — but the caged metal cannot get back out."),
       (9.5, "The tumour holds it for days while the blood clears in hours. That gap is the treatment.")]),
 (14, [(0, "Every decay releases one electron, averaging 134 kiloelectronvolts."),
       (5, "It splits water into hydroxyl radicals, and strikes the DNA directly."),
       (9.5, "Both rails of the helix break at once. Repair is outrun, and the cell dies.")]),
 (14, [(0, "That electron travels half a millimetre to two millimetres through tissue."),
       (5, "Dozens of cells deep — so neighbours carrying no receptor are irradiated too."),
       (9.5, "The same physics puts dose in kidneys, marrow and spleen. Those set the ceiling.")]),
 (13, [(0, "Four infusions, eight weeks apart: 29.6 gigabecquerel over about eight months."),
       (4.5, "Blood counts and kidney function are checked before every cycle."),
       (9, "And a scan the next day confirms where the dose actually landed.")]),
 (13, [(0, "NETTER-1 randomised 229 patients with progressive midgut neuroendocrine tumours."),
       (4.5, "65% were progression-free at twenty months, against 11% on high-dose octreotide."),
       (9, "But tumours shrank in only 18%, and the survival gain was not significant.")]),
 (14, [(0, "A tumour that grows slowly also shrinks slowly. Response is read over months."),
       (5, "Early: fatigue, nausea, a dip in blood counts. Late: about a 2% risk of leukaemia."),
       (9.5, "Disease held still counts as success.")]),
 (9,  [(0, "Educational material — not medical advice.")]),
]
assert len(CUES) == len(SC.ALL)

fonts = open(os.path.join(SCRATCH, 'fonts-inline.css')).read()
css = open(os.path.join(HERE, 'page.css')).read()
scene_html = '\n'.join('<div class="sc%s"><svg viewBox="0 0 720 420">%s</svg></div>'
                       % (' is-active' if i == 0 else '', fn())
                       for i, fn in enumerate(SC.ALL))

html = f'''<!doctype html><html><head><meta charset="utf-8"><title>reel</title>
<style>{fonts}</style>
<style>{css}</style>
<style>
html,body{{width:1920px;height:1080px;margin:0;padding:0;overflow:hidden;background:var(--paper)}}
body::before{{display:none}}
#frame{{position:relative;width:1920px;height:1080px;background:var(--paper);overflow:hidden}}
#scenes{{position:absolute;left:130px;top:8px;width:1660px;height:968px;transform-origin:50% 46%}}
#scenes .sc{{margin:0}}
#scenes svg{{display:block;width:1660px;height:968px;overflow:visible}}
#trans{{position:absolute;left:0;top:0;width:1920px;height:984px;z-index:4;display:none}}
#mottle,#vignette,#flick{{position:absolute;inset:0;pointer-events:none}}
#mottle{{z-index:7;opacity:.42;will-change:transform}}
#vignette{{z-index:8;background:radial-gradient(ellipse 78% 72% at 50% 47%,rgba(0,0,0,0) 58%,rgba(30,38,71,.20) 100%)}}
#flick{{z-index:9;background:#1E2647;opacity:0}}
#slate{{position:absolute;right:130px;top:26px;font-family:var(--mono);font-weight:600;font-size:19px;letter-spacing:.14em;color:var(--navyL);z-index:6}}
#cap{{position:absolute;left:130px;right:130px;top:990px;height:68px;display:flex;align-items:center;gap:20px;z-index:6}}
#capRule{{width:6px;align-self:stretch;background:var(--rust);flex:none}}
#capText{{margin:0;font-family:var(--body);font-size:33px;line-height:1.3;color:var(--ink);text-wrap:balance}}
#bar{{position:absolute;left:130px;right:130px;top:1062px;height:6px;background:var(--creamD);z-index:6}}
#barFill{{height:6px;width:0;background:var(--gold)}}
</style></head><body>
<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>
  <filter id="roughEdge" x="-4%" y="-8%" width="108%" height="116%">
    <feTurbulence id="roughTurb" type="fractalNoise" baseFrequency="0.038" numOctaves="2" seed="3"/>
    <feDisplacementMap in="SourceGraphic" scale="3.2" xChannelSelector="R" yChannelSelector="G"/>
  </filter>
</defs></svg>
<div id="frame">
  <div id="scenes">{scene_html}</div>
  <svg id="trans" viewBox="0 0 1920 984"><defs>
    <pattern id="tdots" width="8.3" height="8.3" patternUnits="userSpaceOnUse" patternTransform="rotate(15)">
      <circle cx="4.15" cy="4.15" r="2.9" fill="#FAF5E9"/></pattern>
    <filter id="tgrain"><feTurbulence type="fractalNoise" baseFrequency="0.6" numOctaves="2" seed="4"/>
      <feColorMatrix type="saturate" values="0"/><feComposite in2="SourceGraphic" operator="in"/></filter>
  </defs></svg>
  <svg id="mottle" viewBox="0 0 1920 1080" preserveAspectRatio="none">
    <filter id="mot" x="0" y="0" width="100%" height="100%">
      <feTurbulence type="fractalNoise" baseFrequency="0.011 0.016" numOctaves="3" seed="11"/>
      <feColorMatrix type="matrix" values="0 0 0 0 .52  0 0 0 0 .42  0 0 0 0 .27  0 0 0 -1.1 .62"/>
    </filter>
    <rect width="1920" height="1080" filter="url(#mot)"/>
  </svg>
  <div id="vignette"></div>
  <div id="flick"></div>
  <div id="slate">01 / {len(SC.ALL)}</div>
  <div id="cap"><div id="capRule"></div><p id="capText"></p></div>
  <div id="bar"><div id="barFill"></div></div>
</div>
<script>
var CUES = {json.dumps(CUES)};
var FPS_STOP = 12;          // poses per second: the video is 24 fps, so every pose is held for two frames
var ENTER = 5/12;           // scene clocks start once the incoming tile sweep has cleared (a whole number of poses)
var SCN = document.querySelectorAll('#scenes .sc');
var OFF = [], acc = 0;
for (var i=0;i<CUES.length;i++){{ OFF.push(acc); acc += CUES[i][0]; }}
window.TOTAL = acc;
function pad(n){{ return n<10?'0'+n:''+n; }}
function hash(a,b){{ var x=Math.sin(a*127.1+b*311.7)*43758.5453; return x-Math.floor(x); }}
function clamp(v,a,b){{ return v<a?a:(v>b?b:v); }}

// ---- transition tiles: an isometric diamond lattice that sweeps the frame between scenes
var TR = document.getElementById('trans'), TILES = [];
(function(){{
  var NS='http://www.w3.org/2000/svg', inks=['#2B3A67','#2B3A67','#2B3A67','#2B3A67','#3D5083','#3D5083','#EFBF49','#3E9E8F','#E9B2A6'];
  for (var r=-1;r<=22;r++) for (var c=-1;c<=12;c++) {{
    var cx=c*160+((r&1)?80:0), cy=r*46, g=document.createElementNS(NS,'g');
    // each tile is printed: a flat ink, paper dots punched through it, and a trace of grain
    [['fill',inks[Math.floor(hash(c+3,r+7)*inks.length)],'1'],['fill','url(#tdots)','.30'],['filter','url(#tgrain)','.16']].forEach(function(L){{
      var p=document.createElementNS(NS,'polygon'); p.setAttribute('points','0,-47 81,0 0,47 -81,0');
      if (L[0]==='fill') p.setAttribute('fill',L[1]); else {{ p.setAttribute('fill','#1E2647'); p.setAttribute('filter',L[1]); }}
      p.setAttribute('opacity',L[2]); g.appendChild(p);
    }});
    TR.appendChild(g);
    TILES.push({{el:g,cx:cx,cy:cy,d:0.28*clamp((cx/1920)*0.62+(cy/984)*0.38,0,1)}});
  }}
}})();
function tileSweep(u, covering){{
  // u runs 0..0.5 through one half of the sweep
  for (var k=0;k<TILES.length;k++){{
    var T=TILES[k], p=clamp((u-T.d)/0.2,0,1);
    // covering tiles overshoot a touch as they land; clearing tiles simply shrink away
    var sc = covering ? (p<1 ? p*(1+0.14*Math.sin(p*Math.PI)) : 1) : 1-p;
    T.el.setAttribute('transform','translate('+T.cx+' '+T.cy+') scale('+(sc*1.035).toFixed(3)+')');
  }}
}}

var lastSF = -1, lastScene = -1;
window.seek = function(t){{
  if (t > window.TOTAL) t = window.TOTAL;
  // pose index from the global clock; the epsilon stops f/24*12 landing a hair under an integer
  var sf = Math.floor(t*FPS_STOP + 1e-6);
  var tq = sf/FPS_STOP;                                 // the stepped global clock
  var i = CUES.length-1;
  while (i>0 && t < OFF[i]) i--;
  var lt = t - OFF[i], dur = CUES[i][0];
  // the scene clock derives from the stepped global clock, so every pose boundary lands on the same frame grid
  var q = Math.max(0, tq - OFF[i] - ENTER);

  if (i !== lastScene){{ for (var k=0;k<SCN.length;k++) SCN[k].classList.toggle('is-active', k===i); lastScene=i; void document.body.offsetHeight; }}
  var anims = document.getAnimations();
  for (var a=0;a<anims.length;a++){{ try{{ anims[a].pause(); anims[a].currentTime = q*1000; }}catch(e){{}} }}

  var S = SCN[i];
  if (sf !== lastSF){{
    // boil: every hand-placed piece sits a hair differently in each pose
    var bl = S.querySelectorAll('.bl');
    for (var k=0;k<bl.length;k++){{
      bl[k].setAttribute('transform','translate('+((hash(sf,k)-.5)*1.25).toFixed(2)+' '+((hash(sf,k+71)-.5)*1.25).toFixed(2)+')');
    }}
    // the torn card edges boil every pose, as re-cut paper would. The paper grain and the
    // print screen stay put: physical paper does not change between frames, and full-frame
    // noise that changes every frame is close to incompressible (set CRAWL to re-lay it).
    document.getElementById('roughTurb').setAttribute('seed', (sf%53)+1);
    if (window.CRAWL){{
      var tb = S.querySelectorAll('feTurbulence');
      for (var k=0;k<tb.length;k++) tb[k].setAttribute('seed', (sf%89)+1);
      var pats = S.querySelectorAll('pattern');
      for (var k=0;k<pats.length;k++){{ pats[k].setAttribute('x', ((sf+k)%3)*0.9); pats[k].setAttribute('y', ((sf*2+k)%3)*0.9); }}
    }}
    // exposure flicker, as from a lamp that is never quite constant between frames
    document.getElementById('flick').style.opacity = (0.010 + hash(sf,999)*0.034).toFixed(3);
    // counters
    var cs = S.querySelectorAll('[data-to]');
    for (var k=0;k<cs.length;k++){{
      var e=cs[k], t0=+e.getAttribute('data-t0'), t1=+e.getAttribute('data-t1'), fr=+e.getAttribute('data-from'),
          to=+e.getAttribute('data-to'), dec=+e.getAttribute('data-dec'), suf=e.getAttribute('data-suf');
      var p=clamp((q-t0)/(t1-t0),0,1); p=1-Math.pow(1-p,3);
      e.textContent=(fr+(to-fr)*p).toFixed(dec)+suf;
    }}
    lastSF = sf;
  }}

  // camera: a slow push and drift across each scene, with a handheld wobble per pose
  var pu = clamp((tq-OFF[i])/dur,0,1), eased = pu<.5 ? 2*pu*pu : 1-Math.pow(-2*pu+2,2)/2;
  var dir = (i%2) ? -1 : 1;
  var tx = dir*22*(eased-.5) + (hash(sf,5)-.5)*2.2, ty = -9*eased + (hash(sf,9)-.5)*2.2;
  var rot = (hash(sf,13)-.5)*0.16 + dir*0.25*(eased-.5), zoom = 1 + 0.055*eased;
  document.getElementById('scenes').style.transform = 'translate('+tx.toFixed(2)+'px,'+ty.toFixed(2)+'px) rotate('+rot.toFixed(3)+'deg) scale('+zoom.toFixed(4)+')';

  // transitions: tiles cover in the last half-second of a scene and clear in the first
  var shown = false;
  for (var j=0;j<=OFF.length;j++){{
    var b = (j<OFF.length) ? OFF[j] : window.TOTAL;
    var u = tq - b;
    if (u >= -0.5 && u < 0 && j>0){{ tileSweep(u+0.5, true); shown = true; break; }}
    if (u >= 0 && u < 0.5 && j<OFF.length){{ tileSweep(u, false); shown = true; break; }}
  }}
  TR.style.display = shown ? 'block' : 'none';

  // caption layer stays smooth: it is graphics laid over the animation, not part of it
  var cues = CUES[i][1], c = cues.length-1;
  while (c>0 && lt < cues[c][0]) c--;
  var cs0 = cues[c][0], ce = (c+1 < cues.length) ? cues[c+1][0] : dur;
  var el = document.getElementById('capText');
  if (el.textContent !== cues[c][1]) el.textContent = cues[c][1];
  var into = lt - cs0, left = ce - lt, o = 1;
  if (into < 0.45) o = Math.max(0, into/0.45);
  if (left < 0.45) o = Math.min(o, Math.max(0, left/0.45));
  document.getElementById('cap').style.opacity = o.toFixed(3);
  document.getElementById('slate').textContent = pad(i+1)+' / '+pad(SCN.length);
  document.getElementById('barFill').style.width = ((t/window.TOTAL)*100).toFixed(3)+'%';
}};
window.seek(0);
</script></body></html>'''
open(os.path.join(SCRATCH, 'video.html'), 'w').write(html)
print('video.html:', len(html), 'bytes, total', sum(c[0] for c in CUES), 's')
