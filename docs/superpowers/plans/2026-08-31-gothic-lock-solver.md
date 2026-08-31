# План реализации решателя замков Gothic 1 Remake

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Создать проверяемую Node.js CLI-утилиту, которая по состоянию замка и направленной матрице связей находит минимальную последовательность сгруппированных команд `пластина + направление + xN`.

**Status:** Выполнен 2026-08-31. Все задачи реализованы и проверены.

**Architecture:** Вычислительное ядро состоит из чистых ESM-модулей: валидация модели, кодирование состояния, переходы и поиск в ширину. CLI отвечает только за файлы, аргументы, форматирование и коды выхода; благодаря этому ядро позднее можно напрямую использовать на сайте.

**Tech Stack:** Node.js 20+, pnpm, JavaScript ESM (`.mjs`), встроенные `node:test`, `node:assert`, `node:fs`, `node:child_process`; сторонних runtime- и test-зависимостей нет.

**Spec:** `../specs/2026-08-31-gothic-lock-solver.md`

## Global Constraints

- Число пластин: от 2 до 7; у каждой ровно 7 позиций.
- Цель: все пластины в позиции `4`.
- Влево означает `+1`, вправо означает `-1`.
- Матрица направленная, коэффициенты только `-1`, `0`, `1`, диагональ только `0`.
- Связи применяются один раз от выбранной строки, без обратного вывода связей и без каскада.
- Если хотя бы одна затронутая пластина не может пройти все `steps`, команда полностью заблокирована.
- Стоимость каждого допустимого макрохода `x1..x6` равна одной команде.
- Среди кратчайших решений порядок действий: пластина по возрастанию, `left` перед `right`, большее `steps` перед меньшим.
- Состояния кодируются числами в системе счисления по основанию 7; BFS использует типизированные массивы.
- Ядро не читает и не пишет файлы и не зависит от CLI.
- Пользовательские сообщения CLI выводятся по-русски; значения `direction` в JSON: только `left` и `right`.
- Грамматика CLI строгая: `<lock.json>` либо `<lock.json> --output <solution.json>`; неизвестные флаги и лишние аргументы дают код `1`.
- Дополнительные свойства входного JSON игнорируются; нормализованная модель содержит только `state` и `links`.
- Обычный результат идет в stdout, ошибки - в stderr; `unsolvable` с `--output` сначала записывает JSON, затем завершает процесс кодом `2`.
- PDF не используется. Сайт, распознавание изображений, база известных замков и преждевременная оптимизация не входят в план.
- Разработка идет по TDD: сначала наблюдаемый правильный провал теста, затем минимальная реализация, затем полный зеленый прогон.

---

## Карта файлов

| Файл | Ответственность |
|---|---|
| `package.json` | Метаданные Node.js, команды `test` и `solve`, ограничение Node.js 20+. |
| `.gitignore` | Исключение временных данных, зависимостей и приложенных исходных материалов. |
| `solve-lock.mjs` | Минимальная исполняемая точка входа. |
| `src/lock-definition.mjs` | Разбор JSON и полная валидация определения замка. |
| `src/state-codec.mjs` | Кодирование и декодирование состояний в base-7. |
| `src/transition.mjs` | Атомарное применение команды и генерация переходов в стабильном порядке. |
| `src/solver.mjs` | BFS, массивы родителей и восстановление кратчайшего пути. |
| `src/result.mjs` | Формирование JSON-результата, метрик и русского консольного текста. |
| `src/index.mjs` | Стабильный website-safe facade `solveLock` вычислительного ядра. |
| `src/cli.mjs` | Разбор аргументов, чтение/запись файлов и коды завершения. |
| `test/*.test.mjs` | Модульные, дифференциальные и интеграционные тесты. |
| `examples/lock.example.json` | Проверяемый пример входного замка. |
| `scripts/benchmark.mjs` | Ручное измерение предельного семипластинчатого случая. |
| `.codex/skills/gothic-lock-solver/` | Проектный skill интерактивного сбора модели и запуска решателя. |

---

### Task 1: Каркас проекта и валидация определения замка

**Files:**
- Create: `package.json`
- Create: `.gitignore`
- Create: `src/lock-definition.mjs`
- Create: `test/lock-definition.test.mjs`
- Include in first commit: `docs/superpowers/specs/2026-08-31-gothic-lock-solver.md`
- Include in first commit: `docs/superpowers/plans/2026-08-31-gothic-lock-solver.md`

**Interfaces:**
- Consumes: строку JSON или неизвестное JavaScript-значение.
- Produces: `LockInputError`, `parseLockDefinition(text)`, `validateLockDefinition(value)`.
- Return shape: `{ state: number[], links: number[][] }`; функции возвращают защитные копии массивов.

- [x] **Step 1: Подготовить Git без затрагивания приложенного PDF**

Run:

```bash
git rev-parse --is-inside-work-tree
```

Expected: если команда завершается ошибкой, выполнить `git init`. Не добавлять `project_sources/` в индекс.

Run:

```bash
mkdir -p src test
```

Expected: каталоги для первых production- и test-файлов существуют.

- [x] **Step 2: Создать падающие тесты валидации**

