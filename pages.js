// Wheel paging inside <main>, the page's scroll container: each wheel notch or trackpad flick
// moves one page, and quick repeated inputs queue up instead of being dropped mid-animation.
// Touch and keyboard scrolling use the CSS scroll snapping in style.css.
(() => {
  const scroller = document.querySelector("main");
  const pages = scroller ? [...scroller.querySelectorAll(".page")] : [];
  if (pages.length < 2) return;
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const GESTURE_GAP = 150;   // ms of quiet that ends a trackpad gesture
  let target = null;         // page index we are animating to, null when settled
  let lastWheel = 0, inGesture = false, settle = 0;
  const top = () => scroller.scrollTop, height = () => scroller.clientHeight;

  const indexAt = () => {
    let i = 0;
    pages.forEach((p, k) => { if (p.offsetTop <= top() + 2) i = k; });
    return i;
  };
  const topOf = (i, dir) => {
    const t = pages[i];
    return dir > 0 ? t.offsetTop : Math.max(t.offsetTop, t.offsetTop + t.offsetHeight - height());
  };
  const go = (i, dir) => {
    target = i;
    scroller.scrollTo({ top: topOf(i, dir), behavior: reduced ? "auto" : "smooth" });
  };
  // a mouse wheel notch arrives as one whole-number event of 100 or more (or in line units);
  // trackpads send streams of small, fractional deltas
  const isNotch = (e) => e.deltaMode !== 0 || (Number.isInteger(e.deltaY) && Math.abs(e.deltaY) >= 100);

  addEventListener("wheel", (e) => {
    if (e.ctrlKey || Math.abs(e.deltaY) < Math.abs(e.deltaX)) return;
    const dir = Math.sign(e.deltaY);
    if (!dir) return;
    const now = performance.now(), gap = now - lastWheel;
    lastWheel = now;
    const i = target ?? indexAt(), page = pages[i];
    // pages taller than the window scroll normally until their edge
    if (target === null) {
      const bottom = page.offsetTop + page.offsetHeight;
      if (dir > 0 && top() + height() < bottom - 2) return;
      if (dir < 0 && top() > page.offsetTop + 2) return;
    }
    e.preventDefault();
    let step;
    if (isNotch(e)) step = true;                       // every notch counts, even mid-animation
    else if (gap > GESTURE_GAP) { inGesture = true; step = true; }   // first event of a flick
    else step = false;                                 // the rest of the flick
    if (!step) return;
    const next = Math.min(pages.length - 1, Math.max(0, i + dir));
    if (next !== i) go(next, dir);
  }, { passive: false });

  // once the scroll settles the target is cleared and the snapped position is the truth again
  scroller.addEventListener("scroll", () => {
    clearTimeout(settle);
    settle = setTimeout(() => { target = null; }, 150);
  }, { passive: true });

  // the hash names a page: land on it inside the scroller (the browser only scrolls the window)
  const jump = () => {
    const t = location.hash && document.getElementById(location.hash.slice(1));
    if (t && t.classList.contains("page")) scroller.scrollTo({ top: t.offsetTop, behavior: "auto" });
  };
  addEventListener("hashchange", jump);
  jump();
})();
