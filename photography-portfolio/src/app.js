(() => {
  const photos = JSON.parse(document.getElementById("photo-data").textContent);
  const $ = (id) => document.getElementById(id);
  const root = document.documentElement;
  const body = document.body;
  const grid = $("grid");
  const lb = $("lb");
  const stage = $("lb-stage");
  const img = $("lb-img");
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const fineHover = matchMedia("(hover: hover)").matches;

  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (_) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (_) { /* private mode */ } },
  };
  const setHash = (hash) => {
    try { history.replaceState(null, "", hash || location.pathname + location.search); } catch (_) { /* embedded */ }
  };
  // Filtering and layout changes morph where the browser supports it.
  const morph = (fn) => (document.startViewTransition && !reduce ? document.startViewTransition(fn) : fn());

  // --- toast and copy --------------------------------------------------
  let toastTimer;
  function toast(msg) {
    const t = $("toast");
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove("show"), 1700);
  }
  function copy(text, done, fallback) {
    try {
      navigator.clipboard.writeText(text).then(() => toast(done), fallback);
    } catch (_) {
      fallback();
    }
  }
  document.querySelectorAll("[data-copy]").forEach((btn) => {
    btn.addEventListener("click", () => copy(btn.dataset.copy, btn.dataset.copied, () => {
      const r = document.createRange();
      r.selectNodeContents($("email"));
      getSelection().removeAllRanges();
      getSelection().addRange(r);
      toast("Selected. Copy it from the menu");
    }));
  });

  // --- theme -----------------------------------------------------------
  const themeBtn = $("theme");
  const theme = () => root.dataset.theme || (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
  const labelTheme = () => themeBtn.setAttribute("aria-label", `Switch to ${theme() === "dark" ? "light" : "dark"} theme`);
  themeBtn.addEventListener("click", () => {
    const next = theme() === "dark" ? "light" : "dark";
    root.dataset.theme = next;
    store.set("theme", next);
    labelTheme();
  });
  labelTheme();

  // --- ambient tint: the page leans toward the photo you are looking at --
  function tint(colour) {
    if (colour) body.style.setProperty("--tint", colour);
    body.style.setProperty("--tint-on", colour ? 1 : 0);
  }
  if (fineHover) {
    grid.addEventListener("pointerover", (ev) => {
      const t = ev.target.closest(".tile");
      if (t && ev.pointerType === "mouse") tint(t.dataset.tint);
    });
    grid.addEventListener("pointerleave", () => { if (!grid.classList.contains("single")) tint(null); });
  }
  // In the one-at-a-time layout, the photo crossing the middle of the screen sets it.
  const watcher = new IntersectionObserver((entries) => {
    entries.forEach((en) => { if (en.isIntersecting) tint(en.target.dataset.tint); });
  }, { rootMargin: "-45% 0px -45% 0px" });

  // --- layout ----------------------------------------------------------
  const tiles = [...grid.querySelectorAll(".tile")];
  function setView(view, animate) {
    const apply = () => {
      grid.classList.toggle("single", view === "single");
      document.querySelectorAll("[data-view]").forEach((b) => b.setAttribute("aria-pressed", b.dataset.view === view));
    };
    const work = $("work").getBoundingClientRect().top + scrollY;
    animate ? morph(apply) : apply();
    tiles.forEach((t) => (view === "single" ? watcher.observe(t) : watcher.unobserve(t)));
    if (view !== "single") tint(null);
    if (animate && scrollY > work) scrollTo({ top: work, behavior: "instant" });
    store.set("view", view);
  }
  document.querySelectorAll("[data-view]").forEach((b) => b.addEventListener("click", () => setView(b.dataset.view, true)));
  if (store.get("view") === "single") setView("single", false);

  // --- filters ---------------------------------------------------------
  document.querySelectorAll(".chips button").forEach((btn) => {
    btn.addEventListener("click", () => morph(() => {
      const cat = btn.dataset.cat;
      document.querySelectorAll(".chips button").forEach((b) => b.setAttribute("aria-pressed", b === btn));
      tiles.forEach((t) => { t.hidden = cat !== "" && t.dataset.cat !== cat; });
    }));
  });

  // --- viewer ----------------------------------------------------------
  let order = [];
  let pos = 0;
  const z = { s: 1, x: 0, y: 0 };

  function applyZoom() {
    img.style.setProperty("--s", z.s);
    img.style.setProperty("--x", `${z.x}px`);
    img.style.setProperty("--y", `${z.y}px`);
    stage.classList.toggle("zoomed", z.s > 1);
  }
  function clampPan() {
    const r = stage.getBoundingClientRect();
    const mx = ((z.s - 1) * r.width) / 2;
    const my = ((z.s - 1) * r.height) / 2;
    z.x = Math.max(-mx, Math.min(mx, z.x));
    z.y = Math.max(-my, Math.min(my, z.y));
  }
  function toggleZoom(px, py) {
    if (z.s > 1) {
      Object.assign(z, { s: 1, x: 0, y: 0 });
    } else {
      const r = stage.getBoundingClientRect();
      z.s = 2.5;
      z.x = -(px - (r.left + r.width / 2)) * (z.s - 1);
      z.y = -(py - (r.top + r.height / 2)) * (z.s - 1);
      clampPan();
    }
    applyZoom();
  }

  function show() {
    const p = photos[order[pos]];
    Object.assign(z, { s: 1, x: 0, y: 0 });
    applyZoom();
    img.classList.add("loading");
    img.onload = () => img.classList.remove("loading");
    img.alt = p.alt;
    img.sizes = "100vw";
    img.srcset = p.srcset;
    img.src = p.src;
    if (img.complete) img.classList.remove("loading");
    lb.style.setProperty("--lb-c", p.tint);
    $("lb-title").textContent = p.title || p.catLabel || "";
    $("lb-exif").textContent = [p.camera, p.zoom, p.exposure, p.when].filter(Boolean).join(" · ");
    $("lb-caption").textContent = p.caption || "";
    $("lb-count").textContent = order.length > 1 ? `${pos + 1} / ${order.length}` : "";
    $("lb-prev").hidden = $("lb-next").hidden = order.length < 2;
    $("lb-swatches").replaceChildren(...p.palette.map((hex) => {
      const b = document.createElement("button");
      b.type = "button";
      b.style.setProperty("--c", hex);
      b.title = hex;
      b.setAttribute("aria-label", `Copy colour ${hex}`);
      b.addEventListener("click", () => copy(hex, `Copied ${hex}`, () => toast(hex)));
      return b;
    }));
    setHash("#" + p.id);
    [1, -1].forEach((d) => {
      const n = photos[order[(pos + d + order.length) % order.length]];
      const pre = new Image();
      pre.sizes = "100vw";
      pre.srcset = n.srcset;
    });
  }
  function open(i) {
    order = tiles.filter((t) => !t.hidden).map((t) => +t.querySelector("[data-i]").dataset.i);
    if (!order.includes(i)) order = photos.map((_, k) => k);
    pos = order.indexOf(i);
    show();
    if (!lb.open) lb.showModal();
  }
  function step(d) {
    if (order.length < 2) return;
    pos = (pos + d + order.length) % order.length;
    show();
  }

  document.addEventListener("click", (ev) => {
    const a = ev.target.closest("a[data-i]");
    if (!a || ev.metaKey || ev.ctrlKey || ev.shiftKey) return;
    ev.preventDefault();
    open(+a.dataset.i);
  });
  $("lb-prev").addEventListener("click", () => step(-1));
  $("lb-next").addEventListener("click", () => step(1));
  $("lb-close").addEventListener("click", () => lb.close());
  lb.addEventListener("close", () => setHash(""));
  lb.addEventListener("keydown", (ev) => {
    if (ev.key === "ArrowRight") step(1);
    if (ev.key === "ArrowLeft") step(-1);
  });
  $("lb-hint").textContent = fineHover ? "Double-click to zoom" : "Double-tap to zoom";

  // One pointer handler: swipe to move, swipe down to close, double-tap to
  // zoom, drag to pan while zoomed.
  let start = null;
  let lastTap = null;
  stage.addEventListener("pointerdown", (ev) => {
    if (!ev.isPrimary) return;
    stage.setPointerCapture(ev.pointerId);
    start = { x: ev.clientX, y: ev.clientY, t: Date.now(), zx: z.x, zy: z.y };
  });
  stage.addEventListener("pointermove", (ev) => {
    if (!start || z.s === 1) return;
    stage.classList.add("dragging");
    z.x = start.zx + ev.clientX - start.x;
    z.y = start.zy + ev.clientY - start.y;
    clampPan();
    applyZoom();
  });
  stage.addEventListener("pointerup", (ev) => {
    if (!start) return;
    const dx = ev.clientX - start.x;
    const dy = ev.clientY - start.y;
    const moved = Math.hypot(dx, dy) > 10;
    const quick = Date.now() - start.t < 350;
    start = null;
    stage.classList.remove("dragging");
    if (!moved && quick) {
      const now = Date.now();
      if (lastTap && now - lastTap.t < 320 && Math.hypot(ev.clientX - lastTap.x, ev.clientY - lastTap.y) < 30) {
        toggleZoom(ev.clientX, ev.clientY);
        lastTap = null;
      } else {
        lastTap = { t: now, x: ev.clientX, y: ev.clientY };
      }
      return;
    }
    if (z.s > 1) return;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) step(dx < 0 ? 1 : -1);
    else if (dy > 90) lb.close();
  });
  stage.addEventListener("pointercancel", () => { start = null; stage.classList.remove("dragging"); });

  // A link ending in #p-<photo> opens straight into that photo.
  const linked = photos.findIndex((p) => "#" + p.id === location.hash);
  if (linked >= 0) open(linked);
})();