```js
// test/lock-definition.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  LockInputError,
  parseLockDefinition,
  validateLockDefinition,
} from '../src/lock-definition.mjs';

const validLock = {
  state: [7, 4, 1],
  links: [
    [0, 1, -1],
    [0, 0, 0],
    [1, 0, 0],
  ],
};

test('validateLockDefinition accepts and copies a valid directed lock', () => {
  const result = validateLockDefinition(validLock);
  assert.deepEqual(result, validLock);
  assert.notEqual(result.state, validLock.state);
  assert.notEqual(result.links[0], validLock.links[0]);
});

for (const [name, value, message] of [
  ['requires 2 to 7 plates', { state: [4], links: [[0]] }, /от 2 до 7/],
  ['rejects a position outside 1..7', { ...validLock, state: [7, 8, 1] }, /state\[1\]/],
  ['requires a square matrix', { ...validLock, links: [[0], [0], [0]] }, /links\[0\]/],
  ['rejects an unknown coefficient', { ...validLock, links: [[0, 2, 0], [0, 0, 0], [0, 0, 0]] }, /-1, 0 или 1/],
  ['requires a zero diagonal', { ...validLock, links: [[1, 0, 0], [0, 0, 0], [0, 0, 0]] }, /диагонали/],
]) {
  test(name, () => {
    assert.throws(() => validateLockDefinition(value), message);
  });
}

test('parseLockDefinition reports malformed JSON as LockInputError', () => {
  assert.throws(
    () => parseLockDefinition('{'),
    (error) => error instanceof LockInputError && /Некорректный JSON/.test(error.message),
  );
});
```

- [x] **Step 3: Запустить тест и увидеть правильный RED**

Run:

```bash
node --test test/lock-definition.test.mjs
```

Expected: FAIL с `ERR_MODULE_NOT_FOUND` для `src/lock-definition.mjs`.

- [x] **Step 4: Создать минимальный проект и реализацию валидации**

```json
{
  "name": "gothic-lock-solver",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "engines": {
    "node": ">=20"
  },
  "scripts": {
    "test": "node --test"
  }
}
```

```gitignore
# .gitignore
node_modules/
coverage/
*.tmp
project_sources/
```

```js
// src/lock-definition.mjs
export class LockInputError extends Error {
  constructor(message, options) {
    super(message, options);
    this.name = 'LockInputError';
  }
}

export function validateLockDefinition(value) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new LockInputError('Определение замка должно быть JSON-объектом.');
  }

  const { state, links } = value;
  if (!Array.isArray(state) || state.length < 2 || state.length > 7) {
    throw new LockInputError('state должен содержать от 2 до 7 пластин.');
  }

  state.forEach((position, index) => {
    if (!Number.isInteger(position) || position < 1 || position > 7) {
      throw new LockInputError(`state[${index}] должен быть целым числом от 1 до 7.`);
    }
  });

  if (!Array.isArray(links) || links.length !== state.length) {
    throw new LockInputError(`links должен быть матрицей ${state.length}x${state.length}.`);
  }

  links.forEach((row, rowIndex) => {
    if (!Array.isArray(row) || row.length !== state.length) {
      throw new LockInputError(`links[${rowIndex}] должен содержать ${state.length} элементов.`);
    }
    row.forEach((coefficient, columnIndex) => {
      if (![ -1, 0, 1 ].includes(coefficient)) {
        throw new LockInputError(`links[${rowIndex}][${columnIndex}] должен быть -1, 0 или 1.`);
      }
      if (rowIndex === columnIndex && coefficient !== 0) {
        throw new LockInputError(`links[${rowIndex}][${columnIndex}] на диагонали должен быть 0.`);
      }
    });
  });

  return {
    state: [...state],
    links: links.map((row) => [...row]),
  };
}

export function parseLockDefinition(text) {
  try {
    return validateLockDefinition(JSON.parse(text));
  } catch (error) {
    if (error instanceof LockInputError) {
      throw error;
    }
    throw new LockInputError(`Некорректный JSON: ${error.message}`, { cause: error });
  }
}
```

- [x] **Step 5: Запустить тесты и увидеть GREEN**

Run:

```bash
pnpm test
```

Expected: все тесты `lock-definition` PASS.

- [x] **Step 6: Зафиксировать первый самостоятельно проверяемый результат**

```bash
git add .gitignore package.json docs/superpowers/specs/2026-08-31-gothic-lock-solver.md docs/superpowers/plans/2026-08-31-gothic-lock-solver.md src/lock-definition.mjs test/lock-definition.test.mjs
git commit -m "feat: validate Gothic lock definitions"
```

---

### Task 2: Числовой кодек состояний

**Files:**
- Create: `src/state-codec.mjs`
- Create: `test/state-codec.test.mjs`

**Interfaces:**
- Consumes: `state: number[]`, `code: number`, `plateCount: number`.
- Produces: `stateSpaceSize(plateCount)`, `encodeState(state)`, `decodeState(code, plateCount)`, `createTargetState(plateCount)`.
- Encoding invariant: `[1, 1] -> 0`, `[7, 7] -> 48`, любой валидный вектор проходит round-trip без изменений.
- Порядок разрядов: `state[0]` - старший base-7 разряд; обязательный `plateCount` при декодировании сохраняет ведущие позиции `1`.

- [x] **Step 1: Написать падающий тест кодека**

```js
// test/state-codec.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createTargetState,
  decodeState,
  encodeState,
  stateSpaceSize,
} from '../src/state-codec.mjs';

test('base-7 encoding has stable boundary values', () => {
  assert.equal(encodeState([1, 1]), 0);
  assert.equal(encodeState([7, 7]), 48);
  assert.equal(stateSpaceSize(7), 823_543);
});

test('encodeState and decodeState round-trip a seven-plate state', () => {
  const state = [7, 4, 1, 3, 6, 2, 5];
  assert.deepEqual(decodeState(encodeState(state), state.length), state);
});

test('createTargetState creates only center positions', () => {
  assert.deepEqual(createTargetState(5), [4, 4, 4, 4, 4]);
});
```

- [x] **Step 2: Подтвердить RED**

Run: `node --test test/state-codec.test.mjs`  
Expected: FAIL с `ERR_MODULE_NOT_FOUND`.

- [x] **Step 3: Реализовать кодек без файловых и CLI-зависимостей**

