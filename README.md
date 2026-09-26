# Mausam Nepal (मौसम नेपाल)

A bilingual (English / Nepali) AI-powered weather portal for Nepal, built for
farmers and travelers. Live at **https://mnepal000.github.io/mausam-nepal/**

## What it does

- **Live forecasts** for 16 key places across Nepal, plus search for any village,
  town or trailhead (Open-Meteo geocoding)
- **AI rain nowcast**: a machine-learning classifier trained on 2020-2024 ERA5
  reanalysis data predicts the chance of rain in the next 6 hours, shown next to
  the global weather-model estimate
- **Satellite & radar**: animated rain radar (RainViewer), satellite-derived
  rainfall (NASA GIBS / GPM IMERG) and true-color imagery (NASA GIBS / VIIRS)
- **Farmer advisories**: agromet-style bulletins in English and Nepali, tied to
  Nepal's crop calendar (paddy, wheat, maize), with heavy-rain, hail, frost,
  heat, wind and dry-spell guidance
- **Traveler advisories**: landslide risk on hill highways, high-mountain winds,
  freezing level, Lukla flight weather, visibility and thunderstorm guidance
- **Drought watch**: last-30-day rainfall vs the 30-year normal for the same
  calendar dates
- **Mountain conditions**: freezing level, winds aloft and visibility for
  high-elevation places
- **Browser alerts**: optional notifications when a critical advisory is issued

## Data sources (all free, no API keys)

| Source | Used for | License |
|---|---|---|
| Open-Meteo forecast + archive (ERA5) | forecasts, history, drought normals | CC BY 4.0 |
| RainViewer | animated rain radar | free for community use, attribution required |
| NASA GIBS (VIIRS, GPM IMERG) | satellite imagery + rainfall | public domain (US Gov work) |
| OpenStreetMap | base map | ODbL |

## The ML model

`ml/train_rain_classifier.py` trains one L2 logistic-regression classifier per
station (8 stations). Target: will precipitation exceed 0.5 mm in any of the
next 6 hours. Features (22): current temperature, humidity, dew-point
depression, cloud cover, pressure, wind, precipitation, 6h/24h lags, 3h
pressure tendency, 24h temperature change, 6h precipitation sum, and
diurnal/seasonal cycles. Split is strictly temporal: train 2020-2024, test
2025-2026. The browser runs the identical logistic function on live
Open-Meteo data (`assets/js/nowcast.js`). Full metrics: `ml/model_card.md`.

Re-train any time:

```sh
cd ml
./venv/bin/python train_rain_classifier.py
```

## Run locally

Any static server works:

```sh
cd ~/workspace/nepal-mausam
python3 -m http.server 8000
# open http://localhost:8000
```

## Deploy

The live site is served from the `mnepal000/mausam-nepal` GitHub repo via
GitHub Pages (`https://mnepal000.github.io/mausam-nepal/`). To publish changes:

```sh
cd ~/workspace/nepal-mausam
git add -A && git commit -m "describe changes" && git push
```

## Notes

- Nepali translations use Devanagari digits throughout when Nepali is selected.
- This is a community planning tool, not an official warning system. Official
  alerts come from Nepal's Department of Hydrology and Meteorology (DHM).
- Never use em dashes in user-facing copy (house style).
