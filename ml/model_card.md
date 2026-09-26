# Model card: Mausam Nepal rain-nowcast classifiers

Target: P(rain > 0.5 mm in at least one of the next 6 hours).
Data: Open-Meteo ERA5 archive, hourly, Asia/Kathmandu, 2020-01-01 to 2026-09-20.
Model: L2 logistic regression on standardized features (22 features: current + 6h/24h lags, pressure tendency, precip history, diurnal/seasonal cycles). class_weight=balanced.
Split: train 2020-2024, test 2025-2026-09-20 (strictly temporal). Baselines: persistence (raining now -> rain later) and majority class.


| Location | Accuracy | Precision | Recall | AUC | Persistence acc |
|---|---|---|---|---|---|
| Kathmandu | 0.795 | 0.605 | 0.863 | 0.902 | 0.794 |
| Pokhara | 0.815 | 0.545 | 0.809 | 0.907 | 0.852 |
| Biratnagar | 0.777 | 0.480 | 0.807 | 0.879 | 0.832 |
| Nepalgunj | 0.783 | 0.391 | 0.850 | 0.892 | 0.878 |
| Lukla | 0.818 | 0.635 | 0.801 | 0.897 | 0.796 |
| Jomsom | 0.774 | 0.298 | 0.706 | 0.838 | 0.883 |
| Ilam | 0.800 | 0.615 | 0.824 | 0.892 | 0.781 |
| Jumla | 0.790 | 0.481 | 0.876 | 0.905 | 0.849 |

Exported: assets/models/<slug>.json (scaler + coefficients). Browser runs the identical logistic function on live Open-Meteo data.
