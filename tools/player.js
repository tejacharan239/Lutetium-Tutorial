<script>
(function(){
  var stage = document.getElementById('stage');
  var scenes = Array.prototype.slice.call(stage.querySelectorAll('.sc'));
  var durs = scenes.map(function(s){ return parseFloat(s.getAttribute('data-dur')) || 10; });
  var total = durs.reduce(function(a,b){ return a+b; }, 0);
  var offsets = [];
  durs.reduce(function(acc, d, i){ offsets[i] = acc; return acc + d; }, 0);

  var playBtn = document.getElementById('play');
  var playLabel = document.getElementById('playLabel');
  var railFill = document.getElementById('railFill');
  var rail = document.getElementById('rail');
  var clock = document.getElementById('clock');
  var tag = document.getElementById('tag');
  var chapters = document.getElementById('chapters');

  var idx = 0, elapsed = 0, playing = false, last = 0, raf = 0;
  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function pad(n){ return n < 10 ? '0' + n : '' + n; }
  function fmt(s){ s = Math.max(0, Math.round(s)); return Math.floor(s/60) + ':' + pad(s % 60); }

  var tabs = scenes.map(function(sc, i){
    var h2 = sc.querySelector('h2');
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'tab';
    b.innerHTML = '<b>' + pad(i + 1) + '</b>' + (h2 ? h2.textContent : 'Scene ' + (i + 1));
    b.addEventListener('click', function(){ go(i); });
    chapters.appendChild(b);
    return b;
  });

  function paint(){
    var t = offsets[idx] + Math.min(elapsed, durs[idx]);
    var pct = total ? (t / total) * 100 : 0;
    railFill.style.width = pct.toFixed(2) + '%';
    rail.setAttribute('aria-valuenow', Math.round(pct));
    clock.textContent = fmt(t) + ' / ' + fmt(total);
    tag.textContent = pad(idx + 1) + ' / ' + pad(scenes.length);
  }

  function show(i){
    scenes[idx].classList.remove('is-active');
    idx = i;
    scenes[idx].classList.add('is-active');
    tabs.forEach(function(t, n){
      if (n === idx) { t.setAttribute('aria-current', 'true'); }
      else { t.removeAttribute('aria-current'); }
    });
    elapsed = 0;
    paint();
  }

  function go(i){
    if (i < 0) i = 0;
    if (i > scenes.length - 1) i = scenes.length - 1;
    if (i !== idx) show(i); else { elapsed = 0; paint(); }
  }

  function setPlaying(on){
    playing = on;
    if (on) { stage.classList.remove('paused'); }
    else { stage.classList.add('paused'); }
    playLabel.textContent = on ? 'Pause' : (idx === scenes.length - 1 && elapsed >= durs[idx] ? 'Replay' : 'Play');
    playBtn.setAttribute('aria-label', on ? 'Pause the reel' : 'Play the reel');
    playBtn.querySelector('svg').innerHTML = on
      ? '<rect x="0" y="0" width="3.5" height="12" fill="currentColor"/><rect x="6.5" y="0" width="3.5" height="12" fill="currentColor"/>'
      : '<path d="M0 0 L10 6 L0 12 Z" fill="currentColor"/>';
    if (on) { last = 0; raf = requestAnimationFrame(tick); }
    else if (raf) { cancelAnimationFrame(raf); raf = 0; }
  }

  function tick(ts){
    if (!playing) return;
    if (!last) last = ts;
    var dt = Math.min((ts - last) / 1000, 0.5);
    last = ts;
    elapsed += dt;
    if (elapsed >= durs[idx]) {
      if (idx < scenes.length - 1) { show(idx + 1); }
      else { elapsed = durs[idx]; setPlaying(false); paint(); return; }
    }
    paint();
    raf = requestAnimationFrame(tick);
  }

  playBtn.addEventListener('click', function(){
    if (!playing && idx === scenes.length - 1 && elapsed >= durs[idx]) { show(0); }
    setPlaying(!playing);
  });
  document.getElementById('prev').addEventListener('click', function(){
    if (elapsed > 1.2) { elapsed = 0; show(idx); } else { go(idx - 1); }
  });
  document.getElementById('next').addEventListener('click', function(){ go(idx + 1); });

  rail.addEventListener('click', function(e){
    var r = rail.getBoundingClientRect();
    var t = ((e.clientX - r.left) / r.width) * total;
    for (var i = scenes.length - 1; i >= 0; i--) {
      if (t >= offsets[i]) { show(i); elapsed = Math.min(t - offsets[i], durs[i]); paint(); break; }
    }
  });

  document.addEventListener('keydown', function(e){
    var tagName = (e.target && e.target.tagName || '').toLowerCase();
    if (tagName === 'input' || tagName === 'textarea') return;
    if (e.key === 'ArrowRight') { e.preventDefault(); go(idx + 1); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); go(idx - 1); }
    else if (e.key === ' ' || e.key === 'k') {
      if (tagName === 'button') return;
      e.preventDefault();
      setPlaying(!playing);
    }
  });

  scenes[0].classList.add('is-active');
  tabs[0].setAttribute('aria-current', 'true');
  paint();
})();
</script>