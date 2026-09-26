#!/usr/bin/env python3
"""
Train per-location ML rain classifiers for the Mausam Nepal portal.

Target: will it rain (>0.5mm in any hour) in the NEXT 6 hours?
Data: Open-Meteo ERA5 archive (hourly, Asia/Kathmandu).
Model: L2 logistic regression on standardized features (exports cleanly to JS).
Split: train 2020-2024, test 2025-2026-09-20 (strictly temporal, no leakage).

Outputs: assets/models/<slug>.json with scaler + coefficients + metrics,
         and ml/model_card.md with the full report.
"""
import json, math, os, sys
import requests
import numpy as np
import pandas as pd
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (accuracy_score, precision_score, recall_score,
                             f1_score, roc_auc_score, brier_score_loss)

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT_DIR = os.path.join(BASE, "assets", "models")
CACHE_DIR = os.path.join(BASE, "ml", "cache")
os.makedirs(OUT_DIR, exist_ok=True)
os.makedirs(CACHE_DIR, exist_ok=True)

LOCATIONS = [
    ("kathmandu", "Kathmandu", 27.7172, 85.3240),
    ("pokhara", "Pokhara", 28.2096, 83.9856),
    ("biratnagar", "Biratnagar", 26.4525, 87.2718),
    ("nepalgunj", "Nepalgunj", 28.0500, 81.6167),
    ("lukla", "Lukla", 27.6869, 86.7297),
    ("jomsom", "Jomsom", 28.7806, 83.7231),
    ("ilam", "Ilam", 26.9081, 87.9265),
    ("jumla", "Jumla", 29.2747, 82.1838),
]

VARS = ("temperature_2m,relative_humidity_2m,dew_point_2m,precipitation,"
        "cloud_cover,pressure_msl,wind_speed_10m")
TRAIN_END = "2024-12-31"
ARCHIVE_END = "2026-09-20"

FEATURES = [
    "temp", "rh", "dew_dep", "cloud", "pressure", "wind", "precip_1h",
    "temp_lag6", "rh_lag6", "cloud_lag6", "pressure_lag6", "wind_lag6",
    "temp_lag24", "rh_lag24", "cloud_lag24",
    "pressure_tendency_3h", "temp_change_24h", "precip_sum_6h",
    "hour_sin", "hour_cos", "month_sin", "month_cos",
]


def fetch(slug, lat, lon):
    cache = os.path.join(CACHE_DIR, f"{slug}.pkl")
    if os.path.exists(cache):
        print(f"[{slug}] using cache")
        return pd.read_pickle(cache)
    url = ("https://archive-api.open-meteo.com/v1/archive"
           f"?latitude={lat}&longitude={lon}"
           f"&start_date=2020-01-01&end_date={ARCHIVE_END}"
           f"&hourly={VARS}&timezone=Asia%2FKathmandu")
    print(f"[{slug}] downloading ...")
    r = requests.get(url, timeout=120)
    r.raise_for_status()
    h = r.json()["hourly"]
    df = pd.DataFrame({
        "time": pd.to_datetime(h["time"]),
        "temp": h["temperature_2m"],
        "rh": h["relative_humidity_2m"],
        "dewpoint": h["dew_point_2m"],
        "precip": h["precipitation"],
        "cloud": h["cloud_cover"],
        "pressure": h["pressure_msl"],
        "wind": h["wind_speed_10m"],
    })
    df.to_pickle(cache)
    return df


def build_xy(df):
    d = df.copy()
    d["dew_dep"] = d["temp"] - d["dewpoint"]
    d["precip_1h"] = d["precip"]
    for lag, cols in ((3, ["pressure"]), (6, ["temp", "rh", "cloud", "pressure", "wind"]),
                      (24, ["temp", "rh", "cloud"])):
        for c in cols:
            d[f"{c}_lag{lag}"] = d[c].shift(lag)
    d["pressure_tendency_3h"] = d["pressure"] - d["pressure_lag3"]
    d["temp_change_24h"] = d["temp"] - d["temp_lag24"]
    d["precip_sum_6h"] = d["precip"].rolling(6, min_periods=6).sum()
    # future rain in next 6h: max precip over t+1..t+6 > 0.5mm
    future = d["precip"].shift(-1).rolling(6, min_periods=6).max().shift(-5)
    d["target"] = (future > 0.5).astype(int)
    hr = d["time"].dt.hour
    mo = d["time"].dt.month
    d["hour_sin"] = np.sin(2 * np.pi * hr / 24)
    d["hour_cos"] = np.cos(2 * np.pi * hr / 24)
    d["month_sin"] = np.sin(2 * np.pi * mo / 12)
    d["month_cos"] = np.cos(2 * np.pi * mo / 12)
    d = d.dropna(subset=FEATURES + ["target"]).reset_index(drop=True)
    X = d[FEATURES].to_numpy(dtype=float)
    y = d["target"].to_numpy(dtype=int)
    times = d["time"]
    return X, y, times


