# Gothic Lock Solver benchmark evidence

Scope: **full-45-catalog**; quality: **passed**; performance: **inconclusive**.

Warmups: 2; repetitions: 7. A = grouped actions, U = distinct plates, C = unit divisions, S = plate switches.

Only synchronous public solver call; cloning, legacy/reference normalization, replay and metrics excluded.
Per-lock baseline-vs-itself calibration first; matched rounds rotate by lock and round. A non-pass receives one bounded repeat with all raw attempts retained.
Paired log-ratio mean with conservative 2.776 standard-error envelope; control sets tolerance. >=5 samples; >25% control envelope cannot certify a pass.

| Implementation | A | U | C | S | Sum of per-lock medians (ms) |
| --- | ---: | ---: | ---: | ---: | ---: |
| originalBfs | 483 | 245 | 1727 | 438 | 2653.701 |
| upstream | 491 | 245 | 1695 | 446 | 1517.403 |
| candidate | 483 | 245 | 1723 | 438 | 47.363 |
| baseline | 483 | 245 | 1723 | 438 | 48.507 |

| Lock | Optimum A | Implementation | A/U/C/S | Median / p95 ms | Quality vs base | Timing vs base |
| --- | ---: | --- | --- | --- | --- | --- |
| ruined-tower-door | 17 | originalBfs | 17/6/57/16 | 89.658 / 252.696 |  |  |
| ruined-tower-door | 17 | upstream | 17/6/57/16 | 93.831 / 132.731 |  |  |
| ruined-tower-door | 17 | candidate | 17/6/57/16 | 3.577 / 4.910 | passed | inconclusive |
| ruined-tower-door | 17 | baseline | 17/6/57/16 | 3.509 / 5.843 |  |  |
| scatty-chest | 9 | originalBfs | 9/5/31/8 | 12.406 / 33.726 |  |  |
| scatty-chest | 9 | upstream | 9/5/31/8 | 5.647 / 6.514 |  |  |
| scatty-chest | 9 | candidate | 9/5/31/8 | 0.137 / 0.165 | passed | inconclusive |
| scatty-chest | 9 | baseline | 9/5/31/8 | 0.138 / 0.198 |  |  |
| cor-galom-chest | 5 | originalBfs | 5/4/19/4 | 0.506 / 0.552 |  |  |
| cor-galom-chest | 5 | upstream | 5/4/15/4 | 0.343 / 0.463 |  |  |
| cor-galom-chest | 5 | candidate | 5/4/15/4 | 0.081 / 0.116 | passed | inconclusive |
| cor-galom-chest | 5 | baseline | 5/4/15/4 | 0.040 / 0.134 |  |  |
| cor-galom-bedroom-chest | 14 | originalBfs | 14/5/60/13 | 71.330 / 78.037 |  |  |
| cor-galom-bedroom-chest | 14 | upstream | 14/5/60/13 | 32.020 / 32.880 |  |  |
| cor-galom-bedroom-chest | 14 | candidate | 14/5/60/13 | 0.238 / 0.327 | passed | inconclusive |
| cor-galom-bedroom-chest | 14 | baseline | 14/5/60/13 | 0.199 / 0.222 |  |  |
| swamp-camp-forge-chest | 11 | originalBfs | 11/6/41/10 | 106.387 / 120.809 |  |  |
| swamp-camp-forge-chest | 11 | upstream | 11/6/41/10 | 38.003 / 42.506 |  |  |
| swamp-camp-forge-chest | 11 | candidate | 11/6/41/10 | 0.241 / 0.461 | passed | inconclusive |
| swamp-camp-forge-chest | 11 | baseline | 11/6/41/10 | 0.212 / 0.247 |  |  |
| rice-lord-storeroom | 9 | originalBfs | 9/5/30/8 | 8.856 / 9.087 |  |  |
| rice-lord-storeroom | 9 | upstream | 9/5/30/8 | 4.829 / 5.141 |  |  |
| rice-lord-storeroom | 9 | candidate | 9/5/30/8 | 0.159 / 0.227 | passed | inconclusive |
| rice-lord-storeroom | 9 | baseline | 9/5/30/8 | 0.124 / 0.127 |  |  |
| gomez-chambers-door | 9 | originalBfs | 9/6/28/8 | 74.677 / 77.957 |  |  |
| gomez-chambers-door | 9 | upstream | 9/6/28/8 | 31.106 / 32.987 |  |  |
| gomez-chambers-door | 9 | candidate | 9/6/28/8 | 0.202 / 0.245 | passed | inconclusive |
| gomez-chambers-door | 9 | baseline | 9/6/28/8 | 0.171 / 0.238 |  |  |
| gomez-throne-hall-chest | 5 | originalBfs | 5/4/16/4 | 0.179 / 0.220 |  |  |
| gomez-throne-hall-chest | 5 | upstream | 5/4/16/4 | 0.239 / 0.333 |  |  |
| gomez-throne-hall-chest | 5 | candidate | 5/4/16/4 | 0.025 / 0.052 | passed | inconclusive |
| gomez-throne-hall-chest | 5 | baseline | 5/4/16/4 | 0.025 / 0.031 |  |  |
| old-camp-dungeon-door | 17 | originalBfs | 17/6/72/16 | 90.523 / 125.406 |  |  |
| old-camp-dungeon-door | 17 | upstream | 18/6/68/17 | 42.867 / 49.406 |  |  |
| old-camp-dungeon-door | 17 | candidate | 17/6/72/16 | 2.244 / 2.823 | passed | inconclusive |
| old-camp-dungeon-door | 17 | baseline | 17/6/72/16 | 2.279 / 2.316 |  |  |
| arlin-dungeon-key | 7 | originalBfs | 7/5/25/6 | 48.473 / 50.914 |  |  |
| arlin-dungeon-key | 7 | upstream | 7/5/25/6 | 21.404 / 21.503 |  |  |
| arlin-dungeon-key | 7 | candidate | 7/5/25/6 | 7.950 / 11.083 | passed | inconclusive |
| arlin-dungeon-key | 7 | baseline | 7/5/25/6 | 8.874 / 11.835 |  |  |
| gomez-wine-cellar | 9 | originalBfs | 9/6/41/8 | 59.599 / 73.166 |  |  |
| gomez-wine-cellar | 9 | upstream | 11/6/31/10 | 28.340 / 30.370 |  |  |
| gomez-wine-cellar | 9 | candidate | 9/6/41/8 | 0.119 / 0.228 | passed | inconclusive |
| gomez-wine-cellar | 9 | baseline | 9/6/41/8 | 0.092 / 0.168 |  |  |
| gomez-bedside-chest | 23 | originalBfs | 23/5/68/22 | 10.780 / 11.636 |  |  |
| gomez-bedside-chest | 23 | upstream | 23/5/68/22 | 8.770 / 10.758 |  |  |
| gomez-bedside-chest | 23 | candidate | 23/5/68/22 | 1.644 / 2.551 | passed | inconclusive |
| gomez-bedside-chest | 23 | baseline | 23/5/68/22 | 1.568 / 2.397 |  |  |
| gomez-wall-chest | 20 | originalBfs | 20/6/75/19 | 101.362 / 108.772 |  |  |
| gomez-wall-chest | 20 | upstream | 20/6/75/19 | 87.626 / 104.459 |  |  |
| gomez-wall-chest | 20 | candidate | 20/6/75/19 | 5.744 / 7.457 | passed | inconclusive |
| gomez-wall-chest | 20 | baseline | 20/6/75/19 | 5.674 / 10.003 |  |  |
| voran-bedside-chest | 9 | originalBfs | 9/7/38/8 | 199.166 / 217.744 |  |  |
| voran-bedside-chest | 9 | upstream | 9/7/38/8 | 188.301 / 219.238 |  |  |
| voran-bedside-chest | 9 | candidate | 9/7/38/8 | 0.112 / 0.184 | passed | inconclusive |
| voran-bedside-chest | 9 | baseline | 9/7/38/8 | 0.129 / 0.531 |  |  |
| arto-room-door | 7 | originalBfs | 7/5/31/6 | 2.398 / 3.201 |  |  |
| arto-room-door | 7 | upstream | 7/5/31/6 | 4.815 / 5.955 |  |  |
| arto-room-door | 7 | candidate | 7/5/31/6 | 0.050 / 0.060 | passed | inconclusive |
| arto-room-door | 7 | baseline | 7/5/31/6 | 0.046 / 0.084 |  |  |
| arto-far-bed-chest | 11 | originalBfs | 11/5/44/10 | 86.226 / 89.989 |  |  |
| arto-far-bed-chest | 11 | upstream | 13/5/40/12 | 27.589 / 32.241 |  |  |
| arto-far-bed-chest | 11 | candidate | 11/5/44/10 | 0.168 / 0.496 | passed | inconclusive |
| arto-far-bed-chest | 11 | baseline | 11/5/44/10 | 0.156 / 0.194 |  |  |
| arto-near-bed-chest | 13 | originalBfs | 13/6/52/12 | 105.042 / 116.204 |  |  |
| arto-near-bed-chest | 13 | upstream | 13/6/52/12 | 76.194 / 102.692 |  |  |
| arto-near-bed-chest | 13 | candidate | 13/6/52/12 | 0.449 / 0.487 | passed | inconclusive |
| arto-near-bed-chest | 13 | baseline | 13/6/52/12 | 0.477 / 0.751 |  |  |
| gomez-bedrooms-door | 14 | originalBfs | 14/6/45/13 | 104.103 / 110.613 |  |  |
| gomez-bedrooms-door | 14 | upstream | 14/6/45/13 | 38.404 / 41.819 |  |  |
| gomez-bedrooms-door | 14 | candidate | 14/6/49/13 | 5.739 / 7.218 | passed | inconclusive |
| gomez-bedrooms-door | 14 | baseline | 14/6/49/13 | 5.763 / 8.625 |  |  |
| gomez-bedrooms-far-chest | 14 | originalBfs | 14/5/43/13 | 11.208 / 15.988 |  |  |
| gomez-bedrooms-far-chest | 14 | upstream | 16/5/39/15 | 5.621 / 6.539 |  |  |
| gomez-bedrooms-far-chest | 14 | candidate | 14/5/43/13 | 1.372 / 2.125 | passed | passed |
| gomez-bedrooms-far-chest | 14 | baseline | 14/5/43/13 | 1.553 / 2.375 |  |  |
| gomez-bedrooms-near-chest | 12 | originalBfs | 12/6/56/11 | 78.994 / 89.428 |  |  |
| gomez-bedrooms-near-chest | 12 | upstream | 12/6/56/11 | 43.647 / 49.915 |  |  |
| gomez-bedrooms-near-chest | 12 | candidate | 12/6/56/11 | 0.099 / 0.104 | passed | inconclusive |
| gomez-bedrooms-near-chest | 12 | baseline | 12/6/56/11 | 0.111 / 0.436 |  |  |
| raven-tower-left-chest | 11 | originalBfs | 11/6/35/10 | 109.446 / 128.538 |  |  |
| raven-tower-left-chest | 11 | upstream | 11/6/35/10 | 52.739 / 53.759 |  |  |
| raven-tower-left-chest | 11 | candidate | 11/6/35/10 | 1.455 / 1.825 | passed | inconclusive |
| raven-tower-left-chest | 11 | baseline | 11/6/35/10 | 1.340 / 1.867 |  |  |
| raven-tower-right-chest | 8 | originalBfs | 8/6/23/7 | 36.350 / 38.205 |  |  |
| raven-tower-right-chest | 8 | upstream | 8/6/23/7 | 16.226 / 16.684 |  |  |
| raven-tower-right-chest | 8 | candidate | 8/6/23/7 | 0.134 / 0.156 | passed | inconclusive |
| raven-tower-right-chest | 8 | baseline | 8/6/23/7 | 0.125 / 0.245 |  |  |
| raven-tower-floor2-stairs-chest | 16 | originalBfs | 16/6/48/15 | 103.036 / 108.319 |  |  |
| raven-tower-floor2-stairs-chest | 16 | upstream | 16/6/48/15 | 62.861 / 69.600 |  |  |
| raven-tower-floor2-stairs-chest | 16 | candidate | 16/6/48/15 | 4.291 / 5.547 | passed | passed |
| raven-tower-floor2-stairs-chest | 16 | baseline | 16/6/48/15 | 4.655 / 5.491 |  |  |
| raven-tower-floor2-chest-2 | 8 | originalBfs | 8/5/29/7 | 10.942 / 12.065 |  |  |
| raven-tower-floor2-chest-2 | 8 | upstream | 9/5/27/8 | 3.235 / 3.589 |  |  |
| raven-tower-floor2-chest-2 | 8 | candidate | 8/5/29/7 | 0.190 / 0.268 | passed | inconclusive |
| raven-tower-floor2-chest-2 | 8 | baseline | 8/5/29/7 | 0.188 / 0.385 |  |  |
| raven-tower-floor3-entrance-chest | 14 | originalBfs | 14/5/44/13 | 8.888 / 9.141 |  |  |
| raven-tower-floor3-entrance-chest | 14 | upstream | 14/5/44/13 | 6.582 / 6.925 |  |  |
| raven-tower-floor3-entrance-chest | 14 | candidate | 14/5/44/13 | 0.606 / 1.505 | passed | inconclusive |
| raven-tower-floor3-entrance-chest | 14 | baseline | 14/5/44/13 | 0.616 / 0.838 |  |  |
| raven-tower-floor3-empty-chest | 9 | originalBfs | 9/5/41/8 | 7.984 / 8.417 |  |  |
| raven-tower-floor3-empty-chest | 9 | upstream | 9/5/37/8 | 5.718 / 6.900 |  |  |
| raven-tower-floor3-empty-chest | 9 | candidate | 9/5/37/8 | 0.077 / 0.103 | passed | inconclusive |
| raven-tower-floor3-empty-chest | 9 | baseline | 9/5/37/8 | 0.076 / 0.151 |  |  |
| raven-tower-floor4-elixirs-chest | 8 | originalBfs | 8/5/36/7 | 75.479 / 83.178 |  |  |
| raven-tower-floor4-elixirs-chest | 8 | upstream | 8/5/36/7 | 111.610 / 121.124 |  |  |
| raven-tower-floor4-elixirs-chest | 8 | candidate | 8/5/36/7 | 0.102 / 0.179 | passed | passed |
| raven-tower-floor4-elixirs-chest | 8 | baseline | 8/5/36/7 | 0.179 / 0.379 |  |  |
| raven-tower-floor4-food-chest | 11 | originalBfs | 11/6/43/10 | 95.996 / 102.990 |  |  |
| raven-tower-floor4-food-chest | 11 | upstream | 11/6/43/10 | 57.610 / 61.539 |  |  |
| raven-tower-floor4-food-chest | 11 | candidate | 11/6/43/10 | 0.253 / 0.272 | passed | inconclusive |
| raven-tower-floor4-food-chest | 11 | baseline | 11/6/43/10 | 0.281 / 0.690 |  |  |
| raven-tower-top-chest | 20 | originalBfs | 20/6/48/19 | 83.326 / 92.664 |  |  |
| raven-tower-top-chest | 20 | upstream | 20/6/48/19 | 46.343 / 50.414 |  |  |
| raven-tower-top-chest | 20 | candidate | 20/6/48/19 | 7.368 / 9.387 | passed | inconclusive |
| raven-tower-top-chest | 20 | baseline | 20/6/48/19 | 7.451 / 7.709 |  |  |
| fire-lizard-cave-chest | 10 | originalBfs | 10/6/41/9 | 67.629 / 77.178 |  |  |
| fire-lizard-cave-chest | 10 | upstream | 10/6/41/9 | 56.070 / 58.654 |  |  |
| fire-lizard-cave-chest | 10 | candidate | 10/6/41/9 | 0.160 / 0.230 | passed | inconclusive |
| fire-lizard-cave-chest | 10 | baseline | 10/6/41/9 | 0.152 / 0.850 |  |  |
| silas-tavern-basement-chest | 9 | originalBfs | 9/5/30/8 | 6.911 / 7.779 |  |  |
| silas-tavern-basement-chest | 9 | upstream | 9/5/30/8 | 4.053 / 4.463 |  |  |
| silas-tavern-basement-chest | 9 | candidate | 9/5/30/8 | 0.100 / 0.233 | passed | inconclusive |
| silas-tavern-basement-chest | 9 | baseline | 9/5/30/8 | 0.089 / 0.106 |  |  |
| silas-tavern-storeroom-chest | 9 | originalBfs | 9/6/31/8 | 87.225 / 93.561 |  |  |
| silas-tavern-storeroom-chest | 9 | upstream | 9/6/31/8 | 30.919 / 31.912 |  |  |
| silas-tavern-storeroom-chest | 9 | candidate | 9/6/31/8 | 0.087 / 0.157 | passed | inconclusive |
| silas-tavern-storeroom-chest | 9 | baseline | 9/6/31/8 | 0.080 / 0.103 |  |  |
| silas-tavern-storeroom-door | 10 | originalBfs | 10/5/31/9 | 78.692 / 85.264 |  |  |
| silas-tavern-storeroom-door | 10 | upstream | 10/5/31/9 | 23.705 / 27.696 |  |  |
| silas-tavern-storeroom-door | 10 | candidate | 10/5/31/9 | 0.158 / 0.179 | passed | passed |
| silas-tavern-storeroom-door | 10 | baseline | 10/5/31/9 | 0.169 / 0.183 |  |  |
| jan-pond-house-chest | 8 | originalBfs | 8/6/33/7 | 45.814 / 58.215 |  |  |
| jan-pond-house-chest | 8 | upstream | 8/6/33/7 | 51.663 / 56.488 |  |  |
| jan-pond-house-chest | 8 | candidate | 8/6/33/7 | 0.085 / 0.092 | passed | inconclusive |
| jan-pond-house-chest | 8 | baseline | 8/6/33/7 | 0.075 / 0.097 |  |  |
| graham-chest | 10 | originalBfs | 10/6/40/9 | 97.997 / 111.180 |  |  |
| graham-chest | 10 | upstream | 10/6/40/9 | 31.137 / 32.488 |  |  |
| graham-chest | 10 | candidate | 10/6/40/9 | 0.091 / 0.093 | passed | inconclusive |
| graham-chest | 10 | baseline | 10/6/40/9 | 0.083 / 0.099 |  |  |
| gravo-chest | 8 | originalBfs | 8/5/27/7 | 5.361 / 6.206 |  |  |
| gravo-chest | 8 | upstream | 8/5/27/7 | 5.337 / 5.990 |  |  |
| gravo-chest | 8 | candidate | 8/5/27/7 | 0.063 / 0.081 | passed | inconclusive |
| gravo-chest | 8 | baseline | 8/5/27/7 | 0.055 / 0.071 |  |  |
| diego-chest | 11 | originalBfs | 11/6/40/10 | 81.415 / 84.984 |  |  |
| diego-chest | 11 | upstream | 11/6/40/10 | 31.231 / 47.637 |  |  |
| diego-chest | 11 | candidate | 11/6/40/10 | 0.147 / 0.180 | passed | passed |
| diego-chest | 11 | baseline | 11/6/40/10 | 0.149 / 0.177 |  |  |
| grim-chest | 8 | originalBfs | 8/6/21/7 | 107.132 / 123.995 |  |  |
| grim-chest | 8 | upstream | 8/6/21/7 | 22.792 / 23.272 |  |  |
| grim-chest | 8 | candidate | 8/6/21/7 | 0.221 / 0.274 | passed | inconclusive |
| grim-chest | 8 | baseline | 8/6/21/7 | 0.196 / 0.289 |  |  |
| mercenary-near-grim-chest | 8 | originalBfs | 8/6/25/7 | 103.700 / 115.461 |  |  |
| mercenary-near-grim-chest | 8 | upstream | 8/6/25/7 | 32.990 / 35.385 |  |  |
| mercenary-near-grim-chest | 8 | candidate | 8/6/25/7 | 0.091 / 0.126 | passed | inconclusive |
| mercenary-near-grim-chest | 8 | baseline | 8/6/25/7 | 0.075 / 0.096 |  |  |
| popular-lock | 13 | originalBfs | 13/5/46/12 | 10.440 / 12.194 |  |  |
| popular-lock | 13 | upstream | 13/5/46/12 | 6.057 / 7.192 |  |  |
| popular-lock | 13 | candidate | 13/5/46/12 | 0.573 / 0.721 | passed | passed |
| popular-lock | 13 | baseline | 13/5/46/12 | 0.600 / 0.630 |  |  |
| alberto-mine-hut-chest | 9 | originalBfs | 9/5/36/8 | 9.577 / 15.550 |  |  |
| alberto-mine-hut-chest | 9 | upstream | 9/5/36/8 | 5.696 / 5.980 |  |  |
| alberto-mine-hut-chest | 9 | candidate | 9/5/36/8 | 0.063 / 0.073 | passed | inconclusive |
| alberto-mine-hut-chest | 9 | baseline | 9/5/36/8 | 0.057 / 0.160 |  |  |
| alberto-mine-upstairs-left-chest | 4 | originalBfs | 4/3/20/3 | 0.040 / 0.041 |  |  |
| alberto-mine-upstairs-left-chest | 4 | upstream | 4/3/20/3 | 0.217 / 0.431 |  |  |
| alberto-mine-upstairs-left-chest | 4 | candidate | 4/3/20/3 | 0.021 / 0.102 | passed | inconclusive |
| alberto-mine-upstairs-left-chest | 4 | baseline | 4/3/20/3 | 0.018 / 0.022 |  |  |
| alberto-mine-upstairs-right-chest | 5 | originalBfs | 5/5/13/4 | 2.712 / 3.271 |  |  |
| alberto-mine-upstairs-right-chest | 5 | upstream | 5/5/13/4 | 1.724 / 1.913 |  |  |
| alberto-mine-upstairs-right-chest | 5 | candidate | 5/5/13/4 | 0.035 / 0.279 | passed | inconclusive |
| alberto-mine-upstairs-right-chest | 5 | baseline | 5/5/13/4 | 0.026 / 0.045 |  |  |
| cavalorn-storeroom-door | 11 | originalBfs | 11/6/41/10 | 85.848 / 89.011 |  |  |
| cavalorn-storeroom-door | 11 | upstream | 11/6/41/10 | 43.419 / 47.827 |  |  |
| cavalorn-storeroom-door | 11 | candidate | 11/6/41/10 | 0.220 / 0.254 | passed | inconclusive |
| cavalorn-storeroom-door | 11 | baseline | 11/6/41/10 | 0.211 / 0.274 |  |  |
| old-to-new-camp-bandits-chest | 10 | originalBfs | 10/5/33/9 | 69.890 / 75.509 |  |  |
| old-to-new-camp-bandits-chest | 10 | upstream | 10/5/33/9 | 27.873 / 30.980 |  |  |
| old-to-new-camp-bandits-chest | 10 | candidate | 10/5/33/9 | 0.422 / 0.567 | passed | inconclusive |
| old-to-new-camp-bandits-chest | 10 | baseline | 10/5/33/9 | 0.421 / 0.540 |  |  |