// --- wave band: broken lines on a slow swell; the pointer stirs them ---
(() => {
  const canvas = document.getElementById("waves");
  if (!canvas) return;
  const band = canvas.parentElement;
  const ctx = canvas.getContext("2d");
  const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const GAP = 13;   // px between lines
  const STEP = 5;   // px between samples along a line
  const R = 200;    // reach of the pointer
  let w = 0, h = 0, t = 0, last = 0, raf = 0, frames = 0, onScreen = true;
  let line = "#a2a29b", hot = [46, 94, 80];
  const p = { x: -1e4, y: -1e4, tx: -1e4, ty: -1e4, on: 0, target: 0 };

  function readColours() {
    const cs = getComputedStyle(document.documentElement);
    line = cs.getPropertyValue("--faint").trim() || line;
    const a = cs.getPropertyValue("--accent").trim().replace("#", "");
    if (a.length === 6) hot = [0, 2, 4].map((i) => parseInt(a.slice(i, i + 2), 16));
  }
  function resize() {
    const r = band.getBoundingClientRect();
    const dpr = Math.min(2, devicePixelRatio || 1);
    w = r.width;
    h = r.height;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    draw();
  }

  function draw() {
    ctx.clearRect(0, 0, w, h);
    const rows = Math.ceil(h / GAP) + 2;
    const sigma2 = 2 * (R / 2) ** 2;
    let glow = null;
    if (p.on > 0.01) {
      glow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, R);
      glow.addColorStop(0, `rgba(${hot},${p.on})`);
      glow.addColorStop(1, `rgba(${hot},0)`);
    }
    for (let i = -1; i < rows; i++) {
      const base = i * GAP + GAP / 2;
      const dir = i % 2 ? 1 : -1;
      const path = new Path2D();
      let pen = false;
      for (let x = -STEP; x <= w + STEP; x += STEP) {
        const dx = x - p.x;
        const dy = base - p.y;
        const d = Math.hypot(dx, dy);
        const near = p.on * Math.exp(-(d * d) / sigma2); // 0 far away, up to 1 under the pointer
        // The swell: two slow waves travelling in opposite directions.
        let y = base
          + 8 * Math.sin(x * 0.010 + t * 0.8 + i * 0.42)
          + 4 * Math.sin(x * 0.024 - t * 1.25 + i * 0.95);
        // Under the pointer: a ring ripple and lines parting around it.
        y += near * (22 * Math.sin(d * 0.075 - t * 5) + Math.sign(dy || 1) * 11);
        // Breaks: dashes drift along each line and shorten near the pointer;
        // a slow second pattern opens longer gaps now and then.
        const period = 52 - 34 * near;
        const duty = 0.8 - 0.45 * near - 0.35 * Math.max(0, Math.sin(x * 0.0045 + i * 1.7 + t * 0.25));
        const phase = (x + i * 37 + dir * t * 16) / period;
        if (phase - Math.floor(phase) < duty) {
          pen ? path.lineTo(x, y) : path.moveTo(x, y);
          pen = true;
        } else {
          pen = false;
        }
      }
      ctx.lineWidth = 1.1;
      ctx.strokeStyle = line;
      ctx.stroke(path);
      if (glow) {
        ctx.lineWidth = 1.7;
        ctx.strokeStyle = glow;
        ctx.stroke(path);
      }
    }
  }

  function frame(now) {
    const dt = Math.min(50, now - (last || now));
    last = now;
    t += dt / 1000;
    p.x += (p.tx - p.x) * 0.14;
    p.y += (p.ty - p.y) * 0.14;
    p.on += (p.target - p.on) * 0.05;
    if (++frames % 30 === 0) readColours(); // follows the theme toggle
    draw();
    raf = onScreen && !document.hidden ? requestAnimationFrame(frame) : 0;
  }
  function run() {
    if (still) return draw();
    if (!raf && onScreen && !document.hidden) {
      last = 0;
      raf = requestAnimationFrame(frame);
    }
  }

  // Track the pointer anywhere near the band, so moving across the intro stirs it too.
  addEventListener("pointermove", (ev) => {
    const r = band.getBoundingClientRect();
    const x = ev.clientX - r.left;
    const y = ev.clientY - r.top;
    const inReach = x > -R && x < r.width + R && y > -R && y < r.height + R;
    if (inReach && p.target === 0 && p.on < 0.05) { p.x = x; p.y = y; } // no sweep in from the old spot
    p.tx = x;
    p.ty = y;
    p.target = inReach ? 1 : 0;
    if (still) { p.x = x; p.y = y; p.on = p.target; draw(); }
  }, { passive: true });
  const release = () => { p.target = 0; if (still) { p.on = 0; draw(); } };
  document.addEventListener("pointerleave", release);
  band.addEventListener("pointerup", (ev) => { if (ev.pointerType !== "mouse") release(); });
  band.addEventListener("pointercancel", release);

  new IntersectionObserver(([en]) => { onScreen = en.isIntersecting; run(); }).observe(band);
  document.addEventListener("visibilitychange", run);
  new ResizeObserver(resize).observe(band);
  document.getElementById("theme")?.addEventListener("click", () => requestAnimationFrame(() => { readColours(); draw(); }));
  readColours();
  resize();
  run();
})();