```js
// src/state-codec.mjs
export function stateSpaceSize(plateCount) {
  return 7 ** plateCount;
}

export function encodeState(state) {
  let code = 0;
  for (const position of state) {
    code = code * 7 + (position - 1);
  }
  return code;
}

export function decodeState(code, plateCount) {
  const state = new Array(plateCount);
  let remainder = code;
  for (let index = plateCount - 1; index >= 0; index -= 1) {
    state[index] = (remainder % 7) + 1;
    remainder = Math.floor(remainder / 7);
  }
  return state;
}

export function createTargetState(plateCount) {
  return Array.from({ length: plateCount }, () => 4);
}
```

- [x] **Step 4: Подтвердить GREEN и отсутствие регрессии**

Run: `pnpm test`  
Expected: тесты `lock-definition` и `state-codec` PASS.

- [x] **Step 5: Commit**

```bash
git add src/state-codec.mjs test/state-codec.test.mjs
git commit -m "feat: encode lock states as base-7 integers"
```

---

### Task 3: Атомарные макрокоманды и стабильный генератор переходов

**Files:**
- Create: `src/transition.mjs`
- Create: `test/transition.test.mjs`

**Interfaces:**
- Consumes: `state`, `links`, `command`.
- Produces: `applyCommand(state, links, command): number[] | null`.
- Produces: `generateTransitions(state, links): Array<{ command, state }>`.
- Public command shape: `{ plate: number, direction: 'left' | 'right', steps: number }`; `plate` is one-based, `steps` is 1..6.
- `null` means the whole command is blocked; input arrays remain unchanged.

- [x] **Step 1: Написать падающие тесты направления, инверсии, отсутствия каскада и блокировки**

```js
// test/transition.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { applyCommand, generateTransitions } from '../src/transition.mjs';

test('applyCommand moves direct and inverse links by the full step count', () => {
  const state = [3, 5, 4];
  const links = [
    [0, 1, -1],
    [0, 0, 0],
    [0, 0, 0],
  ];
  const result = applyCommand(state, links, { plate: 1, direction: 'left', steps: 2 });
  assert.deepEqual(result, [5, 7, 2]);
  assert.deepEqual(state, [3, 5, 4]);
});

test('applyCommand does not cascade through a moved target row', () => {
  const links = [
    [0, 1, 0],
    [0, 0, 1],
    [0, 0, 0],
  ];
  assert.deepEqual(
    applyCommand([3, 5, 4], links, { plate: 1, direction: 'left', steps: 2 }),
    [5, 7, 4],
  );
});

test('applyCommand atomically blocks when one linked plate cannot finish', () => {
  const state = [3, 6];
  const links = [[0, 1], [0, 0]];
  assert.deepEqual(
    applyCommand(state, links, { plate: 1, direction: 'left', steps: 1 }),
    [4, 7],
  );
  assert.equal(
    applyCommand(state, links, { plate: 1, direction: 'left', steps: 2 }),
    null,
  );
  assert.deepEqual(state, [3, 6]);
});

test('a directed source row does not imply a reverse link', () => {
  const links = [[0, 1], [0, 0]];
  assert.deepEqual(
    applyCommand([3, 5], links, { plate: 2, direction: 'right', steps: 1 }),
    [3, 4],
  );
});

test('generateTransitions uses plate, direction, descending steps order', () => {
  const transitions = generateTransitions([4, 4], [[0, 0], [0, 0]]);
  assert.deepEqual(
    transitions.slice(0, 6).map(({ command }) => command),
    [
      { plate: 1, direction: 'left', steps: 3 },
      { plate: 1, direction: 'left', steps: 2 },
      { plate: 1, direction: 'left', steps: 1 },
      { plate: 1, direction: 'right', steps: 3 },
      { plate: 1, direction: 'right', steps: 2 },
      { plate: 1, direction: 'right', steps: 1 },
    ],
  );
});
```

- [x] **Step 2: Подтвердить RED**

Run: `node --test test/transition.test.mjs`  
Expected: FAIL с `ERR_MODULE_NOT_FOUND`.

- [x] **Step 3: Реализовать один атомарный переход и генератор**

```js
// src/transition.mjs
const DIRECTIONS = ['left', 'right'];

export function applyCommand(state, links, command) {
  const sourceIndex = command.plate - 1;
  const directionDelta = command.direction === 'left' ? 1 : -1;
  const nextState = [...state];

  for (let targetIndex = 0; targetIndex < state.length; targetIndex += 1) {
    const coefficient = targetIndex === sourceIndex
      ? 1
      : links[sourceIndex][targetIndex];

    if (coefficient === 0) {
      continue;
    }

    const nextPosition = state[targetIndex]
      + directionDelta * coefficient * command.steps;
    if (nextPosition < 1 || nextPosition > 7) {
      return null;
    }
    nextState[targetIndex] = nextPosition;
  }

  return nextState;
}

export function generateTransitions(state, links) {
  const transitions = [];
  for (let plate = 1; plate <= state.length; plate += 1) {
    const sourcePosition = state[plate - 1];
    for (const direction of DIRECTIONS) {
      const sourceLimit = direction === 'left'
        ? 7 - sourcePosition
        : sourcePosition - 1;
      for (let steps = sourceLimit; steps >= 1; steps -= 1) {
        const command = { plate, direction, steps };
        const nextState = applyCommand(state, links, command);
        if (nextState !== null) {
          transitions.push({ command, state: nextState });
        }
      }
    }
  }
  return transitions;
}
```

- [x] **Step 4: Подтвердить GREEN полным прогоном**

Run: `pnpm test`  
Expected: все тесты PASS.

- [x] **Step 5: Commit**

```bash
git add src/transition.mjs test/transition.test.mjs
git commit -m "feat: model atomic linked plate commands"
```

---

### Task 4: BFS и восстановление минимальной комбинации

**Files:**
- Create: `src/solver.mjs`
- Create: `test/solver.test.mjs`

**Interfaces:**
- Consumes: проверенный объект `{ state, links }`.
- Produces: `findShortestCommands(definition): Command[] | null`.
- `[]` означает уже открытый замок; `null` означает недостижимую цель.
- Внутренние `packCommand`/`unpackCommand` кодируют одну команду в `Uint8Array`.

