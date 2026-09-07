/** Resource failures are deliberately distinct from a proof of unreachability. */
export class SearchLimitError extends Error {
  constructor(limit, maximum, used, options) {
    super(`Превышен ресурсный предел поиска: ${limit} (предел ${maximum}, требуется ${used}).`, options);
    this.name = 'SearchLimitError';
    this.limit = limit;
    this.maximum = maximum;
    this.used = used;
  }
}

const DEFAULTS = Object.freeze({
  maxVisited: 2_000_000,
  maxExpanded: 1_000_000,
  maxFrontier: 1_000_000,
  maxDenseBytes: 64 * 1024 * 1024,
});

export function normalizeSearchOptions(options = {}) {
  if (options === null || typeof options !== 'object' || Array.isArray(options)) {
    throw new TypeError('Параметры поиска должны быть объектом.');
  }
  const algorithm = options.algorithm === undefined ? 'matrix-astar' : options.algorithm;
  if (algorithm !== 'matrix-astar' && algorithm !== 'bfs') {
    throw new TypeError('algorithm должен быть matrix-astar или bfs.');
  }
  const result = { algorithm };
  for (const [name, fallback] of Object.entries(DEFAULTS)) {
    const value = options[name] === undefined ? fallback : options[name];
    const minimum = name === 'maxVisited' || name === 'maxFrontier' ? 1 : 0;
    if (!Number.isSafeInteger(value) || value < minimum) {
      throw new TypeError(`${name} должен быть безопасным целым числом не меньше ${minimum}.`);
    }
    result[name] = value;
  }
  return result;
}

export class SearchBudget {
  constructor(options) {
    this.options = options;
    this.visited = 0;
    this.expanded = 0;
  }

  check(name, used) {
    if (used > this.options[name]) throw new SearchLimitError(name, this.options[name], used);
  }

  visit() {
    this.check('maxVisited', this.visited + 1);
    this.visited += 1;
  }

  expand() {
    this.check('maxExpanded', this.expanded + 1);
    this.expanded += 1;
  }
}

/** Validate encoding before matrix work, early returns, or dense allocation. */
export function prepareSearch({ state, links }) {
  const n = state.length;
  const size = 7 ** n;
  if (!Number.isSafeInteger(size)) {
    throw new SearchLimitError('stateEncoding', Number.MAX_SAFE_INTEGER, size);
  }
  const powers = Array.from({ length: n }, (_, index) => 7 ** (n - index - 1));
  let source = 0;
  let goal = 0;
  for (let index = 0; index < n; index += 1) {
    source += (state[index] - 1) * powers[index];
    goal += 3 * powers[index];
  }
  const effects = links.map((row, plate) => {
    const targets = [];
    const signs = [];
    let offset = 0;
    for (let target = 0; target < n; target += 1) {
      const sign = plate === target ? 1 : row[target];
      if (sign === 0) continue;
      targets.push(target);
      signs.push(sign);
      offset += sign * powers[target];
    }
    return { targets, signs, offset };
  });
  return { n, size, source, goal, effects };
}

export function decodeDigits(code, digits) {
  for (let index = digits.length - 1; index >= 0; index -= 1) {
    digits[index] = code % 7;
    code = Math.floor(code / 7);
  }
}

export function movementLimits(digits, effect) {
  let plus = 6;
  let minus = 6;
  for (let index = 0; index < effect.targets.length; index += 1) {
    const position = digits[effect.targets[index]];
    if (effect.signs[index] === 1) {
      if (6 - position < plus) plus = 6 - position;
      if (position < minus) minus = position;
    } else {
      if (position < plus) plus = position;
      if (6 - position < minus) minus = 6 - position;
    }
  }
  return [plus, minus];
}

export function commandFor(plate, delta) {
  return { plate: plate + 1, direction: delta > 0 ? 'left' : 'right', steps: Math.abs(delta) };
}
