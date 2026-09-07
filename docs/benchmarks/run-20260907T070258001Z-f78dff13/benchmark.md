# Matrix search benchmark

Generated: 2026-09-07T07:02:58.001Z. Scope: **full-45-catalog** (45 locks).

Correctness gates: **PASS**. Warmups per solver/lock: 1; measured repetitions: 5.

A = actions (grouped commands); U = unique selected plates; C = unit divisions of the selected plate. All timings are milliseconds.

Only the synchronous solver call is timed. Input cloning, reference click grouping, replay, metrics, and reporting are outside timing. Current and baseline calls include their public facade validation/result construction.

Per lock, warmup and measured rounds rotate solver order deterministically.

GC: Natural Node.js garbage collection; no forced GC.

## Runtime and source evidence

```json
{
  "environment": {
    "node": "v24.19.0",
    "v8": "13.6.233.17-node.51",
    "platform": "linux",
    "arch": "x64",
    "osRelease": "6.18.35",
    "cpu": "AMD EPYC 9V74 80-Core Processor",
    "logicalCpus": 9,
    "totalMemoryBytes": 23109910528,
    "execArgv": []
  },
  "source": {
    "repository": "https://github.com/Marcus-Rise/gothic-lock-solver",
    "revision": "6b1cfbc13bcec68f609d45d5dc97504dd84f1760",
    "dirty": false,
    "core": {
      "sha256": "064dd862f17ea1a8fdd00abd4e06dfb024ffc4dcf98cb648c881a163c4599079",
      "files": {
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
      }
    },
    "harness": {
      "sha256": "becf8b6ca5b15dd64d91e52939bb1bf8b46816f4f62e70b27629e17c26f9bde4",
      "files": {
        "baseline/src/index.mjs": "927fc5391c8c5f673f52c35d1fd2bd14afa5d47554a7a410dae0d8c03788c90f",
        "baseline/src/lock-definition.mjs": "e87e8eae439601cb93d85e8c5d5314976574ad6c6e595fff98f419ef80623d74",
        "baseline/src/result.mjs": "1a38110c34b696f62b9632cb3de27bb0e07c938cdd11b3ffcb89de8532bf08b0",
        "baseline/src/solver.mjs": "ab7335383670c40ccbe2a53c6591dc67a04b7abda49d44978c9a790938f92dec",
        "baseline/src/state-codec.mjs": "ce37a9ede6b26196fef7b89aa9501fe94c6a18fc4110c1cea394995b053759e4",
        "baseline/src/transition.mjs": "28cf5007a8fd1db9d179bf233d995a5e88f5a6c486bca22395e2ed144cdbd4fd",
        "catalog.mjs": "1aeead30de3b4041309df18edae2daa206212cf6bb5e8b7031e77743d450a497",
        "harness.mjs": "49c73bd6cd5b096f079446ca89a272b73f63e333ac187f814e126d66198ed2a0",
        "validation.mjs": "3162b5374be266e5963e63a494006666c2b29ff2be10f2d2b58c8c57e036759e"
      },
      "cliSha256": "57276d8b7dfbc48c8348d021b443f64d14c3bb3dbce753db8d54d51ee2fbf76e"
    }
  },
  "fixtures": {
    "count": 45,
    "catalogSha256": "0eb5b641eac4bda105bde24b60399220f1767dd13db6a312b78638b2750ba675",
    "manifestSha256": "a634d5328fd8d41470397b622ae0bd32b8aac0355dfc31975e023a63a62e65c9",
    "repository": "https://github.com/1h8s/unlockmyloot",
    "revision": "eee0bf50ebcb7fffd2b47954fd76bb015854e365"
  },
  "baseline": {
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
  "reference": {
    "measured": true,
    "repository": "https://github.com/1h8s/unlockmyloot",
    "revision": "eee0bf50ebcb7fffd2b47954fd76bb015854e365",
    "path": "index.html",
    "fileSha256": "691f744099a9169f30e9883fddc5fdbb4949d306f3011e601678419d7b93821b",
    "solverBlockSha256": "d5bc85f40fd7c5b61097403df399ecb7dfd2b58924dc7a670aa0d05306017380",
    "execution": "Unchanged source compiled with Function in the same Node.js realm; no browser or vm context."
  }
}
```

