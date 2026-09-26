/* Mausam Nepal: drought watch.
   Compares last-30-day rainfall with the 30-year normal for the same
   calendar window, using the Open-Meteo ERA5 archive. */
window.MN = window.MN || {};

MN.Drought = (function () {
  const cache = {};

  function iso(d) { return d.toISOString().slice(0, 10); }

  async function compute(loc) {
    if (cache[loc.slug]) return cache[loc.slug];
    const end = new Date(); end.setDate(end.getDate() - 6); // archive latency
    const endS = iso(end);
    const hist = await MN.WX.fetchPrecipHistory(loc, "1995-01-01", endS);
    if (!hist.length) return null;

    const last30 = hist.slice(-30);
    const lastSum = last30.reduce((a, r) => a + r.p, 0);

    // 30-year normal: for each calendar date in the window, mean over 1995-2024
    const byMD = {};
    hist.forEach(r => {
      const y = +r.date.slice(0, 4);
      if (y < 1995 || y > 2024) return;
      const md = r.date.slice(5);
      (byMD[md] = byMD[md] || []).push(r.p);
    });
    let normal = 0, nDays = 0;
    last30.forEach(r => {
      const md = r.date.slice(5);
      const arr = byMD[md];
      if (arr && arr.length >= 20) { normal += arr.reduce((a, v) => a + v, 0) / arr.length; nDays++; }
    });

    let pct = null, status = "normal";
    if (normal >= 5) {
      pct = Math.round(lastSum / normal * 100);
      if (pct < 40) status = "drought";
      else if (pct < 70) status = "dry";
      else if (pct > 140) status = "wet";
    } else {
      // very dry baseline season: judge by absolute rain
      if (lastSum < 5) { pct = 100; status = "normal"; }
      else { pct = Math.round(lastSum / Math.max(normal, 1) * 100); status = "wet"; }
    }
    const out = { lastSum: Math.round(lastSum), normal: Math.round(normal), pct, status,
                  asOf: last30[last30.length - 1].date };
    cache[loc.slug] = out;
    return out;
  }

  return { compute };
})();
