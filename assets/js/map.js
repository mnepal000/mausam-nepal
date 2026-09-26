/* Mausam Nepal: satellite & radar map (Leaflet + RainViewer + NASA GIBS) */
window.MN = window.MN || {};

MN.SatMap = (function () {
  let map = null, radarLayers = [], frames = [], frameIdx = 0, timer = null;
  let imergLayer = null, truecolorLayer = null, marker = null, current = "radar";
  let playing = true;

  function utcDate(daysAgo) {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - daysAgo);
    return d.toISOString().slice(0, 10);
  }

  function init(loc) {
    if (map) { setLocation(loc); return; }
    map = L.map("satmap", { zoomControl: true }).setView([loc.lat, loc.lon], 7);
    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
      maxZoom: 12, attribution: "© OpenStreetMap contributors © CARTO"
    }).addTo(map);
    marker = L.marker([loc.lat, loc.lon]).addTo(map);
    loadRadar();
    // IMERG daily precipitation (yesterday, satellite-derived)
    imergLayer = L.tileLayer(
      `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/IMERG_Precipitation_Rate/default/${utcDate(2)}/GoogleMapsCompatible_Level7/{z}/{y}/{x}.png`,
      { maxZoom: 7, opacity: 0.85, attribution: "NASA GIBS / GPM IMERG" });
    // VIIRS true color (day before yesterday to be safe on latency)
    truecolorLayer = L.tileLayer(
      `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/VIIRS_SNPP_CorrectedReflectance_TrueColor/default/${utcDate(2)}/GoogleMapsCompatible_Level9/{z}/{y}/{x}.jpg`,
      { maxZoom: 9, attribution: "NASA GIBS / VIIRS" });
    showLayer("radar");
  }

  async function loadRadar() {
    try {
      const r = await fetch("https://api.rainviewer.com/public/weather-maps.json");
      const j = await r.json();
      const host = j.host;
      frames = (j.radar && j.radar.past) || [];
      radarLayers = frames.map(f =>
        L.tileLayer(`${host}${f.path}/256/{z}/{x}/{y}/2/1_1.png`,
          { maxZoom: 7, opacity: 0.7, zIndex: 10, attribution: '<a href="https://www.rainviewer.com/">RainViewer</a>' })
      );
      if (radarLayers.length && current === "radar") {
        radarLayers[radarLayers.length - 1].addTo(map);
        frameIdx = radarLayers.length - 1;
        startAnim();
      }
    } catch (e) { /* radar unavailable: map still works */ }
  }

  function startAnim() {
    stopAnim();
    if (radarLayers.length < 2) return;
    playing = true;
    timer = setInterval(() => {
      if (current !== "radar" || !playing) return;
      radarLayers[frameIdx].remove();
      frameIdx = (frameIdx + 1) % radarLayers.length;
      radarLayers[frameIdx].addTo(map);
    }, 900);
  }
  function stopAnim() { if (timer) clearInterval(timer); timer = null; }

  function showLayer(which) {
    current = which;
    stopAnim();
    radarLayers.forEach(l => l.remove());
    if (imergLayer) imergLayer.remove();
    if (truecolorLayer) truecolorLayer.remove();
    if (which === "radar" && radarLayers.length) {
      radarLayers[frameIdx].addTo(map);
      if (playing) startAnim();
    } else if (which === "imerg" && imergLayer) {
      imergLayer.addTo(map);
    } else if (which === "truecolor" && truecolorLayer) {
      truecolorLayer.addTo(map);
    }
    document.querySelectorAll("#layer-seg button").forEach(b =>
      b.classList.toggle("active", b.dataset.layer === which));
  }

  function setLocation(loc) {
    if (!map) return;
    map.setView([loc.lat, loc.lon], 7);
    if (marker) marker.setLatLng([loc.lat, loc.lon]);
  }

  function togglePlay() {
    playing = !playing;
    const btn = document.getElementById("anim-btn");
    if (btn) btn.innerHTML = playing ? "⏸ <span>" + MN.t("pause") + "</span>"
                                    : "▶ <span>" + MN.t("play") + "</span>";
    if (playing && current === "radar") startAnim(); else stopAnim();
    if (playing && current === "radar" && radarLayers.length) {
      radarLayers[frameIdx].addTo(map);
    }
  }

  function invalidate() { if (map) setTimeout(() => map.invalidateSize(), 60); }

  return { init, showLayer, setLocation, togglePlay, invalidate,
           isPlaying: () => playing };
})();
