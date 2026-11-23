(function () {
  const MENU = window.MENU || [];
  const tabsEl = document.getElementById("tabs");
  const inkEl = document.getElementById("tab-ink");
  const chipsEl = document.getElementById("chips");
  const bodyEl = document.getElementById("menu-body");
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const money = (n) => "$" + n.toFixed(2);
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  // ---------- Render ----------
  function renderItem(item, i, sized) {
    const tag = item.tag ? `<span class="item-tag">${esc(item.tag)}</span>` : "";
    const desc = item.desc ? `<span class="item-desc">${esc(item.desc)}</span>` : "";
    let prices;
    if (item.sizes) {
      prices = item.sizes
        .map((p, k) => p == null
          ? `<span class="price is-na" aria-label="Not available in ${k ? "large" : "small"}">—</span>`
          : `<span class="price"><span class="sr-only">${k ? "Large" : "Small"} </span>${money(p)}</span>`)
        .join("");
    } else {
      prices = `<span class="price${sized ? " span" : ""}">${money(item.price)}</span>`;
    }
    return `<li class="item" style="--i:${Math.min(i, 14)}"><div class="item-name">${esc(item.name)}${tag}${desc}</div>${prices}</li>`;
  }

  function renderCategory(cat, idx) {
    const sized = cat.items.some((it) => it.sizes);
    const twoCol = !sized && cat.items.length > 8;
    const head = sized
      ? `<li class="size-head" aria-hidden="true"><span></span><span>${cat.sizeLabels[0]}</span><span>${cat.sizeLabels[1]}</span></li>`
      : "";
    return `
      <section class="cat" id="${cat.id}" data-observe aria-labelledby="h-${cat.id}">
        <div class="cat-head">
          <h2 class="cat-title" id="h-${cat.id}"><span class="cat-num">${String(idx + 1).padStart(2, "0")}</span>${esc(cat.title)}</h2>
          <span class="cat-count">${cat.items.length} items</span>
        </div>
        ${cat.note ? `<p class="cat-note">${esc(cat.note)}</p>` : ""}
        <div class="cat-rule"></div>
        <ul class="items${sized ? " has-sizes" : ""}${twoCol ? " two-col" : ""}">
          ${head}${cat.items.map((it, i) => renderItem(it, i, sized)).join("")}
        </ul>
        ${cat.footnote ? `<p class="cat-foot">${esc(cat.footnote)}</p>` : ""}
      </section>`;
  }

  tabsEl.insertAdjacentHTML("afterbegin", MENU.map((m) =>
    `<button class="tab" role="tab" id="tab-${m.id}" aria-controls="panel-${m.id}" aria-selected="false" data-menu="${m.id}">${esc(m.label)}</button>`
  ).join(""));

  bodyEl.innerHTML = MENU.map((m) => {
    const count = m.categories.reduce((n, c) => n + c.items.length, 0);
    return `
      <div class="panel" role="tabpanel" id="panel-${m.id}" aria-labelledby="tab-${m.id}">
        <article class="feature">
          <figure class="feature__media"><img src="${m.image}" alt="" loading="lazy"></figure>
          <div class="feature__body">
            <p class="feature__eyebrow"><span>✦</span> House favorite</p>
            <h2 class="feature__name">${esc(m.feature.name)}</h2>
            <p class="feature__blurb">${esc(m.feature.blurb)}</p>
            <div class="feature__meta"><span class="feature__price">${esc(m.feature.price)}</span><span class="feature__count">${count} items</span></div>
          </div>
        </article>
        ${m.categories.map(renderCategory).join("")}
      </div>`;
  }).join("");

  // ---------- Tabs ----------
  const tabs = [...tabsEl.querySelectorAll(".tab")];
  let current = null;

  function moveInk(tab) {
    const r = tab.getBoundingClientRect();
    const pr = tabsEl.getBoundingClientRect();
    const w = r.width - 12;
    inkEl.style.width = w + "px";
    inkEl.style.transform = `translateX(${r.left - pr.left + 6}px)`;
  }

  function renderChips(menu) {
    if (menu.categories.length < 2) { chipsEl.parentElement.hidden = true; return; }
    chipsEl.parentElement.hidden = false;
    chipsEl.innerHTML = menu.categories.map((c, i) =>
      `<button class="chip${i === 0 ? " is-active" : ""}" style="--i:${i}" data-target="${c.id}">${esc(c.title)}</button>`
    ).join("");
  }

  function select(id, opts = {}) {
    const menu = MENU.find((m) => m.id === id) || MENU[0];
    if (current === menu.id) return;
    const prev = current && document.getElementById("panel-" + current);
    const next = document.getElementById("panel-" + menu.id);
    current = menu.id;

    tabs.forEach((t) => t.setAttribute("aria-selected", String(t.dataset.menu === menu.id)));
    moveInk(tabs.find((t) => t.dataset.menu === menu.id));
    renderChips(menu);

    const show = () => {
      if (prev) prev.classList.remove("is-active", "is-leaving");
      next.querySelectorAll(".cat").forEach((c) => c.classList.remove("is-in"));
      next.classList.add("is-active");
      window.observeReveal(next);
      watchSpy(next);
    };
    if (prev && !reduce) { prev.classList.add("is-leaving"); prev.classList.remove("is-active"); setTimeout(show, 200); }
    else show();

    if (!opts.silent) {
      const url = new URL(location.href);
      url.searchParams.set("menu", menu.id);
      url.hash = "";
      history.replaceState(null, "", url);
      // Keep the tab bar in view when switching from further down the page
      const bar = document.querySelector(".menu-bar");
      const barTop = bar.getBoundingClientRect().top + window.scrollY - parseInt(getComputedStyle(document.documentElement).getPropertyValue("--header-h"), 10);
      if (window.scrollY > barTop) window.scrollTo({ top: barTop, behavior: reduce ? "auto" : "smooth" });
    }
  }

  tabs.forEach((t) => t.addEventListener("click", () => select(t.dataset.menu)));
  tabsEl.addEventListener("keydown", (e) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    const i = tabs.findIndex((t) => t.dataset.menu === current);
    const n = tabs[(i + (e.key === "ArrowRight" ? 1 : tabs.length - 1)) % tabs.length];
    n.focus(); select(n.dataset.menu);
  });
  window.addEventListener("resize", () => {
    const t = tabs.find((x) => x.dataset.menu === current);
    if (t) moveInk(t);
  });

  // ---------- Chips: jump + scroll-spy ----------
  let spyLock = 0;
  chipsEl.addEventListener("click", (e) => {
    const chip = e.target.closest(".chip");
    if (!chip) return;
    const sec = document.getElementById(chip.dataset.target);
    setActiveChip(chip.dataset.target);
    spyLock = Date.now() + 900;
    sec.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
  });

  function setActiveChip(id) {
    chipsEl.querySelectorAll(".chip").forEach((c) => {
      const on = c.dataset.target === id;
      c.classList.toggle("is-active", on);
      if (on) {
        const left = c.offsetLeft - chipsEl.clientWidth / 2 + c.clientWidth / 2;
        chipsEl.scrollTo({ left, behavior: reduce ? "auto" : "smooth" });
      }
    });
  }

  let spyIO;
  function watchSpy(panel) {
    if (spyIO) spyIO.disconnect();
    if (!("IntersectionObserver" in window)) return;
    spyIO = new IntersectionObserver((entries) => {
      if (Date.now() < spyLock) return;
      const vis = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
      if (vis[0]) setActiveChip(vis[0].target.id);
    }, { rootMargin: "-35% 0px -60% 0px" });
    panel.querySelectorAll(".cat").forEach((c) => spyIO.observe(c));
  }

  // ---------- Count-up on hero stats ----------
  document.querySelectorAll("[data-count]").forEach((el, k) => {
    const end = +el.dataset.count;
    if (reduce) { el.textContent = end; return; }
    const t0 = performance.now() + 500 + k * 120, dur = 1100;
    const tick = (t) => {
      const p = Math.min(Math.max((t - t0) / dur, 0), 1);
      el.textContent = Math.round(end * (1 - Math.pow(1 - p, 3)));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });

  // ---------- Back to top ----------
  const top = document.querySelector(".to-top");
  if (top) {
    // Only appears while scrolling back up, so it never sits on top of prices while reading
    let lastY = window.scrollY, hideT;
    window.addEventListener("scroll", () => {
      const y = window.scrollY, up = y < lastY - 4;
      if (Math.abs(y - lastY) > 4) {
        top.classList.toggle("is-visible", up && y > 900);
        clearTimeout(hideT);
        if (up) hideT = setTimeout(() => top.classList.remove("is-visible"), 2200);
        lastY = y;
      }
    }, { passive: true });
    top.addEventListener("click", () => window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" }));
  }

  // ---------- Initial selection: ?menu=deli or old-site style ?menu=deli-menu ----------
  const q = (new URLSearchParams(location.search).get("menu") || "").replace(/-menu$/, "");
  select(MENU.some((m) => m.id === q) ? q : MENU[0].id, { silent: true });
  // Fonts can shift tab widths after load
  if (document.fonts) document.fonts.ready.then(() => moveInk(tabs.find((t) => t.dataset.menu === current)));
})();