## Totals across measured locks

| Solver | A | U | C | Sum of per-lock median ms |
| --- | ---: | ---: | ---: | ---: |
| Matrix A* | 483 | 245 | 1723 | 49.630951 |
| Current exact BFS | 483 | 245 | 1727 | 423.230535 |
| Original Apache BFS | 483 | 245 | 1727 | 2537.917176 |
| UnlockMyLoot (live pinned reference) | 491 | 245 | 1695 | 1465.336812 |

## Matrix A* comparisons

Wins/ties/losses count locks where matrix A* is lower/equal/higher. A ratio above 1 favors matrix A*.

| Comparator | A wins/ties/losses | U wins/ties/losses | C wins/ties/losses | Time wins/ties/losses | Geometric mean speedup | Ratio of summed medians |
| --- | --- | --- | --- | --- | ---: | ---: |
| Current exact BFS | 0/45/0 | 0/45/0 | 2/42/1 | 43/0/2 | 16.232012 | 8.527552 |
| Original Apache BFS | 0/45/0 | 0/45/0 | 2/42/1 | 45/0/0 | 88.393103 | 51.135776 |
| UnlockMyLoot (live pinned reference) | 5/40/0 | 0/45/0 | 0/39/6 | 45/0/0 | 52.863128 | 29.524657 |
| Reference (cached metrics only) | 5/40/0 | 0/45/0 | 0/39/6 | not timed | — | — |

## Per-lock action metrics