## Per-lock candidate differences

| Lock | Comparator | ΔA / ΔU / ΔC / ΔS |
| --- | --- | --- |
| ruined-tower-door | originalBfs | 0/0/0/0 |
| ruined-tower-door | upstream | 0/0/0/0 |
| ruined-tower-door | baseline | 0/0/0/0 |
| scatty-chest | originalBfs | 0/0/0/0 |
| scatty-chest | upstream | 0/0/0/0 |
| scatty-chest | baseline | 0/0/0/0 |
| cor-galom-chest | originalBfs | 0/0/-4/0 |
| cor-galom-chest | upstream | 0/0/0/0 |
| cor-galom-chest | baseline | 0/0/0/0 |
| cor-galom-bedroom-chest | originalBfs | 0/0/0/0 |
| cor-galom-bedroom-chest | upstream | 0/0/0/0 |
| cor-galom-bedroom-chest | baseline | 0/0/0/0 |
| swamp-camp-forge-chest | originalBfs | 0/0/0/0 |
| swamp-camp-forge-chest | upstream | 0/0/0/0 |
| swamp-camp-forge-chest | baseline | 0/0/0/0 |
| rice-lord-storeroom | originalBfs | 0/0/0/0 |
| rice-lord-storeroom | upstream | 0/0/0/0 |
| rice-lord-storeroom | baseline | 0/0/0/0 |
| gomez-chambers-door | originalBfs | 0/0/0/0 |
| gomez-chambers-door | upstream | 0/0/0/0 |
| gomez-chambers-door | baseline | 0/0/0/0 |
| gomez-throne-hall-chest | originalBfs | 0/0/0/0 |
| gomez-throne-hall-chest | upstream | 0/0/0/0 |
| gomez-throne-hall-chest | baseline | 0/0/0/0 |
| old-camp-dungeon-door | originalBfs | 0/0/0/0 |
| old-camp-dungeon-door | upstream | -1/0/4/-1 |
| old-camp-dungeon-door | baseline | 0/0/0/0 |
| arlin-dungeon-key | originalBfs | 0/0/0/0 |
| arlin-dungeon-key | upstream | 0/0/0/0 |
| arlin-dungeon-key | baseline | 0/0/0/0 |
| gomez-wine-cellar | originalBfs | 0/0/0/0 |
| gomez-wine-cellar | upstream | -2/0/10/-2 |
| gomez-wine-cellar | baseline | 0/0/0/0 |
| gomez-bedside-chest | originalBfs | 0/0/0/0 |
| gomez-bedside-chest | upstream | 0/0/0/0 |
| gomez-bedside-chest | baseline | 0/0/0/0 |
| gomez-wall-chest | originalBfs | 0/0/0/0 |
| gomez-wall-chest | upstream | 0/0/0/0 |
| gomez-wall-chest | baseline | 0/0/0/0 |
| voran-bedside-chest | originalBfs | 0/0/0/0 |
| voran-bedside-chest | upstream | 0/0/0/0 |
| voran-bedside-chest | baseline | 0/0/0/0 |
| arto-room-door | originalBfs | 0/0/0/0 |
| arto-room-door | upstream | 0/0/0/0 |
| arto-room-door | baseline | 0/0/0/0 |
| arto-far-bed-chest | originalBfs | 0/0/0/0 |
| arto-far-bed-chest | upstream | -2/0/4/-2 |
| arto-far-bed-chest | baseline | 0/0/0/0 |
| arto-near-bed-chest | originalBfs | 0/0/0/0 |
| arto-near-bed-chest | upstream | 0/0/0/0 |
| arto-near-bed-chest | baseline | 0/0/0/0 |
| gomez-bedrooms-door | originalBfs | 0/0/4/0 |
| gomez-bedrooms-door | upstream | 0/0/4/0 |
| gomez-bedrooms-door | baseline | 0/0/0/0 |
| gomez-bedrooms-far-chest | originalBfs | 0/0/0/0 |
| gomez-bedrooms-far-chest | upstream | -2/0/4/-2 |
| gomez-bedrooms-far-chest | baseline | 0/0/0/0 |
| gomez-bedrooms-near-chest | originalBfs | 0/0/0/0 |
| gomez-bedrooms-near-chest | upstream | 0/0/0/0 |
| gomez-bedrooms-near-chest | baseline | 0/0/0/0 |
| raven-tower-left-chest | originalBfs | 0/0/0/0 |
| raven-tower-left-chest | upstream | 0/0/0/0 |
| raven-tower-left-chest | baseline | 0/0/0/0 |
| raven-tower-right-chest | originalBfs | 0/0/0/0 |
| raven-tower-right-chest | upstream | 0/0/0/0 |
| raven-tower-right-chest | baseline | 0/0/0/0 |
| raven-tower-floor2-stairs-chest | originalBfs | 0/0/0/0 |
| raven-tower-floor2-stairs-chest | upstream | 0/0/0/0 |
| raven-tower-floor2-stairs-chest | baseline | 0/0/0/0 |
| raven-tower-floor2-chest-2 | originalBfs | 0/0/0/0 |
| raven-tower-floor2-chest-2 | upstream | -1/0/2/-1 |
| raven-tower-floor2-chest-2 | baseline | 0/0/0/0 |
| raven-tower-floor3-entrance-chest | originalBfs | 0/0/0/0 |
| raven-tower-floor3-entrance-chest | upstream | 0/0/0/0 |
| raven-tower-floor3-entrance-chest | baseline | 0/0/0/0 |
| raven-tower-floor3-empty-chest | originalBfs | 0/0/-4/0 |
| raven-tower-floor3-empty-chest | upstream | 0/0/0/0 |
| raven-tower-floor3-empty-chest | baseline | 0/0/0/0 |
| raven-tower-floor4-elixirs-chest | originalBfs | 0/0/0/0 |
| raven-tower-floor4-elixirs-chest | upstream | 0/0/0/0 |
| raven-tower-floor4-elixirs-chest | baseline | 0/0/0/0 |
| raven-tower-floor4-food-chest | originalBfs | 0/0/0/0 |
| raven-tower-floor4-food-chest | upstream | 0/0/0/0 |
| raven-tower-floor4-food-chest | baseline | 0/0/0/0 |
| raven-tower-top-chest | originalBfs | 0/0/0/0 |
| raven-tower-top-chest | upstream | 0/0/0/0 |
| raven-tower-top-chest | baseline | 0/0/0/0 |
| fire-lizard-cave-chest | originalBfs | 0/0/0/0 |
| fire-lizard-cave-chest | upstream | 0/0/0/0 |
| fire-lizard-cave-chest | baseline | 0/0/0/0 |
| silas-tavern-basement-chest | originalBfs | 0/0/0/0 |
| silas-tavern-basement-chest | upstream | 0/0/0/0 |
| silas-tavern-basement-chest | baseline | 0/0/0/0 |
| silas-tavern-storeroom-chest | originalBfs | 0/0/0/0 |
| silas-tavern-storeroom-chest | upstream | 0/0/0/0 |
| silas-tavern-storeroom-chest | baseline | 0/0/0/0 |
| silas-tavern-storeroom-door | originalBfs | 0/0/0/0 |
| silas-tavern-storeroom-door | upstream | 0/0/0/0 |
| silas-tavern-storeroom-door | baseline | 0/0/0/0 |
| jan-pond-house-chest | originalBfs | 0/0/0/0 |
| jan-pond-house-chest | upstream | 0/0/0/0 |
| jan-pond-house-chest | baseline | 0/0/0/0 |
| graham-chest | originalBfs | 0/0/0/0 |
| graham-chest | upstream | 0/0/0/0 |
| graham-chest | baseline | 0/0/0/0 |
| gravo-chest | originalBfs | 0/0/0/0 |
| gravo-chest | upstream | 0/0/0/0 |
| gravo-chest | baseline | 0/0/0/0 |
| diego-chest | originalBfs | 0/0/0/0 |
| diego-chest | upstream | 0/0/0/0 |
| diego-chest | baseline | 0/0/0/0 |
| grim-chest | originalBfs | 0/0/0/0 |
| grim-chest | upstream | 0/0/0/0 |
| grim-chest | baseline | 0/0/0/0 |
| mercenary-near-grim-chest | originalBfs | 0/0/0/0 |
| mercenary-near-grim-chest | upstream | 0/0/0/0 |
| mercenary-near-grim-chest | baseline | 0/0/0/0 |
| popular-lock | originalBfs | 0/0/0/0 |
| popular-lock | upstream | 0/0/0/0 |
| popular-lock | baseline | 0/0/0/0 |
| alberto-mine-hut-chest | originalBfs | 0/0/0/0 |
| alberto-mine-hut-chest | upstream | 0/0/0/0 |
| alberto-mine-hut-chest | baseline | 0/0/0/0 |
| alberto-mine-upstairs-left-chest | originalBfs | 0/0/0/0 |
| alberto-mine-upstairs-left-chest | upstream | 0/0/0/0 |
| alberto-mine-upstairs-left-chest | baseline | 0/0/0/0 |
| alberto-mine-upstairs-right-chest | originalBfs | 0/0/0/0 |
| alberto-mine-upstairs-right-chest | upstream | 0/0/0/0 |
| alberto-mine-upstairs-right-chest | baseline | 0/0/0/0 |
| cavalorn-storeroom-door | originalBfs | 0/0/0/0 |
| cavalorn-storeroom-door | upstream | 0/0/0/0 |
| cavalorn-storeroom-door | baseline | 0/0/0/0 |
| old-to-new-camp-bandits-chest | originalBfs | 0/0/0/0 |
| old-to-new-camp-bandits-chest | upstream | 0/0/0/0 |
| old-to-new-camp-bandits-chest | baseline | 0/0/0/0 |

## Isolated process peak RSS

RSS includes Node, module loading and runtime allocation; it is not exact algorithm heap allocation. Browser peak memory is unavailable. Memory runs are separate from timed calls.

