# Pinned Apache BFS baseline

`src/` and `LICENSE` are byte-for-byte copies from
[Marcus-Rise/gothic-lock-solver](https://github.com/Marcus-Rise/gothic-lock-solver/tree/a87e739a22ccc4215d6d9b14fa06b0738171cb60),
commit `a87e739a22ccc4215d6d9b14fa06b0738171cb60`, under Apache License 2.0.
`manifest.json` records each original file's SHA-256. The benchmark checks these
hashes before measuring the baseline's public `solveLock` facade. The original
algorithm, validation, transition ordering, result construction, and relative
imports are unchanged. This snapshot intentionally preserves the old N <= 7 API.

UnlockMyLoot solver code is not distributed here. Its optional comparison loads
the unchanged, hash-verified function from a separately supplied checkout.
