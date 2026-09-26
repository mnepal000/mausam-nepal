/* Mausam Nepal: shared config — locations, constants, API endpoints */
window.MN = window.MN || {};

MN.LOCATIONS = [
  { slug: "kathmandu",  en: "Kathmandu",  ne: "काठमाडौं",  lat: 27.7172, lon: 85.3240, elev: 1400, zone: "hill",     hasModel: true },
  { slug: "pokhara",    en: "Pokhara",    ne: "पोखरा",    lat: 28.2096, lon: 83.9856, elev: 822,  zone: "hill",     hasModel: true },
  { slug: "biratnagar", en: "Biratnagar", ne: "विराटनगर", lat: 26.4525, lon: 87.2718, elev: 72,   zone: "terai",    hasModel: true },
  { slug: "nepalgunj",  en: "Nepalgunj",  ne: "नेपालगञ्ज", lat: 28.0500, lon: 81.6167, elev: 150,  zone: "terai",    hasModel: true },
  { slug: "dhangadhi",  en: "Dhangadhi",  ne: "धनगढी",   lat: 28.7046, lon: 80.5898, elev: 109,  zone: "terai",    hasModel: false },
  { slug: "birgunj",    en: "Birgunj",    ne: "वीरगञ्ज",  lat: 27.0104, lon: 84.8818, elev: 78,   zone: "terai",    hasModel: false },
  { slug: "dharan",     en: "Dharan",     ne: "धरान",     lat: 26.8124, lon: 87.2839, elev: 349,  zone: "terai",    hasModel: false },
  { slug: "butwal",     en: "Butwal",     ne: "बुटवल",    lat: 27.6866, lon: 83.4328, elev: 188,  zone: "terai",    hasModel: false },
  { slug: "chitwan",    en: "Chitwan",    ne: "चितवन",    lat: 27.6833, lon: 84.4333, elev: 208,  zone: "terai",    hasModel: false },
  { slug: "ilam",       en: "Ilam",       ne: "इलाम",     lat: 26.9081, lon: 87.9265, elev: 1206, zone: "hill",     hasModel: true },
  { slug: "jumla",      en: "Jumla",      ne: "जुम्ला",    lat: 29.2747, lon: 82.1838, elev: 2370, zone: "mountain", hasModel: true },
  { slug: "jomsom",     en: "Jomsom",     ne: "जोमसोम",   lat: 28.7806, lon: 83.7231, elev: 2743, zone: "mountain", hasModel: true },
  { slug: "lukla",      en: "Lukla",      ne: "लुक्ला",    lat: 27.6869, lon: 86.7297, elev: 2860, zone: "mountain", hasModel: true },
  { slug: "langtang",   en: "Langtang",   ne: "लाङटाङ",   lat: 28.2159, lon: 85.6871, elev: 3430, zone: "mountain", hasModel: false },
  { slug: "abc",        en: "Annapurna Base Camp", ne: "अन्नपूर्ण आधार शिविर", lat: 28.5306, lon: 83.8779, elev: 4130, zone: "mountain", hasModel: false },
  { slug: "ebc",        en: "Everest Base Camp",   ne: "सगरमाथा आधार शिविर",  lat: 27.9881, lon: 86.9250, elev: 5364, zone: "mountain", hasModel: false },
];

MN.DEFAULT_LOCATION = "kathmandu";
MN.TIMEZONE = "Asia/Kathmandu";

/* WMO weather-code -> condition key */
MN.wmoKey = function (code) {
  if (code === 0) return "clear";
  if (code === 1) return "mainlyClear";
  if (code === 2) return "partlyCloudy";
  if (code === 3) return "overcast";
  if (code === 45 || code === 48) return "fog";
  if (code >= 51 && code <= 57) return "drizzle";
  if (code >= 61 && code <= 67) return "rain";
  if (code >= 71 && code <= 77) return "snow";
  if (code >= 80 && code <= 82) return "rainShowers";
  if (code === 85 || code === 86) return "snowShowers";
  if (code === 95) return "thunderstorm";
  if (code === 96 || code === 99) return "thunderHail";
  return "clear";
};

MN.wmoIcon = function (code) {
  const k = MN.wmoKey(code);
  return { clear: "☀️", mainlyClear: "🌤️", partlyCloudy: "⛅", overcast: "☁️",
    fog: "🌫️", drizzle: "🌦️", rain: "🌧️", snow: "❄️",
    rainShowers: "🌦️", snowShowers: "🌨️", thunderstorm: "⛈️", thunderHail: "🌩️" }[k] || "🌤️";
};
