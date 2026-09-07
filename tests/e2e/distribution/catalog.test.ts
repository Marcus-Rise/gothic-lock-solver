import { execFileSync } from 'node:child_process';
import { test, expect } from 'vitest';
import { loadCatalog } from '../../benchmarks/catalog.ts';
import { replayCommands } from '../../benchmarks/validation.ts';

for (const filename of ['gothic-lock-solver.mjs', 'gothic-lock-solver.min.mjs']) {
  test(`${filename}: real Node loader solves all 45 fixtures at the exact minimum`, () => {
    const catalog = loadCatalog();
    const code = `import { solveLock } from ${JSON.stringify(new URL(`../../../dist/${filename}`, import.meta.url).href)};let input='';for await (const chunk of process.stdin) input+=chunk;console.log(JSON.stringify(JSON.parse(input).map(({state,links})=>solveLock(state,links))));`;
    const output = execFileSync(process.execPath, ['--input-type=module', '-e', code], { input: JSON.stringify(catalog), encoding: 'utf8' });
    const results: unknown = JSON.parse(output);
    if (!Array.isArray(results)) throw new Error('Node consumer returned a malformed result');
    expect(results).toHaveLength(45);
    for (const [index, fixture] of catalog.entries()) {
      const commands: unknown = results[index];
      expect(commands).toHaveLength(fixture.expectedActions);
      expect(replayCommands(fixture, commands)).toEqual(fixture.state.map(() => 4));
    }
  });
}
