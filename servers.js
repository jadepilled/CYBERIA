// Server cards for cyberia.gg. Server list: servers.json (edit to add servers).
// Live status: status.json on the repo's `status` branch, refreshed every 10 min by a GitHub Action.
(() => {
  const STATUS_URL = "https://raw.githubusercontent.com/jadepilled/CYBERIA/status/status.json";
  const RANGES = { "24h": 24 * 3600, "7d": 7 * 24 * 3600 };
  const FRESH = 20 * 60;            // a poll this recent is shown without an age
  const STALE_AFTER = 12 * 3600;    // older than this and we stop guessing
  const list = document.getElementById("server-list");
  if (!list) return;

  const el = (tag, cls, text) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  };
  const NS = "http://www.w3.org/2000/svg";
  const svgEl = (tag, attrs) => {
    const n = document.createElementNS(NS, tag);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    return n;
  };
  const clock = (t, withDay) => new Date(t * 1000).toLocaleString([], withDay
    ? { weekday: "short", hour: "2-digit", minute: "2-digit" }
    : { hour: "2-digit", minute: "2-digit" });
  const ago = (sec) => sec < 3600 ? `${Math.max(1, Math.round(sec / 60))} min ago` : `${Math.round(sec / 3600)} h ago`;

  async function getJSON(url) {
    const r = await fetch(url, { cache: "no-store" });
    if (!r.ok) throw new Error(r.status);
    return r.json();
  }

  function drawChart(box, history, maxPlayers, range, readout) {
    box.replaceChildren();
    const now = Date.now() / 1000;
    const from = now - RANGES[range];
    const pts = history.filter((p) => p[0] >= from);
    if (!pts.some((p) => p[1] != null)) {
      box.append(el("div", "chart-empty", "No data yet"));
      return null;
    }
    const W = box.clientWidth || 300, H = box.clientHeight || 72;
    const top = Math.max(maxPlayers || 0, ...pts.map((p) => p[1] || 0), 1);
    const x = (t) => ((t - from) / (now - from)) * W;
    const y = (v) => H - (v / top) * (H - 6);
    const svg = svgEl("svg", { viewBox: `0 0 ${W} ${H}`, role: "img", "aria-label": `Player count, last ${range}` });

    svg.append(svgEl("line", { x1: 0, x2: W, y1: H - 0.5, y2: H - 0.5, stroke: "#4a3729", "stroke-width": 1 }));
    svg.append(svgEl("line", { x1: 0, x2: W, y1: y(top) + 0.5, y2: y(top) + 0.5, stroke: "#3d2d20", "stroke-width": 1 }));
    const yl = svgEl("text", { x: 0, y: y(top) - 4, fill: "#8a7458", "font-size": 10 });
    yl.textContent = top;
    svg.append(yl);

    // split into runs at offline gaps
    const runs = [];
    let run = [];
    for (const p of pts) {
      if (p[1] == null) { if (run.length) runs.push(run); run = []; } else run.push(p);
    }
    if (run.length) runs.push(run);
    for (const r of runs) {
      const line = r.map((p, i) => `${i ? "L" : "M"}${x(p[0]).toFixed(1)},${y(p[1]).toFixed(1)}`).join("");
      const area = `${line}L${x(r[r.length - 1][0]).toFixed(1)},${H}L${x(r[0][0]).toFixed(1)},${H}Z`;
      svg.append(svgEl("path", { d: area, fill: "var(--chart)", "fill-opacity": 0.1 }));
      svg.append(svgEl("path", { d: line, fill: "none", stroke: "var(--chart)", "stroke-width": 2, "stroke-linejoin": "round", "stroke-linecap": "round" }));
    }
    const last = pts[pts.length - 1];
    if (last[1] != null) {
      svg.append(svgEl("circle", { cx: x(last[0]), cy: y(last[1]), r: 4, fill: "var(--chart)", stroke: "#2a1d14", "stroke-width": 2 }));
    }

    // hover: crosshair + tooltip on the nearest sample
    const cross = svgEl("line", { y1: 0, y2: H, stroke: "#6a5140", "stroke-width": 1, visibility: "hidden" });
    const dot = svgEl("circle", { r: 4, fill: "var(--chart)", stroke: "#2a1d14", "stroke-width": 2, visibility: "hidden" });
    svg.append(cross, dot);
    box.append(svg);
    const hide = () => { cross.setAttribute("visibility", "hidden"); dot.setAttribute("visibility", "hidden"); readout(null); };
    box.onpointerleave = hide;
    box.onpointermove = (e) => {
      const rect = box.getBoundingClientRect();
      const t = from + ((e.clientX - rect.left) / rect.width) * (now - from);
      let best = pts[0];
      for (const p of pts) if (Math.abs(p[0] - t) < Math.abs(best[0] - t)) best = p;
      const px = x(best[0]);
      cross.setAttribute("x1", px); cross.setAttribute("x2", px); cross.setAttribute("visibility", "visible");
      if (best[1] != null) {
        dot.setAttribute("cx", px); dot.setAttribute("cy", y(best[1])); dot.setAttribute("visibility", "visible");
      } else dot.setAttribute("visibility", "hidden");
      readout(`${best[1] == null ? "Offline" : `${best[1]} players`} · ${clock(best[0], range === "7d")}`);
    };
  }

  function card(srv, st, updated) {
    const soon = srv.status !== "live";
    const c = el("article", "srv" + (soon ? " soon" : ""));
    const now = Date.now() / 1000;
    const age = st && updated ? now - updated : Infinity;
    const stale = age > STALE_AFTER;
    const online = !soon && st && st.online && !stale;

    const top = el("div", "srv-top");
    top.append(el("span", "srv-map", srv.map));
    const status = el("span");
    const pill = el("span", "pill" + (online ? " on" : ""),
      soon ? "Coming soon" : online ? "Online" : stale ? "Status unavailable" : "Offline");
    status.append(pill);
    // the poller runs on a GitHub schedule that often fires hours apart: say how old the reading is
    if (!soon && !stale && age > FRESH) status.append(el("span", "pill-age", `checked ${ago(age)}`));
    top.append(status);
    c.append(top);

    if (soon) return c;

    const pop = el("div", "srv-pop");
    const count = el("b");
    count.append(document.createTextNode(online ? st.players : "–"), el("small", null, ` / ${st && st.maxPlayers ? st.maxPlayers : "–"}`));
    pop.append(count);
    c.append(pop);

    const head = el("div", "chart-head");
    const label = el("span", null, "Players");
    const range = el("div", "range");
    head.append(label, range);
    const box = el("div", "chart");
    c.append(head, box);

    let current = "24h";
    const render = () => {
      drawChart(box, (st && st.history) || [], st && st.maxPlayers, current,
        (text) => { label.textContent = text || "Players"; label.classList.toggle("live", !!text); });
    };
    for (const r of Object.keys(RANGES)) {
      const b = el("button", null, r.toUpperCase());
      b.type = "button";
      b.setAttribute("aria-pressed", r === current);
      b.onclick = () => {
        current = r;
        range.querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", x === b));
        render();
      };
      range.append(b);
    }
    requestAnimationFrame(render);
    new ResizeObserver(() => render()).observe(box);

    const addr = el("div", "addr");
    const address = `${srv.ip}:${srv.port}`;
    const copy = el("button", "copy", "Copy");
    copy.type = "button";
    copy.onclick = async () => {
      try { await navigator.clipboard.writeText(address); copy.textContent = "Copied"; }
      catch { copy.textContent = "Select it"; }
      setTimeout(() => (copy.textContent = "Copy"), 1500);
    };
    addr.append(el("code", null, address), copy);
    c.append(addr);
    return c;
  }

  async function load() {
    let servers;
    try { servers = await getJSON("servers.json"); }
    catch { list.replaceChildren(el("p", "muted", "Server list unavailable.")); return; }
    let status = {};
    try { status = await getJSON(`${STATUS_URL}?t=${Math.floor(Date.now() / 60000)}`); } catch { /* shown per card */ }
    list.replaceChildren(...servers.map((s) => card(s, (status.servers || {})[s.id], status.updated)));
  }

  load();
  setInterval(load, 2 * 60 * 1000);
})();
