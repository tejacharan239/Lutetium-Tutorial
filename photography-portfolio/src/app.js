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
  // Phones skip the page tint: repainting the whole page while scrolling costs smoothness.
  const touch = matchMedia("(hover: none), (pointer: coarse)").matches;
  function tint(colour) {
    if (touch) return;
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

// --- dot field: rows sway in sync, neighbours in opposite directions ----
// Kept out of the photo section so nothing sits over or between the photos.
(() => {
  const canvas = document.getElementById("dots");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
  // Touch screens use the CSS dot layer instead: it scrolls with the page
  // natively, so nothing lags behind the finger. Only its cut-out for the
  // photo section is measured here.
  if (matchMedia("(hover: none), (pointer: coarse)").matches) {
    const bed = document.getElementById("dotbed");
    const work = document.getElementById("work");
    const measure = () => {
      const top = document.body.getBoundingClientRect().top;
      const r = work.getBoundingClientRect();
      bed.style.setProperty("--wt", `${r.top - top}px`);
      bed.style.setProperty("--wb", `${r.bottom - top}px`);
    };
    new ResizeObserver(measure).observe(document.body);
    new ResizeObserver(measure).observe(work);
    measure();
    return;
  }
  const GAP = 26;     // px between dots
  const REACH = 110;  // how far the pointer's pull is felt
  const RING_SPEED = 170, RING_LIFE = 1.8;
  const SWAY = 3.5;   // px each row travels either side of its rest position
  const PERIOD = 9;   // seconds for one full sway
  const FADE = 56;    // px over which dots fade out before the photo section
  const work = document.getElementById("work");
  let w = 0, h = 0, t = 0, last = 0, raf = 0, frames = 0;
  let dot = "#d0d0c9", accent = [46, 94, 80];
  const p = { x: -1e4, y: -1e4, tx: -1e4, ty: -1e4, on: 0, target: 0 };
  const rings = []; // { x, y (page coords), t0, amp }
  let lastRing = { x: -1e4, y: -1e4, t: -10 };

  function readColours() {
    const cs = getComputedStyle(document.documentElement);
    dot = cs.getPropertyValue("--dot").trim() || dot;
    const a = cs.getPropertyValue("--accent").trim().replace("#", "");
    if (a.length === 6) accent = [0, 2, 4].map((i) => parseInt(a.slice(i, i + 2), 16));
  }
  function resize() {
    const dpr = Math.min(2, devicePixelRatio || 1);
    w = innerWidth;
    h = innerHeight;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    draw();
  }

  function draw() {
    ctx.clearRect(0, 0, w, h);
    const sy = scrollY;
    const sigma2 = 2 * (REACH / 2) ** 2;
    const base = new Path2D();
    const lit = [new Path2D(), new Path2D(), new Path2D()]; // three accent strengths
    const live = rings.map((r) => {
      const age = t - r.t0;
      return { x: r.x, y: r.y - sy, rad: age * RING_SPEED, amp: r.amp * (1 - age / RING_LIFE) ** 2 };
    });
    const wr = work ? work.getBoundingClientRect() : null;
    // One shared, eased sway for every row; odd rows mirror it.
    const sway = SWAY * Math.sin((t / PERIOD) * Math.PI * 2);
    const y0 = -((sy % GAP) + GAP);
    for (let gy = y0; gy < h + GAP; gy += GAP) {
      // Fade rows out as they approach the photo section; skip them inside it.
      let size = 1;
      if (wr) {
        const out = gy < wr.top ? wr.top - gy : gy > wr.bottom ? gy - wr.bottom : 0;
        size = Math.min(1, out / FADE);
        if (size < 0.15) continue;
      }
      const row = Math.round((gy + sy) / GAP);
      const shift = row % 2 ? sway : -sway;
      for (let gx = GAP / 2; gx < w + GAP; gx += GAP) {
        let x = gx + shift;
        let y = gy;
        let r = 0.95 * size;
        let glow = 0;
        // Near the pointer: dots ease outward a little and pick up the accent.
        const dx = gx - p.x, dy = gy - p.y;
        const d2 = dx * dx + dy * dy;
        if (p.on > 0.01 && d2 < REACH * REACH * 4) {
          const d = Math.sqrt(d2) || 1;
          const near = p.on * Math.exp(-d2 / sigma2);
          x += (dx / d) * near * 7;
          y += (dy / d) * near * 7;
          r += near * 0.9 * size;
          glow = near;
        }
        // Rings: a thin band of dots lifts as each ring passes.
        for (const ring of live) {
          const rx = gx - ring.x, ry = gy - ring.y;
          const rd = Math.sqrt(rx * rx + ry * ry) || 1;
          const band = Math.exp(-((rd - ring.rad) ** 2) / 180) * ring.amp;
          if (band > 0.01) {
            x += (rx / rd) * band * 3;
            y += (ry / rd) * band * 3;
            r += band * 0.6 * size;
            glow = Math.max(glow, band * 0.6);
          }
        }
        const path = glow > 0.55 ? lit[2] : glow > 0.3 ? lit[1] : glow > 0.08 ? lit[0] : base;
        path.moveTo(x + r, y);
        path.arc(x, y, r, 0, Math.PI * 2);
      }
    }
    ctx.fillStyle = dot;
    ctx.fill(base);
    [0.35, 0.6, 0.9].forEach((alpha, i) => {
      ctx.fillStyle = `rgba(${accent},${alpha})`;
      ctx.fill(lit[i]);
    });
  }

  function frame(now) {
    const dt = Math.min(50, now - (last || now));
    last = now;
    t += dt / 1000;
    p.x += (p.tx - p.x) * 0.12;
    p.y += (p.ty - p.y) * 0.12;
    p.on += (p.target - p.on) * 0.06;
    while (rings.length && t - rings[0].t0 > RING_LIFE) rings.shift();
    if (++frames % 30 === 0) readColours(); // follows the theme toggle
    draw();
    raf = document.hidden ? 0 : requestAnimationFrame(frame);
  }
  function run() {
    if (still) return draw();
    if (!raf && !document.hidden) {
      last = 0;
      raf = requestAnimationFrame(frame);
    }
  }
  function ring(x, y, amp) {
    if (still) return;
    rings.push({ x, y: y + scrollY, t0: t, amp });
    if (rings.length > 4) rings.shift();
    lastRing = { x, y, t };
  }

  addEventListener("pointermove", (ev) => {
    if (p.target === 0 && p.on < 0.05) { p.x = ev.clientX; p.y = ev.clientY; } // no sweep in from the old spot
    p.tx = ev.clientX;
    p.ty = ev.clientY;
    p.target = 1;
    // A soft ring now and then while the pointer travels.
    if (t - lastRing.t > 1.1 && Math.hypot(ev.clientX - lastRing.x, ev.clientY - lastRing.y) > 140) ring(ev.clientX, ev.clientY, 0.6);
    if (still) { p.x = p.tx; p.y = p.ty; p.on = 1; draw(); }
  }, { passive: true });
  addEventListener("pointerdown", (ev) => ring(ev.clientX, ev.clientY, 1), { passive: true });
  const release = () => { p.target = 0; if (still) { p.on = 0; draw(); } };
  document.addEventListener("pointerleave", release);
  addEventListener("pointerup", (ev) => { if (ev.pointerType !== "mouse") release(); }, { passive: true });
  if (still) addEventListener("scroll", draw, { passive: true });
  addEventListener("resize", resize);
  document.addEventListener("visibilitychange", run);
  document.getElementById("theme")?.addEventListener("click", () => requestAnimationFrame(() => { readColours(); draw(); }));
  readColours();
  resize();
  run();
})();