- [x] **Step 1: Написать падающие тесты готовой цели, макрооптимальности, tie-break и недостижимости**

```js
// test/solver.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  findShortestCommands,
  packCommand,
  unpackCommand,
} from '../src/solver.mjs';

const noLinks = [[0, 0], [0, 0]];

test('packs every possible command into one byte and restores it', () => {
  for (let plate = 1; plate <= 7; plate += 1) {
    for (const direction of ['left', 'right']) {
      for (let steps = 1; steps <= 6; steps += 1) {
        const command = { plate, direction, steps };
        const packed = packCommand(command);
        assert.ok(packed >= 0 && packed <= 83);
        assert.deepEqual(unpackCommand(packed), command);
      }
    }
  }
});

test('returns no commands for an already open lock', () => {
  assert.deepEqual(
    findShortestCommands({ state: [4, 4], links: noLinks }),
    [],
  );
});

test('uses one macro command per independent plate', () => {
  assert.deepEqual(
    findShortestCommands({ state: [1, 7], links: noLinks }),
    [
      { plate: 1, direction: 'left', steps: 3 },
      { plate: 2, direction: 'right', steps: 3 },
    ],
  );
});

test('prefers the lower plate when two one-command solutions exist', () => {
  const links = [[0, 1], [1, 0]];
  assert.deepEqual(
    findShortestCommands({ state: [1, 1], links }),
    [{ plate: 1, direction: 'left', steps: 3 }],
  );
});

test('returns null when every possible move is blocked', () => {
  const links = [[0, 1], [1, 0]];
  assert.equal(findShortestCommands({ state: [1, 7], links }), null);
});

test('prefers left over right when both start equally short solutions', () => {
  const definition = {
    state: [2, 7, 1],
    links: [
      [0, 0, 0],
      [-1, 0, -1],
      [-1, -1, 0],
    ],
  };
  assert.deepEqual(findShortestCommands(definition), [
    { plate: 1, direction: 'left', steps: 5 },
    { plate: 3, direction: 'left', steps: 3 },
  ]);
});

test('prefers larger steps when earlier action fields are equal', () => {
  const definition = {
    state: [3, 2, 1],
    links: [
      [0, 0, -1],
      [-1, 0, -1],
      [-1, -1, 0],
    ],
  };
  assert.deepEqual(findShortestCommands(definition), [
    { plate: 1, direction: 'right', steps: 2 },
    { plate: 3, direction: 'right', steps: 2 },
    { plate: 2, direction: 'right', steps: 2 },
    { plate: 1, direction: 'right', steps: 3 },
    { plate: 3, direction: 'right', steps: 2 },
  ]);
});
```

- [x] **Step 2: Подтвердить RED**

Run: `node --test test/solver.test.mjs`  
Expected: FAIL с `ERR_MODULE_NOT_FOUND`.

- [x] **Step 3: Реализовать упаковку команды и восстановление пути**

```js
// начало src/solver.mjs
import {
  createTargetState,
  decodeState,
  encodeState,
  stateSpaceSize,
} from './state-codec.mjs';
import { generateTransitions } from './transition.mjs';

const UNSEEN = -2;
const ROOT = -1;

export function packCommand(command) {
  const directionBit = command.direction === 'left' ? 0 : 1;
  return (((command.plate - 1) * 2 + directionBit) * 6) + command.steps - 1;
}

export function unpackCommand(packed) {
  const steps = (packed % 6) + 1;
  const plateDirection = Math.floor(packed / 6);
  return {
    plate: Math.floor(plateDirection / 2) + 1,
    direction: plateDirection % 2 === 0 ? 'left' : 'right',
    steps,
  };
}

function reconstructCommands(startCode, targetCode, parents, actions) {
  const commands = [];
  let code = targetCode;
  while (code !== startCode) {
    commands.push(unpackCommand(actions[code]));
    code = parents[code];
  }
  commands.reverse();
  return commands;
}
```

- [x] **Step 4: Реализовать минимальный BFS на типизированных массивах**

```js
// продолжение src/solver.mjs
export function findShortestCommands({ state, links }) {
  const plateCount = state.length;
  const startCode = encodeState(state);
  const targetCode = encodeState(createTargetState(plateCount));
  if (startCode === targetCode) {
    return [];
  }

  const size = stateSpaceSize(plateCount);
  const parents = new Int32Array(size);
  parents.fill(UNSEEN);
  const actions = new Uint8Array(size);
  const queue = new Int32Array(size);

  parents[startCode] = ROOT;
  let head = 0;
  let tail = 0;
  queue[tail] = startCode;
  tail += 1;

  while (head < tail) {
    const currentCode = queue[head];
    head += 1;
    const currentState = decodeState(currentCode, plateCount);

    for (const transition of generateTransitions(currentState, links)) {
      const nextCode = encodeState(transition.state);
      if (parents[nextCode] !== UNSEEN) {
        continue;
      }

      parents[nextCode] = currentCode;
      actions[nextCode] = packCommand(transition.command);
      if (nextCode === targetCode) {
        return reconstructCommands(startCode, targetCode, parents, actions);
      }
      queue[tail] = nextCode;
      tail += 1;
    }
  }

  return null;
}
```

- [x] **Step 5: Подтвердить кратчайший и стабильный GREEN**

Run: `pnpm test`  
Expected: все тесты PASS; независимый замок решается двумя командами, а равный однокомандный путь выбирает пластину 1.

- [x] **Step 6: Commit**

```bash
git add src/solver.mjs test/solver.test.mjs
git commit -m "feat: find shortest lock command sequence"
```

---

### Task 5: Результат, метрики и консольное представление

**Files:**
- Create: `src/result.mjs`
- Create: `src/index.mjs`
- Create: `test/result.test.mjs`

