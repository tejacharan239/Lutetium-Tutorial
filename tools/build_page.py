# -*- coding: utf-8 -*-
"""Assemble index.html from the generated scenes plus the written narration."""
import sys, os, re, json
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import scenes as SC
from iso import P

ROOT = os.path.dirname(HERE)

# Narration, reference material and player live beside the generator so that
# rebuilding the page is repeatable -- the builder never reads its own output.
narr = [(n['h2'], n['p']) for n in json.load(open(os.path.join(HERE, 'narration.json')))['narration']]
notes = open(os.path.join(HERE, 'notes.html')).read()
script = open(os.path.join(HERE, 'player.js')).read()

DUR = [11, 13, 13, 13, 13, 14, 14, 14, 14, 13, 13, 14, 9]
assert len(DUR) == 13

figs = []
for i, (fn, (h2, para)) in enumerate(zip(SC.ALL, narr)):
    figs.append(
        '<figure class="sc%s" data-dur="%d">\n<div class="svg-hold">'
        '<svg viewBox="0 0 720 420" role="img" aria-label="%s">%s</svg></div>\n'
        '<figcaption class="narration"><h2>%s</h2><p>%s</p></figcaption>\n</figure>'
        % (' is-active' if i == 0 else '', DUR[i],
           re.sub('<[^>]+>', '', h2) + '. ' + re.sub(r'\s+', ' ', re.sub('<[^>]+>', '', para))[:300],
           fn(), h2, para))

CSS = open(os.path.join(HERE, 'page.css')).read()
HTML = f'''<title>The Lutetium-177 Reel</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,700;12..96,800&family=IBM+Plex+Mono:wght@400;500;600&family=Source+Serif+4:opsz,wght@8..60,400;8..60,600&display=swap">
<style>
{CSS}
</style>

<svg width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false"><defs><filter id="roughEdge" x="-4%" y="-8%" width="108%" height="116%"><feTurbulence id="roughTurb" type="fractalNoise" baseFrequency="0.038" numOctaves="2" seed="3"/><feDisplacementMap in="SourceGraphic" scale="3.2" xChannelSelector="R" yChannelSelector="G"/></filter></defs></svg>

<div class="wrap">
<header class="masthead">
  <p class="kicker">Peptide receptor radionuclide therapy &middot; an isometric explainer</p>
  <h1>The <em>Lutetium&#8209;177</em> Reel</h1>
  <p class="standfirst">Thirteen scenes on how one molecule finds a grade&nbsp;1, stage&nbsp;4 neuroendocrine tumour by its receptors, gets swallowed by it, and irradiates it from the inside out.</p>
  <div class="chips">
    <span class="chip">Lu&#8209;177 DOTATATE</span>
    <span class="chip">SSTR2&#8209;targeted</span>
    <span class="chip">&beta;&#8315; &middot; t&frac12; 6.65 d</span>
    <span class="chip">4 &times; 7.4 GBq</span>
    <span class="chip warn">Educational &mdash; not medical advice</span>
  </div>
</header>

<div class="player">
<div class="stage" id="stage">
{chr(10).join(figs)}
<div class="stage-tag" id="tag">01 / 13</div>
</div>

<div class="transport">
  <button class="btn primary" id="play" type="button" aria-label="Play the reel">
    <svg width="10" height="12" viewBox="0 0 10 12" aria-hidden="true"><path d="M0 0 L10 6 L0 12 Z" fill="currentColor"/></svg>
    <span id="playLabel">Play</span>
  </button>
  <button class="btn" id="prev" type="button" aria-label="Previous scene">&larr;</button>
  <button class="btn" id="next" type="button" aria-label="Next scene">&rarr;</button>
  <div class="rail" role="progressbar" aria-label="Reel progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" id="rail"><div class="rail-fill" id="railFill"></div></div>
  <span class="clock" id="clock">0:00 / 2:54</span>
  <span class="pan-hint">drag the scene sideways to see all of it</span>
</div>

<nav class="chapters" id="chapters" aria-label="Scenes"></nav>
</div>

{notes}
</div>

{script}
'''
open(os.path.join(ROOT, 'index.html'), 'w').write(HTML)
print('index.html rebuilt:', len(HTML), 'bytes,', len(figs), 'scenes')
