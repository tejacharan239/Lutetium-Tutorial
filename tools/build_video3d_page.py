# -*- coding: utf-8 -*-
"""Compose the 3D reel page: the scenes from the generator's 3D backend, the three.js
engine, and the same captions, tile transitions and overlay cards as the 2D reel.

    python3 build_video3d_page.py <serve dir with node_modules/three> <fonts-inline.css>
"""
import sys, os, json, shutil
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import iso
iso.MODE = '3d'
import scenes as SC
from cues import CUES

OUT, FONTS = sys.argv[1], sys.argv[2]
shutil.copy(os.path.join(HERE, 'engine3d.js'), os.path.join(OUT, 'engine3d.js'))
data = json.dumps({'scenes': [fn() for fn in SC.ALL], 'cues': CUES}).replace('</', '<\\/')
fonts = open(FONTS).read()
K = 1.543

html = f'''<!doctype html><html><head><meta charset="utf-8"><title>reel 3d</title>
<script type="importmap">{{"imports":{{"three":"./node_modules/three/build/three.module.js","three/addons/":"./node_modules/three/examples/jsm/"}}}}</script>
<style>{fonts}</style>
<style>
html,body{{margin:0;width:1280px;height:720px;overflow:hidden;background:#FAF5E9}}
#frame{{position:relative;width:1280px;height:720px;overflow:hidden}}
#gl,#gl canvas{{position:absolute;inset:0}}
#hud{{position:absolute;inset:0;z-index:3;pointer-events:none}}
.hudscene{{position:absolute;inset:0}}
.card{{position:absolute;transform-origin:50% 50%;font-family:"IBM Plex Mono",monospace;color:#1E2647}}
.card .bg{{position:absolute;inset:0;background:#F5EEDC radial-gradient(circle,rgba(30,38,71,.13) 1.1px,transparent 1.5px) 0 0/7px 7px;
          border:{1.6*K:.2f}px solid #1E2647;box-shadow:{4*K:.1f}px {4*K:.1f}px 0 rgba(30,38,71,.18);filter:url(#roughEdge)}}
.card .mis{{position:absolute;inset:0;transform:translate({1.6*K:.1f}px,{1.1*K:.1f}px);border:{1.3*K:.1f}px solid rgba(196,102,77,.38)}}
.card .acc{{position:absolute;left:0;top:0;bottom:0;width:{5*K:.1f}px;background:var(--acc);filter:url(#roughEdge)}}
.card .tx{{position:absolute;left:{17*K:.1f}px;top:{9*K:.1f}px;right:{8*K:.1f}px}}
.card .t{{font-size:{9.5*K:.1f}px;font-weight:600;letter-spacing:{1.5*K:.1f}px;color:#3D5083;margin-bottom:{4*K:.1f}px}}
.card .l{{line-height:1.44;white-space:nowrap}}
.heading{{position:absolute;font-family:"IBM Plex Mono",monospace;font-weight:600;font-size:{13*K:.1f}px;letter-spacing:{2.2*K:.1f}px;white-space:nowrap}}
.anchored,.tag{{position:absolute;left:0;top:0;font-family:"IBM Plex Mono",monospace;font-weight:600;white-space:nowrap}}
.anchored{{text-shadow:0 1px 0 rgba(30,38,71,.35)}}
.tag{{background:#F5EEDC;border:{1.5*K:.1f}px solid #1E2647;padding:{3*K:.1f}px {10*K:.1f}px;font-size:{17*K:.1f}px !important;color:#1E2647 !important}}
#trans{{position:absolute;left:0;top:0;width:1280px;height:656px;z-index:4;display:none}}
#slate{{position:absolute;right:{86}px;top:18px;font-family:"IBM Plex Mono",monospace;font-weight:600;font-size:13px;letter-spacing:.14em;color:#3D5083;z-index:6}}
#capband{{position:absolute;left:0;right:0;top:640px;bottom:0;z-index:5;background:linear-gradient(to bottom,rgba(250,245,233,0),rgba(250,245,233,.94) 26%)}}
#cap{{position:absolute;left:87px;right:87px;top:660px;height:45px;display:flex;align-items:center;gap:13px;z-index:6}}
#capRule{{width:4px;align-self:stretch;background:#C4664D;flex:none}}
#capText{{margin:0;font-family:"Source Serif 4",Georgia,serif;font-size:22px;line-height:1.3;color:#1E2647}}
#bar{{position:absolute;left:87px;right:87px;top:712px;height:4px;background:#E3D8BE;z-index:6}}
#barFill{{height:4px;width:0;background:#EFBF49}}
</style></head><body>
<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>
  <filter id="roughEdge" x="-4%" y="-8%" width="108%" height="116%">
    <feTurbulence id="roughTurb" type="fractalNoise" baseFrequency="0.03" numOctaves="2" seed="3"/>
    <feDisplacementMap in="SourceGraphic" scale="4" xChannelSelector="R" yChannelSelector="G"/>
  </filter></defs></svg>
<div id="frame">
  <div id="gl"></div>
  <div id="hud"></div>
  <svg id="trans" viewBox="0 0 1920 984"><defs>
    <pattern id="tdots" width="8.3" height="8.3" patternUnits="userSpaceOnUse" patternTransform="rotate(15)"><circle cx="4.15" cy="4.15" r="2.9" fill="#FAF5E9"/></pattern>
  </defs></svg>
  <div id="capband"></div>
  <div id="slate">01 / 13</div>
  <div id="cap"><div id="capRule"></div><p id="capText"></p></div>
  <div id="bar"><div id="barFill"></div></div>
</div>
<script id="data" type="application/json">{data}</script>
<script>
// the overlay layer: tile sweep between scenes, captions, slate and progress, on the same clock as the 2D reel
(function(){{
  var CUES = JSON.parse(document.getElementById('data').textContent).cues, OFF=[], acc=0;
  for (var i=0;i<CUES.length;i++){{ OFF.push(acc); acc+=CUES[i][0]; }}
  function hash(a,b){{ var x=Math.sin(a*127.1+b*311.7)*43758.5453; return x-Math.floor(x); }}
  function clamp(v,a,b){{ return v<a?a:(v>b?b:v); }}
  function pad(n){{ return n<10?'0'+n:''+n; }}
  var TR=document.getElementById('trans'), TILES=[], NS='http://www.w3.org/2000/svg',
      inks=['#2B3A67','#2B3A67','#2B3A67','#2B3A67','#3D5083','#3D5083','#EFBF49','#3E9E8F','#E9B2A6'];
  for (var r=-1;r<=22;r++) for (var c=-1;c<=12;c++) {{
    var cx=c*160+((r&1)?80:0), cy=r*46, g=document.createElementNS(NS,'g');
    [[inks[Math.floor(hash(c+3,r+7)*inks.length)],1],['url(#tdots)',.30]].forEach(function(L){{
      var p=document.createElementNS(NS,'polygon'); p.setAttribute('points','0,-47 81,0 0,47 -81,0'); p.setAttribute('fill',L[0]); p.setAttribute('opacity',L[1]); g.appendChild(p); }});
    TR.appendChild(g); TILES.push({{el:g,cx:cx,cy:cy,d:0.28*clamp((cx/1920)*0.62+(cy/984)*0.38,0,1)}});
  }}
  function sweep(u,cover){{ for (var k=0;k<TILES.length;k++){{ var T=TILES[k], p=clamp((u-T.d)/0.2,0,1);
    var s=cover?(p<1?p*(1+0.14*Math.sin(p*Math.PI)):1):1-p; T.el.setAttribute('transform','translate('+T.cx+' '+T.cy+') scale('+(s*1.035).toFixed(3)+')'); }} }}
  window.overlay=function(t,tq,i,lt,dur){{
    var shown=false;
    for (var j=0;j<=OFF.length;j++){{ var b=(j<OFF.length)?OFF[j]:acc, u=tq-b;
      if (u>=-0.5&&u<0&&j>0){{ sweep(u+0.5,true); shown=true; break; }}
      if (u>=0&&u<0.5&&j<OFF.length){{ sweep(u,false); shown=true; break; }} }}
    TR.style.display=shown?'block':'none';
    var sf=Math.floor(t*12+1e-6); document.getElementById('roughTurb').setAttribute('seed',(sf%53)+1);
    var cues=CUES[i][1], c=cues.length-1; while(c>0&&lt<cues[c][0]) c--;
    var cs0=cues[c][0], ce=(c+1<cues.length)?cues[c+1][0]:dur, el=document.getElementById('capText');
    if (el.textContent!==cues[c][1]) el.textContent=cues[c][1];
    var into=lt-cs0, left=ce-lt, o=1; if(into<0.45)o=Math.max(0,into/0.45); if(left<0.45)o=Math.min(o,Math.max(0,left/0.45));
    document.getElementById('cap').style.opacity=o.toFixed(3);
    document.getElementById('slate').textContent=pad(i+1)+' / '+pad(CUES.length);
    document.getElementById('barFill').style.width=((t/acc)*100).toFixed(3)+'%';
  }};
}})();
</script>
<script type="module" src="./engine3d.js"></script>
</body></html>'''
open(os.path.join(OUT, 'video3d.html'), 'w').write(html)
print('video3d.html: %d bytes, %d scenes, %d s' % (len(html), len(SC.ALL), sum(c[0] for c in CUES)))