**Interfaces:**
- Consumes: проверенное определение замка и `Command[] | null`.
- Produces: `createSolveResult(definition, commands)` строго по JSON-структуре спеки.
- Produces: `formatConsoleResult(result): string` без завершающего перевода строки.
- Produces: `solveLock(value)` как единственную стабильную высокоуровневую функцию для будущего сайта.

- [x] **Step 1: Написать падающие тесты solved, already-open и unsolvable**

```js
// test/result.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { solveLock } from '../src/index.mjs';
import { createSolveResult, formatConsoleResult } from '../src/result.mjs';

const definition = {
  state: [1, 7],
  links: [[0, 0], [0, 0]],
};
const commands = [
  { plate: 1, direction: 'left', steps: 3 },
  { plate: 2, direction: 'right', steps: 3 },
];

test('createSolveResult replays commands and calculates metrics', () => {
  const result = createSolveResult(definition, commands);
  assert.deepEqual(result.finalState, [4, 4]);
  assert.deepEqual(result.metrics, {
    commands: 2,
    divisions: 6,
    plateSwitches: 1,
  });
});

test('formatConsoleResult renders grouped Russian commands', () => {
  const result = createSolveResult(definition, commands);
  assert.equal(
    formatConsoleResult(result),
    'Найдено команд: 2\n'
      + '1. Пластина 1 - влево x3\n'
      + '2. Пластина 2 - вправо x3',
  );
});

test('already-open and unsolvable results have distinct text', () => {
  const open = createSolveResult({ state: [4, 4], links: definition.links }, []);
  const unsolvable = createSolveResult(definition, null);
  assert.equal(formatConsoleResult(open), 'Замок уже открыт.');
  assert.equal(formatConsoleResult(unsolvable), 'Решение не найдено.');
  assert.deepEqual(unsolvable.commands, []);
});

test('solveLock validates and solves through the website-safe facade', () => {
  const result = solveLock(definition);
  assert.equal(result.status, 'solved');
  assert.deepEqual(result.finalState, [4, 4]);
});
```

- [x] **Step 2: Подтвердить RED**

Run: `node --test test/result.test.mjs`  
Expected: FAIL с `ERR_MODULE_NOT_FOUND`.

- [x] **Step 3: Реализовать построение результата через повторное применение команд**

```js
// src/result.mjs
import { createTargetState } from './state-codec.mjs';
import { applyCommand } from './transition.mjs';

export function createSolveResult(definition, commands) {
  const initialState = [...definition.state];
  const targetState = createTargetState(initialState.length);

  if (commands === null) {
    return { status: 'unsolvable', initialState, targetState, commands: [] };
  }

  let finalState = initialState;
  for (const command of commands) {
    const nextState = applyCommand(finalState, definition.links, command);
    if (nextState === null) {
      throw new Error('Решатель вернул заблокированную команду.');
    }
    finalState = nextState;
  }

  if (!finalState.every((position) => position === 4)) {
    throw new Error('Решатель не привел замок к целевому состоянию.');
  }

  const plateSwitches = commands.reduce((count, command, index) => {
    if (index === 0 || command.plate === commands[index - 1].plate) {
      return count;
    }
    return count + 1;
  }, 0);

  return {
    status: 'solved',
    initialState,
    targetState,
    commands: commands.map((command) => ({ ...command })),
    finalState,
    metrics: {
      commands: commands.length,
      divisions: commands.reduce((sum, command) => sum + command.steps, 0),
      plateSwitches,
    },
  };
}

export function formatConsoleResult(result) {
  if (result.status === 'unsolvable') {
    return 'Решение не найдено.';
  }
  if (result.commands.length === 0) {
    return 'Замок уже открыт.';
  }

  const directionNames = { left: 'влево', right: 'вправо' };
  const lines = result.commands.map((command, index) => (
    `${index + 1}. Пластина ${command.plate} - ${directionNames[command.direction]} x${command.steps}`
  ));
  return [`Найдено команд: ${result.commands.length}`, ...lines].join('\n');
}
```

```js
// src/index.mjs
import { validateLockDefinition } from './lock-definition.mjs';
import { createSolveResult } from './result.mjs';
import { findShortestCommands } from './solver.mjs';

export function solveLock(value) {
  const definition = validateLockDefinition(value);
  return createSolveResult(definition, findShortestCommands(definition));
}

export { applyCommand, generateTransitions } from './transition.mjs';
```

- [x] **Step 4: Подтвердить GREEN**

Run: `pnpm test`  
Expected: все тесты PASS.

- [x] **Step 5: Commit**

```bash
git add src/index.mjs src/result.mjs test/result.test.mjs
git commit -m "feat: format lock solving results"
```

---

### Task 6: CLI, консоль, создание и перезапись JSON-файла

**Files:**
- Create: `src/cli.mjs`
- Create: `solve-lock.mjs`
- Create: `test/cli.test.mjs`
- Modify: `package.json`

**Interfaces:**
- Produces: `parseArgs(argv): { inputPath: string, outputPath: string | null }`.
- Produces: `runCli(argv, streams?): Promise<0 | 1 | 2>`.
- `solve-lock.mjs` передает `process.argv.slice(2)` и устанавливает `process.exitCode`.
- При `--output` файл записывается до печати успешного результата; `writeFile` полностью перезаписывает существующий файл.

- [x] **Step 1: Написать интеграционные тесты реального процесса Node.js**

