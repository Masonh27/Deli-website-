(function () {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Header shadow on scroll
  const header = document.querySelector(".site-header");
  const onScroll = () => header && header.classList.toggle("is-scrolled", window.scrollY > 8);
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  // Mobile nav
  const toggle = document.querySelector(".menu-toggle");
  if (toggle) {
    const close = () => { document.body.classList.remove("menu-open"); toggle.setAttribute("aria-expanded", "false"); };
    toggle.addEventListener("click", () => {
      const open = document.body.classList.toggle("menu-open");
      toggle.setAttribute("aria-expanded", String(open));
    });
    document.querySelectorAll(".nav a").forEach((a) => a.addEventListener("click", close));
    document.addEventListener("keydown", (e) => e.key === "Escape" && close());
  }

  // Scroll reveal (also exposed for the menu page to re-use on rendered content)
  const io = "IntersectionObserver" in window
    ? new IntersectionObserver((entries) => {
        entries.forEach((en) => {
          if (en.isIntersecting) { en.target.classList.add("is-in"); io.unobserve(en.target); }
        });
      }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 })
    : null;
  window.observeReveal = (root) => {
    (root || document).querySelectorAll(".reveal, .settle, [data-observe]").forEach((el) => {
      if (!io || reduce) el.classList.add("is-in"); else io.observe(el);
    });
  };
  window.observeReveal();

  // Gentle parallax on banner images
  const px = [...document.querySelectorAll("[data-parallax]")];
  if (px.length && !reduce) {
    let ticking = false;
    const run = () => {
      const vh = window.innerHeight;
      px.forEach((img) => {
        const r = img.parentElement.getBoundingClientRect();
        if (r.bottom < 0 || r.top > vh) return;
        const p = (r.top + r.height / 2 - vh / 2) / vh; // -1..1
        img.style.transform = `translate3d(0, ${(p * -40).toFixed(1)}px, 0)`;
      });
      ticking = false;
    };
    window.addEventListener("scroll", () => { if (!ticking) { ticking = true; requestAnimationFrame(run); } }, { passive: true });
    run();
  }

  // Hours: highlight today + open/closed, in Lakeland (Eastern) time
  const HOURS = { 0: [8, 14], 1: [7, 17], 2: [7, 17], 3: [7, 17], 4: [7, 17], 5: [7, 17], 6: [7, 16] };
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", weekday: "short", hour: "numeric", minute: "numeric", hour12: false }).formatToParts(new Date());
  const get = (t) => parts.find((p) => p.type === t).value;
  const day = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(get("weekday"));
  const now = (parseInt(get("hour"), 10) % 24) + parseInt(get("minute"), 10) / 60;
  const [o, c] = HOURS[day];
  const open = now >= o && now < c;
  const fmt = (h) => (h > 12 ? h - 12 : h) + (h >= 12 ? " PM" : " AM");
  document.querySelectorAll("[data-days]").forEach((li) => {
    if (li.dataset.days.split(",").map(Number).includes(day)) li.classList.add("is-today");
  });
  document.querySelectorAll(".open-status").forEach((el) => {
    el.classList.toggle("is-open", open);
    el.querySelector("span").textContent = open ? `Open now · until ${fmt(c)}` : (now < o ? `Closed · opens ${fmt(o)} today` : "Closed now");
  });

  // Ticker: duplicate the run once so the -50% marquee loops seamlessly
  document.querySelectorAll("[data-ticker]").forEach((t) => { t.innerHTML += t.innerHTML; });

  // Tap/click micro-interactions: quick press-in + ripple from the touch point
  const PRESS = ".btn, .chip, .tab, .to-top, .menu-toggle, .socials a, .status-pill, .trio-card, .nav a";
  const RIPPLE = ".btn, .chip, .tab, .to-top, .socials a, .status-pill";
  document.addEventListener("pointerdown", (e) => {
    const el = e.target.closest(PRESS);
    if (!el || reduce) return;
    el.classList.add("is-pressed");
    const release = () => { el.classList.remove("is-pressed"); window.removeEventListener("pointerup", release); window.removeEventListener("pointercancel", release); };
    window.addEventListener("pointerup", release); window.addEventListener("pointercancel", release);
    if (!el.matches(RIPPLE)) return;
    const r = el.getBoundingClientRect();
    const size = Math.max(r.width, r.height) * 2.2;
    const rip = document.createElement("span");
    rip.className = "ripple";
    rip.style.cssText = `width:${size}px;height:${size}px;left:${e.clientX - r.left - size / 2}px;top:${e.clientY - r.top - size / 2}px`;
    el.appendChild(rip);
    rip.addEventListener("animationend", () => rip.remove());
  });

  // Soft fade between pages on internal links
  document.addEventListener("click", (e) => {
    const a = e.target.closest("a[href]");
    if (!a || reduce || e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || a.target === "_blank") return;
    const url = new URL(a.href, location.href);
    if (url.origin !== location.origin || url.pathname === location.pathname || a.hasAttribute("download")) return;
    e.preventDefault();
    document.body.classList.add("is-leaving");
    setTimeout(() => { location.href = url.href; }, 260);
  });
  window.addEventListener("pageshow", () => document.body.classList.remove("is-leaving"));

  // Footer year
  document.querySelectorAll("[data-year]").forEach((el) => (el.textContent = new Date().getFullYear()));
})();