| Lock | N | Exact minimum A | Matrix A* A/U/C | Current exact BFS A/U/C | Original Apache BFS A/U/C | UnlockMyLoot (live pinned reference) A/U/C | Cached reference A/U/C |
| --- | ---: | ---: | --- | --- | --- | --- | --- |
| Дверь Разрушенной башни (ruined-tower-door) | 6 | 17 | 17/6/57 | 17/6/57 | 17/6/57 | 17/6/57 | 17/6/57 |
| Сундук Скатти (scatty-chest) | 5 | 9 | 9/5/31 | 9/5/31 | 9/5/31 | 9/5/31 | 9/5/31 |
| Сундук Кор Галома (cor-galom-chest) | 4 | 5 | 5/4/15 | 5/4/19 | 5/4/19 | 5/4/15 | 5/4/15 |
| Сундук в спальне Кор Галома (cor-galom-bedroom-chest) | 6 | 14 | 14/5/60 | 14/5/60 | 14/5/60 | 14/5/60 | 14/5/60 |
| Сундук в кузнице Болотного лагеря (swamp-camp-forge-chest) | 6 | 11 | 11/6/41 | 11/6/41 | 11/6/41 | 11/6/41 | 11/6/41 |
| Склад Рисового лорда (3-й этаж) (rice-lord-storeroom) | 5 | 9 | 9/5/30 | 9/5/30 | 9/5/30 | 9/5/30 | 9/5/30 |
| Дверь в покои Гомеза (gomez-chambers-door) | 6 | 9 | 9/6/28 | 9/6/28 | 9/6/28 | 9/6/28 | 9/6/28 |
| Сундук в тронном зале у Гомеза (gomez-throne-hall-chest) | 4 | 5 | 5/4/16 | 5/4/16 | 5/4/16 | 5/4/16 | 5/4/16 |
| Дверь в темнице с расстрелянным призраком (old-camp-dungeon-door) | 6 | 17 | 17/6/72 | 17/6/72 | 17/6/72 | 18/6/68 | 18/6/68 |
| Ключ от темницы Арлина (arlin-dungeon-key) | 7 | 7 | 7/5/25 | 7/5/25 | 7/5/25 | 7/5/25 | 7/5/25 |
| Винный погреб Гомеза (gomez-wine-cellar) | 6 | 9 | 9/6/41 | 9/6/41 | 9/6/41 | 11/6/31 | 11/6/31 |
| Сундук в ногах Гомеза (gomez-bedside-chest) | 5 | 23 | 23/5/68 | 23/5/68 | 23/5/68 | 23/5/68 | 23/5/68 |
| Сундук у стены в покоях Гомеза (gomez-wall-chest) | 6 | 20 | 20/6/75 | 20/6/75 | 20/6/75 | 20/6/75 | 20/6/75 |
| Сундук у кровати Ворона (voran-bedside-chest) | 7 | 9 | 9/7/38 | 9/7/38 | 9/7/38 | 9/7/38 | 9/7/38 |
| Дверь в комнату Арто (arto-room-door) | 5 | 7 | 7/5/31 | 7/5/31 | 7/5/31 | 7/5/31 | 7/5/31 |
| Сундук у дальней кровати Арто (arto-far-bed-chest) | 6 | 11 | 11/5/44 | 11/5/44 | 11/5/44 | 13/5/40 | 13/5/40 |
| Сундук у ближней кровати Арто (arto-near-bed-chest) | 6 | 13 | 13/6/52 | 13/6/52 | 13/6/52 | 13/6/52 | 13/6/52 |
| Дверь на этаже спален покоев (gomez-bedrooms-door) | 6 | 14 | 14/6/49 | 14/6/45 | 14/6/45 | 14/6/45 | 14/6/45 |
| Сундук у дальней кровати (этаж спален) (gomez-bedrooms-far-chest) | 5 | 14 | 14/5/43 | 14/5/43 | 14/5/43 | 16/5/39 | 16/5/39 |
| Сундук у ближней кровати (этаж спален) (gomez-bedrooms-near-chest) | 6 | 12 | 12/6/56 | 12/6/56 | 12/6/56 | 12/6/56 | 12/6/56 |
| Левый сундук в башне Ворона (raven-tower-left-chest) | 6 | 11 | 11/6/35 | 11/6/35 | 11/6/35 | 11/6/35 | 11/6/35 |
| Правый сундук в башне Ворона (raven-tower-right-chest) | 6 | 8 | 8/6/23 | 8/6/23 | 8/6/23 | 8/6/23 | 8/6/23 |
| Сундук у лестницы (2-й этаж башни) (raven-tower-floor2-stairs-chest) | 6 | 16 | 16/6/48 | 16/6/48 | 16/6/48 | 16/6/48 | 16/6/48 |
| Второй сундук на 2-м этаже башни (raven-tower-floor2-chest-2) | 5 | 8 | 8/5/29 | 8/5/29 | 8/5/29 | 9/5/27 | 9/5/27 |
| Сундук у входа (3-й этаж башни) (raven-tower-floor3-entrance-chest) | 5 | 14 | 14/5/44 | 14/5/44 | 14/5/44 | 14/5/44 | 14/5/44 |
| Пустой сундук (3-й этаж башни) (raven-tower-floor3-empty-chest) | 5 | 9 | 9/5/37 | 9/5/41 | 9/5/41 | 9/5/37 | 9/5/37 |
| Сундук с эликсирами (4-й этаж башни) (raven-tower-floor4-elixirs-chest) | 7 | 8 | 8/5/36 | 8/5/36 | 8/5/36 | 8/5/36 | 8/5/36 |
| Сундук с едой (4-й этаж башни) (raven-tower-floor4-food-chest) | 6 | 11 | 11/6/43 | 11/6/43 | 11/6/43 | 11/6/43 | 11/6/43 |
| Сундук на вершине башни Ворона (raven-tower-top-chest) | 6 | 20 | 20/6/48 | 20/6/48 | 20/6/48 | 20/6/48 | 20/6/48 |
| Ящик у огненного ящера (fire-lizard-cave-chest) | 6 | 10 | 10/6/41 | 10/6/41 | 10/6/41 | 10/6/41 | 10/6/41 |
| Сундук в подвале таверны (silas-tavern-basement-chest) | 5 | 9 | 9/5/30 | 9/5/30 | 9/5/30 | 9/5/30 | 9/5/30 |
| Сундук склада таверны (silas-tavern-storeroom-chest) | 6 | 9 | 9/6/31 | 9/6/31 | 9/6/31 | 9/6/31 | 9/6/31 |
| Склад таверны - дверь (silas-tavern-storeroom-door) | 6 | 10 | 10/5/31 | 10/5/31 | 10/5/31 | 10/5/31 | 10/5/31 |
| Сундук в домике напротив Джана (jan-pond-house-chest) | 6 | 8 | 8/6/33 | 8/6/33 | 8/6/33 | 8/6/33 | 8/6/33 |
| Сундук Грэхэма (graham-chest) | 6 | 10 | 10/6/40 | 10/6/40 | 10/6/40 | 10/6/40 | 10/6/40 |
| Сундук Граво (gravo-chest) | 5 | 8 | 8/5/27 | 8/5/27 | 8/5/27 | 8/5/27 | 8/5/27 |
| Сундук Диего (diego-chest) | 6 | 11 | 11/6/40 | 11/6/40 | 11/6/40 | 11/6/40 | 11/6/40 |
| Сундук Грима (grim-chest) | 6 | 8 | 8/6/21 | 8/6/21 | 8/6/21 | 8/6/21 | 8/6/21 |
| Сундук наёмника (у Грима) (mercenary-near-grim-chest) | 6 | 8 | 8/6/25 | 8/6/25 | 8/6/25 | 8/6/25 | 8/6/25 |
| Популярный замок (popular-lock) | 5 | 13 | 13/5/46 | 13/5/46 | 13/5/46 | 13/5/46 | 13/5/46 |
| Сундук в хижине шахты Альберто (alberto-mine-hut-chest) | 5 | 9 | 9/5/36 | 9/5/36 | 9/5/36 | 9/5/36 | 9/5/36 |
| Левый сундук наверху в шахте Альберто (alberto-mine-upstairs-left-chest) | 4 | 4 | 4/3/20 | 4/3/20 | 4/3/20 | 4/3/20 | 4/3/20 |
| Правый сундук наверху в шахте Альберто (alberto-mine-upstairs-right-chest) | 5 | 5 | 5/5/13 | 5/5/13 | 5/5/13 | 5/5/13 | 5/5/13 |
| Дверь на склад охотника Кавалорна (cavalorn-storeroom-door) | 6 | 11 | 11/6/41 | 11/6/41 | 11/6/41 | 11/6/41 | 11/6/41 |
| Сундук у разбойников на пути в Новый лагерь (old-to-new-camp-bandits-chest) | 6 | 10 | 10/5/33 | 10/5/33 | 10/5/33 | 10/5/33 | 10/5/33 |