```js
// test/cli.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const entry = join(projectRoot, 'solve-lock.mjs');

async function createCase(t, definition) {
  const directory = await mkdtemp(join(tmpdir(), 'gothic-lock-solver-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const inputPath = join(directory, 'lock.json');
  await writeFile(inputPath, JSON.stringify(definition), 'utf8');
  return { directory, inputPath };
}

function run(args) {
  return spawnSync(process.execPath, [entry, ...args], { encoding: 'utf8' });
}

test('prints a solution without creating an output file by default', async (t) => {
  const { directory, inputPath } = await createCase(t, {
    state: [1, 7],
    links: [[0, 0], [0, 0]],
  });
  const outputPath = join(directory, 'solution.json');
  const result = run([inputPath]);
  assert.equal(result.status, 0);
  assert.match(result.stdout, /Найдено команд: 2/);
  assert.equal(result.stderr, '');
  await assert.rejects(readFile(outputPath, 'utf8'), { code: 'ENOENT' });
});

test('--output creates and then overwrites a JSON result', async (t) => {
  const { directory, inputPath } = await createCase(t, {
    state: [1, 7],
    links: [[0, 0], [0, 0]],
  });
  const outputPath = join(directory, 'solution.json');
  const created = run([inputPath, '--output', outputPath]);
  assert.equal(created.status, 0);
  assert.equal(JSON.parse(await readFile(outputPath, 'utf8')).status, 'solved');

  await writeFile(outputPath, 'stale'.repeat(1_000), 'utf8');
  const overwritten = run([inputPath, '--output', outputPath]);
  assert.equal(overwritten.status, 0);
  assert.match(overwritten.stdout, /Пластина 1 - влево x3/);
  assert.equal(JSON.parse(await readFile(outputPath, 'utf8')).status, 'solved');
});

test('invalid JSON exits with code 1 and a Russian error', async (t) => {
  const { inputPath } = await createCase(t, {
    state: [4, 4],
    links: [[0, 0], [0, 0]],
  });
  await writeFile(inputPath, '{', 'utf8');
  const result = run([inputPath]);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Ошибка: Некорректный JSON/);
});

test('an unsolvable lock writes JSON and exits with code 2', async (t) => {
  const { directory, inputPath } = await createCase(t, {
    state: [1, 7],
    links: [[0, 1], [1, 0]],
  });
  const outputPath = join(directory, 'solution.json');
  const result = run([inputPath, '--output', outputPath]);
  assert.equal(result.status, 2);
  assert.match(result.stdout, /Решение не найдено/);
  assert.equal(JSON.parse(await readFile(outputPath, 'utf8')).status, 'unsolvable');
});

test('read, write, and CLI grammar errors exit with code 1', async (t) => {
  const { directory, inputPath } = await createCase(t, {
    state: [4, 4],
    links: [[0, 0], [0, 0]],
  });

  const missingInput = run([join(directory, 'missing.json')]);
  assert.equal(missingInput.status, 1);
  assert.match(missingInput.stderr, /Ошибка:/);

  for (const args of [
    [inputPath, '--unknown'],
    [inputPath, '--output'],
    [inputPath, 'extra'],
  ]) {
    const invalidArgs = run(args);
    assert.equal(invalidArgs.status, 1);
    assert.match(invalidArgs.stderr, /Ошибка: Использование:/);
  }

  const writeError = run([inputPath, '--output', directory]);
  assert.equal(writeError.status, 1);
  assert.match(writeError.stderr, /Ошибка:/);
});
```

- [x] **Step 2: Подтвердить RED**

Run: `node --test test/cli.test.mjs`  
Expected: FAIL, потому что `solve-lock.mjs` отсутствует.

- [x] **Step 3: Реализовать CLI-оркестрацию и точные коды выхода**

```js
// src/cli.mjs
import { readFile, writeFile } from 'node:fs/promises';
import { solveLock } from './index.mjs';
import { parseLockDefinition } from './lock-definition.mjs';
import { formatConsoleResult } from './result.mjs';

export function parseArgs(argv) {
  if (argv.length === 1) {
    return { inputPath: argv[0], outputPath: null };
  }
  if (argv.length === 3 && argv[1] === '--output') {
    return { inputPath: argv[0], outputPath: argv[2] };
  }
  throw new Error('Использование: node solve-lock.mjs <lock.json> [--output <solution.json>]');
}

export async function runCli(argv, streams = {}) {
  const stdout = streams.stdout ?? process.stdout;
  const stderr = streams.stderr ?? process.stderr;

  try {
    const { inputPath, outputPath } = parseArgs(argv);
    const definition = parseLockDefinition(await readFile(inputPath, 'utf8'));
    const result = solveLock(definition);

    if (outputPath !== null) {
      await writeFile(outputPath, `${JSON.stringify(result, null, 2)}\n`, 'utf8');
    }
    stdout.write(`${formatConsoleResult(result)}\n`);
    return result.status === 'unsolvable' ? 2 : 0;
  } catch (error) {
    stderr.write(`Ошибка: ${error.message}\n`);
    return 1;
  }
}
```

```js
#!/usr/bin/env node
// solve-lock.mjs
import { runCli } from './src/cli.mjs';

process.exitCode = await runCli(process.argv.slice(2));
```

Replace `package.json` with the complete final content:

```json
{
  "name": "gothic-lock-solver",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "engines": {
    "node": ">=20"
  },
  "scripts": {
    "test": "node --test",
    "solve": "node solve-lock.mjs"
  },
  "bin": {
    "gothic-lock-solver": "./solve-lock.mjs"
  }
}
```

- [x] **Step 4: Сделать точку входа исполняемой и подтвердить GREEN**

Run:

```bash
chmod +x solve-lock.mjs
pnpm test
```

Expected: все модульные и CLI-тесты PASS.

- [x] **Step 5: Отдельно проверить ошибки аргументов**

Run:

```bash
node solve-lock.mjs
```

Expected: stderr начинается с `Ошибка: Использование:`, код выхода `1`.

- [x] **Step 6: Commit**

```bash
git add package.json solve-lock.mjs src/cli.mjs test/cli.test.mjs
git commit -m "feat: add Gothic lock solver CLI"
```

---

### Task 7: Сквозной пример и измерение предельного случая

