/* Mausam Nepal — ambient sky FX: canvas particles driven by current conditions */
window.MN = window.MN || {};
MN.FX = (function () {
  let canvas = null, ctx = null, parts = [], sky = "cloud", raf = 0;
  let W = 0, H = 0, flash = 0;
  const reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function resize() {
    W = canvas.width = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }

  function newPart(anyY) {
    const p = { x: Math.random() * W, y: anyY ? Math.random() * H : -12 };
    if (sky === "snow") {
      p.r = 1 + Math.random() * 2.6; p.vy = 0.4 + Math.random() * 1.1;
      p.vx = -0.4 + Math.random() * 0.8; p.ph = Math.random() * 6.28;
    } else if (sky === "rain" || sky === "storm" || sky === "drizzle") {
      p.len = 10 + Math.random() * 14; p.vy = 9 + Math.random() * 7;
      p.vx = -1.5 - Math.random();
    } else if (sky === "clear-night") {
      p.r = 0.5 + Math.random() * 1.4; p.ph = Math.random() * 6.28;
      p.sp = 0.5 + Math.random() * 1.5;
    } else {
      p.r = 1 + Math.random() * 2; p.vy = 0.15 + Math.random() * 0.3;
      p.vx = 0.1 + Math.random() * 0.3; p.a = 0.05 + Math.random() * 0.12;
    }
    return p;
  }

  function spawn() {
    parts = [];
    const n = sky === "snow" ? 140
      : sky === "rain" || sky === "storm" ? 130
      : sky === "drizzle" ? 70
      : sky === "clear-night" ? 90 : 40;
    for (let i = 0; i < n; i++) parts.push(newPart(true));
  }

  function tick() {
    ctx.clearRect(0, 0, W, H);
    if (sky === "rain" || sky === "storm" || sky === "drizzle") {
      ctx.strokeStyle = "rgba(174,194,224,.5)";
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      for (const p of parts) {
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x - p.vx * 1.6, p.y - p.len);
        p.x += p.vx; p.y += p.vy;
        if (p.y > H + 20) { const q = newPart(false); q.x = Math.random() * (W + 100); Object.assign(p, q); }
      }
      ctx.stroke();
      if (sky === "storm" && Math.random() < 0.006) flash = 1;
      if (flash > 0) {
        ctx.fillStyle = "rgba(200,210,255," + (flash * 0.12).toFixed(3) + ")";
        ctx.fillRect(0, 0, W, H);
        flash -= 0.04;
      }
    } else if (sky === "snow") {
      ctx.fillStyle = "rgba(255,255,255,.85)";
      for (const p of parts) {
        p.ph += 0.01; p.x += p.vx + Math.sin(p.ph) * 0.4; p.y += p.vy;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.29); ctx.fill();
        if (p.y > H + 10) Object.assign(p, newPart(false));
      }
    } else if (sky === "clear-night") {
      for (const p of parts) {
        p.ph += 0.02 * p.sp;
        const a = 0.25 + 0.55 * Math.abs(Math.sin(p.ph));
        ctx.fillStyle = "rgba(255,255,255," + a.toFixed(2) + ")";
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.29); ctx.fill();
      }
    } else {
      for (const p of parts) {
        p.x += p.vx; p.y -= p.vy;
        ctx.globalAlpha = p.a;
        ctx.fillStyle = "rgba(255,255,255,.6)";
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.29); ctx.fill();
        ctx.globalAlpha = 1;
        if (p.y < -10 || p.x > W + 10) { const q = newPart(false); q.y = H + 10; q.x = Math.random() * W; Object.assign(p, q); }
      }
    }
    raf = requestAnimationFrame(tick);
  }

  function init() {
    canvas = document.getElementById("sky-fx");
    if (!canvas || reduced) return;
    ctx = canvas.getContext("2d");
    resize();
    window.addEventListener("resize", resize);
    spawn();
    tick();
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) { cancelAnimationFrame(raf); raf = 0; }
      else if (!raf) { spawn(); tick(); }
    });
  }

  function setSky(s) {
    if (s && s !== sky) { sky = s; if (ctx) spawn(); }
  }

  return { init, setSky };
})();
