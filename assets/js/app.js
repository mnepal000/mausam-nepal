/* Mausam Nepal: main app orchestration */
window.MNApp = (function () {
  const S = {
    loc: MN.LOCATIONS.find(l => l.slug === MN.DEFAULT_LOCATION),
    data: null,
    audience: "farmer",
    drought: null,
    satInit: false,
  };

  const $ = id => document.getElementById(id);

  function locName(l) { return MN.lang === "ne" ? l.ne : l.en; }

  /* ---------- rendering ---------- */
  function renderHero() {
    const d = S.data, c = d.current, loc = S.loc;
    $("hero-place").textContent = locName(loc);
    $("hero-temp").textContent = MN.num(Math.round(c.temperature_2m));
    $("hero-icon").textContent = MN.wmoIcon(c.weather_code);
    $("hero-cond").textContent = MN.t("cond_" + MN.wmoKey(c.weather_code));
    const up = c.time.slice(0, 16).replace("T", " ");
    $("hero-updated").textContent = up;
    $("hero-elev").textContent = MN.num(loc.elev);
    /* living sky: theme the whole page off the current condition */
    const wk = MN.wmoKey(c.weather_code);
    let sky = "cloud";
    if (wk === "clear" || wk === "mainlyClear" || wk === "partlyCloudy") sky = c.is_day ? "clear-day" : "clear-night";
    else if (wk === "fog") sky = "fog";
    else if (wk === "drizzle") sky = "drizzle";
    else if (wk === "rain" || wk === "rainShowers") sky = "rain";
    else if (wk === "snow" || wk === "snowShowers") sky = "snow";
    else if (wk === "thunderstorm" || wk === "thunderHail") sky = "storm";
    document.body.dataset.sky = sky;
    if (MN.FX) MN.FX.setSky(sky);
    const i = MN.WX.currentHourIndex(d);
    const stats = [
      [MN.t("feelsLike"), MN.num(Math.round(c.apparent_temperature)) + "°"],
      [MN.t("humidity"), MN.num(c.relative_humidity_2m) + "%"],
      [MN.t("wind"), MN.num(Math.round(c.wind_speed_10m)) + " " + MN.t("kmh")],
      [MN.t("pressure"), MN.num(Math.round(c.pressure_msl)) + " " + MN.t("hpa")],
      [MN.t("cloudCover"), MN.num(c.cloud_cover) + "%"],
      [MN.t("uvIndex"), MN.num((MN.WX.at(d, i, "uv_index") || 0).toFixed(1))],
      [MN.t("sunrise"), (d.daily.sunrise[0] || "").slice(11, 16)],
      [MN.t("sunset"), (d.daily.sunset[0] || "").slice(11, 16)],
    ];
    $("hero-stats").innerHTML = stats.map(s =>
      `<div class="stat"><div class="k">${s[0]}</div><div class="v">${s[1]}</div></div>`).join("");
  }

  function renderHourly() {
    const d = S.data, i0 = MN.WX.currentHourIndex(d);
    let html = "";
    for (let k = 0; k < 24; k++) {
      const i = i0 + k;
      const t = d.hourly.time[i]; if (!t) break;
      const hr = MN.num(parseInt(t.slice(11, 13), 10));
      const code = d.hourly.weather_code[i];
      const tp = Math.round(d.hourly.temperature_2m[i]);
      const pp = d.hourly.precipitation_probability[i] || 0;
      html += `<div class="hour-cell"><div class="hh">${hr}</div>` +
        `<div class="ic">${MN.wmoIcon(code)}</div>` +
        `<div>${MN.num(tp)}°</div><div class="pp">${MN.num(pp)}%</div></div>`;
    }
    $("hourly-strip").innerHTML = html;
  }

  function renderDaily() {
    const d = S.data;
    let html = "";
    const n = Math.min(7, d.daily.time.length);
    for (let k = 0; k < n; k++) {
      const dt = new Date(d.daily.time[k] + "T12:00:00");
      const day = k === 0 ? MN.t("now") : MN.t("days")[dt.getDay()];
      const code = d.daily.weather_code[k];
      const mx = Math.round(d.daily.temperature_2m_max[k]);
      const mn = Math.round(d.daily.temperature_2m_min[k]);
      const pp = d.daily.precipitation_probability_max[k] || 0;
      const rain = d.daily.precipitation_sum[k] || 0;
      const pct = Math.min(100, Math.max(4, (mx / 40) * 100));
      html += `<div class="day-row"><div class="d">${day}</div>` +
        `<div style="font-size:20px">${MN.wmoIcon(code)}</div>` +
        `<div><div class="bar"><i style="left:0;width:${pct}%"></i></div>` +
        `<div style="font-size:11.5px;color:var(--muted)">${MN.num(pp)}% · ${MN.num(rain.toFixed(1))} ${MN.t("mm")}</div></div>` +
        `<div class="tr">${MN.num(mn)}° / <b>${MN.num(mx)}°</b></div></div>`;
    }
    $("daily-list").innerHTML = html;
  }

  async function renderNowcast() {
    const r = await MN.Nowcast.predict(S.loc, S.data);
    const pct = v => v === null || v === undefined ? "-" : MN.num(Math.round(v * 100)) + "%";
    const arc = $("gauge-arc");
    if (r.prob !== null) {
      const C = 402;
      arc.style.strokeDashoffset = C * (1 - r.prob);
      arc.style.stroke = r.prob >= 0.6 ? "#dc2626" : r.prob >= 0.3 ? "#f59e0b" : "#16a34a";
      $("gauge-val").textContent = MN.num(Math.round(r.prob * 100)) + "%";
      $("ml-val").textContent = pct(r.prob);
      $("ml-bar").style.width = (r.prob * 100) + "%";
    } else {
      $("gauge-val").textContent = "-";
      $("ml-val").textContent = "-";
      arc.style.strokeDashoffset = 402;
    }
    $("nwp-val").textContent = pct(r.nwp);
    $("nwp-bar").style.width = (r.nwp * 100) + "%";
    let note = r.hasModel ? MN.t("modelNote") : MN.t("noModel");
    if (r.hasModel && r.metrics) {
      const m = r.metrics.model;
      note += " AUC " + MN.num(m.auc.toFixed(2)) + " · " +
        (MN.lang === "ne" ? "सटीकता" : "accuracy") + " " + MN.num(Math.round(m.acc * 100)) + "%";
    }
    $("model-note").textContent = note;
  }

  function renderMountain() {
    const card = $("mountain-card");
    if (S.loc.zone !== "mountain") { card.style.display = "none"; return; }
    card.style.display = "block";
    const d = S.data, i = MN.WX.currentHourIndex(d);
    const fl = MN.WX.at(d, i, "freezing_level_height");
    const w500 = MN.WX.at(d, i, "wind_speed_500hPa");
    const w700 = MN.WX.at(d, i, "wind_speed_700hPa");
    const vis = MN.WX.at(d, i, "visibility");
    const rows = [
      [MN.t("freezingLevel"), isNaN(fl) ? "-" : MN.num(Math.round(fl)) + " " + MN.t("m")],
      [MN.t("windAloft"), isNaN(w500) ? "-" : MN.num(Math.round(Math.max(w500, w700 || 0))) + " " + MN.t("kmh")],
      [MN.t("visibility"), isNaN(vis) ? "-" : MN.num((vis / 1000).toFixed(1)) + " km"],
      [MN.t("elevation"), MN.num(S.loc.elev) + " " + MN.t("m")],
    ];
    $("mountain-grid").innerHTML =
      `<div class="mtn-card"><h4>${locName(S.loc)}</h4>` +
      rows.map(r => `<div class="row"><span>${r[0]}</span><b>${r[1]}</b></div>`).join("") + `</div>`;
  }

  function renderAdvisories() {
    const list = S.audience === "farmer"
      ? MN.Advisories.farmerAdvisories(S.loc, S.data, S.drought)
      : MN.Advisories.travelerAdvisories(S.loc, S.data);
    if (!list.length) {
      $("advisory-list").innerHTML = `<p style="color:var(--muted)">${MN.t("noAdvisories")}</p>`;
      return;
    }
    $("advisory-list").innerHTML = list.map(a => {
      const title = MN.lang === "ne" ? a.title.ne : a.title.en;
      const body = MN.lang === "ne" ? a.body.ne : a.body.en;
      return `<div class="adv sev-${a.sev}"><span class="sev">${MN.t("sev_" + a.sev)}</span>` +
        `<h4>${title}</h4><p>${body}</p></div>`;
    }).join("");
    return list;
  }

  async function renderDrought() {
    const r = await MN.Drought.compute(S.loc);
    S.drought = r;
    if (!r) return;
    $("d-last").textContent = MN.num(r.lastSum) + " " + MN.t("mm");
    $("d-norm").textContent = MN.num(r.normal) + " " + MN.t("mm");
    $("d-pct").textContent = r.pct === null ? "-" : MN.t("ofNormal", { x: MN.num(r.pct) });
    $("d-status").textContent = MN.t("st_" + r.status);
    const pos = Math.max(2, Math.min(98, (Math.min(r.pct === null ? 100 : r.pct, 200) / 200) * 100));
    $("d-pin").style.left = pos + "%";
    renderAdvisories(); // advisories use drought info
  }

  function renderCropCal() {
    const mo = parseInt(S.data.current.time.slice(5, 7), 10);
    let html = `<div class="mtn-grid">`;
    for (let m = 1; m <= 12; m++) {
      const t = MN.Advisories.cropTitle(m);
      const name = MN.lang === "ne" ? t.ne : t.en;
      const active = m === mo ? `style="border-color:var(--brand);background:#ecfeff"` : "";
      html += `<div class="mtn-card" ${active}><h4>${MN.t("months")[m - 1]}</h4>` +
        `<div style="font-size:12px;color:var(--muted)">${name.replace(/^(Crop note|बाली नोट):?\s*/, "")}</div></div>`;
    }
    $("crop-cal").innerHTML = html + "</div>";
  }

  function renderChips() {
    const picks = ["kathmandu", "pokhara", "biratnagar", "nepalgunj", "lukla", "ebc"];
    $("quick-chips").innerHTML = picks.map(s => {
      const l = MN.LOCATIONS.find(x => x.slug === s);
      return `<button data-slug="${s}" class="${l.slug === S.loc.slug ? "active" : ""}">${locName(l)}</button>`;
    }).join("");
    $("quick-chips").querySelectorAll("button").forEach(b =>
      b.addEventListener("click", () => setLocation(MN.LOCATIONS.find(x => x.slug === b.dataset.slug))));
    renderLocSelect();
  }

  function renderLocSelect() {
    const sel = $("loc-select");
    if (!sel) return;
    let html = "";
    for (const p of MN.PROVINCES) {
      html += `<optgroup label="${MN.lang === "ne" ? p.ne : p.en}">`;
      for (const l of MN.LOCATIONS.filter(x => x.province === p.id))
        html += `<option value="${l.slug}">${locName(l)}</option>`;
      html += `</optgroup>`;
    }
    sel.innerHTML = html;
    sel.onchange = () => {
      const l = MN.LOCATIONS.find(x => x.slug === sel.value);
      if (l) setLocation(l);
    };
    syncLocSelect();
  }

  function syncLocSelect() {
    const sel = $("loc-select");
    if (!sel || !S.loc) return;
    if (!sel.querySelector(`option[value="${S.loc.slug}"]`)) {
      const o = document.createElement("option");
      o.value = S.loc.slug; o.textContent = locName(S.loc);
      sel.prepend(o);
    }
    sel.value = S.loc.slug;
  }

  /* ---------- location loading ---------- */
  async function setLocation(loc) {
    S.loc = loc; S.data = null; S.drought = null;
    renderChips();
    ["hero-temp", "hero-cond"].forEach(id => $(id).textContent = "...");
    try {
      S.data = await MN.WX.fetchForecast(loc);
    } catch (e) {
      $("hero-cond").innerHTML = `<span class="err">Failed to load weather data. Check connection.</span>`;
      return;
    }
    renderHero(); renderHourly(); renderDaily(); renderNowcast();
    renderMountain(); renderAdvisories(); renderDrought(); renderCropCal();
    MN.SatMap.setLocation(loc);
    checkAlertConditions();
  }

  /* ---------- search ---------- */
  let searchTimer = null;
  function initSearch() {
    const inp = $("place-search"), box = $("search-results");
    inp.addEventListener("input", () => {
      clearTimeout(searchTimer);
      const q = inp.value.trim();
      if (q.length < 2) { box.style.display = "none"; return; }
      searchTimer = setTimeout(async () => {
        try {
          const res = await MN.WX.searchPlaces(q);
          if (!res.length) { box.innerHTML = `<button disabled>${MN.t("noResults")}</button>`; }
          else box.innerHTML = res.slice(0, 6).map((r, i) =>
            `<button data-i="${i}">${r.name}<span class="sub">${r.admin ? r.admin + ", " : ""}${r.country}</span></button>`).join("");
          box.style.display = "block";
          box.querySelectorAll("button[data-i]").forEach(b => b.addEventListener("click", () => {
            const r = res[+b.dataset.i];
            box.style.display = "none"; inp.value = "";
            setLocation({ slug: "custom", en: r.name, ne: r.name, lat: r.lat, lon: r.lon,
              elev: Math.round(r.elev || 0), zone: (r.elev || 0) >= 2500 ? "mountain" : (r.elev || 0) < 500 ? "terai" : "hill",
              hasModel: false });
          }));
        } catch (e) { /* ignore */ }
      }, 350);
    });
    document.addEventListener("click", e => {
      if (!e.target.closest(".search-wrap")) box.style.display = "none";
    });
  }

  /* ---------- tabs ---------- */
  function initTabs() {
    document.querySelectorAll(".tabs button").forEach(b => b.addEventListener("click", () => {
      document.querySelectorAll(".tabs button").forEach(x => x.classList.remove("active"));
      b.classList.add("active");
      document.querySelectorAll(".tabpane").forEach(p => p.classList.remove("active"));
      $("tab-" + b.dataset.tab).classList.add("active");
      if (b.dataset.tab === "satellite" && !S.satInit) {
        S.satInit = true;
        MN.SatMap.init(S.loc);
      }
      if (b.dataset.tab === "satellite") MN.SatMap.invalidate();
    }));
    $("aud-farmer").addEventListener("click", () => {
      S.audience = "farmer";
      $("aud-farmer").classList.add("active"); $("aud-traveler").classList.remove("active");
      renderAdvisories();
    });
    $("aud-traveler").addEventListener("click", () => {
      S.audience = "traveler";
      $("aud-traveler").classList.add("active"); $("aud-farmer").classList.remove("active");
      renderAdvisories();
    });
    document.querySelectorAll("#layer-seg button").forEach(b =>
      b.addEventListener("click", () => MN.SatMap.showLayer(b.dataset.layer)));
    $("anim-btn").addEventListener("click", () => MN.SatMap.togglePlay());
  }

  /* ---------- alerts ---------- */
  function initAlerts() {
    const btn = $("alerts-btn"), state = $("alerts-state");
    const saved = localStorage.getItem("mn-alerts") === "on";
    function paint() {
      const on = localStorage.getItem("mn-alerts") === "on";
      btn.textContent = MN.t(on ? "alertsOn" : "enableAlerts");
      btn.disabled = on;
    }
    if (saved && Notification.permission === "granted") paint();
    btn.addEventListener("click", async () => {
      if (!("Notification" in window)) { state.textContent = MN.t("alertsDenied"); return; }
      const p = await Notification.requestPermission();
      if (p === "granted") {
        localStorage.setItem("mn-alerts", "on");
        state.textContent = "";
        paint();
        checkAlertConditions(true);
      } else {
        state.textContent = MN.t("alertsDenied");
      }
    });
    paint();
    setInterval(checkAlertConditions, 30 * 60 * 1000);
  }

  function checkAlertConditions(manual) {
    if (localStorage.getItem("mn-alerts") !== "on" || Notification.permission !== "granted") return;
    if (!S.data) return;
    const all = MN.Advisories.farmerAdvisories(S.loc, S.data, S.drought)
      .concat(MN.Advisories.travelerAdvisories(S.loc, S.data));
    const crit = all.filter(a => a.sev === "critical");
    if (!crit.length) return;
    const key = "mn-alerted-" + S.loc.slug + "-" + S.data.current.time.slice(0, 10);
    if (!manual && localStorage.getItem(key)) return;
    localStorage.setItem(key, "1");
    const a = crit[0];
    try {
      new Notification(MN.lang === "ne" ? "⚠️ मौसम सतर्कता" : "⚠️ Weather alert", {
        body: (MN.lang === "ne" ? a.title.ne : a.title.en) + " — " + locName(S.loc),
      });
    } catch (e) { /* ignore */ }
  }

  function refresh() {
    renderChips();
    if (!S.data) return;
    renderHero(); renderHourly(); renderDaily(); renderNowcast();
    renderMountain(); renderAdvisories(); renderDrought(); renderCropCal();
  }

  function init() {
    document.documentElement.lang = MN.lang === "ne" ? "ne" : "en";
    MN.setLang(MN.lang);
    if (MN.FX) MN.FX.init();
    $("lang-toggle").addEventListener("click", () =>
      MN.setLang(MN.lang === "ne" ? "en" : "ne"));
    initTabs(); initSearch(); initAlerts();
    setLocation(S.loc);
  }

  return { init, refresh, setLocation, getState: () => S };
})();

document.addEventListener("DOMContentLoaded", () => MNApp.init());