**Files:**
- Create: `examples/lock.example.json`
- Create: `test/e2e.test.mjs`
- Create: `test/differential.test.mjs`
- Create: `scripts/benchmark.mjs`

**Interfaces:**
- Consumes: готовый CLI и внутреннюю тестируемую `findShortestCommands`; стабильным внешним facade остается `solveLock` из `src/index.mjs`.
- Produces: воспроизводимый пяти-пластинчатый пример и ручной benchmark без жесткого временного порога.

- [x] **Step 1: Сначала создать только падающий сквозной тест**

Run:

```bash
mkdir -p examples scripts
```

Expected: каталоги существуют, но `examples/lock.example.json` еще отсутствует, поэтому следующий тест действительно будет RED.

```js
// test/e2e.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = dirname(dirname(fileURLToPath(import.meta.url)));

test('example lock produces the documented four-command solution', () => {
  const result = spawnSync(
    process.execPath,
    [join(projectRoot, 'solve-lock.mjs'), join(projectRoot, 'examples/lock.example.json')],
    { encoding: 'utf8' },
  );
  assert.equal(result.status, 0);
  assert.equal(
    result.stdout,
    'Найдено команд: 4\n'
      + '1. Пластина 1 - влево x3\n'
      + '2. Пластина 2 - вправо x3\n'
      + '3. Пластина 4 - влево x2\n'
      + '4. Пластина 5 - вправо x2\n',
  );
});
```

- [x] **Step 2: Подтвердить RED до создания example-файла**

Run: `node --test test/e2e.test.mjs`  
Expected: FAIL из-за отсутствующего `examples/lock.example.json`.

- [x] **Step 3: Добавить example-файл и получить GREEN**

```json
{
  "state": [1, 7, 4, 2, 6],
  "links": [
    [0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0]
  ]
}
```

Run: `pnpm test`  
Expected: все тесты PASS, включая точный четырехкомандный вывод.

- [x] **Step 4: Добавить дифференциальную проверку BFS для всех двухпластинчатых состояний и матриц**

```js
// test/differential.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { createTargetState } from '../src/state-codec.mjs';
import { findShortestCommands } from '../src/solver.mjs';
import { generateTransitions } from '../src/transition.mjs';

function referenceBfs(definition) {
  const targetKey = createTargetState(definition.state.length).join(',');
  const startKey = definition.state.join(',');
  if (startKey === targetKey) {
    return [];
  }

  const queue = [{ state: definition.state, commands: [] }];
  const visited = new Set([startKey]);
  for (let head = 0; head < queue.length; head += 1) {
    const current = queue[head];
    for (const transition of generateTransitions(current.state, definition.links)) {
      const key = transition.state.join(',');
      if (visited.has(key)) {
        continue;
      }
      const commands = [...current.commands, transition.command];
      if (key === targetKey) {
        return commands;
      }
      visited.add(key);
      queue.push({ state: transition.state, commands });
    }
  }
  return null;
}

test('typed-array BFS matches reference BFS for every N=2 lock', () => {
  for (const link12 of [-1, 0, 1]) {
    for (const link21 of [-1, 0, 1]) {
      const links = [[0, link12], [link21, 0]];
      for (let first = 1; first <= 7; first += 1) {
        for (let second = 1; second <= 7; second += 1) {
          const definition = { state: [first, second], links };
          assert.deepEqual(
            findShortestCommands(definition),
            referenceBfs(definition),
            `state=${first},${second}; links=${link12},${link21}`,
          );
        }
      }
    }
  }
});
```

Run: `node --test test/differential.test.mjs`  
Expected: PASS для всех `9 * 49 = 441` конфигураций.

- [x] **Step 5: Создать benchmark максимального пространства без performance-assertion**

```js
// scripts/benchmark.mjs
import { performance } from 'node:perf_hooks';
import { findShortestCommands } from '../src/solver.mjs';

const plateCount = 7;
const definition = {
  state: Array.from({ length: plateCount }, () => 1),
  links: Array.from(
    { length: plateCount },
    () => Array.from({ length: plateCount }, () => 0),
  ),
};

const startedAt = performance.now();
const commands = findShortestCommands(definition);
const elapsedMs = performance.now() - startedAt;

console.log(JSON.stringify({
  elapsedMs: Math.round(elapsedMs),
  commands: commands?.length ?? null,
  rssMiB: Math.round(process.memoryUsage().rss / 1024 / 1024),
}, null, 2));

if (commands?.length !== 7) {
  process.exitCode = 1;
}
```

- [x] **Step 6: Выполнить функциональную и предельную проверку**

Run:

```bash
pnpm test
node scripts/benchmark.mjs
```

Expected: тесты PASS; benchmark завершается с кодом `0`, сообщает `commands: 7` и фактические `elapsedMs`/`rssMiB`. Не менять алгоритм только из-за субъективной оценки времени; сначала зафиксировать измерение.

- [x] **Step 7: Commit**

```bash
git add examples/lock.example.json test/e2e.test.mjs test/differential.test.mjs scripts/benchmark.mjs
git commit -m "test: verify solver end to end"
```

---

### Task 8: Проектный skill для интерактивного решения замков

**Files:**
- Create: `.codex/skills/gothic-lock-solver/SKILL.md`
- Create: `.codex/skills/gothic-lock-solver/agents/openai.yaml`

**Interfaces:**
- Consumes: наблюдаемое состояние и подтвержденные пользователем направленные связи.
- Produces: полный `lock.json`, запуск `solve-lock.mjs` и сгруппированную комбинацию.
- Depends on: стабильные интерфейсы CLI из Task 6 и проверенный пример из Task 7.

- [x] **Step 1: Перед редактированием прочитать обязательные skill-инструкции**

Read and follow полностью:

```text
superpowers:writing-skills
skill-creator
```

Expected: дальнейшее создание следует их требованиям, а изменения skill будут включены в Git-коммит.

- [x] **Step 2: Инициализировать проектный skill штатным генератором**