```json
{
  "metric": "Linux /proc/self/status VmHWM × 1024 bytes (current process-image RSS high-water)",
  "repetitions": 5,
  "sources": [
    "https://docs.kernel.org/filesystems/proc.html",
    "https://nodejs.org/api/process.html#processresourceusage"
  ],
  "accuracy": "Kernel RSS accounting is asynchronous and approximate; this is not an exact allocation count. Raw getrusage maxRSS and startup/current-image peaks are preserved to expose pre-exec launch floors.",
  "scope": "Each per-lock observation is a fresh process. Repeated comparison is peak RSS of the selected 45-lock workload per fresh process.",
  "includes": "Node runtime, TypeScript benchmark loader, module loading, fixture loading, normalization, independent replay and solver allocations. Startup and loaded current RSS are recorded separately; subtraction is not exact algorithm allocation.",
  "browser": {
    "available": false,
    "reason": "No portable exact browser peak-memory API; Node RSS is not browser memory."
  },
  "performance": {
    "verdict": "passed",
    "reason": "Measured upper slowdown bound lies within the calibrated control envelope.",
    "ratio": 0.962246756993597,
    "noiseRatio": 1.0949647700001646,
    "lowerRatio": 0.8908822461111241,
    "upperRatio": 1.0393279531458977
  },
  "attempts": [
    {
      "verdict": "passed",
      "reason": "Measured upper slowdown bound lies within the calibrated control envelope.",
      "ratio": 0.962246756993597,
      "noiseRatio": 1.0949647700001646,
      "lowerRatio": 0.8908822461111241,
      "upperRatio": 1.0393279531458977,
      "samples": {
        "candidate": [
          {
            "peakRssBytes": 94666752,
            "startupRssBytes": 64344064,
            "loadedRssBytes": 65785856,
            "lockCount": 45,
            "peakRssMetric": "linux-proc-VmHWM",
            "startupPeakRssBytes": 65351680,
            "loadedPeakRssBytes": 66846720,
            "resourceUsageMaxRssBytes": 93732864,
            "startupResourceUsageMaxRssBytes": 84721664,
            "resourceUsageLaunchFloorDetected": true
          },
          {
            "peakRssBytes": 94412800,
            "startupRssBytes": 65175552,
            "loadedRssBytes": 66617344,
            "lockCount": 45,
            "peakRssMetric": "linux-proc-VmHWM",
            "startupPeakRssBytes": 66248704,
            "loadedPeakRssBytes": 67477504,
            "resourceUsageMaxRssBytes": 93741056,
            "startupResourceUsageMaxRssBytes": 84721664,
            "resourceUsageLaunchFloorDetected": true
          },
          {
            "peakRssBytes": 94752768,
            "startupRssBytes": 65814528,
            "loadedRssBytes": 66732032,
            "lockCount": 45,
            "peakRssMetric": "linux-proc-VmHWM",
            "startupPeakRssBytes": 66715648,
            "loadedPeakRssBytes": 67567616,
            "resourceUsageMaxRssBytes": 94523392,
            "startupResourceUsageMaxRssBytes": 84721664,
            "resourceUsageLaunchFloorDetected": true
          },
          {
            "peakRssBytes": 89186304,
            "startupRssBytes": 65310720,
            "loadedRssBytes": 66883584,
            "lockCount": 45,
            "peakRssMetric": "linux-proc-VmHWM",
            "startupPeakRssBytes": 66576384,
            "loadedPeakRssBytes": 67739648,
            "resourceUsageMaxRssBytes": 89006080,
            "startupResourceUsageMaxRssBytes": 84721664,
            "resourceUsageLaunchFloorDetected": true
          },
          {
            "peakRssBytes": 84447232,
            "startupRssBytes": 65482752,
            "loadedRssBytes": 67186688,
            "lockCount": 45,
            "peakRssMetric": "linux-proc-VmHWM",
            "startupPeakRssBytes": 66744320,
            "loadedPeakRssBytes": 67825664,
            "resourceUsageMaxRssBytes": 84721664,
            "startupResourceUsageMaxRssBytes": 84721664,
            "resourceUsageLaunchFloorDetected": true
          }
        ],
        "baseline": [
          {
            "peakRssBytes": 95948800,
            "startupRssBytes": 64970752,
            "loadedRssBytes": 67461120,
            "lockCount": 45,
            "peakRssMetric": "linux-proc-VmHWM",
            "startupPeakRssBytes": 66179072,
            "loadedPeakRssBytes": 68268032,
            "resourceUsageMaxRssBytes": 95100928,
            "startupResourceUsageMaxRssBytes": 84721664,
            "resourceUsageLaunchFloorDetected": true
          },
          {
            "peakRssBytes": 89391104,
            "startupRssBytes": 64778240,
            "loadedRssBytes": 67137536,
            "lockCount": 45,
            "peakRssMetric": "linux-proc-VmHWM",
            "startupPeakRssBytes": 65925120,
            "loadedPeakRssBytes": 68210688,
            "resourceUsageMaxRssBytes": 88641536,
            "startupResourceUsageMaxRssBytes": 84721664,
            "resourceUsageLaunchFloorDetected": true
          },
          {
            "peakRssBytes": 100007936,
            "startupRssBytes": 64532480,
            "loadedRssBytes": 67678208,
            "lockCount": 45,
            "peakRssMetric": "linux-proc-VmHWM",
            "startupPeakRssBytes": 65564672,
            "loadedPeakRssBytes": 68284416,
            "resourceUsageMaxRssBytes": 100007936,
            "startupResourceUsageMaxRssBytes": 84721664,
            "resourceUsageLaunchFloorDetected": true
          },
          {
            "peakRssBytes": 95895552,
            "startupRssBytes": 65687552,
            "loadedRssBytes": 67391488,
            "lockCount": 45,
            "peakRssMetric": "linux-proc-VmHWM",
            "startupPeakRssBytes": 67055616,
            "loadedPeakRssBytes": 68235264,
            "resourceUsageMaxRssBytes": 95895552,
            "startupResourceUsageMaxRssBytes": 84721664,
            "resourceUsageLaunchFloorDetected": true
          },
          {
            "peakRssBytes": 93995008,
            "startupRssBytes": 65671168,
            "loadedRssBytes": 67375104,
            "lockCount": 45,
            "peakRssMetric": "linux-proc-VmHWM",
            "startupPeakRssBytes": 66916352,
            "loadedPeakRssBytes": 68136960,
            "resourceUsageMaxRssBytes": 93188096,
            "startupResourceUsageMaxRssBytes": 84721664,
            "resourceUsageLaunchFloorDetected": true
          }
        ],
        "originalBfs": [
          {
            "peakRssBytes": 121143296,
            "startupRssBytes": 65421312,
            "loadedRssBytes": 66732032,
            "lockCount": 45,
            "peakRssMetric": "linux-proc-VmHWM",
            "startupPeakRssBytes": 66490368,
            "loadedPeakRssBytes": 67485696,
            "resourceUsageMaxRssBytes": 120414208,
            "startupResourceUsageMaxRssBytes": 84721664,
            "resourceUsageLaunchFloorDetected": true
          },
          {
            "peakRssBytes": 120922112,
            "startupRssBytes": 65372160,
            "loadedRssBytes": 67207168,
            "lockCount": 45,
            "peakRssMetric": "linux-proc-VmHWM",
            "startupPeakRssBytes": 66613248,
            "loadedPeakRssBytes": 68161536,
            "resourceUsageMaxRssBytes": 120160256,
            "startupResourceUsageMaxRssBytes": 84721664,
            "resourceUsageLaunchFloorDetected": true
          },
          {
            "peakRssBytes": 120438784,
            "startupRssBytes": 64557056,
            "loadedRssBytes": 66392064,
            "lockCount": 45,
            "peakRssMetric": "linux-proc-VmHWM",
            "startupPeakRssBytes": 65339392,
            "loadedPeakRssBytes": 67448832,
            "resourceUsageMaxRssBytes": 119697408,
            "startupResourceUsageMaxRssBytes": 84721664,
            "resourceUsageLaunchFloorDetected": true
          },
          {
            "peakRssBytes": 120311808,
            "startupRssBytes": 65306624,
            "loadedRssBytes": 67141632,
            "lockCount": 45,
            "peakRssMetric": "linux-proc-VmHWM",
            "startupPeakRssBytes": 66830336,
            "loadedPeakRssBytes": 68071424,
            "resourceUsageMaxRssBytes": 119595008,
            "startupResourceUsageMaxRssBytes": 84721664,
            "resourceUsageLaunchFloorDetected": true
          },
          {
            "peakRssBytes": 121356288,
            "startupRssBytes": 65691648,
            "loadedRssBytes": 67395584,
            "lockCount": 45,
            "peakRssMetric": "linux-proc-VmHWM",
            "startupPeakRssBytes": 67006464,
            "loadedPeakRssBytes": 68116480,
            "resourceUsageMaxRssBytes": 120606720,
            "startupResourceUsageMaxRssBytes": 84721664,
            "resourceUsageLaunchFloorDetected": true
          }
        ],
        "upstream": [
          {
            "peakRssBytes": 270356480,
            "startupRssBytes": 65941504,
            "loadedRssBytes": 68431872,
            "lockCount": 45,
            "peakRssMetric": "linux-proc-VmHWM",
            "startupPeakRssBytes": 67108864,
            "loadedPeakRssBytes": 69251072,
            "resourceUsageMaxRssBytes": 269815808,
            "startupResourceUsageMaxRssBytes": 84721664,
            "resourceUsageLaunchFloorDetected": true
          },
          {
            "peakRssBytes": 270110720,
            "startupRssBytes": 65540096,
            "loadedRssBytes": 68685824,
            "lockCount": 45,
            "peakRssMetric": "linux-proc-VmHWM",
            "startupPeakRssBytes": 67006464,
            "loadedPeakRssBytes": 69443584,
            "resourceUsageMaxRssBytes": 269246464,
            "startupResourceUsageMaxRssBytes": 84721664,
            "resourceUsageLaunchFloorDetected": true
          },
          {
            "peakRssBytes": 268992512,
            "startupRssBytes": 64909312,
            "loadedRssBytes": 68710400,
            "lockCount": 45,
            "peakRssMetric": "linux-proc-VmHWM",
            "startupPeakRssBytes": 65966080,
            "loadedPeakRssBytes": 69349376,
            "resourceUsageMaxRssBytes": 267882496,
            "startupResourceUsageMaxRssBytes": 84721664,
            "resourceUsageLaunchFloorDetected": true
          },
          {
            "peakRssBytes": 309043200,
            "startupRssBytes": 65306624,
            "loadedRssBytes": 68452352,
            "lockCount": 45,
            "peakRssMetric": "linux-proc-VmHWM",
            "startupPeakRssBytes": 66768896,
            "loadedPeakRssBytes": 69234688,
            "resourceUsageMaxRssBytes": 309043200,
            "startupResourceUsageMaxRssBytes": 84721664,
            "resourceUsageLaunchFloorDetected": true
          },
          {
            "peakRssBytes": 270135296,
            "startupRssBytes": 65089536,
            "loadedRssBytes": 68497408,
            "lockCount": 45,
            "peakRssMetric": "linux-proc-VmHWM",
            "startupPeakRssBytes": 65785856,
            "loadedPeakRssBytes": 69300224,
            "resourceUsageMaxRssBytes": 269443072,
            "startupResourceUsageMaxRssBytes": 84721664,
            "resourceUsageLaunchFloorDetected": true
          }
        ],
        "baselineSelfA": [
          {
            "peakRssBytes": 95563776,
            "startupRssBytes": 65470464,
            "loadedRssBytes": 67305472,
            "lockCount": 45,
            "peakRssMetric": "linux-proc-VmHWM",
            "startupPeakRssBytes": 66633728,
            "loadedPeakRssBytes": 68255744,
            "resourceUsageMaxRssBytes": 95563776,
            "startupResourceUsageMaxRssBytes": 84721664,
            "resourceUsageLaunchFloorDetected": true
          },
          {
            "peakRssBytes": 95862784,
            "startupRssBytes": 65462272,
            "loadedRssBytes": 67297280,
            "lockCount": 45,
            "peakRssMetric": "linux-proc-VmHWM",
            "startupPeakRssBytes": 66928640,
            "loadedPeakRssBytes": 68186112,
            "resourceUsageMaxRssBytes": 95862784,
            "startupResourceUsageMaxRssBytes": 84721664,
            "resourceUsageLaunchFloorDetected": true
          },
          {
            "peakRssBytes": 94965760,
            "startupRssBytes": 65818624,
            "loadedRssBytes": 67391488,
            "lockCount": 45,
            "peakRssMetric": "linux-proc-VmHWM",
            "startupPeakRssBytes": 67014656,
            "loadedPeakRssBytes": 68362240,
            "resourceUsageMaxRssBytes": 94965760,
            "startupResourceUsageMaxRssBytes": 84721664,
            "resourceUsageLaunchFloorDetected": true
          },
          {
            "peakRssBytes": 95129600,
            "startupRssBytes": 65208320,
            "loadedRssBytes": 67305472,
            "lockCount": 45,
            "peakRssMetric": "linux-proc-VmHWM",
            "startupPeakRssBytes": 66326528,
            "loadedPeakRssBytes": 68149248,
            "resourceUsageMaxRssBytes": 94162944,
            "startupResourceUsageMaxRssBytes": 84721664,
            "resourceUsageLaunchFloorDetected": true
          },
          {
            "peakRssBytes": 94371840,
            "startupRssBytes": 64974848,
            "loadedRssBytes": 66940928,
            "lockCount": 45,
            "peakRssMetric": "linux-proc-VmHWM",
            "startupPeakRssBytes": 66097152,
            "loadedPeakRssBytes": 67719168,
            "resourceUsageMaxRssBytes": 94371840,
            "startupResourceUsageMaxRssBytes": 84721664,
            "resourceUsageLaunchFloorDetected": true
          }
        ],
        "baselineSelfB": [
          {
            "peakRssBytes": 96808960,
            "startupRssBytes": 64933888,
            "loadedRssBytes": 67424256,
            "lockCount": 45,
            "peakRssMetric": "linux-proc-VmHWM",
            "startupPeakRssBytes": 66068480,
            "loadedPeakRssBytes": 68247552,
            "resourceUsageMaxRssBytes": 96731136,
            "startupResourceUsageMaxRssBytes": 84721664,
            "resourceUsageLaunchFloorDetected": true
          },
          {
            "peakRssBytes": 94896128,
            "startupRssBytes": 65703936,
            "loadedRssBytes": 67407872,
            "lockCount": 45,
            "peakRssMetric": "linux-proc-VmHWM",
            "startupPeakRssBytes": 66998272,
            "loadedPeakRssBytes": 68202496,
            "resourceUsageMaxRssBytes": 94896128,
            "startupResourceUsageMaxRssBytes": 84721664,
            "resourceUsageLaunchFloorDetected": true
          },
          {
            "peakRssBytes": 84250624,
            "startupRssBytes": 65826816,
            "loadedRssBytes": 67530752,
            "lockCount": 45,
            "peakRssMetric": "linux-proc-VmHWM",
            "startupPeakRssBytes": 66949120,
            "loadedPeakRssBytes": 68239360,
            "resourceUsageMaxRssBytes": 84721664,
            "startupResourceUsageMaxRssBytes": 84721664,
            "resourceUsageLaunchFloorDetected": true
          },
          {
            "peakRssBytes": 97107968,
            "startupRssBytes": 65032192,
            "loadedRssBytes": 66998272,
            "lockCount": 45,
            "peakRssMetric": "linux-proc-VmHWM",
            "startupPeakRssBytes": 66183168,
            "loadedPeakRssBytes": 67727360,
            "resourceUsageMaxRssBytes": 97107968,
            "startupResourceUsageMaxRssBytes": 84721664,
            "resourceUsageLaunchFloorDetected": true
          },
          {
            "peakRssBytes": 94167040,
            "startupRssBytes": 64937984,
            "loadedRssBytes": 67428352,
            "lockCount": 45,
            "peakRssMetric": "linux-proc-VmHWM",
            "startupPeakRssBytes": 66555904,
            "loadedPeakRssBytes": 68247552,
            "resourceUsageMaxRssBytes": 93442048,
            "startupResourceUsageMaxRssBytes": 84721664,
            "resourceUsageLaunchFloorDetected": true
          }
        ]
      }
    }
  ],
  "wholeCatalog": {
    "candidate": {
      "samples": [
        {
          "peakRssBytes": 94666752,
          "startupRssBytes": 64344064,
          "loadedRssBytes": 65785856,
          "lockCount": 45,
          "peakRssMetric": "linux-proc-VmHWM",
          "startupPeakRssBytes": 65351680,
          "loadedPeakRssBytes": 66846720,
          "resourceUsageMaxRssBytes": 93732864,
          "startupResourceUsageMaxRssBytes": 84721664,
          "resourceUsageLaunchFloorDetected": true
        },
        {
          "peakRssBytes": 94412800,
          "startupRssBytes": 65175552,
          "loadedRssBytes": 66617344,
          "lockCount": 45,
          "peakRssMetric": "linux-proc-VmHWM",
          "startupPeakRssBytes": 66248704,
          "loadedPeakRssBytes": 67477504,
          "resourceUsageMaxRssBytes": 93741056,
          "startupResourceUsageMaxRssBytes": 84721664,
          "resourceUsageLaunchFloorDetected": true
        },
        {
          "peakRssBytes": 94752768,
          "startupRssBytes": 65814528,
          "loadedRssBytes": 66732032,
          "lockCount": 45,
          "peakRssMetric": "linux-proc-VmHWM",
          "startupPeakRssBytes": 66715648,
          "loadedPeakRssBytes": 67567616,
          "resourceUsageMaxRssBytes": 94523392,
          "startupResourceUsageMaxRssBytes": 84721664,
          "resourceUsageLaunchFloorDetected": true
        },
        {
          "peakRssBytes": 89186304,
          "startupRssBytes": 65310720,
          "loadedRssBytes": 66883584,
          "lockCount": 45,
          "peakRssMetric": "linux-proc-VmHWM",
          "startupPeakRssBytes": 66576384,
          "loadedPeakRssBytes": 67739648,
          "resourceUsageMaxRssBytes": 89006080,
          "startupResourceUsageMaxRssBytes": 84721664,
          "resourceUsageLaunchFloorDetected": true
        },
        {
          "peakRssBytes": 84447232,
          "startupRssBytes": 65482752,
          "loadedRssBytes": 67186688,
          "lockCount": 45,
          "peakRssMetric": "linux-proc-VmHWM",
          "startupPeakRssBytes": 66744320,
          "loadedPeakRssBytes": 67825664,
          "resourceUsageMaxRssBytes": 84721664,
          "startupResourceUsageMaxRssBytes": 84721664,
          "resourceUsageLaunchFloorDetected": true
        }
      ],
      "peakRssBytes": {
        "min": 84447232,
        "median": 94412800,
        "p95": 94752768,
        "max": 94752768
      }
    },
    "baseline": {
      "samples": [
        {
          "peakRssBytes": 95948800,
          "startupRssBytes": 64970752,
          "loadedRssBytes": 67461120,
          "lockCount": 45,
          "peakRssMetric": "linux-proc-VmHWM",
          "startupPeakRssBytes": 66179072,
          "loadedPeakRssBytes": 68268032,
          "resourceUsageMaxRssBytes": 95100928,
          "startupResourceUsageMaxRssBytes": 84721664,
          "resourceUsageLaunchFloorDetected": true
        },
        {
          "peakRssBytes": 89391104,
          "startupRssBytes": 64778240,
          "loadedRssBytes": 67137536,
          "lockCount": 45,
          "peakRssMetric": "linux-proc-VmHWM",
          "startupPeakRssBytes": 65925120,
          "loadedPeakRssBytes": 68210688,
          "resourceUsageMaxRssBytes": 88641536,
          "startupResourceUsageMaxRssBytes": 84721664,
          "resourceUsageLaunchFloorDetected": true
        },
        {
          "peakRssBytes": 100007936,
          "startupRssBytes": 64532480,
          "loadedRssBytes": 67678208,
          "lockCount": 45,
          "peakRssMetric": "linux-proc-VmHWM",
          "startupPeakRssBytes": 65564672,
          "loadedPeakRssBytes": 68284416,
          "resourceUsageMaxRssBytes": 100007936,
          "startupResourceUsageMaxRssBytes": 84721664,
          "resourceUsageLaunchFloorDetected": true
        },
        {
          "peakRssBytes": 95895552,
          "startupRssBytes": 65687552,
          "loadedRssBytes": 67391488,
          "lockCount": 45,
          "peakRssMetric": "linux-proc-VmHWM",
          "startupPeakRssBytes": 67055616,
          "loadedPeakRssBytes": 68235264,
          "resourceUsageMaxRssBytes": 95895552,
          "startupResourceUsageMaxRssBytes": 84721664,
          "resourceUsageLaunchFloorDetected": true
        },
        {
          "peakRssBytes": 93995008,
          "startupRssBytes": 65671168,
          "loadedRssBytes": 67375104,
          "lockCount": 45,
          "peakRssMetric": "linux-proc-VmHWM",
          "startupPeakRssBytes": 66916352,
          "loadedPeakRssBytes": 68136960,
          "resourceUsageMaxRssBytes": 93188096,
          "startupResourceUsageMaxRssBytes": 84721664,
          "resourceUsageLaunchFloorDetected": true
        }
      ],
      "peakRssBytes": {
        "min": 89391104,
        "median": 95895552,
        "p95": 100007936,
        "max": 100007936
      }
    },
    "originalBfs": {
      "samples": [
        {
          "peakRssBytes": 121143296,
          "startupRssBytes": 65421312,
          "loadedRssBytes": 66732032,
          "lockCount": 45,
          "peakRssMetric": "linux-proc-VmHWM",
          "startupPeakRssBytes": 66490368,
          "loadedPeakRssBytes": 67485696,
          "resourceUsageMaxRssBytes": 120414208,
          "startupResourceUsageMaxRssBytes": 84721664,
          "resourceUsageLaunchFloorDetected": true
        },
        {
          "peakRssBytes": 120922112,
          "startupRssBytes": 65372160,
          "loadedRssBytes": 67207168,
          "lockCount": 45,
          "peakRssMetric": "linux-proc-VmHWM",
          "startupPeakRssBytes": 66613248,
          "loadedPeakRssBytes": 68161536,
          "resourceUsageMaxRssBytes": 120160256,
          "startupResourceUsageMaxRssBytes": 84721664,
          "resourceUsageLaunchFloorDetected": true
        },
        {
          "peakRssBytes": 120438784,
          "startupRssBytes": 64557056,
          "loadedRssBytes": 66392064,
          "lockCount": 45,
          "peakRssMetric": "linux-proc-VmHWM",
          "startupPeakRssBytes": 65339392,
          "loadedPeakRssBytes": 67448832,
          "resourceUsageMaxRssBytes": 119697408,
          "startupResourceUsageMaxRssBytes": 84721664,
          "resourceUsageLaunchFloorDetected": true
        },
        {
          "peakRssBytes": 120311808,
          "startupRssBytes": 65306624,
          "loadedRssBytes": 67141632,
          "lockCount": 45,
          "peakRssMetric": "linux-proc-VmHWM",
          "startupPeakRssBytes": 66830336,
          "loadedPeakRssBytes": 68071424,
          "resourceUsageMaxRssBytes": 119595008,
          "startupResourceUsageMaxRssBytes": 84721664,
          "resourceUsageLaunchFloorDetected": true
        },
        {
          "peakRssBytes": 121356288,
          "startupRssBytes": 65691648,
          "loadedRssBytes": 67395584,
          "lockCount": 45,
          "peakRssMetric": "linux-proc-VmHWM",
          "startupPeakRssBytes": 67006464,
          "loadedPeakRssBytes": 68116480,
          "resourceUsageMaxRssBytes": 120606720,
          "startupResourceUsageMaxRssBytes": 84721664,
          "resourceUsageLaunchFloorDetected": true
        }
      ],
      "peakRssBytes": {
        "min": 120311808,
        "median": 120922112,
        "p95": 121356288,
        "max": 121356288
      }
    },
    "upstream": {
      "samples": [
        {
          "peakRssBytes": 270356480,
          "startupRssBytes": 65941504,
          "loadedRssBytes": 68431872,
          "lockCount": 45,
          "peakRssMetric": "linux-proc-VmHWM",
          "startupPeakRssBytes": 67108864,
          "loadedPeakRssBytes": 69251072,
          "resourceUsageMaxRssBytes": 269815808,
          "startupResourceUsageMaxRssBytes": 84721664,
          "resourceUsageLaunchFloorDetected": true
        },
        {
          "peakRssBytes": 270110720,
          "startupRssBytes": 65540096,
          "loadedRssBytes": 68685824,
          "lockCount": 45,
          "peakRssMetric": "linux-proc-VmHWM",
          "startupPeakRssBytes": 67006464,
          "loadedPeakRssBytes": 69443584,
          "resourceUsageMaxRssBytes": 269246464,
          "startupResourceUsageMaxRssBytes": 84721664,
          "resourceUsageLaunchFloorDetected": true
        },
        {
          "peakRssBytes": 268992512,
          "startupRssBytes": 64909312,
          "loadedRssBytes": 68710400,
          "lockCount": 45,
          "peakRssMetric": "linux-proc-VmHWM",
          "startupPeakRssBytes": 65966080,
          "loadedPeakRssBytes": 69349376,
          "resourceUsageMaxRssBytes": 267882496,
          "startupResourceUsageMaxRssBytes": 84721664,
          "resourceUsageLaunchFloorDetected": true
        },
        {
          "peakRssBytes": 309043200,
          "startupRssBytes": 65306624,
          "loadedRssBytes": 68452352,
          "lockCount": 45,
          "peakRssMetric": "linux-proc-VmHWM",
          "startupPeakRssBytes": 66768896,
          "loadedPeakRssBytes": 69234688,
          "resourceUsageMaxRssBytes": 309043200,
          "startupResourceUsageMaxRssBytes": 84721664,
          "resourceUsageLaunchFloorDetected": true
        },
        {
          "peakRssBytes": 270135296,
          "startupRssBytes": 65089536,
          "loadedRssBytes": 68497408,
          "lockCount": 45,
          "peakRssMetric": "linux-proc-VmHWM",
          "startupPeakRssBytes": 65785856,
          "loadedPeakRssBytes": 69300224,
          "resourceUsageMaxRssBytes": 269443072,
          "startupResourceUsageMaxRssBytes": 84721664,
          "resourceUsageLaunchFloorDetected": true
        }
      ],
      "peakRssBytes": {
        "min": 268992512,
        "median": 270135296,
        "p95": 309043200,
        "max": 309043200
      }
    },
    "baselineSelfA": {
      "samples": [
        {
          "peakRssBytes": 95563776,
          "startupRssBytes": 65470464,
          "loadedRssBytes": 67305472,
          "lockCount": 45,
          "peakRssMetric": "linux-proc-VmHWM",
          "startupPeakRssBytes": 66633728,
          "loadedPeakRssBytes": 68255744,
          "resourceUsageMaxRssBytes": 95563776,
          "startupResourceUsageMaxRssBytes": 84721664,
          "resourceUsageLaunchFloorDetected": true
        },
        {
          "peakRssBytes": 95862784,
          "startupRssBytes": 65462272,
          "loadedRssBytes": 67297280,
          "lockCount": 45,
          "peakRssMetric": "linux-proc-VmHWM",
          "startupPeakRssBytes": 66928640,
          "loadedPeakRssBytes": 68186112,
          "resourceUsageMaxRssBytes": 95862784,
          "startupResourceUsageMaxRssBytes": 84721664,
          "resourceUsageLaunchFloorDetected": true
        },
        {
          "peakRssBytes": 94965760,
          "startupRssBytes": 65818624,
          "loadedRssBytes": 67391488,
          "lockCount": 45,
          "peakRssMetric": "linux-proc-VmHWM",
          "startupPeakRssBytes": 67014656,
          "loadedPeakRssBytes": 68362240,
          "resourceUsageMaxRssBytes": 94965760,
          "startupResourceUsageMaxRssBytes": 84721664,
          "resourceUsageLaunchFloorDetected": true
        },
        {
          "peakRssBytes": 95129600,
          "startupRssBytes": 65208320,
          "loadedRssBytes": 67305472,
          "lockCount": 45,
          "peakRssMetric": "linux-proc-VmHWM",
          "startupPeakRssBytes": 66326528,
          "loadedPeakRssBytes": 68149248,
          "resourceUsageMaxRssBytes": 94162944,
          "startupResourceUsageMaxRssBytes": 84721664,
          "resourceUsageLaunchFloorDetected": true
        },
        {
          "peakRssBytes": 94371840,
          "startupRssBytes": 64974848,
          "loadedRssBytes": 66940928,
          "lockCount": 45,
          "peakRssMetric": "linux-proc-VmHWM",
          "startupPeakRssBytes": 66097152,
          "loadedPeakRssBytes": 67719168,
          "resourceUsageMaxRssBytes": 94371840,
          "startupResourceUsageMaxRssBytes": 84721664,
          "resourceUsageLaunchFloorDetected": true
        }
      ],
      "peakRssBytes": {
        "min": 94371840,
        "median": 95129600,
        "p95": 95862784,
        "max": 95862784
      }
    },
    "baselineSelfB": {
      "samples": [
        {
          "peakRssBytes": 96808960,
          "startupRssBytes": 64933888,
          "loadedRssBytes": 67424256,
          "lockCount": 45,
          "peakRssMetric": "linux-proc-VmHWM",
          "startupPeakRssBytes": 66068480,
          "loadedPeakRssBytes": 68247552,
          "resourceUsageMaxRssBytes": 96731136,
          "startupResourceUsageMaxRssBytes": 84721664,
          "resourceUsageLaunchFloorDetected": true
        },
        {
          "peakRssBytes": 94896128,
          "startupRssBytes": 65703936,
          "loadedRssBytes": 67407872,
          "lockCount": 45,
          "peakRssMetric": "linux-proc-VmHWM",
          "startupPeakRssBytes": 66998272,
          "loadedPeakRssBytes": 68202496,
          "resourceUsageMaxRssBytes": 94896128,
          "startupResourceUsageMaxRssBytes": 84721664,
          "resourceUsageLaunchFloorDetected": true
        },
        {
          "peakRssBytes": 84250624,
          "startupRssBytes": 65826816,
          "loadedRssBytes": 67530752,
          "lockCount": 45,
          "peakRssMetric": "linux-proc-VmHWM",
          "startupPeakRssBytes": 66949120,
          "loadedPeakRssBytes": 68239360,
          "resourceUsageMaxRssBytes": 84721664,
          "startupResourceUsageMaxRssBytes": 84721664,
          "resourceUsageLaunchFloorDetected": true
        },
        {
          "peakRssBytes": 97107968,
          "startupRssBytes": 65032192,
          "loadedRssBytes": 66998272,
          "lockCount": 45,
          "peakRssMetric": "linux-proc-VmHWM",
          "startupPeakRssBytes": 66183168,
          "loadedPeakRssBytes": 67727360,
          "resourceUsageMaxRssBytes": 97107968,
          "startupResourceUsageMaxRssBytes": 84721664,
          "resourceUsageLaunchFloorDetected": true
        },
        {
          "peakRssBytes": 94167040,
          "startupRssBytes": 64937984,
          "loadedRssBytes": 67428352,
          "lockCount": 45,
          "peakRssMetric": "linux-proc-VmHWM",
          "startupPeakRssBytes": 66555904,
          "loadedPeakRssBytes": 68247552,
          "resourceUsageMaxRssBytes": 93442048,
          "startupResourceUsageMaxRssBytes": 84721664,
          "resourceUsageLaunchFloorDetected": true
        }
      ],
      "peakRssBytes": {
        "min": 84250624,
        "median": 94896128,
        "p95": 97107968,
        "max": 97107968
      }
    }
  },
  "perLock": [
    {
      "id": "ruined-tower-door",
      "solvers": {
        "candidate": {
          "peakRssBytes": 77537280,
          "startupRssBytes": 65085440,
          "loadedRssBytes": 66658304,
          "lockCount": 1,
          "peakRssMetric": "linux-proc-VmHWM",
          "startupPeakRssBytes": 66162688,
          "loadedPeakRssBytes": 67620864,
          "resourceUsageMaxRssBytes": 84721664,
          "startupResourceUsageMaxRssBytes": 84721664,
          "resourceUsageLaunchFloorDetected": true
        },
        "baseline": {
          "peakRssBytes": 74416128,
          "startupRssBytes": 64368640,
          "loadedRssBytes": 67383296,
          "lockCount": 1,
          "peakRssMetric": "linux-proc-VmHWM",
          "startupPeakRssBytes": 65441792,
          "loadedPeakRssBytes": 68239360,
          "resourceUsageMaxRssBytes": 84721664,
          "startupResourceUsageMaxRssBytes": 84721664,
          "resourceUsageLaunchFloorDetected": true
        },
        "originalBfs": {
          "peakRssBytes": 78462976,
          "startupRssBytes": 65814528,
          "loadedRssBytes": 67125248,
          "lockCount": 1,
          "peakRssMetric": "linux-proc-VmHWM",
          "startupPeakRssBytes": 66789376,
          "loadedPeakRssBytes": 67813376,
          "resourceUsageMaxRssBytes": 84721664,
          "startupResourceUsageMaxRssBytes": 84721664,
          "resourceUsageLaunchFloorDetected": true
        },
        "upstream": {
          "peakRssBytes": 106233856,
          "startupRssBytes": 64303104,
          "loadedRssBytes": 68497408,
          "lockCount": 1,
          "peakRssMetric": "linux-proc-VmHWM",
          "startupPeakRssBytes": 65495040,
          "loadedPeakRssBytes": 69402624,
          "resourceUsageMaxRssBytes": 105652224,
          "startupResourceUsageMaxRssBytes": 84721664,
          "resourceUsageLaunchFloorDetected": true
        }
      },
      "repetitions": 1,
      "verdict": "inconclusive",
      "reason": "Single isolated per-lock observation; environmental variation is not estimated per lock."
    },
    {
      "id": "scatty-chest",
      "solvers": {
        "candidate": {
          "peakRssBytes": 71573504,
          "startupRssBytes": 65675264,
          "loadedRssBytes": 67117056,
          "lockCount": 1,
          "peakRssMetric": "linux-proc-VmHWM",
          "startupPeakRssBytes": 66748416,
          "loadedPeakRssBytes": 67698688,
          "resourceUsageMaxRssBytes": 84721664,
          "startupResourceUsageMaxRssBytes": 84721664,
          "resourceUsageLaunchFloorDetected": true
        },
        "baseline": {
          "peakRssBytes": 71282688,
          "startupRssBytes": 65290240,
          "loadedRssBytes": 67387392,
          "lockCount": 1,
          "peakRssMetric": "linux-proc-VmHWM",
          "startupPeakRssBytes": 66768896,
          "loadedPeakRssBytes": 68235264,
          "resourceUsageMaxRssBytes": 84721664,
          "startupResourceUsageMaxRssBytes": 84721664,
          "resourceUsageLaunchFloorDetected": true
        },
        "originalBfs": {
          "peakRssBytes": 78876672,
          "startupRssBytes": 66211840,
          "loadedRssBytes": 67260416,
          "lockCount": 1,
          "peakRssMetric": "linux-proc-VmHWM",
          "startupPeakRssBytes": 67403776,
          "loadedPeakRssBytes": 68096000,
          "resourceUsageMaxRssBytes": 84721664,
          "startupResourceUsageMaxRssBytes": 84721664,
          "resourceUsageLaunchFloorDetected": true
        },
        "upstream": {
          "peakRssBytes": 75640832,
          "startupRssBytes": 65265664,
          "loadedRssBytes": 68411392,
          "lockCount": 1,
          "peakRssMetric": "linux-proc-VmHWM",
          "startupPeakRssBytes": 66207744,
          "loadedPeakRssBytes": 69148672,
          "resourceUsageMaxRssBytes": 84721664,
          "startupResourceUsageMaxRssBytes": 84721664,
          "resourceUsageLaunchFloorDetected": true
        }
      },
      "repetitions": 1,
      "verdict": "inconclusive",
      "reason": "Single isolated per-lock observation; environmental variation is not estimated per lock."
    },
    {
      "id": "cor-galom-chest",
      "solvers": {
        "candidate": {
          "peakRssBytes": 72212480,
          "startupRssBytes": 65150976,
          "loadedRssBytes": 66592768,
          "lockCount": 1,
          "peakRssMetric": "linux-proc-VmHWM",
          "startupPeakRssBytes": 66125824,
          "loadedPeakRssBytes": 67354624,
          "resourceUsageMaxRssBytes": 84721664,
          "startupResourceUsageMaxRssBytes": 84721664,
          "resourceUsageLaunchFloorDetected": true
        },
        "baseline": {
          "peakRssBytes": 71266304,
          "startupRssBytes": 65617920,
          "loadedRssBytes": 67452928,
          "lockCount": 1,
          "peakRssMetric": "linux-proc-VmHWM",
          "startupPeakRssBytes": 66957312,
          "loadedPeakRssBytes": 68227072,
          "resourceUsageMaxRssBytes": 84721664,
          "startupResourceUsageMaxRssBytes": 84721664,
          "resourceUsageLaunchFloorDetected": true
        },
        "originalBfs": {
          "peakRssBytes": 76562432,
          "startupRssBytes": 65687552,
          "loadedRssBytes": 67391488,
          "lockCount": 1,
          "peakRssMetric": "linux-proc-VmHWM",
          "startupPeakRssBytes": 66940928,
          "loadedPeakRssBytes": 68087808,
          "resourceUsageMaxRssBytes": 84721664,
          "startupResourceUsageMaxRssBytes": 84721664,
          "resourceUsageLaunchFloorDetected": true
        },
        "upstream": {
          "peakRssBytes": 73269248,
          "startupRssBytes": 65531904,
          "loadedRssBytes": 68415488,
          "lockCount": 1,
          "peakRssMetric": "linux-proc-VmHWM",
          "startupPeakRssBytes": 67010560,
          "loadedPeakRssBytes": 69345280,
          "resourceUsageMaxRssBytes": 84721664,
          "startupResourceUsageMaxRssBytes": 84721664,
          "resourceUsageLaunchFloorDetected": true
        }
      },
      "repetitions": 1,
      "verdict": "inconclusive",
      "reason": "Single isolated per-lock observation; environmental variation is not estimated per lock."
    },
    {
      "id": "cor-galom-bedroom-chest",
      "solvers": {
        "candidate": {
          "peakRssBytes": 72265728,
          "startupRssBytes": 65675264,
          "loadedRssBytes": 67379200,
          "lockCount": 1,
          "peakRssMetric": "linux-proc-VmHWM",
          "startupPeakRssBytes": 67072000,
          "loadedPeakRssBytes": 68050944,
          "resourceUsageMaxRssBytes": 84721664,
          "startupResourceUsageMaxRssBytes": 84721664,
          "resourceUsageLaunchFloorDetected": true
        },
        "baseline": {
          "peakRssBytes": 71311360,
          "startupRssBytes": 65495040,
          "loadedRssBytes": 67461120,
          "lockCount": 1,
          "peakRssMetric": "linux-proc-VmHWM",
          "startupPeakRssBytes": 66600960,
          "loadedPeakRssBytes": 68280320,
          "resourceUsageMaxRssBytes": 84721664,
          "startupResourceUsageMaxRssBytes": 84721664,
          "resourceUsageLaunchFloorDetected": true
        },
        "originalBfs": {
          "peakRssBytes": 78819328,
          "startupRssBytes": 65101824,
          "loadedRssBytes": 67198976,
          "lockCount": 1,
          "peakRssMetric": "linux-proc-VmHWM",
          "startupPeakRssBytes": 66678784,
          "loadedPeakRssBytes": 68079616,
          "resourceUsageMaxRssBytes": 84721664,
          "startupResourceUsageMaxRssBytes": 84721664,
          "resourceUsageLaunchFloorDetected": true
        },
        "upstream": {
          "peakRssBytes": 78999552,
          "startupRssBytes": 65703936,
          "loadedRssBytes": 68456448,
          "lockCount": 1,
          "peakRssMetric": "linux-proc-VmHWM",
          "startupPeakRssBytes": 66990080,
          "loadedPeakRssBytes": 69292032,
          "resourceUsageMaxRssBytes": 84721664,
          "startupResourceUsageMaxRssBytes": 84721664,
          "resourceUsageLaunchFloorDetected": true
        }
      },
      "repetitions": 1,
      "verdict": "inconclusive",
      "reason": "Single isolated per-lock observation; environmental variation is not estimated per lock."
    },
    {
      "id": "swamp-camp-forge-chest",
      "solvers": {
        "candidate": {
          "peakRssBytes": 72208384,
          "startupRssBytes": 65228800,
          "loadedRssBytes": 66670592,
          "lockCount": 1,
          "peakRssMetric": "linux-proc-VmHWM",
          "startupPeakRssBytes": 66412544,
          "loadedPeakRssBytes": 67661824,
          "resourceUsageMaxRssBytes": 84721664,
          "startupResourceUsageMaxRssBytes": 84721664,
          "resourceUsageLaunchFloorDetected": true
        },
        "baseline": {
          "peakRssBytes": 71602176,
          "startupRssBytes": 64950272,
          "loadedRssBytes": 67571712,
          "lockCount": 1,
          "peakRssMetric": "linux-proc-VmHWM",
          "startupPeakRssBytes": 65806336,
          "loadedPeakRssBytes": 68268032,
          "resourceUsageMaxRssBytes": 84721664,
          "startupResourceUsageMaxRssBytes": 84721664,
          "resourceUsageLaunchFloorDetected": true
        },
        "originalBfs": {
          "peakRssBytes": 78815232,
          "startupRssBytes": 65097728,
          "loadedRssBytes": 67325952,
          "lockCount": 1,
          "peakRssMetric": "linux-proc-VmHWM",
          "startupPeakRssBytes": 66359296,
          "loadedPeakRssBytes": 68022272,
          "resourceUsageMaxRssBytes": 84721664,
          "startupResourceUsageMaxRssBytes": 84721664,
          "resourceUsageLaunchFloorDetected": true
        },
        "upstream": {
          "peakRssBytes": 83496960,
          "startupRssBytes": 65830912,
          "loadedRssBytes": 68714496,
          "lockCount": 1,
          "peakRssMetric": "linux-proc-VmHWM",
          "startupPeakRssBytes": 67059712,
          "loadedPeakRssBytes": 69357568,
          "resourceUsageMaxRssBytes": 84721664,
          "startupResourceUsageMaxRssBytes": 84721664,
          "resourceUsageLaunchFloorDetected": true
        }
      },
      "repetitions": 1,
      "verdict": "inconclusive",
      "reason": "Single isolated per-lock observation; environmental variation is not estimated per lock."
    },
    {
      "id": "rice-lord-storeroom",
      "solvers": {
        "candidate": {
          "peakRssBytes": 71999488,
          "startupRssBytes": 65429504,
          "loadedRssBytes": 66740224,
          "lockCount": 1,
          "peakRssMetric": "linux-proc-VmHWM",
          "startupPeakRssBytes": 66564096,
          "loadedPeakRssBytes": 67616768,
          "resourceUsageMaxRssBytes": 84721664,
          "startupResourceUsageMaxRssBytes": 84721664,
          "resourceUsageLaunchFloorDetected": true
        },
        "baseline": {
          "peakRssBytes": 71303168,
          "startupRssBytes": 65781760,
          "loadedRssBytes": 67747840,
          "lockCount": 1,
          "peakRssMetric": "linux-proc-VmHWM",
          "startupPeakRssBytes": 67104768,
          "loadedPeakRssBytes": 68378624,
          "resourceUsageMaxRssBytes": 84721664,
          "startupResourceUsageMaxRssBytes": 84721664,
          "resourceUsageLaunchFloorDetected": true
        },
        "originalBfs": {
          "peakRssBytes": 78467072,
          "startupRssBytes": 65544192,
          "loadedRssBytes": 66985984,
          "lockCount": 1,
          "peakRssMetric": "linux-proc-VmHWM",
          "startupPeakRssBytes": 66797568,
          "loadedPeakRssBytes": 67825664,
          "resourceUsageMaxRssBytes": 84721664,
          "startupResourceUsageMaxRssBytes": 84721664,
          "resourceUsageLaunchFloorDetected": true
        },
        "upstream": {
          "peakRssBytes": 75665408,
          "startupRssBytes": 65040384,
          "loadedRssBytes": 68448256,
          "lockCount": 1,
          "peakRssMetric": "linux-proc-VmHWM",
          "startupPeakRssBytes": 65794048,
          "loadedPeakRssBytes": 69210112,
          "resourceUsageMaxRssBytes": 84721664,
          "startupResourceUsageMaxRssBytes": 84721664,
          "resourceUsageLaunchFloorDetected": true
        }
      },
      "repetitions": 1,
      "verdict": "inconclusive",
      "reason": "Single isolated per-lock observation; environmental variation is not estimated per lock."
    },
    {
      "id": "gomez-chambers-door",
      "solvers": {
        "candidate": {
          "peakRssBytes": 72138752,
          "startupRssBytes": 65363968,
          "loadedRssBytes": 66936832,
          "lockCount": 1,
          "peakRssMetric": "linux-proc-VmHWM",
          "startupPeakRssBytes": 66924544,
          "loadedPeakRssBytes": 67854336,
          "resourceUsageMaxRssBytes": 84721664,
          "startupResourceUsageMaxRssBytes": 84721664,
          "resourceUsageLaunchFloorDetected": true
        },
        "baseline": {
          "peakRssBytes": 71692288,
          "startupRssBytes": 65499136,
          "loadedRssBytes": 67203072,
          "lockCount": 1,
          "peakRssMetric": "linux-proc-VmHWM",
          "startupPeakRssBytes": 66719744,
          "loadedPeakRssBytes": 67993600,
          "resourceUsageMaxRssBytes": 84721664,
          "startupResourceUsageMaxRssBytes": 84721664,
          "resourceUsageLaunchFloorDetected": true
        },
        "originalBfs": {
          "peakRssBytes": 79171584,
          "startupRssBytes": 65282048,
          "loadedRssBytes": 67248128,
          "lockCount": 1,
          "peakRssMetric": "linux-proc-VmHWM",
          "startupPeakRssBytes": 66682880,
          "loadedPeakRssBytes": 68141056,
          "resourceUsageMaxRssBytes": 84721664,
          "startupResourceUsageMaxRssBytes": 84721664,
          "resourceUsageLaunchFloorDetected": true
        },
        "upstream": {
          "peakRssBytes": 80289792,
          "startupRssBytes": 65380352,
          "loadedRssBytes": 68395008,
          "lockCount": 1,
          "peakRssMetric": "linux-proc-VmHWM",
          "startupPeakRssBytes": 67026944,
          "loadedPeakRssBytes": 69320704,
          "resourceUsageMaxRssBytes": 84721664,
          "startupResourceUsageMaxRssBytes": 84721664,
          "resourceUsageLaunchFloorDetected": true
        }
      },
      "repetitions": 1,
      "verdict": "inconclusive",
      "reason": "Single isolated per-lock observation; environmental variation is not estimated per lock."
    },
    {
      "id": "gomez-throne-hall-chest",
      "solvers": {
        "candidate": {
          "peakRssBytes": 71208960,
          "startupRssBytes": 65286144,
          "loadedRssBytes": 66727936,
          "lockCount": 1,
          "peakRssMetric": "linux-proc-VmHWM",
          "startupPeakRssBytes": 66678784,
          "loadedPeakRssBytes": 67715072,
          "resourceUsageMaxRssBytes": 84721664,
          "startupResourceUsageMaxRssBytes": 84721664,
          "resourceUsageLaunchFloorDetected": true
        },
        "baseline": {
          "peakRssBytes": 71991296,
          "startupRssBytes": 65724416,
          "loadedRssBytes": 67297280,
          "lockCount": 1,
          "peakRssMetric": "linux-proc-VmHWM",
          "startupPeakRssBytes": 67112960,
          "loadedPeakRssBytes": 68227072,
          "resourceUsageMaxRssBytes": 84721664,
          "startupResourceUsageMaxRssBytes": 84721664,
          "resourceUsageLaunchFloorDetected": true
        },
        "originalBfs": {
          "peakRssBytes": 72019968,
          "startupRssBytes": 65179648,
          "loadedRssBytes": 67801088,
          "lockCount": 1,
          "peakRssMetric": "linux-proc-VmHWM",
          "startupPeakRssBytes": 66400256,
          "loadedPeakRssBytes": 68497408,
          "resourceUsageMaxRssBytes": 84721664,
          "startupResourceUsageMaxRssBytes": 84721664,
          "resourceUsageLaunchFloorDetected": true
        },
        "upstream": {
          "peakRssBytes": 72011776,
          "startupRssBytes": 64962560,
          "loadedRssBytes": 68632576,
          "lockCount": 1,
          "peakRssMetric": "linux-proc-VmHWM",
          "startupPeakRssBytes": 66564096,
          "loadedPeakRssBytes": 69357568,
          "resourceUsageMaxRssBytes": 84721664,
          "startupResourceUsageMaxRssBytes": 84721664,
          "resourceUsageLaunchFloorDetected": true
        }
      },
      "repetitions": 1,
      "verdict": "inconclusive",
      "reason": "Single isolated per-lock observation; environmental variation is not estimated per lock."
    },
    {
      "id": "old-camp-dungeon-door",
      "solvers": {
        "candidate": {
          "peakRssBytes": 77049856,
          "startupRssBytes": 65257472,
          "loadedRssBytes": 67092480,
          "lockCount": 1,
          "peakRssMetric": "linux-proc-VmHWM",
          "startupPeakRssBytes": 66510848,
          "loadedPeakRssBytes": 67887104,
          "resourceUsageMaxRssBytes": 84721664,
          "startupResourceUsageMaxRssBytes": 84721664,
          "resourceUsageLaunchFloorDetected": true
        },
        "baseline": {
          "peakRssBytes": 75661312,
          "startupRssBytes": 65220608,
          "loadedRssBytes": 67448832,
          "lockCount": 1,
          "peakRssMetric": "linux-proc-VmHWM",
          "startupPeakRssBytes": 66314240,
          "loadedPeakRssBytes": 68214784,
          "resourceUsageMaxRssBytes": 84721664,
          "startupResourceUsageMaxRssBytes": 84721664,
          "resourceUsageLaunchFloorDetected": true
        },
        "originalBfs": {
          "peakRssBytes": 79208448,
          "startupRssBytes": 63983616,
          "loadedRssBytes": 66473984,
          "lockCount": 1,
          "peakRssMetric": "linux-proc-VmHWM",
          "startupPeakRssBytes": 65093632,
          "loadedPeakRssBytes": 67276800,
          "resourceUsageMaxRssBytes": 84721664,
          "startupResourceUsageMaxRssBytes": 84721664,
          "resourceUsageLaunchFloorDetected": true
        },
        "upstream": {
          "peakRssBytes": 85356544,
          "startupRssBytes": 65171456,
          "loadedRssBytes": 68448256,
          "lockCount": 1,
          "peakRssMetric": "linux-proc-VmHWM",
          "startupPeakRssBytes": 66473984,
          "loadedPeakRssBytes": 69226496,
          "resourceUsageMaxRssBytes": 84721664,
          "startupResourceUsageMaxRssBytes": 84721664,
          "resourceUsageLaunchFloorDetected": true
        }
      },
      "repetitions": 1,
      "verdict": "inconclusive",
      "reason": "Single isolated per-lock observation; environmental variation is not estimated per lock."
    },
    {
      "id": "arlin-dungeon-key",
      "solvers": {
        "candidate": {
          "peakRssBytes": 81268736,
          "startupRssBytes": 65007616,
          "loadedRssBytes": 66449408,
          "lockCount": 1,
          "peakRssMetric": "linux-proc-VmHWM",
          "startupPeakRssBytes": 66531328,
          "loadedPeakRssBytes": 67469312,
          "resourceUsageMaxRssBytes": 84721664,
          "startupResourceUsageMaxRssBytes": 84721664,
          "resourceUsageLaunchFloorDetected": true
        },
        "baseline": {
          "peakRssBytes": 79904768,
          "startupRssBytes": 65724416,
          "loadedRssBytes": 67428352,
          "lockCount": 1,
          "peakRssMetric": "linux-proc-VmHWM",
          "startupPeakRssBytes": 66981888,
          "loadedPeakRssBytes": 68276224,
          "resourceUsageMaxRssBytes": 84721664,
          "startupResourceUsageMaxRssBytes": 84721664,
          "resourceUsageLaunchFloorDetected": true
        },
        "originalBfs": {
          "peakRssBytes": 83525632,
          "startupRssBytes": 64585728,
          "loadedRssBytes": 67338240,
          "lockCount": 1,
          "peakRssMetric": "linux-proc-VmHWM",
          "startupPeakRssBytes": 65556480,
          "loadedPeakRssBytes": 68038656,
          "resourceUsageMaxRssBytes": 84721664,
          "startupResourceUsageMaxRssBytes": 84721664,
          "resourceUsageLaunchFloorDetected": true
        },
        "upstream": {
          "peakRssBytes": 76693504,
          "startupRssBytes": 65495040,
          "loadedRssBytes": 68509696,
          "lockCount": 1,
          "peakRssMetric": "linux-proc-VmHWM",
          "startupPeakRssBytes": 66912256,
          "loadedPeakRssBytes": 69320704,
          "resourceUsageMaxRssBytes": 84721664,
          "startupResourceUsageMaxRssBytes": 84721664,
          "resourceUsageLaunchFloorDetected": true
        }
      },
      "repetitions": 1,
      "verdict": "inconclusive",
      "reason": "Single isolated per-lock observation; environmental variation is not estimated per lock."
    },
    {
      "id": "gomez-wine-cellar",
      "solvers": {
        "candidate": {
          "peakRssBytes": 71606272,
          "startupRssBytes": 65417216,
          "loadedRssBytes": 66859008,
          "lockCount": 1,
          "peakRssMetric": "linux-proc-VmHWM",
          "startupPeakRssBytes": 66609152,
          "loadedPeakRssBytes": 67608576,
          "resourceUsageMaxRssBytes": 84721664,
          "startupResourceUsageMaxRssBytes": 84721664,
          "resourceUsageLaunchFloorDetected": true
        },
        "baseline": {
          "peakRssBytes": 71225344,
          "startupRssBytes": 65245184,
          "loadedRssBytes": 67473408,
          "lockCount": 1,
          "peakRssMetric": "linux-proc-VmHWM",
          "startupPeakRssBytes": 66383872,
          "loadedPeakRssBytes": 68194304,
          "resourceUsageMaxRssBytes": 84721664,
          "startupResourceUsageMaxRssBytes": 84721664,
          "resourceUsageLaunchFloorDetected": true
        },
        "originalBfs": {
          "peakRssBytes": 79204352,
          "startupRssBytes": 65544192,
          "loadedRssBytes": 67379200,
          "lockCount": 1,
          "peakRssMetric": "linux-proc-VmHWM",
          "startupPeakRssBytes": 66928640,
          "loadedPeakRssBytes": 68059136,
          "resourceUsageMaxRssBytes": 84721664,
          "startupResourceUsageMaxRssBytes": 84721664,
          "resourceUsageLaunchFloorDetected": true
        },
        "upstream": {
          "peakRssBytes": 75743232,
          "startupRssBytes": 65306624,
          "loadedRssBytes": 68583424,
          "lockCount": 1,
          "peakRssMetric": "linux-proc-VmHWM",
          "startupPeakRssBytes": 66613248,
          "loadedPeakRssBytes": 69271552,
          "resourceUsageMaxRssBytes": 84721664,
          "startupResourceUsageMaxRssBytes": 84721664,
          "resourceUsageLaunchFloorDetected": true
        }
      },
      "repetitions": 1,
      "verdict": "inconclusive",
      "reason": "Single isolated per-lock observation; environmental variation is not estimated per lock."
    },
    {
      "id": "gomez-bedside-chest",
      "solvers": {
        "candidate": {
          "peakRssBytes": 76054528,
          "startupRssBytes": 65183744,
          "loadedRssBytes": 66887680,
          "lockCount": 1,
          "peakRssMetric": "linux-proc-VmHWM",
          "startupPeakRssBytes": 66506752,
          "loadedPeakRssBytes": 67825664,
          "resourceUsageMaxRssBytes": 84721664,
          "startupResourceUsageMaxRssBytes": 84721664,
          "resourceUsageLaunchFloorDetected": true
        },
        "baseline": {
          "peakRssBytes": 73519104,
          "startupRssBytes": 64593920,
          "loadedRssBytes": 67215360,
          "lockCount": 1,
          "peakRssMetric": "linux-proc-VmHWM",
          "startupPeakRssBytes": 65310720,
          "loadedPeakRssBytes": 67936256,
          "resourceUsageMaxRssBytes": 84721664,
          "startupResourceUsageMaxRssBytes": 84721664,
          "resourceUsageLaunchFloorDetected": true
        },
        "originalBfs": {
          "peakRssBytes": 78987264,
          "startupRssBytes": 64577536,
          "loadedRssBytes": 67198976,
          "lockCount": 1,
          "peakRssMetric": "linux-proc-VmHWM",
          "startupPeakRssBytes": 65683456,
          "loadedPeakRssBytes": 67956736,
          "resourceUsageMaxRssBytes": 84721664,
          "startupResourceUsageMaxRssBytes": 84721664,
          "resourceUsageLaunchFloorDetected": true
        },
        "upstream": {
          "peakRssBytes": 78557184,
          "startupRssBytes": 65847296,
          "loadedRssBytes": 68599808,
          "lockCount": 1,
          "peakRssMetric": "linux-proc-VmHWM",
          "startupPeakRssBytes": 67043328,
          "loadedPeakRssBytes": 69226496,
          "resourceUsageMaxRssBytes": 84721664,
          "startupResourceUsageMaxRssBytes": 84721664,
          "resourceUsageLaunchFloorDetected": true
        }
      },
      "repetitions": 1,
      "verdict": "inconclusive",
      "reason": "Single isolated per-lock observation; environmental variation is not estimated per lock."
    },
    {
      "id": "gomez-wall-chest",
      "solvers": {
        "candidate": {
          "peakRssBytes": 79142912,
          "startupRssBytes": 65122304,
          "loadedRssBytes": 66957312,
          "lockCount": 1,
          "peakRssMetric": "linux-proc-VmHWM",
          "startupPeakRssBytes": 66228224,
          "loadedPeakRssBytes": 67846144,
          "resourceUsageMaxRssBytes": 84721664,
          "startupResourceUsageMaxRssBytes": 84721664,
          "resourceUsageLaunchFloorDetected": true
        },
        "baseline": {
          "peakRssBytes": 76414976,
          "startupRssBytes": 64720896,
          "loadedRssBytes": 67080192,
          "lockCount": 1,
          "peakRssMetric": "linux-proc-VmHWM",
          "startupPeakRssBytes": 65634304,
          "loadedPeakRssBytes": 67944448,
          "resourceUsageMaxRssBytes": 84721664,
          "startupResourceUsageMaxRssBytes": 84721664,
          "resourceUsageLaunchFloorDetected": true
        },
        "originalBfs": {
          "peakRssBytes": 79220736,
          "startupRssBytes": 65282048,
          "loadedRssBytes": 67379200,
          "lockCount": 1,
          "peakRssMetric": "linux-proc-VmHWM",
          "startupPeakRssBytes": 66985984,
          "loadedPeakRssBytes": 68161536,
          "resourceUsageMaxRssBytes": 84721664,
          "startupResourceUsageMaxRssBytes": 84721664,
          "resourceUsageLaunchFloorDetected": true
        },
        "upstream": {
          "peakRssBytes": 111869952,
          "startupRssBytes": 64249856,
          "loadedRssBytes": 68444160,
          "lockCount": 1,
          "peakRssMetric": "linux-proc-VmHWM",
          "startupPeakRssBytes": 65085440,
          "loadedPeakRssBytes": 69144576,
          "resourceUsageMaxRssBytes": 111263744,
          "startupResourceUsageMaxRssBytes": 84721664,
          "resourceUsageLaunchFloorDetected": true
        }
      },
      "repetitions": 1,
      "verdict": "inconclusive",
      "reason": "Single isolated per-lock observation; environmental variation is not estimated per lock."
    },
    {
      "id": "voran-bedside-chest",
      "solvers": {
        "candidate": {
          "peakRssBytes": 71966720,
          "startupRssBytes": 65683456,
          "loadedRssBytes": 66994176,
          "lockCount": 1,
          "peakRssMetric": "linux-proc-VmHWM",
          "startupPeakRssBytes": 67055616,
          "loadedPeakRssBytes": 67956736,
          "resourceUsageMaxRssBytes": 84721664,
          "startupResourceUsageMaxRssBytes": 84721664,
          "resourceUsageLaunchFloorDetected": true
        },
        "baseline": {
          "peakRssBytes": 71983104,
          "startupRssBytes": 65404928,
          "loadedRssBytes": 67502080,
          "lockCount": 1,
          "peakRssMetric": "linux-proc-VmHWM",
          "startupPeakRssBytes": 66428928,
          "loadedPeakRssBytes": 68198400,
          "resourceUsageMaxRssBytes": 84721664,
          "startupResourceUsageMaxRssBytes": 84721664,
          "resourceUsageLaunchFloorDetected": true
        },
        "originalBfs": {
          "peakRssBytes": 83914752,
          "startupRssBytes": 65208320,
          "loadedRssBytes": 67436544,
          "lockCount": 1,
          "peakRssMetric": "linux-proc-VmHWM",
          "startupPeakRssBytes": 66514944,
          "loadedPeakRssBytes": 68112384,
          "resourceUsageMaxRssBytes": 84721664,
          "startupResourceUsageMaxRssBytes": 84721664,
          "resourceUsageLaunchFloorDetected": true
        },
        "upstream": {
          "peakRssBytes": 123584512,
          "startupRssBytes": 65044480,
          "loadedRssBytes": 68190208,
          "lockCount": 1,
          "peakRssMetric": "linux-proc-VmHWM",
          "startupPeakRssBytes": 66375680,
          "loadedPeakRssBytes": 69156864,
          "resourceUsageMaxRssBytes": 122744832,
          "startupResourceUsageMaxRssBytes": 84721664,
          "resourceUsageLaunchFloorDetected": true
        }
      },
      "repetitions": 1,
      "verdict": "inconclusive",
      "reason": "Single isolated per-lock observation; environmental variation is not estimated per lock."
    },
    {
      "id": "arto-room-door",
      "solvers": {
        "candidate": {
          "peakRssBytes": 71913472,
          "startupRssBytes": 65241088,
          "loadedRssBytes": 66551808,
          "lockCount": 1,
          "peakRssMetric": "linux-proc-VmHWM",
          "startupPeakRssBytes": 66400256,
          "loadedPeakRssBytes": 67444736,
          "resourceUsageMaxRssBytes": 84721664,
          "startupResourceUsageMaxRssBytes": 84721664,
          "resourceUsageLaunchFloorDetected": true
        },
        "baseline": {
          "peakRssBytes": 70885376,
          "startupRssBytes": 65437696,
          "loadedRssBytes": 67272704,
          "lockCount": 1,
          "peakRssMetric": "linux-proc-VmHWM",
          "startupPeakRssBytes": 66719744,
          "loadedPeakRssBytes": 67952640,
          "resourceUsageMaxRssBytes": 84721664,
          "startupResourceUsageMaxRssBytes": 84721664,
          "resourceUsageLaunchFloorDetected": true
        },
        "originalBfs": {
          "peakRssBytes": 78823424,
          "startupRssBytes": 65675264,
          "loadedRssBytes": 67248128,
          "lockCount": 1,
          "peakRssMetric": "linux-proc-VmHWM",
          "startupPeakRssBytes": 67026944,
          "loadedPeakRssBytes": 68091904,
          "resourceUsageMaxRssBytes": 84721664,
          "startupResourceUsageMaxRssBytes": 84721664,
          "resourceUsageLaunchFloorDetected": true
        },
        "upstream": {
          "peakRssBytes": 74354688,
          "startupRssBytes": 65679360,
          "loadedRssBytes": 68038656,
          "lockCount": 1,
          "peakRssMetric": "linux-proc-VmHWM",
          "startupPeakRssBytes": 66564096,
          "loadedPeakRssBytes": 68825088,
          "resourceUsageMaxRssBytes": 84721664,
          "startupResourceUsageMaxRssBytes": 84721664,
          "resourceUsageLaunchFloorDetected": true
        }
      },
      "repetitions": 1,
      "verdict": "inconclusive",
      "reason": "Single isolated per-lock observation; environmental variation is not estimated per lock."
    },
    {
      "id": "arto-far-bed-chest",
      "solvers": {
        "candidate": {
          "peakRssBytes": 72302592,
          "startupRssBytes": 65015808,
          "loadedRssBytes": 66326528,
          "lockCount": 1,
          "peakRssMetric": "linux-proc-VmHWM",
          "startupPeakRssBytes": 66314240,
          "loadedPeakRssBytes": 67268608,
          "resourceUsageMaxRssBytes": 84721664,
          "startupResourceUsageMaxRssBytes": 84721664,
          "resourceUsageLaunchFloorDetected": true
        },
        "baseline": {
          "peakRssBytes": 71376896,
          "startupRssBytes": 65216512,
          "loadedRssBytes": 67575808,
          "lockCount": 1,
          "peakRssMetric": "linux-proc-VmHWM",
          "startupPeakRssBytes": 66478080,
          "loadedPeakRssBytes": 68255744,
          "resourceUsageMaxRssBytes": 84721664,
          "startupResourceUsageMaxRssBytes": 84721664,
          "resourceUsageLaunchFloorDetected": true
        },
        "originalBfs": {
          "peakRssBytes": 78929920,
          "startupRssBytes": 65646592,
          "loadedRssBytes": 67219456,
          "lockCount": 1,
          "peakRssMetric": "linux-proc-VmHWM",
          "startupPeakRssBytes": 66936832,
          "loadedPeakRssBytes": 68046848,
          "resourceUsageMaxRssBytes": 84721664,
          "startupResourceUsageMaxRssBytes": 84721664,
          "resourceUsageLaunchFloorDetected": true
        },
        "upstream": {
          "peakRssBytes": 74788864,
          "startupRssBytes": 65531904,
          "loadedRssBytes": 68546560,
          "lockCount": 1,
          "peakRssMetric": "linux-proc-VmHWM",
          "startupPeakRssBytes": 66867200,
          "loadedPeakRssBytes": 69308416,
          "resourceUsageMaxRssBytes": 84721664,
          "startupResourceUsageMaxRssBytes": 84721664,
          "resourceUsageLaunchFloorDetected": true
        }
      },
      "repetitions": 1,
      "verdict": "inconclusive",
      "reason": "Single isolated per-lock observation; environmental variation is not estimated per lock."
    },
    {
      "id": "arto-near-bed-chest",
      "solvers": {
        "candidate": {
          "peakRssBytes": 73064448,
          "startupRssBytes": 64270336,
          "loadedRssBytes": 65974272,
          "lockCount": 1,
          "peakRssMetric": "linux-proc-VmHWM",
          "startupPeakRssBytes": 65445888,
          "loadedPeakRssBytes": 66961408,
          "resourceUsageMaxRssBytes": 84721664,
          "startupResourceUsageMaxRssBytes": 84721664,
          "resourceUsageLaunchFloorDetected": true
        },
        "baseline": {
          "peakRssBytes": 71794688,
          "startupRssBytes": 64516096,
          "loadedRssBytes": 66088960,
          "lockCount": 1,
          "peakRssMetric": "linux-proc-VmHWM",
          "startupPeakRssBytes": 65302528,
          "loadedPeakRssBytes": 66691072,
          "resourceUsageMaxRssBytes": 84721664,
          "startupResourceUsageMaxRssBytes": 84721664,
          "resourceUsageLaunchFloorDetected": true
        },
        "originalBfs": {
          "peakRssBytes": 78839808,
          "startupRssBytes": 65679360,
          "loadedRssBytes": 67383296,
          "lockCount": 1,
          "peakRssMetric": "linux-proc-VmHWM",
          "startupPeakRssBytes": 66977792,
          "loadedPeakRssBytes": 68071424,
          "resourceUsageMaxRssBytes": 84721664,
          "startupResourceUsageMaxRssBytes": 84721664,
          "resourceUsageLaunchFloorDetected": true
        },
        "upstream": {
          "peakRssBytes": 110370816,
          "startupRssBytes": 64880640,
          "loadedRssBytes": 68419584,
          "lockCount": 1,
          "peakRssMetric": "linux-proc-VmHWM",
          "startupPeakRssBytes": 66088960,
          "loadedPeakRssBytes": 69353472,
          "resourceUsageMaxRssBytes": 109670400,
          "startupResourceUsageMaxRssBytes": 84721664,
          "resourceUsageLaunchFloorDetected": true
        }
      },
      "repetitions": 1,
      "verdict": "inconclusive",
      "reason": "Single isolated per-lock observation; environmental variation is not estimated per lock."
    },
    {
      "id": "gomez-bedrooms-door",
      "solvers": {
        "candidate": {
          "peakRssBytes": 79302656,
          "startupRssBytes": 65355776,
          "loadedRssBytes": 66928640,
          "lockCount": 1,
          "peakRssMetric": "linux-proc-VmHWM",
          "startupPeakRssBytes": 66699264,
          "loadedPeakRssBytes": 67833856,
          "resourceUsageMaxRssBytes": 84721664,
          "startupResourceUsageMaxRssBytes": 84721664,
          "resourceUsageLaunchFloorDetected": true
        },
        "baseline": {
          "peakRssBytes": 78962688,
          "startupRssBytes": 65097728,
          "loadedRssBytes": 67325952,
          "lockCount": 1,
          "peakRssMetric": "linux-proc-VmHWM",
          "startupPeakRssBytes": 66465792,
          "loadedPeakRssBytes": 68202496,
          "resourceUsageMaxRssBytes": 84721664,
          "startupResourceUsageMaxRssBytes": 84721664,
          "resourceUsageLaunchFloorDetected": true
        },
        "originalBfs": {
          "peakRssBytes": 79081472,
          "startupRssBytes": 64839680,
          "loadedRssBytes": 67067904,
          "lockCount": 1,
          "peakRssMetric": "linux-proc-VmHWM",
          "startupPeakRssBytes": 65900544,
          "loadedPeakRssBytes": 67969024,
          "resourceUsageMaxRssBytes": 84721664,
          "startupResourceUsageMaxRssBytes": 84721664,
          "resourceUsageLaunchFloorDetected": true
        },
        "upstream": {
          "peakRssBytes": 84283392,
          "startupRssBytes": 64897024,
          "loadedRssBytes": 68698112,
          "lockCount": 1,
          "peakRssMetric": "linux-proc-VmHWM",
          "startupPeakRssBytes": 65888256,
          "loadedPeakRssBytes": 69361664,
          "resourceUsageMaxRssBytes": 84721664,
          "startupResourceUsageMaxRssBytes": 84721664,
          "resourceUsageLaunchFloorDetected": true
        }
      },
      "repetitions": 1,
      "verdict": "inconclusive",
      "reason": "Single isolated per-lock observation; environmental variation is not estimated per lock."
    },
    {
      "id": "gomez-bedrooms-far-chest",
      "solvers": {
        "candidate": {
          "peakRssBytes": 75325440,
          "startupRssBytes": 65163264,
          "loadedRssBytes": 66867200,
          "lockCount": 1,
          "peakRssMetric": "linux-proc-VmHWM",
          "startupPeakRssBytes": 66473984,
          "loadedPeakRssBytes": 67735552,
          "resourceUsageMaxRssBytes": 84721664,
          "startupResourceUsageMaxRssBytes": 84721664,
          "resourceUsageLaunchFloorDetected": true
        },
        "baseline": {
          "peakRssBytes": 73637888,
          "startupRssBytes": 65191936,
          "loadedRssBytes": 67420160,
          "lockCount": 1,
          "peakRssMetric": "linux-proc-VmHWM",
          "startupPeakRssBytes": 66863104,
          "loadedPeakRssBytes": 68190208,
          "resourceUsageMaxRssBytes": 84721664,
          "startupResourceUsageMaxRssBytes": 84721664,
          "resourceUsageLaunchFloorDetected": true
        },
        "originalBfs": {
          "peakRssBytes": 79294464,
          "startupRssBytes": 67203072,
          "loadedRssBytes": 67596288,
          "lockCount": 1,
          "peakRssMetric": "linux-proc-VmHWM",
          "startupPeakRssBytes": 67887104,
          "loadedPeakRssBytes": 68239360,
          "resourceUsageMaxRssBytes": 84721664,
          "startupResourceUsageMaxRssBytes": 84721664,
          "resourceUsageLaunchFloorDetected": true
        },
        "upstream": {
          "peakRssBytes": 75583488,
          "startupRssBytes": 65593344,
          "loadedRssBytes": 68476928,
          "lockCount": 1,
          "peakRssMetric": "linux-proc-VmHWM",
          "startupPeakRssBytes": 66969600,
          "loadedPeakRssBytes": 69156864,
          "resourceUsageMaxRssBytes": 84721664,
          "startupResourceUsageMaxRssBytes": 84721664,
          "resourceUsageLaunchFloorDetected": true
        }
      },
      "repetitions": 1,
      "verdict": "inconclusive",
      "reason": "Single isolated per-lock observation; environmental variation is not estimated per lock."
    },
    {
      "id": "gomez-bedrooms-near-chest",
      "solvers": {
        "candidate": {
          "peakRssBytes": 71790592,
          "startupRssBytes": 64991232,
          "loadedRssBytes": 66301952,
          "lockCount": 1,
          "peakRssMetric": "linux-proc-VmHWM",
          "startupPeakRssBytes": 65740800,
          "loadedPeakRssBytes": 67002368,
          "resourceUsageMaxRssBytes": 84721664,
          "startupResourceUsageMaxRssBytes": 84721664,
          "resourceUsageLaunchFloorDetected": true
        },
        "baseline": {
          "peakRssBytes": 71270400,
          "startupRssBytes": 64344064,
          "loadedRssBytes": 67489792,
          "lockCount": 1,
          "peakRssMetric": "linux-proc-VmHWM",
          "startupPeakRssBytes": 65359872,
          "loadedPeakRssBytes": 68161536,
          "resourceUsageMaxRssBytes": 84721664,
          "startupResourceUsageMaxRssBytes": 84721664,
          "resourceUsageLaunchFloorDetected": true
        },
        "originalBfs": {
          "peakRssBytes": 79159296,
          "startupRssBytes": 64802816,
          "loadedRssBytes": 67293184,
          "lockCount": 1,
          "peakRssMetric": "linux-proc-VmHWM",
          "startupPeakRssBytes": 66056192,
          "loadedPeakRssBytes": 68067328,
          "resourceUsageMaxRssBytes": 84721664,
          "startupResourceUsageMaxRssBytes": 84721664,
          "resourceUsageLaunchFloorDetected": true
        },
        "upstream": {
          "peakRssBytes": 85274624,
          "startupRssBytes": 65421312,
          "loadedRssBytes": 68435968,
          "lockCount": 1,
          "peakRssMetric": "linux-proc-VmHWM",
          "startupPeakRssBytes": 66600960,
          "loadedPeakRssBytes": 69005312,
          "resourceUsageMaxRssBytes": 84721664,
          "startupResourceUsageMaxRssBytes": 84721664,
          "resourceUsageLaunchFloorDetected": true
        }
      },
      "repetitions": 1,
      "verdict": "inconclusive",
      "reason": "Single isolated per-lock observation; environmental variation is not estimated per lock."
    },
    {
      "id": "raven-tower-left-chest",
      "solvers": {
        "candidate": {
          "peakRssBytes": 75079680,
          "startupRssBytes": 65523712,
          "loadedRssBytes": 66965504,
          "lockCount": 1,
          "peakRssMetric": "linux-proc-VmHWM",
          "startupPeakRssBytes": 66568192,
          "loadedPeakRssBytes": 67747840,
          "resourceUsageMaxRssBytes": 84721664,
          "startupResourceUsageMaxRssBytes": 84721664,
          "resourceUsageLaunchFloorDetected": true
        },
        "baseline": {
          "peakRssBytes": 73498624,
          "startupRssBytes": 65802240,
          "loadedRssBytes": 67244032,
          "lockCount": 1,
          "peakRssMetric": "linux-proc-VmHWM",
          "startupPeakRssBytes": 66772992,
          "loadedPeakRssBytes": 67981312,
          "resourceUsageMaxRssBytes": 84721664,
          "startupResourceUsageMaxRssBytes": 84721664,
          "resourceUsageLaunchFloorDetected": true
        },
        "originalBfs": {
          "peakRssBytes": 79056896,
          "startupRssBytes": 64958464,
          "loadedRssBytes": 67186688,
          "lockCount": 1,
          "peakRssMetric": "linux-proc-VmHWM",
          "startupPeakRssBytes": 65679360,
          "loadedPeakRssBytes": 68022272,
          "resourceUsageMaxRssBytes": 84721664,
          "startupResourceUsageMaxRssBytes": 84721664,
          "resourceUsageLaunchFloorDetected": true
        },
        "upstream": {
          "peakRssBytes": 92065792,
          "startupRssBytes": 64827392,
          "loadedRssBytes": 68497408,
          "lockCount": 1,
          "peakRssMetric": "linux-proc-VmHWM",
          "startupPeakRssBytes": 66138112,
          "loadedPeakRssBytes": 69206016,
          "resourceUsageMaxRssBytes": 91205632,
          "startupResourceUsageMaxRssBytes": 84721664,
          "resourceUsageLaunchFloorDetected": true
        }
      },
      "repetitions": 1,
      "verdict": "inconclusive",
      "reason": "Single isolated per-lock observation; environmental variation is not estimated per lock."
    },
    {
      "id": "raven-tower-right-chest",
      "solvers": {
        "candidate": {
          "peakRssBytes": 72089600,
          "startupRssBytes": 65638400,
          "loadedRssBytes": 67211264,
          "lockCount": 1,
          "peakRssMetric": "linux-proc-VmHWM",
          "startupPeakRssBytes": 67026944,
          "loadedPeakRssBytes": 67960832,
          "resourceUsageMaxRssBytes": 84721664,
          "startupResourceUsageMaxRssBytes": 84721664,
          "resourceUsageLaunchFloorDetected": true
        },
        "baseline": {
          "peakRssBytes": 72290304,
          "startupRssBytes": 66674688,
          "loadedRssBytes": 67592192,
          "lockCount": 1,
          "peakRssMetric": "linux-proc-VmHWM",
          "startupPeakRssBytes": 67465216,
          "loadedPeakRssBytes": 68386816,
          "resourceUsageMaxRssBytes": 84721664,
          "startupResourceUsageMaxRssBytes": 84721664,
          "resourceUsageLaunchFloorDetected": true
        },
        "originalBfs": {
          "peakRssBytes": 79151104,
          "startupRssBytes": 64765952,
          "loadedRssBytes": 67256320,
          "lockCount": 1,
          "peakRssMetric": "linux-proc-VmHWM",
          "startupPeakRssBytes": 65757184,
          "loadedPeakRssBytes": 68038656,
          "resourceUsageMaxRssBytes": 84721664,
          "startupResourceUsageMaxRssBytes": 84721664,
          "resourceUsageLaunchFloorDetected": true
        },
        "upstream": {
          "peakRssBytes": 76038144,
          "startupRssBytes": 65339392,
          "loadedRssBytes": 68354048,
          "lockCount": 1,
          "peakRssMetric": "linux-proc-VmHWM",
          "startupPeakRssBytes": 66514944,
          "loadedPeakRssBytes": 69271552,
          "resourceUsageMaxRssBytes": 84721664,
          "startupResourceUsageMaxRssBytes": 84721664,
          "resourceUsageLaunchFloorDetected": true
        }
      },
      "repetitions": 1,
      "verdict": "inconclusive",
      "reason": "Single isolated per-lock observation; environmental variation is not estimated per lock."
    },
    {
      "id": "raven-tower-floor2-stairs-chest",
      "solvers": {
        "candidate": {
          "peakRssBytes": 78045184,
          "startupRssBytes": 64905216,
          "loadedRssBytes": 66740224,
          "lockCount": 1,
          "peakRssMetric": "linux-proc-VmHWM",
          "startupPeakRssBytes": 66195456,
          "loadedPeakRssBytes": 67358720,
          "resourceUsageMaxRssBytes": 84721664,
          "startupResourceUsageMaxRssBytes": 84721664,
          "resourceUsageLaunchFloorDetected": true
        },
        "baseline": {
          "peakRssBytes": 75186176,
          "startupRssBytes": 64901120,
          "loadedRssBytes": 67260416,
          "lockCount": 1,
          "peakRssMetric": "linux-proc-VmHWM",
          "startupPeakRssBytes": 66289664,
          "loadedPeakRssBytes": 68206592,
          "resourceUsageMaxRssBytes": 84721664,
          "startupResourceUsageMaxRssBytes": 84721664,
          "resourceUsageLaunchFloorDetected": true
        },
        "originalBfs": {
          "peakRssBytes": 78721024,
          "startupRssBytes": 64835584,
          "loadedRssBytes": 67063808,
          "lockCount": 1,
          "peakRssMetric": "linux-proc-VmHWM",
          "startupPeakRssBytes": 66416640,
          "loadedPeakRssBytes": 67735552,
          "resourceUsageMaxRssBytes": 84721664,
          "startupResourceUsageMaxRssBytes": 84721664,
          "resourceUsageLaunchFloorDetected": true
        },
        "upstream": {
          "peakRssBytes": 93245440,
          "startupRssBytes": 65855488,
          "loadedRssBytes": 68476928,
          "lockCount": 1,
          "peakRssMetric": "linux-proc-VmHWM",
          "startupPeakRssBytes": 66990080,
          "loadedPeakRssBytes": 69308416,
          "resourceUsageMaxRssBytes": 92598272,
          "startupResourceUsageMaxRssBytes": 84721664,
          "resourceUsageLaunchFloorDetected": true
        }
      },
      "repetitions": 1,
      "verdict": "inconclusive",
      "reason": "Single isolated per-lock observation; environmental variation is not estimated per lock."
    },
    {
      "id": "raven-tower-floor2-chest-2",
      "solvers": {
        "candidate": {
          "peakRssBytes": 72044544,
          "startupRssBytes": 65884160,
          "loadedRssBytes": 67063808,
          "lockCount": 1,
          "peakRssMetric": "linux-proc-VmHWM",
          "startupPeakRssBytes": 67031040,
          "loadedPeakRssBytes": 67891200,
          "resourceUsageMaxRssBytes": 84721664,
          "startupResourceUsageMaxRssBytes": 84721664,
          "resourceUsageLaunchFloorDetected": true
        },
        "baseline": {
          "peakRssBytes": 72298496,
          "startupRssBytes": 65290240,
          "loadedRssBytes": 67256320,
          "lockCount": 1,
          "peakRssMetric": "linux-proc-VmHWM",
          "startupPeakRssBytes": 66572288,
          "loadedPeakRssBytes": 68222976,
          "resourceUsageMaxRssBytes": 84721664,
          "startupResourceUsageMaxRssBytes": 84721664,
          "resourceUsageLaunchFloorDetected": true
        },
        "originalBfs": {
          "peakRssBytes": 78888960,
          "startupRssBytes": 65081344,
          "loadedRssBytes": 67178496,
          "lockCount": 1,
          "peakRssMetric": "linux-proc-VmHWM",
          "startupPeakRssBytes": 66191360,
          "loadedPeakRssBytes": 68038656,
          "resourceUsageMaxRssBytes": 84721664,
          "startupResourceUsageMaxRssBytes": 84721664,
          "resourceUsageLaunchFloorDetected": true
        },
        "upstream": {
          "peakRssBytes": 74493952,
          "startupRssBytes": 64372736,
          "loadedRssBytes": 68567040,
          "lockCount": 1,
          "peakRssMetric": "linux-proc-VmHWM",
          "startupPeakRssBytes": 65331200,
          "loadedPeakRssBytes": 69373952,
          "resourceUsageMaxRssBytes": 84721664,
          "startupResourceUsageMaxRssBytes": 84721664,
          "resourceUsageLaunchFloorDetected": true
        }
      },
      "repetitions": 1,
      "verdict": "inconclusive",
      "reason": "Single isolated per-lock observation; environmental variation is not estimated per lock."
    },
    {
      "id": "raven-tower-floor3-entrance-chest",
      "solvers": {
        "candidate": {
          "peakRssBytes": 73695232,
          "startupRssBytes": 65236992,
          "loadedRssBytes": 66547712,
          "lockCount": 1,
          "peakRssMetric": "linux-proc-VmHWM",
          "startupPeakRssBytes": 66519040,
          "loadedPeakRssBytes": 67457024,
          "resourceUsageMaxRssBytes": 84721664,
          "startupResourceUsageMaxRssBytes": 84721664,
          "resourceUsageLaunchFloorDetected": true
        },
        "baseline": {
          "peakRssBytes": 73441280,
          "startupRssBytes": 65343488,
          "loadedRssBytes": 67702784,
          "lockCount": 1,
          "peakRssMetric": "linux-proc-VmHWM",
          "startupPeakRssBytes": 66543616,
          "loadedPeakRssBytes": 68182016,
          "resourceUsageMaxRssBytes": 84721664,
          "startupResourceUsageMaxRssBytes": 84721664,
          "resourceUsageLaunchFloorDetected": true
        },
        "originalBfs": {
          "peakRssBytes": 78643200,
          "startupRssBytes": 65867776,
          "loadedRssBytes": 67047424,
          "lockCount": 1,
          "peakRssMetric": "linux-proc-VmHWM",
          "startupPeakRssBytes": 66863104,
          "loadedPeakRssBytes": 67829760,
          "resourceUsageMaxRssBytes": 84721664,
          "startupResourceUsageMaxRssBytes": 84721664,
          "resourceUsageLaunchFloorDetected": true
        },
        "upstream": {
          "peakRssBytes": 76640256,
          "startupRssBytes": 65904640,
          "loadedRssBytes": 68657152,
          "lockCount": 1,
          "peakRssMetric": "linux-proc-VmHWM",
          "startupPeakRssBytes": 66973696,
          "loadedPeakRssBytes": 69349376,
          "resourceUsageMaxRssBytes": 84721664,
          "startupResourceUsageMaxRssBytes": 84721664,
          "resourceUsageLaunchFloorDetected": true
        }
      },
      "repetitions": 1,
      "verdict": "inconclusive",
      "reason": "Single isolated per-lock observation; environmental variation is not estimated per lock."
    },
    {
      "id": "raven-tower-floor3-empty-chest",
      "solvers": {
        "candidate": {
          "peakRssBytes": 71852032,
          "startupRssBytes": 66080768,
          "loadedRssBytes": 66998272,
          "lockCount": 1,
          "peakRssMetric": "linux-proc-VmHWM",
          "startupPeakRssBytes": 67137536,
          "loadedPeakRssBytes": 67940352,
          "resourceUsageMaxRssBytes": 84721664,
          "startupResourceUsageMaxRssBytes": 84721664,
          "resourceUsageLaunchFloorDetected": true
        },
        "baseline": {
          "peakRssBytes": 71245824,
          "startupRssBytes": 65163264,
          "loadedRssBytes": 67260416,
          "lockCount": 1,
          "peakRssMetric": "linux-proc-VmHWM",
          "startupPeakRssBytes": 66428928,
          "loadedPeakRssBytes": 68218880,
          "resourceUsageMaxRssBytes": 84721664,
          "startupResourceUsageMaxRssBytes": 84721664,
          "resourceUsageLaunchFloorDetected": true
        },
        "originalBfs": {
          "peakRssBytes": 78536704,
          "startupRssBytes": 65486848,
          "loadedRssBytes": 66928640,
          "lockCount": 1,
          "peakRssMetric": "linux-proc-VmHWM",
          "startupPeakRssBytes": 66781184,
          "loadedPeakRssBytes": 67825664,
          "resourceUsageMaxRssBytes": 84721664,
          "startupResourceUsageMaxRssBytes": 84721664,
          "resourceUsageLaunchFloorDetected": true
        },
        "upstream": {
          "peakRssBytes": 75935744,
          "startupRssBytes": 64512000,
          "loadedRssBytes": 68575232,
          "lockCount": 1,
          "peakRssMetric": "linux-proc-VmHWM",
          "startupPeakRssBytes": 65622016,
          "loadedPeakRssBytes": 69304320,
          "resourceUsageMaxRssBytes": 84721664,
          "startupResourceUsageMaxRssBytes": 84721664,
          "resourceUsageLaunchFloorDetected": true
        }
      },
      "repetitions": 1,
      "verdict": "inconclusive",
      "reason": "Single isolated per-lock observation; environmental variation is not estimated per lock."
    },
    {
      "id": "raven-tower-floor4-elixirs-chest",
      "solvers": {
        "candidate": {
          "peakRssBytes": 72155136,
          "startupRssBytes": 64491520,
          "loadedRssBytes": 66719744,
          "lockCount": 1,
          "peakRssMetric": "linux-proc-VmHWM",
          "startupPeakRssBytes": 65703936,
          "loadedPeakRssBytes": 67670016,
          "resourceUsageMaxRssBytes": 84721664,
          "startupResourceUsageMaxRssBytes": 84721664,
          "resourceUsageLaunchFloorDetected": true
        },
        "baseline": {
          "peakRssBytes": 71299072,
          "startupRssBytes": 65552384,
          "loadedRssBytes": 67387392,
          "lockCount": 1,
          "peakRssMetric": "linux-proc-VmHWM",
          "startupPeakRssBytes": 66998272,
          "loadedPeakRssBytes": 68268032,
          "resourceUsageMaxRssBytes": 84721664,
          "startupResourceUsageMaxRssBytes": 84721664,
          "resourceUsageLaunchFloorDetected": true
        },
        "originalBfs": {
          "peakRssBytes": 82427904,
          "startupRssBytes": 65687552,
          "loadedRssBytes": 66736128,
          "lockCount": 1,
          "peakRssMetric": "linux-proc-VmHWM",
          "startupPeakRssBytes": 66732032,
          "loadedPeakRssBytes": 67620864,
          "resourceUsageMaxRssBytes": 84721664,
          "startupResourceUsageMaxRssBytes": 84721664,
          "resourceUsageLaunchFloorDetected": true
        },
        "upstream": {
          "peakRssBytes": 78761984,
          "startupRssBytes": 65454080,
          "loadedRssBytes": 68730880,
          "lockCount": 1,
          "peakRssMetric": "linux-proc-VmHWM",
          "startupPeakRssBytes": 66600960,
          "loadedPeakRssBytes": 69373952,
          "resourceUsageMaxRssBytes": 84721664,
          "startupResourceUsageMaxRssBytes": 84721664,
          "resourceUsageLaunchFloorDetected": true
        }
      },
      "repetitions": 1,
      "verdict": "inconclusive",
      "reason": "Single isolated per-lock observation; environmental variation is not estimated per lock."
    },
    {
      "id": "raven-tower-floor4-food-chest",
      "solvers": {
        "candidate": {
          "peakRssBytes": 72327168,
          "startupRssBytes": 64372736,
          "loadedRssBytes": 65421312,
          "lockCount": 1,
          "peakRssMetric": "linux-proc-VmHWM",
          "startupPeakRssBytes": 65400832,
          "loadedPeakRssBytes": 66535424,
          "resourceUsageMaxRssBytes": 84721664,
          "startupResourceUsageMaxRssBytes": 84721664,
          "resourceUsageLaunchFloorDetected": true
        },
        "baseline": {
          "peakRssBytes": 71421952,
          "startupRssBytes": 65310720,
          "loadedRssBytes": 67407872,
          "lockCount": 1,
          "peakRssMetric": "linux-proc-VmHWM",
          "startupPeakRssBytes": 66527232,
          "loadedPeakRssBytes": 68280320,
          "resourceUsageMaxRssBytes": 84721664,
          "startupResourceUsageMaxRssBytes": 84721664,
          "resourceUsageLaunchFloorDetected": true
        },
        "originalBfs": {
          "peakRssBytes": 79224832,
          "startupRssBytes": 65339392,
          "loadedRssBytes": 67174400,
          "lockCount": 1,
          "peakRssMetric": "linux-proc-VmHWM",
          "startupPeakRssBytes": 66560000,
          "loadedPeakRssBytes": 68120576,
          "resourceUsageMaxRssBytes": 84721664,
          "startupResourceUsageMaxRssBytes": 84721664,
          "resourceUsageLaunchFloorDetected": true
        },
        "upstream": {
          "peakRssBytes": 93716480,
          "startupRssBytes": 65572864,
          "loadedRssBytes": 67801088,
          "lockCount": 1,
          "peakRssMetric": "linux-proc-VmHWM",
          "startupPeakRssBytes": 66535424,
          "loadedPeakRssBytes": 68571136,
          "resourceUsageMaxRssBytes": 93716480,
          "startupResourceUsageMaxRssBytes": 84721664,
          "resourceUsageLaunchFloorDetected": true
        }
      },
      "repetitions": 1,
      "verdict": "inconclusive",
      "reason": "Single isolated per-lock observation; environmental variation is not estimated per lock."
    },
    {
      "id": "raven-tower-top-chest",
      "solvers": {
        "candidate": {
          "peakRssBytes": 79269888,
          "startupRssBytes": 66072576,
          "loadedRssBytes": 67121152,
          "lockCount": 1,
          "peakRssMetric": "linux-proc-VmHWM",
          "startupPeakRssBytes": 67076096,
          "loadedPeakRssBytes": 67948544,
          "resourceUsageMaxRssBytes": 84721664,
          "startupResourceUsageMaxRssBytes": 84721664,
          "resourceUsageLaunchFloorDetected": true
        },
        "baseline": {
          "peakRssBytes": 76902400,
          "startupRssBytes": 65351680,
          "loadedRssBytes": 67710976,
          "lockCount": 1,
          "peakRssMetric": "linux-proc-VmHWM",
          "startupPeakRssBytes": 66949120,
          "loadedPeakRssBytes": 68268032,
          "resourceUsageMaxRssBytes": 84721664,
          "startupResourceUsageMaxRssBytes": 84721664,
          "resourceUsageLaunchFloorDetected": true
        },
        "originalBfs": {
          "peakRssBytes": 78548992,
          "startupRssBytes": 65146880,
          "loadedRssBytes": 66981888,
          "lockCount": 1,
          "peakRssMetric": "linux-proc-VmHWM",
          "startupPeakRssBytes": 66613248,
          "loadedPeakRssBytes": 67817472,
          "resourceUsageMaxRssBytes": 84721664,
          "startupResourceUsageMaxRssBytes": 84721664,
          "resourceUsageLaunchFloorDetected": true
        },
        "upstream": {
          "peakRssBytes": 86102016,
          "startupRssBytes": 65794048,
          "loadedRssBytes": 68546560,
          "lockCount": 1,
          "peakRssMetric": "linux-proc-VmHWM",
          "startupPeakRssBytes": 66965504,
          "loadedPeakRssBytes": 69246976,
          "resourceUsageMaxRssBytes": 85250048,
          "startupResourceUsageMaxRssBytes": 84721664,
          "resourceUsageLaunchFloorDetected": true
        }
      },
      "repetitions": 1,
      "verdict": "inconclusive",
      "reason": "Single isolated per-lock observation; environmental variation is not estimated per lock."
    },
    {
      "id": "fire-lizard-cave-chest",
      "solvers": {
        "candidate": {
          "peakRssBytes": 71999488,
          "startupRssBytes": 65421312,
          "loadedRssBytes": 67125248,
          "lockCount": 1,
          "peakRssMetric": "linux-proc-VmHWM",
          "startupPeakRssBytes": 66793472,
          "loadedPeakRssBytes": 67944448,
          "resourceUsageMaxRssBytes": 84721664,
          "startupResourceUsageMaxRssBytes": 84721664,
          "resourceUsageLaunchFloorDetected": true
        },
        "baseline": {
          "peakRssBytes": 71417856,
          "startupRssBytes": 64843776,
          "loadedRssBytes": 67334144,
          "lockCount": 1,
          "peakRssMetric": "linux-proc-VmHWM",
          "startupPeakRssBytes": 66064384,
          "loadedPeakRssBytes": 68235264,
          "resourceUsageMaxRssBytes": 84721664,
          "startupResourceUsageMaxRssBytes": 84721664,
          "resourceUsageLaunchFloorDetected": true
        },
        "originalBfs": {
          "peakRssBytes": 79163392,
          "startupRssBytes": 65540096,
          "loadedRssBytes": 66850816,
          "lockCount": 1,
          "peakRssMetric": "linux-proc-VmHWM",
          "startupPeakRssBytes": 66707456,
          "loadedPeakRssBytes": 67694592,
          "resourceUsageMaxRssBytes": 84721664,
          "startupResourceUsageMaxRssBytes": 84721664,
          "resourceUsageLaunchFloorDetected": true
        },
        "upstream": {
          "peakRssBytes": 94773248,
          "startupRssBytes": 65036288,
          "loadedRssBytes": 68706304,
          "lockCount": 1,
          "peakRssMetric": "linux-proc-VmHWM",
          "startupPeakRssBytes": 66277376,
          "loadedPeakRssBytes": 69341184,
          "resourceUsageMaxRssBytes": 94773248,
          "startupResourceUsageMaxRssBytes": 84721664,
          "resourceUsageLaunchFloorDetected": true
        }
      },
      "repetitions": 1,
      "verdict": "inconclusive",
      "reason": "Single isolated per-lock observation; environmental variation is not estimated per lock."
    },
    {
      "id": "silas-tavern-basement-chest",
      "solvers": {
        "candidate": {
          "peakRssBytes": 72122368,
          "startupRssBytes": 64565248,
          "loadedRssBytes": 66269184,
          "lockCount": 1,
          "peakRssMetric": "linux-proc-VmHWM",
          "startupPeakRssBytes": 65400832,
          "loadedPeakRssBytes": 66957312,
          "resourceUsageMaxRssBytes": 84721664,
          "startupResourceUsageMaxRssBytes": 84721664,
          "resourceUsageLaunchFloorDetected": true
        },
        "baseline": {
          "peakRssBytes": 71405568,
          "startupRssBytes": 65630208,
          "loadedRssBytes": 67727360,
          "lockCount": 1,
          "peakRssMetric": "linux-proc-VmHWM",
          "startupPeakRssBytes": 66318336,
          "loadedPeakRssBytes": 68210688,
          "resourceUsageMaxRssBytes": 84721664,
          "startupResourceUsageMaxRssBytes": 84721664,
          "resourceUsageLaunchFloorDetected": true
        },
        "originalBfs": {
          "peakRssBytes": 78974976,
          "startupRssBytes": 65765376,
          "loadedRssBytes": 67600384,
          "lockCount": 1,
          "peakRssMetric": "linux-proc-VmHWM",
          "startupPeakRssBytes": 67031040,
          "loadedPeakRssBytes": 68091904,
          "resourceUsageMaxRssBytes": 84721664,
          "startupResourceUsageMaxRssBytes": 84721664,
          "resourceUsageLaunchFloorDetected": true
        },
        "upstream": {
          "peakRssBytes": 74752000,
          "startupRssBytes": 65855488,
          "loadedRssBytes": 68476928,
          "lockCount": 1,
          "peakRssMetric": "linux-proc-VmHWM",
          "startupPeakRssBytes": 67010560,
          "loadedPeakRssBytes": 69316608,
          "resourceUsageMaxRssBytes": 84721664,
          "startupResourceUsageMaxRssBytes": 84721664,
          "resourceUsageLaunchFloorDetected": true
        }
      },
      "repetitions": 1,
      "verdict": "inconclusive",
      "reason": "Single isolated per-lock observation; environmental variation is not estimated per lock."
    },
    {
      "id": "silas-tavern-storeroom-chest",
      "solvers": {
        "candidate": {
          "peakRssBytes": 71946240,
          "startupRssBytes": 66117632,
          "loadedRssBytes": 67166208,
          "lockCount": 1,
          "peakRssMetric": "linux-proc-VmHWM",
          "startupPeakRssBytes": 67235840,
          "loadedPeakRssBytes": 67985408,
          "resourceUsageMaxRssBytes": 84721664,
          "startupResourceUsageMaxRssBytes": 84721664,
          "resourceUsageLaunchFloorDetected": true
        },
        "baseline": {
          "peakRssBytes": 71139328,
          "startupRssBytes": 65794048,
          "loadedRssBytes": 67760128,
          "lockCount": 1,
          "peakRssMetric": "linux-proc-VmHWM",
          "startupPeakRssBytes": 67022848,
          "loadedPeakRssBytes": 68370432,
          "resourceUsageMaxRssBytes": 84721664,
          "startupResourceUsageMaxRssBytes": 84721664,
          "resourceUsageLaunchFloorDetected": true
        },
        "originalBfs": {
          "peakRssBytes": 79196160,
          "startupRssBytes": 65155072,
          "loadedRssBytes": 67252224,
          "lockCount": 1,
          "peakRssMetric": "linux-proc-VmHWM",
          "startupPeakRssBytes": 66383872,
          "loadedPeakRssBytes": 68141056,
          "resourceUsageMaxRssBytes": 84721664,
          "startupResourceUsageMaxRssBytes": 84721664,
          "resourceUsageLaunchFloorDetected": true
        },
        "upstream": {
          "peakRssBytes": 78635008,
          "startupRssBytes": 64790528,
          "loadedRssBytes": 68329472,
          "lockCount": 1,
          "peakRssMetric": "linux-proc-VmHWM",
          "startupPeakRssBytes": 66011136,
          "loadedPeakRssBytes": 69222400,
          "resourceUsageMaxRssBytes": 84721664,
          "startupResourceUsageMaxRssBytes": 84721664,
          "resourceUsageLaunchFloorDetected": true
        }
      },
      "repetitions": 1,
      "verdict": "inconclusive",
      "reason": "Single isolated per-lock observation; environmental variation is not estimated per lock."
    },
    {
      "id": "silas-tavern-storeroom-door",
      "solvers": {
        "candidate": {
          "peakRssBytes": 72241152,
          "startupRssBytes": 64372736,
          "loadedRssBytes": 65290240,
          "lockCount": 1,
          "peakRssMetric": "linux-proc-VmHWM",
          "startupPeakRssBytes": 65490944,
          "loadedPeakRssBytes": 66146304,
          "resourceUsageMaxRssBytes": 84721664,
          "startupResourceUsageMaxRssBytes": 84721664,
          "resourceUsageLaunchFloorDetected": true
        },
        "baseline": {
          "peakRssBytes": 71512064,
          "startupRssBytes": 64557056,
          "loadedRssBytes": 67440640,
          "lockCount": 1,
          "peakRssMetric": "linux-proc-VmHWM",
          "startupPeakRssBytes": 65273856,
          "loadedPeakRssBytes": 68132864,
          "resourceUsageMaxRssBytes": 84721664,
          "startupResourceUsageMaxRssBytes": 84721664,
          "resourceUsageLaunchFloorDetected": true
        },
        "originalBfs": {
          "peakRssBytes": 78893056,
          "startupRssBytes": 65040384,
          "loadedRssBytes": 67399680,
          "lockCount": 1,
          "peakRssMetric": "linux-proc-VmHWM",
          "startupPeakRssBytes": 66592768,
          "loadedPeakRssBytes": 68124672,
          "resourceUsageMaxRssBytes": 84721664,
          "startupResourceUsageMaxRssBytes": 84721664,
          "resourceUsageLaunchFloorDetected": true
        },
        "upstream": {
          "peakRssBytes": 75194368,
          "startupRssBytes": 65142784,
          "loadedRssBytes": 68419584,
          "lockCount": 1,
          "peakRssMetric": "linux-proc-VmHWM",
          "startupPeakRssBytes": 66314240,
          "loadedPeakRssBytes": 69242880,
          "resourceUsageMaxRssBytes": 84721664,
          "startupResourceUsageMaxRssBytes": 84721664,
          "resourceUsageLaunchFloorDetected": true
        }
      },
      "repetitions": 1,
      "verdict": "inconclusive",
      "reason": "Single isolated per-lock observation; environmental variation is not estimated per lock."
    },
    {
      "id": "jan-pond-house-chest",
      "solvers": {
        "candidate": {
          "peakRssBytes": 71491584,
          "startupRssBytes": 65925120,
          "loadedRssBytes": 66842624,
          "lockCount": 1,
          "peakRssMetric": "linux-proc-VmHWM",
          "startupPeakRssBytes": 66760704,
          "loadedPeakRssBytes": 67538944,
          "resourceUsageMaxRssBytes": 84721664,
          "startupResourceUsageMaxRssBytes": 84721664,
          "resourceUsageLaunchFloorDetected": true
        },
        "baseline": {
          "peakRssBytes": 70500352,
          "startupRssBytes": 65695744,
          "loadedRssBytes": 67137536,
          "lockCount": 1,
          "peakRssMetric": "linux-proc-VmHWM",
          "startupPeakRssBytes": 66633728,
          "loadedPeakRssBytes": 67809280,
          "resourceUsageMaxRssBytes": 84721664,
          "startupResourceUsageMaxRssBytes": 84721664,
          "resourceUsageLaunchFloorDetected": true
        },
        "originalBfs": {
          "peakRssBytes": 78970880,
          "startupRssBytes": 65470464,
          "loadedRssBytes": 67436544,
          "lockCount": 1,
          "peakRssMetric": "linux-proc-VmHWM",
          "startupPeakRssBytes": 66777088,
          "loadedPeakRssBytes": 68116480,
          "resourceUsageMaxRssBytes": 84721664,
          "startupResourceUsageMaxRssBytes": 84721664,
          "resourceUsageLaunchFloorDetected": true
        },
        "upstream": {
          "peakRssBytes": 93093888,
          "startupRssBytes": 65413120,
          "loadedRssBytes": 68034560,
          "lockCount": 1,
          "peakRssMetric": "linux-proc-VmHWM",
          "startupPeakRssBytes": 66576384,
          "loadedPeakRssBytes": 68816896,
          "resourceUsageMaxRssBytes": 91906048,
          "startupResourceUsageMaxRssBytes": 84721664,
          "resourceUsageLaunchFloorDetected": true
        }
      },
      "repetitions": 1,
      "verdict": "inconclusive",
      "reason": "Single isolated per-lock observation; environmental variation is not estimated per lock."
    },
    {
      "id": "graham-chest",
      "solvers": {
        "candidate": {
          "peakRssBytes": 72069120,
          "startupRssBytes": 64765952,
          "loadedRssBytes": 66338816,
          "lockCount": 1,
          "peakRssMetric": "linux-proc-VmHWM",
          "startupPeakRssBytes": 65581056,
          "loadedPeakRssBytes": 67194880,
          "resourceUsageMaxRssBytes": 84721664,
          "startupResourceUsageMaxRssBytes": 84721664,
          "resourceUsageLaunchFloorDetected": true
        },
        "baseline": {
          "peakRssBytes": 71299072,
          "startupRssBytes": 65204224,
          "loadedRssBytes": 67563520,
          "lockCount": 1,
          "peakRssMetric": "linux-proc-VmHWM",
          "startupPeakRssBytes": 66428928,
          "loadedPeakRssBytes": 68218880,
          "resourceUsageMaxRssBytes": 84721664,
          "startupResourceUsageMaxRssBytes": 84721664,
          "resourceUsageLaunchFloorDetected": true
        },
        "originalBfs": {
          "peakRssBytes": 78872576,
          "startupRssBytes": 65208320,
          "loadedRssBytes": 67305472,
          "lockCount": 1,
          "peakRssMetric": "linux-proc-VmHWM",
          "startupPeakRssBytes": 66457600,
          "loadedPeakRssBytes": 68055040,
          "resourceUsageMaxRssBytes": 84721664,
          "startupResourceUsageMaxRssBytes": 84721664,
          "resourceUsageLaunchFloorDetected": true
        },
        "upstream": {
          "peakRssBytes": 79687680,
          "startupRssBytes": 65462272,
          "loadedRssBytes": 68476928,
          "lockCount": 1,
          "peakRssMetric": "linux-proc-VmHWM",
          "startupPeakRssBytes": 66789376,
          "loadedPeakRssBytes": 69304320,
          "resourceUsageMaxRssBytes": 84721664,
          "startupResourceUsageMaxRssBytes": 84721664,
          "resourceUsageLaunchFloorDetected": true
        }
      },
      "repetitions": 1,
      "verdict": "inconclusive",
      "reason": "Single isolated per-lock observation; environmental variation is not estimated per lock."
    },
    {
      "id": "gravo-chest",
      "solvers": {
        "candidate": {
          "peakRssBytes": 72118272,
          "startupRssBytes": 64983040,
          "loadedRssBytes": 66686976,
          "lockCount": 1,
          "peakRssMetric": "linux-proc-VmHWM",
          "startupPeakRssBytes": 66228224,
          "loadedPeakRssBytes": 67579904,
          "resourceUsageMaxRssBytes": 84721664,
          "startupResourceUsageMaxRssBytes": 84721664,
          "resourceUsageLaunchFloorDetected": true
        },
        "baseline": {
          "peakRssBytes": 70488064,
          "startupRssBytes": 65179648,
          "loadedRssBytes": 66883584,
          "lockCount": 1,
          "peakRssMetric": "linux-proc-VmHWM",
          "startupPeakRssBytes": 66408448,
          "loadedPeakRssBytes": 67633152,
          "resourceUsageMaxRssBytes": 84721664,
          "startupResourceUsageMaxRssBytes": 84721664,
          "resourceUsageLaunchFloorDetected": true
        },
        "originalBfs": {
          "peakRssBytes": 79040512,
          "startupRssBytes": 65675264,
          "loadedRssBytes": 67117056,
          "lockCount": 1,
          "peakRssMetric": "linux-proc-VmHWM",
          "startupPeakRssBytes": 66781184,
          "loadedPeakRssBytes": 67846144,
          "resourceUsageMaxRssBytes": 84721664,
          "startupResourceUsageMaxRssBytes": 84721664,
          "resourceUsageLaunchFloorDetected": true
        },
        "upstream": {
          "peakRssBytes": 75771904,
          "startupRssBytes": 65347584,
          "loadedRssBytes": 68624384,
          "lockCount": 1,
          "peakRssMetric": "linux-proc-VmHWM",
          "startupPeakRssBytes": 66322432,
          "loadedPeakRssBytes": 69361664,
          "resourceUsageMaxRssBytes": 84721664,
          "startupResourceUsageMaxRssBytes": 84721664,
          "resourceUsageLaunchFloorDetected": true
        }
      },
      "repetitions": 1,
      "verdict": "inconclusive",
      "reason": "Single isolated per-lock observation; environmental variation is not estimated per lock."
    },
    {
      "id": "diego-chest",
      "solvers": {
        "candidate": {
          "peakRssBytes": 72146944,
          "startupRssBytes": 65880064,
          "loadedRssBytes": 67190784,
          "lockCount": 1,
          "peakRssMetric": "linux-proc-VmHWM",
          "startupPeakRssBytes": 67063808,
          "loadedPeakRssBytes": 68005888,
          "resourceUsageMaxRssBytes": 84721664,
          "startupResourceUsageMaxRssBytes": 84721664,
          "resourceUsageLaunchFloorDetected": true
        },
        "baseline": {
          "peakRssBytes": 72073216,
          "startupRssBytes": 65470464,
          "loadedRssBytes": 67567616,
          "lockCount": 1,
          "peakRssMetric": "linux-proc-VmHWM",
          "startupPeakRssBytes": 66408448,
          "loadedPeakRssBytes": 68186112,
          "resourceUsageMaxRssBytes": 84721664,
          "startupResourceUsageMaxRssBytes": 84721664,
          "resourceUsageLaunchFloorDetected": true
        },
        "originalBfs": {
          "peakRssBytes": 78852096,
          "startupRssBytes": 65925120,
          "loadedRssBytes": 67366912,
          "lockCount": 1,
          "peakRssMetric": "linux-proc-VmHWM",
          "startupPeakRssBytes": 67059712,
          "loadedPeakRssBytes": 68120576,
          "resourceUsageMaxRssBytes": 84721664,
          "startupResourceUsageMaxRssBytes": 84721664,
          "resourceUsageLaunchFloorDetected": true
        },
        "upstream": {
          "peakRssBytes": 78807040,
          "startupRssBytes": 65200128,
          "loadedRssBytes": 68345856,
          "lockCount": 1,
          "peakRssMetric": "linux-proc-VmHWM",
          "startupPeakRssBytes": 66367488,
          "loadedPeakRssBytes": 69296128,
          "resourceUsageMaxRssBytes": 84721664,
          "startupResourceUsageMaxRssBytes": 84721664,
          "resourceUsageLaunchFloorDetected": true
        }
      },
      "repetitions": 1,
      "verdict": "inconclusive",
      "reason": "Single isolated per-lock observation; environmental variation is not estimated per lock."
    },
    {
      "id": "grim-chest",
      "solvers": {
        "candidate": {
          "peakRssBytes": 72241152,
          "startupRssBytes": 65159168,
          "loadedRssBytes": 66994176,
          "lockCount": 1,
          "peakRssMetric": "linux-proc-VmHWM",
          "startupPeakRssBytes": 66891776,
          "loadedPeakRssBytes": 67862528,
          "resourceUsageMaxRssBytes": 84721664,
          "startupResourceUsageMaxRssBytes": 84721664,
          "resourceUsageLaunchFloorDetected": true
        },
        "baseline": {
          "peakRssBytes": 71405568,
          "startupRssBytes": 65433600,
          "loadedRssBytes": 67399680,
          "lockCount": 1,
          "peakRssMetric": "linux-proc-VmHWM",
          "startupPeakRssBytes": 66494464,
          "loadedPeakRssBytes": 68214784,
          "resourceUsageMaxRssBytes": 84721664,
          "startupResourceUsageMaxRssBytes": 84721664,
          "resourceUsageLaunchFloorDetected": true
        },
        "originalBfs": {
          "peakRssBytes": 78860288,
          "startupRssBytes": 65060864,
          "loadedRssBytes": 67158016,
          "lockCount": 1,
          "peakRssMetric": "linux-proc-VmHWM",
          "startupPeakRssBytes": 66310144,
          "loadedPeakRssBytes": 68034560,
          "resourceUsageMaxRssBytes": 84721664,
          "startupResourceUsageMaxRssBytes": 84721664,
          "resourceUsageLaunchFloorDetected": true
        },
        "upstream": {
          "peakRssBytes": 75022336,
          "startupRssBytes": 65683456,
          "loadedRssBytes": 68567040,
          "lockCount": 1,
          "peakRssMetric": "linux-proc-VmHWM",
          "startupPeakRssBytes": 67006464,
          "loadedPeakRssBytes": 69443584,
          "resourceUsageMaxRssBytes": 84721664,
          "startupResourceUsageMaxRssBytes": 84721664,
          "resourceUsageLaunchFloorDetected": true
        }
      },
      "repetitions": 1,
      "verdict": "inconclusive",
      "reason": "Single isolated per-lock observation; environmental variation is not estimated per lock."
    },
    {
      "id": "mercenary-near-grim-chest",
      "solvers": {
        "candidate": {
          "peakRssBytes": 71467008,
          "startupRssBytes": 65024000,
          "loadedRssBytes": 66072576,
          "lockCount": 1,
          "peakRssMetric": "linux-proc-VmHWM",
          "startupPeakRssBytes": 66228224,
          "loadedPeakRssBytes": 66879488,
          "resourceUsageMaxRssBytes": 84721664,
          "startupResourceUsageMaxRssBytes": 84721664,
          "resourceUsageLaunchFloorDetected": true
        },
        "baseline": {
          "peakRssBytes": 71958528,
          "startupRssBytes": 65830912,
          "loadedRssBytes": 67403776,
          "lockCount": 1,
          "peakRssMetric": "linux-proc-VmHWM",
          "startupPeakRssBytes": 66977792,
          "loadedPeakRssBytes": 68313088,
          "resourceUsageMaxRssBytes": 84721664,
          "startupResourceUsageMaxRssBytes": 84721664,
          "resourceUsageLaunchFloorDetected": true
        },
        "originalBfs": {
          "peakRssBytes": 78442496,
          "startupRssBytes": 65724416,
          "loadedRssBytes": 66904064,
          "lockCount": 1,
          "peakRssMetric": "linux-proc-VmHWM",
          "startupPeakRssBytes": 66744320,
          "loadedPeakRssBytes": 67756032,
          "resourceUsageMaxRssBytes": 84721664,
          "startupResourceUsageMaxRssBytes": 84721664,
          "resourceUsageLaunchFloorDetected": true
        },
        "upstream": {
          "peakRssBytes": 78852096,
          "startupRssBytes": 64790528,
          "loadedRssBytes": 68591616,
          "lockCount": 1,
          "peakRssMetric": "linux-proc-VmHWM",
          "startupPeakRssBytes": 65409024,
          "loadedPeakRssBytes": 69369856,
          "resourceUsageMaxRssBytes": 84721664,
          "startupResourceUsageMaxRssBytes": 84721664,
          "resourceUsageLaunchFloorDetected": true
        }
      },
      "repetitions": 1,
      "verdict": "inconclusive",
      "reason": "Single isolated per-lock observation; environmental variation is not estimated per lock."
    },
    {
      "id": "popular-lock",
      "solvers": {
        "candidate": {
          "peakRssBytes": 72925184,
          "startupRssBytes": 64864256,
          "loadedRssBytes": 67223552,
          "lockCount": 1,
          "peakRssMetric": "linux-proc-VmHWM",
          "startupPeakRssBytes": 66072576,
          "loadedPeakRssBytes": 67854336,
          "resourceUsageMaxRssBytes": 84721664,
          "startupResourceUsageMaxRssBytes": 84721664,
          "resourceUsageLaunchFloorDetected": true
        },
        "baseline": {
          "peakRssBytes": 72818688,
          "startupRssBytes": 65572864,
          "loadedRssBytes": 67670016,
          "lockCount": 1,
          "peakRssMetric": "linux-proc-VmHWM",
          "startupPeakRssBytes": 66842624,
          "loadedPeakRssBytes": 68358144,
          "resourceUsageMaxRssBytes": 84721664,
          "startupResourceUsageMaxRssBytes": 84721664,
          "resourceUsageLaunchFloorDetected": true
        },
        "originalBfs": {
          "peakRssBytes": 78925824,
          "startupRssBytes": 64843776,
          "loadedRssBytes": 67465216,
          "lockCount": 1,
          "peakRssMetric": "linux-proc-VmHWM",
          "startupPeakRssBytes": 66355200,
          "loadedPeakRssBytes": 68124672,
          "resourceUsageMaxRssBytes": 84721664,
          "startupResourceUsageMaxRssBytes": 84721664,
          "resourceUsageLaunchFloorDetected": true
        },
        "upstream": {
          "peakRssBytes": 75907072,
          "startupRssBytes": 65937408,
          "loadedRssBytes": 67903488,
          "lockCount": 1,
          "peakRssMetric": "linux-proc-VmHWM",
          "startupPeakRssBytes": 66772992,
          "loadedPeakRssBytes": 68808704,
          "resourceUsageMaxRssBytes": 84721664,
          "startupResourceUsageMaxRssBytes": 84721664,
          "resourceUsageLaunchFloorDetected": true
        }
      },
      "repetitions": 1,
      "verdict": "inconclusive",
      "reason": "Single isolated per-lock observation; environmental variation is not estimated per lock."
    },
    {
      "id": "alberto-mine-hut-chest",
      "solvers": {
        "candidate": {
          "peakRssBytes": 72032256,
          "startupRssBytes": 65372160,
          "loadedRssBytes": 66945024,
          "lockCount": 1,
          "peakRssMetric": "linux-proc-VmHWM",
          "startupPeakRssBytes": 66519040,
          "loadedPeakRssBytes": 67907584,
          "resourceUsageMaxRssBytes": 84721664,
          "startupResourceUsageMaxRssBytes": 84721664,
          "resourceUsageLaunchFloorDetected": true
        },
        "baseline": {
          "peakRssBytes": 71299072,
          "startupRssBytes": 66199552,
          "loadedRssBytes": 67772416,
          "lockCount": 1,
          "peakRssMetric": "linux-proc-VmHWM",
          "startupPeakRssBytes": 67170304,
          "loadedPeakRssBytes": 68464640,
          "resourceUsageMaxRssBytes": 84721664,
          "startupResourceUsageMaxRssBytes": 84721664,
          "resourceUsageLaunchFloorDetected": true
        },
        "originalBfs": {
          "peakRssBytes": 78888960,
          "startupRssBytes": 65069056,
          "loadedRssBytes": 67166208,
          "lockCount": 1,
          "peakRssMetric": "linux-proc-VmHWM",
          "startupPeakRssBytes": 66940928,
          "loadedPeakRssBytes": 68124672,
          "resourceUsageMaxRssBytes": 84721664,
          "startupResourceUsageMaxRssBytes": 84721664,
          "resourceUsageLaunchFloorDetected": true
        },
        "upstream": {
          "peakRssBytes": 75685888,
          "startupRssBytes": 65064960,
          "loadedRssBytes": 68472832,
          "lockCount": 1,
          "peakRssMetric": "linux-proc-VmHWM",
          "startupPeakRssBytes": 66490368,
          "loadedPeakRssBytes": 69316608,
          "resourceUsageMaxRssBytes": 84721664,
          "startupResourceUsageMaxRssBytes": 84721664,
          "resourceUsageLaunchFloorDetected": true
        }
      },
      "repetitions": 1,
      "verdict": "inconclusive",
      "reason": "Single isolated per-lock observation; environmental variation is not estimated per lock."
    },
    {
      "id": "alberto-mine-upstairs-left-chest",
      "solvers": {
        "candidate": {
          "peakRssBytes": 70963200,
          "startupRssBytes": 65175552,
          "loadedRssBytes": 67010560,
          "lockCount": 1,
          "peakRssMetric": "linux-proc-VmHWM",
          "startupPeakRssBytes": 66551808,
          "loadedPeakRssBytes": 67665920,
          "resourceUsageMaxRssBytes": 84721664,
          "startupResourceUsageMaxRssBytes": 84721664,
          "resourceUsageLaunchFloorDetected": true
        },
        "baseline": {
          "peakRssBytes": 71032832,
          "startupRssBytes": 65646592,
          "loadedRssBytes": 67481600,
          "lockCount": 1,
          "peakRssMetric": "linux-proc-VmHWM",
          "startupPeakRssBytes": 66998272,
          "loadedPeakRssBytes": 68358144,
          "resourceUsageMaxRssBytes": 84721664,
          "startupResourceUsageMaxRssBytes": 84721664,
          "resourceUsageLaunchFloorDetected": true
        },
        "originalBfs": {
          "peakRssBytes": 71507968,
          "startupRssBytes": 65769472,
          "loadedRssBytes": 67080192,
          "lockCount": 1,
          "peakRssMetric": "linux-proc-VmHWM",
          "startupPeakRssBytes": 66801664,
          "loadedPeakRssBytes": 67776512,
          "resourceUsageMaxRssBytes": 84721664,
          "startupResourceUsageMaxRssBytes": 84721664,
          "resourceUsageLaunchFloorDetected": true
        },
        "upstream": {
          "peakRssBytes": 72077312,
          "startupRssBytes": 65044480,
          "loadedRssBytes": 68321280,
          "lockCount": 1,
          "peakRssMetric": "linux-proc-VmHWM",
          "startupPeakRssBytes": 66244608,
          "loadedPeakRssBytes": 69312512,
          "resourceUsageMaxRssBytes": 84721664,
          "startupResourceUsageMaxRssBytes": 84721664,
          "resourceUsageLaunchFloorDetected": true
        }
      },
      "repetitions": 1,
      "verdict": "inconclusive",
      "reason": "Single isolated per-lock observation; environmental variation is not estimated per lock."
    },
    {
      "id": "alberto-mine-upstairs-right-chest",
      "solvers": {
        "candidate": {
          "peakRssBytes": 70955008,
          "startupRssBytes": 65347584,
          "loadedRssBytes": 66658304,
          "lockCount": 1,
          "peakRssMetric": "linux-proc-VmHWM",
          "startupPeakRssBytes": 66600960,
          "loadedPeakRssBytes": 67461120,
          "resourceUsageMaxRssBytes": 84721664,
          "startupResourceUsageMaxRssBytes": 84721664,
          "resourceUsageLaunchFloorDetected": true
        },
        "baseline": {
          "peakRssBytes": 70983680,
          "startupRssBytes": 65761280,
          "loadedRssBytes": 67334144,
          "lockCount": 1,
          "peakRssMetric": "linux-proc-VmHWM",
          "startupPeakRssBytes": 66994176,
          "loadedPeakRssBytes": 68202496,
          "resourceUsageMaxRssBytes": 84721664,
          "startupResourceUsageMaxRssBytes": 84721664,
          "resourceUsageLaunchFloorDetected": true
        },
        "originalBfs": {
          "peakRssBytes": 78843904,
          "startupRssBytes": 65380352,
          "loadedRssBytes": 67477504,
          "lockCount": 1,
          "peakRssMetric": "linux-proc-VmHWM",
          "startupPeakRssBytes": 66445312,
          "loadedPeakRssBytes": 68112384,
          "resourceUsageMaxRssBytes": 84721664,
          "startupResourceUsageMaxRssBytes": 84721664,
          "resourceUsageLaunchFloorDetected": true
        },
        "upstream": {
          "peakRssBytes": 73433088,
          "startupRssBytes": 65761280,
          "loadedRssBytes": 67727360,
          "lockCount": 1,
          "peakRssMetric": "linux-proc-VmHWM",
          "startupPeakRssBytes": 66560000,
          "loadedPeakRssBytes": 68489216,
          "resourceUsageMaxRssBytes": 84721664,
          "startupResourceUsageMaxRssBytes": 84721664,
          "resourceUsageLaunchFloorDetected": true
        }
      },
      "repetitions": 1,
      "verdict": "inconclusive",
      "reason": "Single isolated per-lock observation; environmental variation is not estimated per lock."
    },
    {
      "id": "cavalorn-storeroom-door",
      "solvers": {
        "candidate": {
          "peakRssBytes": 72126464,
          "startupRssBytes": 65568768,
          "loadedRssBytes": 67010560,
          "lockCount": 1,
          "peakRssMetric": "linux-proc-VmHWM",
          "startupPeakRssBytes": 66990080,
          "loadedPeakRssBytes": 67907584,
          "resourceUsageMaxRssBytes": 84721664,
          "startupResourceUsageMaxRssBytes": 84721664,
          "resourceUsageLaunchFloorDetected": true
        },
        "baseline": {
          "peakRssBytes": 71397376,
          "startupRssBytes": 65282048,
          "loadedRssBytes": 67379200,
          "lockCount": 1,
          "peakRssMetric": "linux-proc-VmHWM",
          "startupPeakRssBytes": 66547712,
          "loadedPeakRssBytes": 68235264,
          "resourceUsageMaxRssBytes": 84721664,
          "startupResourceUsageMaxRssBytes": 84721664,
          "resourceUsageLaunchFloorDetected": true
        },
        "originalBfs": {
          "peakRssBytes": 79187968,
          "startupRssBytes": 65269760,
          "loadedRssBytes": 67366912,
          "lockCount": 1,
          "peakRssMetric": "linux-proc-VmHWM",
          "startupPeakRssBytes": 66609152,
          "loadedPeakRssBytes": 68096000,
          "resourceUsageMaxRssBytes": 84721664,
          "startupResourceUsageMaxRssBytes": 84721664,
          "resourceUsageLaunchFloorDetected": true
        },
        "upstream": {
          "peakRssBytes": 85778432,
          "startupRssBytes": 65150976,
          "loadedRssBytes": 68558848,
          "lockCount": 1,
          "peakRssMetric": "linux-proc-VmHWM",
          "startupPeakRssBytes": 66166784,
          "loadedPeakRssBytes": 69103616,
          "resourceUsageMaxRssBytes": 85106688,
          "startupResourceUsageMaxRssBytes": 84721664,
          "resourceUsageLaunchFloorDetected": true
        }
      },
      "repetitions": 1,
      "verdict": "inconclusive",
      "reason": "Single isolated per-lock observation; environmental variation is not estimated per lock."
    },
    {
      "id": "old-to-new-camp-bandits-chest",
      "solvers": {
        "candidate": {
          "peakRssBytes": 72785920,
          "startupRssBytes": 65982464,
          "loadedRssBytes": 67162112,
          "lockCount": 1,
          "peakRssMetric": "linux-proc-VmHWM",
          "startupPeakRssBytes": 67121152,
          "loadedPeakRssBytes": 67997696,
          "resourceUsageMaxRssBytes": 84721664,
          "startupResourceUsageMaxRssBytes": 84721664,
          "resourceUsageLaunchFloorDetected": true
        },
        "baseline": {
          "peakRssBytes": 71737344,
          "startupRssBytes": 65581056,
          "loadedRssBytes": 67416064,
          "lockCount": 1,
          "peakRssMetric": "linux-proc-VmHWM",
          "startupPeakRssBytes": 66609152,
          "loadedPeakRssBytes": 68075520,
          "resourceUsageMaxRssBytes": 84721664,
          "startupResourceUsageMaxRssBytes": 84721664,
          "resourceUsageLaunchFloorDetected": true
        },
        "originalBfs": {
          "peakRssBytes": 79044608,
          "startupRssBytes": 65212416,
          "loadedRssBytes": 67309568,
          "lockCount": 1,
          "peakRssMetric": "linux-proc-VmHWM",
          "startupPeakRssBytes": 66351104,
          "loadedPeakRssBytes": 68112384,
          "resourceUsageMaxRssBytes": 84721664,
          "startupResourceUsageMaxRssBytes": 84721664,
          "resourceUsageLaunchFloorDetected": true
        },
        "upstream": {
          "peakRssBytes": 74752000,
          "startupRssBytes": 65073152,
          "loadedRssBytes": 68218880,
          "lockCount": 1,
          "peakRssMetric": "linux-proc-VmHWM",
          "startupPeakRssBytes": 66187264,
          "loadedPeakRssBytes": 69152768,
          "resourceUsageMaxRssBytes": 84721664,
          "startupResourceUsageMaxRssBytes": 84721664,
          "resourceUsageLaunchFloorDetected": true
        }
      },
      "repetitions": 1,
      "verdict": "inconclusive",
      "reason": "Single isolated per-lock observation; environmental variation is not estimated per lock."
    }
  ]
}
```

