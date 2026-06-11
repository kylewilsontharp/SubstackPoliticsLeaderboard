/* Chaotic Era — packed-bubble "map of political Substack".
   EXPERIMENTAL. Self-contained: fetches the data, joins lean + overrides,
   and renders a force-packed landscape bubble chart with D3.
   To remove: delete the .chart-section block in index.html, the two script
   tags (d3 + chart.js), this file, and the chart styles in styles.css. */
(() => {
  "use strict";

  const COLORS = { left: "#419eff", right: "#fa2c5d", neutral: "#9aa6b2", unrated: "#9aa6b2" };
  const LEAN_LABEL = { left: "Left", right: "Right", neutral: "Neutral", unrated: "Unrated" };
  const NF = new Intl.NumberFormat("en-US");

  const leanKey = (url) =>
    String(url || "")
      .toLowerCase()
      .replace(/^https?:\/\//, "")
      .replace(/^www\./, "")
      .replace(/\/+$/, "");

  async function getJSON(url) {
    try {
      const r = await fetch(url, { cache: "no-store" });
      return r.ok ? await r.json() : null;
    } catch {
      return null;
    }
  }

  async function build() {
    const el = document.getElementById("bubble-chart");
    if (!el || typeof d3 === "undefined") return;

    const [us, news, leanDoc, ovDoc] = await Promise.all([
      getJSON("data/us-politics.json"),
      getJSON("data/news.json"),
      getJSON("data/lean.json"),
      getJSON("data/overrides.json"),
    ]);

    const leans = {};
    if (leanDoc && leanDoc.leans)
      for (const [u, v] of Object.entries(leanDoc.leans)) leans[leanKey(u)] = v;
    const overrides = {};
    if (ovDoc && ovDoc.overrides)
      for (const [u, v] of Object.entries(ovDoc.overrides)) overrides[leanKey(u)] = v;

    const seen = new Set();
    const items = [];
    for (const doc of [us, news]) {
      if (!doc || !Array.isArray(doc.publications)) continue;
      for (const p of doc.publications) {
        const k = leanKey(p.url);
        if (seen.has(k)) continue; // dedupe publications that appear in both lists
        seen.add(k);
        let total = p.freeSubscribers || 0;
        const ov = overrides[k];
        if (ov && typeof ov.totalSubscribers === "number") total = ov.totalSubscribers;
        if (total <= 0) continue; // can't size hidden counts
        items.push({
          name: String(p.publicationName || "").trim(),
          url: p.url,
          total,
          lean: leans[k] || "unrated",
          estimated: !!(ov && ov.estimated),
        });
      }
    }
    if (!items.length) return;
    render(el, items);
  }

  function render(el, items) {
    const width = 1000;
    const height = 440;
    const pad = 1.5;

    const maxT = d3.max(items, (d) => d.total) || 1;
    const r = d3.scaleSqrt().domain([0, maxT]).range([3, 54]);
    items.forEach((d, i) => {
      d.r = r(d.total);
      d.x = (i / items.length) * width; // spread horizontally to seed a landscape layout
      d.y = height / 2 + (Math.random() - 0.5) * 40;
    });

    // Pack into a wide band: weak horizontal centering, stronger vertical.
    const sim = d3
      .forceSimulation(items)
      .force("x", d3.forceX(width / 2).strength(0.015))
      .force("y", d3.forceY(height / 2).strength(0.18))
      .force("collide", d3.forceCollide((d) => d.r + pad).iterations(4))
      .stop();
    for (let i = 0; i < 320; i++) sim.tick();

    // Clamp inside the viewBox.
    items.forEach((d) => {
      d.x = Math.max(d.r, Math.min(width - d.r, d.x));
      d.y = Math.max(d.r, Math.min(height - d.r, d.y));
    });

    const svg = d3
      .select(el)
      .append("svg")
      .attr("viewBox", `0 0 ${width} ${height}`)
      .attr("class", "bubbles-svg")
      .attr("role", "img")
      .attr("aria-label", "Packed bubbles of Substack publications, sized by subscribers and coloured by partisan lean");

    const tip = d3.select(el).append("div").attr("class", "bubble-tip").style("opacity", 0);

    const g = svg
      .selectAll("g.bub")
      .data(items)
      .join("g")
      .attr("class", "bub")
      .attr("transform", (d) => `translate(${d.x},${d.y})`)
      .style("cursor", "pointer")
      .on("mousemove", function (event, d) {
        const [mx, my] = d3.pointer(event, el);
        tip
          .html(
            `<strong>${escapeHTML(d.name)}</strong><br>${NF.format(d.total)}${
              d.estimated ? "*" : ""
            } total subs · ${LEAN_LABEL[d.lean]}`
          )
          .style("left", mx + 12 + "px")
          .style("top", my + 12 + "px")
          .style("opacity", 1);
      })
      .on("mouseleave", () => tip.style("opacity", 0))
      .on("click", (event, d) => d.url && window.open(d.url, "_blank", "noopener"));

    g.append("circle")
      .attr("r", (d) => d.r)
      .attr("fill", (d) => COLORS[d.lean] || COLORS.unrated)
      .attr("fill-opacity", 0.85)
      .attr("stroke", (d) => d3.color(COLORS[d.lean] || COLORS.unrated).darker(0.6))
      .attr("stroke-width", 0.75);

    // Label only bubbles big enough to hold readable text.
    g.filter((d) => d.r >= 26)
      .append("text")
      .attr("class", "bub-label")
      .attr("text-anchor", "middle")
      .attr("dy", "0.32em")
      .style("font-size", (d) => Math.max(8, Math.min(13, d.r / 3.2)) + "px")
      .text((d) => shorten(d.name, d.r));
  }

  function shorten(name, radius) {
    const max = Math.max(5, Math.floor(radius / 3.2));
    return name.length > max ? name.slice(0, max - 1).trimEnd() + "…" : name;
  }

  function escapeHTML(s) {
    return String(s).replace(/[&<>"']/g, (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
    );
  }

  document.addEventListener("DOMContentLoaded", build);
})();
