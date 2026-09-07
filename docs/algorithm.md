# Model, optimality and computational complexity

## Objective and coordinates

The state is a vector `x` of N integers in 1–7. The UI's grid visualizes this
vector; the dependency matrix `L` is N×N, with `L[source][target]` describing a
direct influence. Its diagonal is zero. Effects do not cascade.

A command `[i, k]`, where `i` is zero-based and `k` is one of −6…−1 or +1…+6,
costs one **action**. It changes the selected pin and its directly linked pins.
Every intermediate pin position must remain in 1–7. An illegal action is blocked
in its entirety.

| Metric | Definition |
| --- | --- |
| A | Number of commands, or grouped actions |
| U | Number of distinct selected plates, excluding indirectly affected plates |
| C | Number of unit shifts: sum of absolute command deltas |
| Switches | Changes of selected plate between adjacent commands |

A successfully returned solution minimizes A. Minimum U or C among equal-A
solutions is not a general guarantee. An optimal action sequence never has two
adjacent commands selecting the same plate: movements in the same direction can
be combined, and opposite movements can be cancelled. The combined displacement
still lies within the plate's six-position travel range. Thus a nonempty shortest
solution has A−1 switches, although it may revisit a plate later and have U<A.

The pinned Unlock My Loot implementation first minimizes C and then A among
minimum-C paths. A lower action count can therefore come with more unit shifts.
Neither metric alone measures actual player time, which also depends on controls
and animation.

## The matrix equation

Using column vectors, define the effect matrix `M = I + Lᵀ`. One legal command is

```math
x' = x + k M e_i, \qquad 1 \le x'_j \le 7.
```

Each component moves monotonically within a command. From a valid starting state,
checking its endpoint bounds is therefore equivalent to checking every unit shift.
The independent test oracle nevertheless replays each shift separately.

Let `z_i` be the total signed displacement contributed by selecting plate i along
the entire solution. Every successful path satisfies

```math
Mz = g-x, \qquad g=(4,\ldots,4), \qquad z\in\mathbb{Z}^{N}.
```

This is necessary, but does not supply a legal command order. For three mutually
reverse-linked plates, M has ones on its diagonal and −1 everywhere else.
From `[1,1,1]`, the unique integer balance is `[-3,-3,-3]`, yet no first action
is legal. From `[3,1,1]`, the balance is `[-3,-2,-2]`, but four actions are required:

| State before | Command | State after |
| --- | --- | --- |
| `[3,1,1]` | `[0,-2]` | `[1,3,3]` |
| `[1,3,3]` | `[2,-2]` | `[3,5,1]` |
| `[3,5,1]` | `[1,-2]` | `[5,3,3]` |
| `[5,3,3]` | `[0,-1]` | `[4,4,4]` |

Three nonzero balance components do not guarantee a three-action solution.

## Exact analysis, certificate and search

1. Gauss–Jordan elimination over normalized `BigInt` rational numbers checks
   consistency without floating-point tolerances. An inconsistent system proves
   unreachability. For a nonsingular matrix, a unique noninteger balance also
   proves that no path exists.
2. A consistent singular system uses exact BFS over legal grouped actions.
   A particular rational solution cannot exclude other integer solutions.
3. For a unique integer balance, a sufficient certificate is attempted first.
   If every `abs(z_i) <= 6` and each nonzero component can be executed as a single
   legal action, the result reaches the lower bound and is globally optimal.
   The first currently legal plate by index is selected. Failure of this greedy
   attempt proves nothing: the complete A* search then starts from the initial state.
4. A* maintains the residual balance `r = M⁻¹(g−x)` and uses

```math
h(x) = \sum_i \left\lceil |r_i|/6 ightceil.
```

One action changes only one residual component, by at most six. That component
requires at least `ceil(abs(r_i)/6)` actions, so h is admissible. It is also
consistent: `h(x) <= 1 + h(x')` on every edge. Consequently the first goal removed
from the priority queue has minimum action count, and closed states need not be
reopened. An indexed heap decreases priorities in place, without retaining stale
copies of open nodes.

BFS also has unit-cost edges and therefore returns the same minimum A. Its
neighbor order is ascending plate index, positive then negative displacement,
and larger displacement first. A* has deterministic ordering but may choose a
different equal-A path. Only one `solveLock` facade is public; callers do not
select a search implementation.

## Complexity

Let S=7ᴺ, V≤S be the number of discovered states and Q≤V the maximum frontier.
A state has at most 6N neighbors: each plate has a total of at most six available
nonzero displacements across both directions.

| Stage | Time | Memory |
| --- | --- | --- |
| Rational Gauss–Jordan | O(N³) rational operations | O(N²) rational values |
| Sufficient certificate | O(N³) worst case | O(N²), including effects |
| Sparse BFS | O(N²V) | O(V+Q+N²) |
| Dense BFS | O(S+N²V), including initialization | O(S+Qcap+N²) |
| A* after matrix analysis | O(N²V+NV log V) | O(NV+N²) |

Qcap is the preallocated dense queue capacity, bounded by the search budgets.
O(N³) rational operations is not O(N³) bit operations: exact arithmetic costs
increase with numerator/denominator bit length. Search bounds use the usual unit
cost model for safe JS numbers and expected O(1) Map operations.

The matrix heuristic reduces search on the benchmark corpus; the exponential
worst case remains. There is no universal tens-of-milliseconds guarantee.

## Computation limits

The domain accepts N≥2. The current base-7 numeric encoding needs a safe integer
`7 ** N`, allowing N≤18. N≥19 throws `SearchLimitError`, including already open
inputs. This is a representation limit, not a claimed game limit.

| Internal budget | Default | Meaning |
| --- | ---: | --- |
| `maxVisited` | 2,000,000 | Discovered states |
| `maxExpanded` | 1,000,000 | Expanded states |
| `maxFrontier` | 1,000,000 | Pending states |
| `maxDenseBytes` | 67,108,864 | Dense BFS allocation threshold |

These are internal defaults, not a third public options parameter. Dense bytes
are not a whole-process memory cap: above that allocation threshold BFS uses
sparse storage. Map objects, A* vectors and engine overhead are controlled
indirectly by state budgets. Resource exhaustion throws `SearchLimitError`, never
`null`. The successful certificate also obeys the path-length budget.

The solver is synchronous and platform-independent. An integrator can put it in
a Worker to keep a browser interface responsive. Real Chromium, Firefox and
WebKit tests exercise the unchanged distributed files and Worker imports.

## Evidence and scope

Catalog tests independently replay all 45 paths and verify minimum action counts.
A separate exhaustive oracle checks all 441 two-plate configurations and 192
seeded three-plate configurations. Counterexamples cover fractional balances,
inconsistency, singularity, blocked ordering, boundaries and repeated plate use.

These tests establish implementation behavior on their inputs. The general
minimum-A guarantee follows from the search proof, not the number of tests.
The [benchmark harness](../benchmarks/README.md) compares candidate, preserved
matrix reference, original BFS and an optional pinned upstream checkout in one
runtime, with separate timing and process-memory measurements. Reports identify
the exact sources, machine and runtime; Node measurements are not measurements
of a phone or browser.