## Environment and source provenance

```json
{
  "environment": {
    "node": "v24.19.0",
    "v8": "13.6.233.17-node.51",
    "platform": "linux",
    "arch": "x64",
    "cpu": "AMD EPYC 9V74 80-Core Processor",
    "logicalCpus": 9,
    "osRelease": "6.18.35",
    "totalMemoryBytes": 23109910528,
    "execArgv": []
  },
  "source": {
    "revision": "1651cd478b61f368d2fb7ce4cb0f3f644ade4eb9",
    "dirty": false,
    "files": {
      "errors.ts": "830e0995bb1d5b98e8ce0495a22e5ae169cab10b2bdff2612e58323c397306f5",
      "index.ts": "a1a2eedf5010cd66fc5d451035923e6ab417b36ba84cb2da85789cea17a1569a",
      "indexed-heap.ts": "f776755f7405968b567922473c1e6ea5a63dae7643c4bd62b993159e900b7fbc",
      "indexed.ts": "279b11d625a033f45723dd94df13a9be9fdfe267cff2535d5470b2011f11e125",
      "lock-model.ts": "b4674921412e2acfbf0eaeff2031b3fc3907dffe886c42e588cd5ba6348ec966",
      "matrix-analysis.ts": "a105dee650d645a730e3cc7e62a8e9faae31b29ad98c28aafce5ef15df236fc6",
      "matrix-search.ts": "380ae745289a7ffd1997a6b9aa7dc3dd06a56e17453732d41042891c42435d3a",
      "search-bfs.ts": "011c675973ccc8d753c0b9b3608882b16ca93ef4b460635c3474d8d5fc705feb",
      "search-limits.ts": "91afc0940d49af46d9bb57d91af45df992f0684593d2f2d8bc3c13fad3f4c681",
      "types.ts": "a2e72cf02e31694c52c1621cf5359863585b8383aa83a7d4e977c8547e8c879b"
    },
    "harness": {
      "catalog.ts": "2b75c9e9b5fe6997006307bf74cd90d8645d6d61fc527681f209c164680b880a",
      "cli.ts": "b717c3d69c13d4a5b9a77589b1465f96338fe9d8be6501249f4470db035efe33",
      "comparison.ts": "680ac76d266b51ff1f951fd3e232248bc5df0ab9eb70123285d31d176fb3a709",
      "harness.ts": "14d23d697b2c4dd8adc13beac84b1cd3c0236aa34ae42ea96935fb30ac75e9f8",
      "memory.ts": "429b45f541a2ac97e46fb6598ac30966cab4e2dca7e355c56f3ad3e037f43d93",
      "rss.ts": "acc321bc34deac44819e5ff6d9af89e91c7394d9d897f7d69ce0cfedfc2e992c",
      "solver.bench.ts": "985fbba3b387109261abeb1fdcbecd91b0ccfaa4dde5e0f162ad1758d529647f",
      "validation.ts": "c44fc2a3de4da26ab207186a97a6b80ab20a910d27ae335da6cec536e402d77d"
    },
    "scripts": {
      "benchmark-compare.ts": "d4243c84a0a007b611e04e9c07031c3a7e48fb1a610366349084f0a7ab61cd71",
      "benchmark-memory-worker.ts": "807707ca177f43c5ef08b88aa1068ad5f08f391b74f7f8d358159a2e5bf8a49b",
      "benchmark-memory.ts": "c25a0407122f1c16261d8f8f9fd6f60cba463a7e288579ba67fde398db8d854f",
      "benchmark-snapshot.ts": "50b31ffeac808f5b21f0fb864d2efd8a7c758491cf4e2d611bbe900bf3f9ec32",
      "benchmark.ts": "fdb3f22dfdd495a6dde6a27fc3b0db68c7ceb75b94acaff131d30a25b6a06f24"
    }
  },
  "candidate": {
    "revision": "1651cd478b61f368d2fb7ce4cb0f3f644ade4eb9",
    "moduleSha256": "247aef3e975df19df3d3372bb43893b112f2cdb17c450e0a95ce05cc7b819b7b",
    "format": "tuple",
    "module": "/workspace/scratch/5d94b8672fa4/gothic-lock-solver-typescript/dist/gothic-lock-solver.mjs"
  },
  "baseline": {
    "revision": "6b1cfbc13bcec68f609d45d5dc97504dd84f1760",
    "moduleSha256": "5e3d680cbb1ca7bf9437a3800654bc26b1445ec71994bfc1fc70a7d5381aa6ed",
    "format": "legacy",
    "module": "/workspace/scratch/5d94b8672fa4/gothic-lock-solver-typescript/benchmarks/reference-matrix/src/index.mjs",
    "moduleTree": {
      "cli.mjs": "a8ca1332163fa5df64387b1fccc985244f07e99664eba463153700ecd4d672b5",
      "index.mjs": "5e3d680cbb1ca7bf9437a3800654bc26b1445ec71994bfc1fc70a7d5381aa6ed",
      "lock-definition.mjs": "cecc13bdb3c760400dda8421e5bdb58e9fdc5bbd46e1782dbd11f94a6de9a8b3",
      "matrix-analysis.mjs": "7262f85ba882cd8a6ea9cb294be2d2f7a22acd16bc3a963744b9edbdce397986",
      "matrix-search.mjs": "b018cfdad21aaf52f4350d5d8f0001afed1b41c44643e7fc8c330e6aca40b1d4",
      "result.mjs": "1a38110c34b696f62b9632cb3de27bb0e07c938cdd11b3ffcb89de8532bf08b0",
      "search-bfs.mjs": "69f253801d4bb36a9db6887a82a668b0a2765fe55c33cdf7c712fe82df128a75",
      "search-limits.mjs": "4a302b500fa41019b1ec3d8f3b86ad28de1e2046a8f9ac7a707608170ce7b569",
      "solver.mjs": "31e3ebfb7035bc57d4c435351642eac0b49820d9ed4682d7eac38b0529dddd29",
      "state-codec.mjs": "ce37a9ede6b26196fef7b89aa9501fe94c6a18fc4110c1cea394995b053759e4",
      "transition.mjs": "28cf5007a8fd1db9d179bf233d995a5e88f5a6c486bca22395e2ed144cdbd4fd"
    },
    "snapshotSha256": "c21b6319523f625439403c0417d267b5a63c35abafebef758bfc6c21217a3b94",
    "snapshot": "/workspace/scratch/5d94b8672fa4/gothic-lock-solver-typescript/benchmarks/snapshots/reference-matrix.json",
    "kind": "reference-baseline"
  },
  "fixtures": {
    "count": 45,
    "catalogSha256": "0eb5b641eac4bda105bde24b60399220f1767dd13db6a312b78638b2750ba675",
    "manifestSha256": "a634d5328fd8d41470397b622ae0bd32b8aac0355dfc31975e023a63a62e65c9"
  },
  "originalBfs": {
    "repository": "https://github.com/Marcus-Rise/gothic-lock-solver",
    "revision": "a87e739a22ccc4215d6d9b14fa06b0738171cb60",
    "license": "Apache-2.0",
    "files": {
      "src/index.mjs": "927fc5391c8c5f673f52c35d1fd2bd14afa5d47554a7a410dae0d8c03788c90f",
      "src/lock-definition.mjs": "e87e8eae439601cb93d85e8c5d5314976574ad6c6e595fff98f419ef80623d74",
      "src/result.mjs": "1a38110c34b696f62b9632cb3de27bb0e07c938cdd11b3ffcb89de8532bf08b0",
      "src/solver.mjs": "ab7335383670c40ccbe2a53c6591dc67a04b7abda49d44978c9a790938f92dec",
      "src/state-codec.mjs": "ce37a9ede6b26196fef7b89aa9501fe94c6a18fc4110c1cea394995b053759e4",
      "src/transition.mjs": "28cf5007a8fd1db9d179bf233d995a5e88f5a6c486bca22395e2ed144cdbd4fd",
      "LICENSE": "c71d239df91726fc519c6eb72d318ec65820627232b2f796219e87dcf35d0ab4"
    },
    "notes": "Unmodified source snapshots; imports remain relative within this directory. No upstream UnlockMyLoot solver code is included."
  },
  "matrixReference": {
    "schemaVersion": 1,
    "repository": "https://github.com/Marcus-Rise/gothic-lock-solver",
    "revision": "6b1cfbc13bcec68f609d45d5dc97504dd84f1760",
    "license": "Apache-2.0",
    "files": {
      "LICENSE": "c71d239df91726fc519c6eb72d318ec65820627232b2f796219e87dcf35d0ab4",
      "src/cli.mjs": "a8ca1332163fa5df64387b1fccc985244f07e99664eba463153700ecd4d672b5",
      "src/index.mjs": "5e3d680cbb1ca7bf9437a3800654bc26b1445ec71994bfc1fc70a7d5381aa6ed",
      "src/lock-definition.mjs": "cecc13bdb3c760400dda8421e5bdb58e9fdc5bbd46e1782dbd11f94a6de9a8b3",
      "src/matrix-analysis.mjs": "7262f85ba882cd8a6ea9cb294be2d2f7a22acd16bc3a963744b9edbdce397986",
      "src/matrix-search.mjs": "b018cfdad21aaf52f4350d5d8f0001afed1b41c44643e7fc8c330e6aca40b1d4",
      "src/result.mjs": "1a38110c34b696f62b9632cb3de27bb0e07c938cdd11b3ffcb89de8532bf08b0",
      "src/search-bfs.mjs": "69f253801d4bb36a9db6887a82a668b0a2765fe55c33cdf7c712fe82df128a75",
      "src/search-limits.mjs": "4a302b500fa41019b1ec3d8f3b86ad28de1e2046a8f9ac7a707608170ce7b569",
      "src/solver.mjs": "31e3ebfb7035bc57d4c435351642eac0b49820d9ed4682d7eac38b0529dddd29",
      "src/state-codec.mjs": "ce37a9ede6b26196fef7b89aa9501fe94c6a18fc4110c1cea394995b053759e4",
      "src/transition.mjs": "28cf5007a8fd1db9d179bf233d995a5e88f5a6c486bca22395e2ed144cdbd4fd"
    },
    "notes": "Byte-identical Apache matrix reference, copied from source at the pinned revision. Benchmark-only; excluded from runtime and npm package. No external AGPL solver source."
  },
  "upstream": {
    "revision": "eee0bf50ebcb7fffd2b47954fd76bb015854e365",
    "solver": {
      "path": "index.html",
      "sha256": "691f744099a9169f30e9883fddc5fdbb4949d306f3011e601678419d7b93821b",
      "blockSha256": "d5bc85f40fd7c5b61097403df399ecb7dfd2b58924dc7a670aa0d05306017380",
      "startMarker": "/* solver-start",
      "endMarker": "/* solver-end */"
    },
    "measured": true,
    "externalCheckout": "/workspace/scratch/5d94b8672fa4/unlockmyloot",
    "license": "External AGPL source is hash-verified and executed only from the supplied pinned checkout; no upstream solver code is vendored."
  },
  "artifacts": {
    "gothic-lock-solver.mjs": {
      "bytes": 20143,
      "sha256": "247aef3e975df19df3d3372bb43893b112f2cdb17c450e0a95ce05cc7b819b7b"
    },
    "gothic-lock-solver.min.mjs": {
      "bytes": 9098,
      "sha256": "9a7c0d365a0e2630372200f4c8a7914024b04afd048ca77e6a6783c120676d1f"
    },
    "gothic-lock-solver.js": {
      "bytes": 20916,
      "sha256": "14841c4bc1563f4fd8beae3e277798878a2862efa0840e50b1aef9d5e5dff101"
    },
    "gothic-lock-solver.min.js": {
      "bytes": 9197,
      "sha256": "2a936f190ae38f458e2b209681beb099974f32d654eb33be7249be6ede847694"
    },
    "gothic-lock-solver.cli.mjs": {
      "bytes": 23199,
      "sha256": "75129dff219af243b05ffcbdb63ac1a14a32fd0d0b5ae8ee4528bb4d24b75f81"
    }
  }
}
```

## Interpretation

Every warmup and measured solution is replayed independently one unit division at a time, checked against the stored exact action minimum, input immutability and deterministic paths. Target snapshot changes cannot mask candidate drift: the supplied baseline module must reproduce the supplied baseline snapshot.

Historical upstream observations have a different objective (unit divisions, then switches); they are never a substitute for live paired timings. U/C/switches are descriptive and are still strict migration regression gates. Timings describe this Node runtime and machine only. A performance inconclusive verdict does not establish absence of regression. Sum of per-lock medians is not a whole-catalog wall-clock median. Raw samples, paths and calibration envelopes are in benchmark.json.
