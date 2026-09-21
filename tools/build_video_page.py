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
#scenes{{position:absolute;left:130px;top:8px;width:1660px;height:968px}}
#scenes .sc{{margin:0}}
#scenes svg{{display:block;width:1660px;height:968px}}
#slate{{position:absolute;right:130px;top:26px;font-family:var(--mono);font-weight:600;font-size:19px;letter-spacing:.14em;color:var(--navyL);z-index:6}}
#cap{{position:absolute;left:130px;right:130px;top:990px;height:68px;display:flex;align-items:center;gap:20px;z-index:6}}
#capRule{{width:6px;align-self:stretch;background:var(--rust);flex:none}}
#capText{{margin:0;font-family:var(--body);font-size:33px;line-height:1.3;color:var(--ink);text-wrap:balance}}
#bar{{position:absolute;left:130px;right:130px;top:1062px;height:6px;background:var(--creamD);z-index:6}}
#barFill{{height:6px;width:0;background:var(--gold)}}
</style></head><body>
<div id="frame">
  <div id="scenes">{scene_html}</div>
  <div id="slate">01 / {len(SC.ALL)}</div>
  <div id="cap"><div id="capRule"></div><p id="capText"></p></div>
  <div id="bar"><div id="barFill"></div></div>
</div>
<script>
var CUES = {json.dumps(CUES)};
var SCN = document.querySelectorAll('#scenes .sc');
var OFF = [], acc = 0;
for (var i=0;i<CUES.length;i++){{ OFF.push(acc); acc += CUES[i][0]; }}
window.TOTAL = acc;
function pad(n){{ return n<10?'0'+n:''+n; }}
window.seek = function(t){{
  if (t > window.TOTAL) t = window.TOTAL;
  var i = CUES.length-1;
  while (i>0 && t < OFF[i]) i--;
  var lt = t - OFF[i], dur = CUES[i][0];
  for (var k=0;k<SCN.length;k++) SCN[k].classList.toggle('is-active', k===i);
  void document.body.offsetHeight;
  var anims = document.getAnimations();
  for (var a=0;a<anims.length;a++){{ try{{ anims[a].pause(); anims[a].currentTime = lt*1000; }}catch(e){{}} }}
  var cues = CUES[i][1], c = cues.length-1;
  while (c>0 && lt < cues[c][0]) c--;
  var cs = cues[c][0], ce = (c+1 < cues.length) ? cues[c+1][0] : dur;
  var el = document.getElementById('capText');
  if (el.textContent !== cues[c][1]) el.textContent = cues[c][1];
  var into = lt - cs, left = ce - lt, o = 1;
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
