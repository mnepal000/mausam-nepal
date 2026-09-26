/* Mausam Nepal: ML rain nowcast.
   Runs the trained logistic-regression classifier in the browser.
   Feature order MUST match ml/train_rain_classifier.py exactly. */
window.MN = window.MN || {};

MN.Nowcast = (function () {
  const modelCache = {};

  const FEATURES = [
    "temp", "rh", "dew_dep", "cloud", "pressure", "wind", "precip_1h",
    "temp_lag6", "rh_lag6", "cloud_lag6", "pressure_lag6", "wind_lag6",
    "temp_lag24", "rh_lag24", "cloud_lag24",
    "pressure_tendency_3h", "temp_change_24h", "precip_sum_6h",
    "hour_sin", "hour_cos", "month_sin", "month_cos",
  ];

  async function loadModel(slug) {
    if (modelCache[slug] !== undefined) return modelCache[slug];
    try {
      const r = await fetch("assets/models/" + slug + ".json");
      if (!r.ok) throw new Error("no model");
      modelCache[slug] = await r.json();
    } catch (e) {
      modelCache[slug] = null;
    }
    return modelCache[slug];
  }

  function buildFeatures(data, i) {
    const H = data.hourly;
    const g = n => (H[n] && H[n][i] !== null && H[n][i] !== undefined) ? H[n][i] : NaN;
    const gl = (n, lag) => (H[n] && H[n][i - lag] !== null && H[n][i - lag] !== undefined) ? H[n][i - lag] : NaN;
    const temp = g("temperature_2m"), rh = g("relative_humidity_2m"),
          dew = g("dew_point_2m"), cloud = g("cloud_cover"),
          pressure = g("pressure_msl"), wind = g("wind_speed_10m"),
          precip = g("precipitation");
    let psum = 0;
    for (let k = 0; k < 6; k++) { const v = gl("precipitation", k); if (isNaN(v)) return null; psum += v; }
    const tstr = H.time[i]; // "YYYY-MM-DDTHH:MM" in Asia/Kathmandu
    const hr = parseInt(tstr.slice(11, 13), 10), mo = parseInt(tstr.slice(5, 7), 10);
    const f = {
      temp, rh, dew_dep: temp - dew, cloud, pressure, wind, precip_1h: precip,
      temp_lag6: gl("temperature_2m", 6), rh_lag6: gl("relative_humidity_2m", 6),
      cloud_lag6: gl("cloud_cover", 6), pressure_lag6: gl("pressure_msl", 6),
      wind_lag6: gl("wind_speed_10m", 6),
      temp_lag24: gl("temperature_2m", 24), rh_lag24: gl("relative_humidity_2m", 24),
      cloud_lag24: gl("cloud_cover", 24),
      pressure_tendency_3h: pressure - gl("pressure_msl", 3),
      temp_change_24h: temp - gl("temperature_2m", 24),
      precip_sum_6h: psum,
      hour_sin: Math.sin(2 * Math.PI * hr / 24), hour_cos: Math.cos(2 * Math.PI * hr / 24),
      month_sin: Math.sin(2 * Math.PI * mo / 12), month_cos: Math.cos(2 * Math.PI * mo / 12),
    };
    const vec = FEATURES.map(k => f[k]);
    if (vec.some(v => isNaN(v))) return null;
    return vec;
  }

  function sigmoid(z) { return 1 / (1 + Math.exp(-z)); }

  /* NWP baseline: max precipitation_probability over next 6 hours */
  function nwpProb(data, i) {
    const pp = data.hourly.precipitation_probability || [];
    let m = 0;
    for (let k = 0; k < 6; k++) {
      const v = pp[i + k];
      if (v !== null && v !== undefined && v > m) m = v;
    }
    return m / 100;
  }

  async function predict(loc, data) {
    const i = MN.WX.currentHourIndex(data);
    const nwp = nwpProb(data, i);
    const model = loc.hasModel ? await loadModel(loc.slug) : null;
    if (!model) return { prob: null, nwp, hasModel: false, metrics: null };
    const vec = buildFeatures(data, i);
    if (!vec) return { prob: null, nwp, hasModel: true, metrics: model.metrics };
    let z = model.intercept;
    for (let k = 0; k < vec.length; k++) {
      z += model.coef[k] * ((vec[k] - model.scaler_mean[k]) / model.scaler_std[k]);
    }
    return { prob: sigmoid(z), nwp, hasModel: true, metrics: model.metrics };
  }

  return { predict, FEATURES };
})();
