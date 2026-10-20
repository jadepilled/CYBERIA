// The cursor as a soft light: header, wordmark and tagline brighten towards it (fine pointers only).
(() => {
  if (!matchMedia("(pointer: fine)").matches) return;
  const root = document.documentElement;
  const lit = [...document.querySelectorAll("[data-light]")];
  let x = innerWidth / 2, y = innerHeight * 0.45, tx = x, ty = y, raf = 0;
  const tick = () => {
    raf = 0;
    x += (tx - x) * 0.16; y += (ty - y) * 0.16;
    root.style.setProperty("--mx", `${x.toFixed(1)}px`); root.style.setProperty("--my", `${y.toFixed(1)}px`);
    for (const el of lit) {
      const r = el.getBoundingClientRect();
      el.style.setProperty("--lx", `${(x - r.left).toFixed(1)}px`); el.style.setProperty("--ly", `${(y - r.top).toFixed(1)}px`);
    }
    if (Math.abs(tx - x) > 0.4 || Math.abs(ty - y) > 0.4) raf = requestAnimationFrame(tick);
  };
  const poke = () => { if (!raf) raf = requestAnimationFrame(tick); };
  addEventListener("pointermove", (e) => { tx = e.clientX; ty = e.clientY; poke(); }, { passive: true });
  addEventListener("scroll", poke, { passive: true, capture: true });
  addEventListener("resize", poke);
  poke();
})();