## Per-lock live timings (min / median / max ms)

| Lock | Matrix A* | Current exact BFS | Original Apache BFS | UnlockMyLoot (live pinned reference) |
| --- | --- | --- | --- | --- |
| Дверь Разрушенной башни (ruined-tower-door) | 3.453076 / 4.894905 / 9.461225 | 13.383326 / 15.879230 / 25.095196 | 77.485881 / 89.626475 / 108.147190 | 79.482874 / 85.138514 / 124.039541 |
| Сундук Скатти (scatty-chest) | 0.142525 / 0.196035 / 0.249545 | 2.278478 / 2.334082 / 3.282669 | 11.299079 / 11.719832 / 14.038151 | 5.317440 / 8.441120 / 15.322403 |
| Сундук Кор Галома (cor-galom-chest) | 0.042824 / 0.055604 / 0.084437 | 0.126440 / 0.129364 / 0.160211 | 0.452561 / 0.472901 / 0.491039 | 0.302695 / 0.322104 / 0.380232 |
| Сундук в спальне Кор Галома (cor-galom-bedroom-chest) | 0.246551 / 0.326311 / 0.409457 | 12.282660 / 12.730003 / 13.442365 | 70.649905 / 72.507640 / 74.428861 | 29.965104 / 30.333097 / 38.597862 |
| Сундук в кузнице Болотного лагеря (swamp-camp-forge-chest) | 0.259761 / 0.270167 / 0.325390 | 17.623635 / 17.761072 / 18.015034 | 105.264304 / 107.644315 / 113.353715 | 35.309474 / 36.690352 / 40.805724 |
| Склад Рисового лорда (3-й этаж) (rice-lord-storeroom) | 0.134772 / 0.161573 / 0.173140 | 1.684364 / 1.698796 / 1.949533 | 8.109772 / 8.252086 / 8.363103 | 4.524297 / 4.608884 / 4.867022 |
| Дверь в покои Гомеза (gomez-chambers-door) | 0.215093 / 0.223496 / 0.400593 | 13.604608 / 15.005065 / 17.201530 | 75.371168 / 80.544472 / 83.780350 | 28.923346 / 30.335060 / 35.090975 |
| Сундук в тронном зале у Гомеза (gomez-throne-hall-chest) | 0.026100 / 0.032078 / 0.038978 | 0.048132 / 0.059740 / 0.069184 | 0.172279 / 0.174662 / 0.182124 | 0.217517 / 0.232931 / 0.250357 |
| Дверь в темнице с расстрелянным призраком (old-camp-dungeon-door) | 2.305849 / 2.374432 / 2.994916 | 14.948962 / 15.437987 / 19.826901 | 82.738222 / 85.220486 / 92.245296 | 39.820161 / 40.373513 / 44.692852 |
| Ключ от темницы Арлина (arlin-dungeon-key) | 7.175456 / 7.301655 / 8.008499 | 7.162446 / 7.257570 / 7.964863 | 43.223462 / 44.592170 / 48.960672 | 20.249175 / 20.278920 / 24.130546 |
| Винный погреб Гомеза (gomez-wine-cellar) | 0.129154 / 0.139761 / 0.273812 | 8.284354 / 8.696474 / 9.232171 | 53.113420 / 53.189675 / 56.717633 | 26.219829 / 26.631778 / 34.844915 |
| Сундук в ногах Гомеза (gomez-bedside-chest) | 1.526797 / 1.601820 / 1.966659 | 1.902642 / 1.977525 / 2.334743 | 9.919945 / 10.484193 / 13.091537 | 8.149832 / 9.029956 / 9.092720 |
| Сундук у стены в покоях Гомеза (gomez-wall-chest) | 5.406093 / 6.001979 / 7.071058 | 15.090584 / 15.563596 / 16.102007 | 91.646635 / 93.952855 / 113.020993 | 80.892425 / 84.377008 / 86.197156 |
| Сундук у кровати Ворона (voran-bedside-chest) | 0.145339 / 0.174232 / 0.406001 | 27.983533 / 30.266828 / 41.618056 | 186.192047 / 190.957032 / 209.451929 | 188.300504 / 203.817561 / 265.421741 |
| Дверь в комнату Арто (arto-room-door) | 0.063265 / 0.073941 / 0.146470 | 0.483347 / 0.533563 / 0.561044 | 2.122744 / 2.239990 / 2.410086 | 4.410926 / 4.537777 / 6.422824 |
| Сундук у дальней кровати Арто (arto-far-bed-chest) | 0.199440 / 0.212210 / 0.331679 | 13.547542 / 13.620272 / 17.535142 | 78.977815 / 79.816627 / 82.365402 | 26.546390 / 26.896837 / 28.641021 |
| Сундук у ближней кровати Арто (arto-near-bed-chest) | 0.501715 / 0.520293 / 0.635606 | 14.866877 / 15.097875 / 16.566135 | 87.328599 / 87.605125 / 92.911028 | 69.048957 / 72.456504 / 82.421887 |
| Дверь на этаже спален покоев (gomez-bedrooms-door) | 5.449188 / 5.570851 / 6.123373 | 16.233054 / 16.523340 / 16.799676 | 92.039477 / 92.593561 / 92.853461 | 35.486030 / 36.058741 / 38.373735 |
| Сундук у дальней кровати (этаж спален) (gomez-bedrooms-far-chest) | 1.495080 / 1.962974 / 3.205933 | 2.072988 / 2.326961 / 3.976503 | 10.662161 / 11.987535 / 16.185301 | 5.977914 / 6.535844 / 8.364805 |
| Сундук у ближней кровати (этаж спален) (gomez-bedrooms-near-chest) | 0.117467 / 0.145089 / 0.159089 | 11.567103 / 11.670178 / 13.297066 | 65.116330 / 67.716052 / 95.263267 | 38.933377 / 41.407109 / 46.798349 |
| Левый сундук в башне Ворона (raven-tower-left-chest) | 1.332885 / 1.474369 / 2.742176 | 15.653531 / 16.923682 / 19.095039 | 94.090833 / 94.919509 / 95.294274 | 45.368709 / 47.149768 / 51.969109 |
| Правый сундук в башне Ворона (raven-tower-right-chest) | 0.144518 / 0.151548 / 0.180031 | 5.558523 / 6.447561 / 7.085630 | 31.400143 / 35.750863 / 38.894498 | 15.234651 / 15.675303 / 17.539329 |
| Сундук у лестницы (2-й этаж башни) (raven-tower-floor2-stairs-chest) | 4.273090 / 4.441643 / 7.479363 | 13.366460 / 13.868456 / 14.569059 | 80.161436 / 84.439873 / 86.146727 | 51.243917 / 52.779582 / 64.885643 |
| Второй сундук на 2-м этаже башни (raven-tower-floor2-chest-2) | 0.175905 / 0.199640 / 0.234653 | 2.012869 / 2.088602 / 2.346571 | 9.323398 / 9.793506 / 10.253748 | 2.983339 / 3.196580 / 3.440537 |
| Сундук у входа (3-й этаж башни) (raven-tower-floor3-entrance-chest) | 0.637650 / 0.707324 / 0.769047 | 1.540648 / 1.640669 / 3.248508 | 7.454707 / 8.776225 / 12.391845 | 6.350916 / 6.698889 / 9.026892 |
| Пустой сундук (3-й этаж башни) (raven-tower-floor3-empty-chest) | 0.070116 / 0.089505 / 0.095594 | 1.448309 / 1.461428 / 1.837645 | 8.154039 / 8.421802 / 8.643385 | 5.290109 / 5.552194 / 6.112657 |
| Сундук с эликсирами (4-й этаж башни) (raven-tower-floor4-elixirs-chest) | 0.109254 / 0.112309 / 0.136195 | 11.040161 / 11.221093 / 12.678586 | 73.129320 / 75.167478 / 82.039156 | 107.461847 / 112.569413 / 114.667008 |
| Сундук с едой (4-й этаж башни) (raven-tower-floor4-food-chest) | 0.267202 / 0.275865 / 0.295515 | 15.084486 / 15.373972 / 15.722726 | 90.678285 / 96.314105 / 109.625183 | 51.325845 / 52.314011 / 71.146988 |
| Сундук на вершине башни Ворона (raven-tower-top-chest) | 7.054034 / 7.251361 / 7.770963 | 11.989059 / 12.636073 / 14.032354 | 78.873203 / 82.082342 / 83.192121 | 43.022872 / 43.437415 / 48.328646 |
| Ящик у огненного ящера (fire-lizard-cave-chest) | 0.171709 / 0.175704 / 0.258559 | 10.301790 / 10.657055 / 11.986535 | 63.810299 / 64.970214 / 67.822405 | 53.291162 / 55.654889 / 69.187811 |
| Сундук в подвале таверны (silas-tavern-basement-chest) | 0.086651 / 0.114051 / 0.125208 | 1.361138 / 1.583773 / 2.494533 | 6.591978 / 7.191901 / 9.724732 | 3.855982 / 3.980659 / 4.069674 |
| Сундук склада таверны (silas-tavern-storeroom-chest) | 0.103596 / 0.105509 / 0.130747 | 13.265009 / 13.681646 / 15.403706 | 86.416723 / 90.603633 / 94.456980 | 30.445969 / 30.779861 / 31.124511 |
| Склад таверны - дверь (silas-tavern-storeroom-door) | 0.170056 / 0.175664 / 0.191708 | 13.175474 / 13.437288 / 14.941331 | 75.461670 / 81.038310 / 83.869430 | 22.194804 / 22.875538 / 24.601695 |
| Сундук в домике напротив Джана (jan-pond-house-chest) | 0.098569 / 0.103966 / 0.105930 | 6.958811 / 7.156618 / 8.019226 | 44.521017 / 45.811578 / 47.468221 | 47.224825 / 47.618628 / 48.630679 |
| Сундук Грэхэма (graham-chest) | 0.105608 / 0.109424 / 0.138429 | 16.359714 / 17.144644 / 18.131960 | 99.469936 / 101.199529 / 103.562794 | 30.639528 / 33.141643 / 36.963954 |
| Сундук Граво (gravo-chest) | 0.061162 / 0.071658 / 0.113180 | 1.004722 / 1.107086 / 1.167787 | 5.293044 / 5.463670 / 5.936682 | 5.050748 / 5.359533 / 5.448868 |
| Сундук Диего (diego-chest) | 0.159910 / 0.162244 / 0.215634 | 12.245143 / 12.377212 / 13.043719 | 79.944612 / 82.868842 / 86.734019 | 28.887343 / 29.897692 / 32.130710 |
| Сундук Грима (grim-chest) | 0.199200 / 0.213581 / 0.528836 | 16.700641 / 16.907052 / 18.926581 | 100.218671 / 106.557810 / 116.943629 | 19.493485 / 20.138955 / 20.343854 |
| Сундук наёмника (у Грима) (mercenary-near-grim-chest) | 0.091758 / 0.098238 / 0.118909 | 15.047443 / 15.120403 / 15.504441 | 93.219770 / 96.119853 / 100.796931 | 28.609512 / 29.191117 / 34.457432 |
| Популярный замок (popular-lock) | 0.550629 / 0.571239 / 0.592822 | 1.910796 / 1.922192 / 1.952307 | 9.808651 / 9.924765 / 10.116053 | 5.526196 / 5.561629 / 5.680868 |
| Сундук в хижине шахты Альберто (alberto-mine-hut-chest) | 0.059810 / 0.065548 / 0.097607 | 1.766468 / 1.777285 / 1.806328 | 8.646632 / 9.241657 / 10.841905 | 5.200596 / 5.284802 / 5.329430 |
| Левый сундук наверху в шахте Альберто (alberto-mine-upstairs-left-chest) | 0.015704 / 0.018408 / 0.030526 | 0.013030 / 0.014802 / 0.015343 | 0.034912 / 0.038548 / 0.046410 | 0.198168 / 0.210096 / 0.235705 |
| Правый сундук наверху в шахте Альберто (alberto-mine-upstairs-right-chest) | 0.026289 / 0.032729 / 0.050536 | 0.496917 / 0.510779 / 0.644560 | 2.125088 / 2.144357 / 2.693213 | 1.517594 / 1.549391 / 1.567980 |
| Дверь на склад охотника Кавалорна (cavalorn-storeroom-door) | 0.236295 / 0.238709 / 0.242344 | 13.715700 / 13.902150 / 14.243180 | 79.491600 / 81.640773 / 90.801756 | 40.194055 / 40.408977 / 42.256058 |
| Сундук у разбойников на пути в Новый лагерь (old-to-new-camp-bandits-chest) | 0.411970 / 0.431309 / 0.438249 | 9.617881 / 9.699493 / 11.340953 | 61.399960 / 66.138349 / 66.895689 | 24.716668 / 25.806637 / 27.208237 |

## Correctness checks

- Every warmup and measured solution independently replayed one division at a time.
- Matrix A*, exact BFS, and original Apache BFS equal the stored exact action minimum.
- Current BFS preserves the pinned original BFS command sequence.
- Inputs are unchanged and every implementation returns a deterministic path.
- Live reference path and A/U/C equal the cached pinned observation.

## Limits of the conclusions

- These are 45 fixed catalog configurations, not a random sample or a claim about every game state.
- Only actions (A) are minimized by the production solver; distinct plates (U) and unit divisions (C) are descriptive metrics.
- The reference minimizes unit divisions before plate switches; its objective differs from minimum grouped actions.
- Timing reflects this runtime, machine, sample count, JIT and garbage collection; no timing threshold is a correctness gate.
- These are Node.js timings, not measurements in an actual browser or Web Worker.
- Cached historical timings are provenance only and are excluded from current speed comparisons.
- The sum of per-lock medians is an aggregate of medians, not the median runtime of a whole-catalog pass.
- Speedup ratios above 1 favor matrix A*; ratios below 1 favor the comparator. Timing ties require equal measured medians.

The JSON report includes individual samples and independently verified command sequences. Cached observations never supply values to the live timing table.