def main():
    card = []
    card.append("# Model card: Mausam Nepal rain-nowcast classifiers\n")
    card.append("Target: P(rain > 0.5 mm in at least one of the next 6 hours).")
    card.append("Data: Open-Meteo ERA5 archive, hourly, Asia/Kathmandu, 2020-01-01 to "
                + ARCHIVE_END + ".")
    card.append("Model: L2 logistic regression on standardized features "
                "(22 features: current + 6h/24h lags, pressure tendency, "
                "precip history, diurnal/seasonal cycles). class_weight=balanced.")
    card.append("Split: train 2020-2024, test 2025-" + ARCHIVE_END
                + " (strictly temporal). Baselines: persistence "
                "(raining now -> rain later) and majority class.\n")

    summary_rows = []
    for slug, name, lat, lon in LOCATIONS:
        df = fetch(slug, lat, lon)
        X, y, times = build_xy(df)
        tr = times <= TRAIN_END
        te = times > TRAIN_END
        Xtr, ytr, Xte, yte = X[tr], y[tr], X[te], y[te]
        mu, sd = Xtr.mean(0), Xtr.std(0) + 1e-9
        Ztr, Zte = (Xtr - mu) / sd, (Xte - mu) / sd
        clf = LogisticRegression(max_iter=2000, class_weight="balanced")
        clf.fit(Ztr, ytr)
        proba = clf.predict_proba(Zte)[:, 1]
        pred = (proba >= 0.5).astype(int)
        # persistence baseline on test set: precip_1h > 0.1 now -> rain later
        pidx = FEATURES.index("precip_1h")
        persist = (Xte[:, pidx] > 0.1).astype(int)
        maj = np.zeros_like(yte)

        def m(y_true, p_hat, pr):
            return dict(
                acc=round(float(accuracy_score(y_true, p_hat)), 4),
                prec=round(float(precision_score(y_true, p_hat, zero_division=0)), 4),
                rec=round(float(recall_score(y_true, p_hat, zero_division=0)), 4),
                f1=round(float(f1_score(y_true, p_hat, zero_division=0)), 4),
                auc=round(float(roc_auc_score(y_true, pr)), 4) if len(np.unique(y_true)) > 1 else None,
                brier=round(float(brier_score_loss(y_true, pr)), 4),
            )

        metrics = {
            "model": m(yte, pred, proba),
            "persistence": m(yte, persist, persist.astype(float)),
            "majority": m(yte, maj, maj.astype(float)),
            "n_train": int(len(ytr)), "n_test": int(len(yte)),
            "positive_rate_test": round(float(yte.mean()), 4),
        }
        payload = {
            "location": name, "slug": slug, "latitude": lat, "longitude": lon,
            "target": "P(precip > 0.5mm in any of next 6 hours)",
            "features": FEATURES,
            "scaler_mean": [round(float(v), 6) for v in mu],
            "scaler_std": [round(float(v), 6) for v in sd],
            "coef": [round(float(v), 6) for v in clf.coef_[0]],
            "intercept": round(float(clf.intercept_[0]), 6),
            "metrics": metrics,
            "trained_on": f"2020-01-01..{TRAIN_END}",
            "tested_on": f"2025-01-01..{ARCHIVE_END}",
            "data_source": "Open-Meteo ERA5 archive (CC BY 4.0)",
        }
        with open(os.path.join(OUT_DIR, f"{slug}.json"), "w") as f:
            json.dump(payload, f)
        mm = metrics["model"]
        summary_rows.append(
            f"| {name} | {mm['acc']:.3f} | {mm['prec']:.3f} | {mm['rec']:.3f} "
            f"| {mm['auc']:.3f} | {metrics['persistence']['acc']:.3f} |")
        print(f"[{slug}] acc={mm['acc']:.3f} prec={mm['prec']:.3f} "
              f"rec={mm['rec']:.3f} auc={mm['auc']:.3f} "
              f"(persist acc={metrics['persistence']['acc']:.3f})")

    card.append("\n| Location | Accuracy | Precision | Recall | AUC | Persistence acc |")
    card.append("|---|---|---|---|---|---|")
    card.extend(summary_rows)
    card.append("\nExported: assets/models/<slug>.json (scaler + coefficients). "
                "Browser runs the identical logistic function on live Open-Meteo data.")
    with open(os.path.join(BASE, "ml", "model_card.md"), "w") as f:
        f.write("\n".join(card) + "\n")
    print("\nWrote model_card.md")


if __name__ == "__main__":
    sys.exit(main())
