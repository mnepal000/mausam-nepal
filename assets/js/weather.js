/* Mausam Nepal: Open-Meteo data client */
window.MN = window.MN || {};

MN.WX = (function () {
  const cache = {};

  function url(params) {
    return "https://api.open-meteo.com/v1/forecast?" + params;
  }

  async function getJSON(u) {
    const r = await fetch(u);
    if (!r.ok) throw new Error("weather fetch failed: " + r.status);
    return r.json();
  }

  /* Full forecast bundle for a location. Includes past 48h hourly for the ML nowcast. */
  async function fetchForecast(loc) {
    const key = "fc_" + loc.slug;
    const now = Date.now();
    if (cache[key] && now - cache[key].ts < 15 * 60 * 1000) return cache[key].data;

    const base =
      `latitude=${loc.lat}&longitude=${loc.lon}&timezone=${encodeURIComponent(MN.TIMEZONE)}` +
      `&past_days=2&forecast_days=8`;
    const cur = "temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,pressure_msl,wind_speed_10m,cloud_cover,is_day";
    const hourly = "temperature_2m,relative_humidity_2m,dew_point_2m,precipitation,precipitation_probability," +
      "weather_code,cloud_cover,pressure_msl,wind_speed_10m,wind_gusts_10m,visibility,uv_index,freezing_level_height";
    const hourlyMtn = ",wind_speed_700hPa,wind_speed_500hPa";
    const daily = "weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum," +
      "precipitation_probability_max,wind_speed_10m_max,sunrise,sunset,uv_index_max";
    const p =
      base + `&current=${cur}` +
      `&hourly=${hourly}${loc.zone === "mountain" ? hourlyMtn : ""}` +
      `&daily=${daily}`;
    const data = await getJSON(url(p));
    cache[key] = { ts: now, data };
    return data;
  }

  /* Index of the hourly slot matching current time */
  function currentHourIndex(data) {
    const t = data.current.time.slice(0, 13); // "YYYY-MM-DDTHH"
    let i = data.hourly.time.findIndex(x => x.slice(0, 13) === t);
    if (i < 0) i = data.hourly.time.length - 49;
    return Math.max(0, i);
  }

  function at(data, i, name) {
    const v = data.hourly[name] && data.hourly[name][i];
    return (v === null || v === undefined) ? NaN : v;
  }

  /* Place search (biased display: Nepal first) */
  async function searchPlaces(q) {
    const u = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=8&language=en&format=json`;
    const j = await getJSON(u);
    const res = (j.results || []).map(r => ({
      name: r.name, admin: r.admin1 || "", country: r.country || "",
      lat: r.latitude, lon: r.longitude,
      elev: r.elevation, countryCode: r.country_code
    }));
    res.sort((a, b) => (b.countryCode === "NP") - (a.countryCode === "NP"));
    return res;
  }

  /* Daily precipitation history for drought normals */
  async function fetchPrecipHistory(loc, startDate, endDate) {
    const key = `ph_${loc.slug}_${startDate}`;
    if (cache[key]) return cache[key];
    const u = `https://archive-api.open-meteo.com/v1/archive?latitude=${loc.lat}&longitude=${loc.lon}` +
      `&start_date=${startDate}&end_date=${endDate}&daily=precipitation_sum&timezone=${encodeURIComponent(MN.TIMEZONE)}`;
    const j = await getJSON(u);
    const out = j.daily.time.map((t, i) => ({ date: t, p: j.daily.precipitation_sum[i] || 0 }));
    cache[key] = out;
    return out;
  }

  return { fetchForecast, currentHourIndex, at, searchPlaces, fetchPrecipHistory };
})();