Run:

```bash
python3 /root/.codex/skills/.system/skill-creator/scripts/init_skill.py gothic-lock-solver --path .codex/skills
```

Expected: созданы `SKILL.md` и `agents/openai.yaml`; незаполненные scaffold-подсказки не остаются в финальном файле.

- [x] **Step 3: Заменить `SKILL.md` точными рабочими инструкциями**

````markdown
---
name: gothic-lock-solver
description: Собирает модель пластинчатого замка Gothic 1 Remake и запускает проектный Node.js-решатель. Используй, когда пользователь сообщает позиции или связи пластин либо просит кратчайшую комбинацию; не применяй к обычным кодовым замкам и не угадывай неподтвержденные связи.
---

# Gothic Lock Solver

Используй вычислительное ядро проекта, а не языковую модель, для поиска комбинации.

## Правила модели

- Пластин от 2 до 7, позиции каждой от 1 до 7, цель всегда 4.
- Влево означает `+1`, вправо означает `-1`.
- Каждая строка матрицы направленная и независимая; обратную связь не подразумевай.
- Связи не каскадируют. Диагональ матрицы равна 0.
- Если зависимая пластина не может выполнить весь сдвиг, команда заблокирована полностью.
- Не используй приложенный PDF в этом workflow.

## Сбор входа

1. Зафиксируй число пластин и текущий вектор слева направо.
2. Для каждой исходной пластины отдельно зафиксируй, какие другие пластины движутся вместе с ней.
3. Запиши `1` для того же направления, `-1` для противоположного, `0` только для подтвержденного отсутствия связи.
4. Не запускай решатель, пока в каждой строке не устранены неизвестные связи.
5. Создай JSON с полями `state` и `links` по схеме `docs/superpowers/specs/2026-08-31-gothic-lock-solver.md`.

## Запуск

Разреши корень проекта как три уровня вверх от каталога этого skill. Запусти:

```bash
node <project-root>/solve-lock.mjs <lock.json>
```

Добавляй `--output <solution.json>` только когда пользователь просит файл результата.

Передай пользователю команды без перегруппировки и с исходной нумерацией пластин:

```text
Пластина K - влево|вправо xS
```

## Проверка в игре

После каждой выполненной команды сверяй наблюдаемое состояние с рассчитанным, если пользователь сообщает его. При первом расхождении останови текущую комбинацию, зафиксируй фактический вектор и уточни только затронутую строку матрицы. Не продолжай по заведомо неверной модели.
````

- [x] **Step 4: Сгенерировать интерфейсные метаданные**

Run:

```bash
python3 /root/.codex/skills/.system/skill-creator/scripts/generate_openai_yaml.py .codex/skills/gothic-lock-solver --interface "display_name=Gothic Lock Solver" --interface "short_description=Собирает модель замка и находит кратчайшую комбинацию" --interface "default_prompt=Помоги описать и решить замок Gothic 1 Remake."
```

Expected: `agents/openai.yaml` описывает только этот skill и сохраняет автоматическое обнаружение.

- [x] **Step 5: Валидировать структуру skill**

Run:

```bash
python3 /root/.codex/skills/.system/skill-creator/scripts/quick_validate.py .codex/skills/gothic-lock-solver
```

Expected: validation PASS, нет scaffold-placeholder и ошибок frontmatter.

- [x] **Step 6: Выполнить независимый forward-test**

Передать свежему subagent только skill и запрос:

```text
Используй skill gothic-lock-solver из .codex/skills/gothic-lock-solver. Замок: две пластины, состояние [1, 7], связей нет. Получи комбинацию через проектный решатель. PDF не используй.
```

Expected: агент формирует нулевую матрицу `2x2`, запускает CLI и возвращает ровно две команды: пластина 1 влево `x3`, затем пластина 2 вправо `x3`.

- [x] **Step 7: Зафиксировать skill в Git**

```bash
git add .codex/skills/gothic-lock-solver
git commit -m "feat: add Gothic lock solving skill"
```

---

## Покрытие утвержденной спеки

| Раздел спеки | Реализующая задача |
|---|---|
| §1 Цель, Node.js 20+, ESM, отсутствие зависимостей | Tasks 1 и 6 |
| §2 Состояние, направления и направленная матрица | Tasks 1 и 3 |
| §3 Атомарная команда `x1..x6`, блокировка, отсутствие каскада | Task 3 |
| §4 JSON и валидация | Tasks 1 и 6 |
| §5 Base-7 и BFS на типизированных массивах | Tasks 2, 4 и 7 |
| §5.1 Независимое ядро и CLI-адаптер | Tasks 1-6 |
| §6 Минимум макрокоманд и стабильный tie-break | Tasks 3, 4 и 7 |
| §7 CLI, overwrite и коды `0/1/2` | Task 6 |
| §8 JSON-результат, метрики и русский вывод | Tasks 5 и 6 |
| §9 Все обязательные сценарии | Tasks 1-7 |
| §10 Не-цели | Global Constraints |
| §11 Проектный skill | Task 8 |

---

## Финальная проверка перед завершением реализации

- [x] Прочитать и применить `superpowers:verification-before-completion`.
- [x] Run: `pnpm test` — Expected: весь набор PASS без пропусков.
- [x] Run: `node solve-lock.mjs examples/lock.example.json` — Expected: точные четыре сгруппированные команды из Task 7.
- [x] Run: `node scripts/benchmark.mjs` — Expected: код `0`, `commands: 7`, измерения напечатаны.
- [x] Run: `python3 /root/.codex/skills/.system/skill-creator/scripts/quick_validate.py .codex/skills/gothic-lock-solver` — Expected: PASS.
- [x] Run: `git status --short` — Expected: пустой вывод; все изменения сохранены коммитами.
- [x] Не заявлять о завершении, пока каждая команда выше не выполнена заново после последнего изменения.
