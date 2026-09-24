(() => {
  const photos = JSON.parse(document.getElementById("photo-data").textContent);
  const grid = document.querySelector(".grid");
  const count = document.getElementById("count");
  const lb = document.getElementById("lb");
  const stage = document.getElementById("lb-stage");
  const img = document.getElementById("lb-img");
  const $ = (id) => document.getElementById(id);
  let order = [];
  let pos = 0;

  const setHash = (hash) => {
    try {
      history.replaceState(null, "", hash || location.pathname + location.search);
    } catch (_) { /* some embedded viewers refuse history changes */ }
  };

  // --- filters ---------------------------------------------------------
  document.querySelectorAll(".modes button").forEach((btn) => {
    btn.addEventListener("click", () => {
      const cat = btn.dataset.cat;
      document.querySelectorAll(".modes button").forEach((b) => b.setAttribute("aria-pressed", b === btn));
      let shown = 0;
      grid.querySelectorAll(".tile").forEach((t) => {
        t.hidden = cat !== "" && t.dataset.cat !== cat;
        if (!t.hidden) shown++;
      });
      count.textContent = `${shown} photograph${shown === 1 ? "" : "s"}`;
    });
  });

  // --- viewer ----------------------------------------------------------
  const visible = () => [...grid.querySelectorAll(".tile:not([hidden])")].map((t) => +t.dataset.i);

  function show() {
    const p = photos[order[pos]];
    img.classList.add("loading");
    img.onload = () => img.classList.remove("loading");
    img.alt = p.alt;
    img.sizes = "100vw";
    img.srcset = p.srcset;
    img.src = p.src;
    if (img.complete) img.classList.remove("loading");
    stage.style.background = `radial-gradient(closest-side, ${p.colour}33, transparent)`;
    $("lb-title").textContent = p.title || p.catLabel || "";
    $("lb-exif").textContent = [p.camera, p.zoom, p.exposure, p.when].filter(Boolean).join(" · ");
    $("lb-caption").textContent = p.caption || "";
    $("lb-count").textContent = order.length > 1 ? `${pos + 1} / ${order.length}` : "";
    $("lb-prev").hidden = $("lb-next").hidden = order.length < 2;
    setHash("#" + p.id);
    // Warm the neighbours so swiping feels instant.
    [1, -1].forEach((d) => {
      const n = photos[order[(pos + d + order.length) % order.length]];
      const pre = new Image();
      pre.sizes = "100vw";
      pre.srcset = n.srcset;
    });
  }

  function open(i) {
    order = visible();
    if (!order.includes(i)) order = photos.map((_, k) => k);
    pos = order.indexOf(i);
    show();
    if (!lb.open) lb.showModal();
  }

  const step = (d) => {
    if (order.length < 2) return;
    pos = (pos + d + order.length) % order.length;
    show();
  };

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

  // Swipe sideways to move, down to close. A tap on the empty stage closes.
  let start = null;
  stage.addEventListener("pointerdown", (ev) => {
    if (ev.isPrimary) start = { x: ev.clientX, y: ev.clientY, t: Date.now() };
  });
  stage.addEventListener("pointerup", (ev) => {
    if (!start || !ev.isPrimary) return;
    const dx = ev.clientX - start.x;
    const dy = ev.clientY - start.y;
    const tap = Math.abs(dx) < 8 && Math.abs(dy) < 8 && Date.now() - start.t < 400;
    start = null;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) step(dx < 0 ? 1 : -1);
    else if (dy > 90) lb.close();
    else if (tap && ev.target === stage) lb.close();
  });
  stage.addEventListener("pointercancel", () => { start = null; });

  // A link ending in #p-<photo> opens straight into that photo.
  const linked = photos.findIndex((p) => "#" + p.id === location.hash);
  if (linked >= 0) open(linked);

  // --- copy email ------------------------------------------------------
  const copy = $("copy-email");
  if (copy) {
    copy.addEventListener("click", () => {
      const done = () => {
        copy.textContent = "Copied";
        setTimeout(() => { copy.textContent = "Copy"; }, 1800);
      };
      const fallback = () => {
        const r = document.createRange();
        r.selectNodeContents($("email"));
        const sel = getSelection();
        sel.removeAllRanges();
        sel.addRange(r);
        copy.textContent = "Selected";
      };
      try {
        navigator.clipboard.writeText(copy.dataset.copy).then(done, fallback);
      } catch (_) {
        fallback();
      }
    });
  }
})();
