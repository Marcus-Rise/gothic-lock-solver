import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { loadCatalog as loadPinnedCatalog } from '../benchmarks/catalog.ts';
import { array, replayCommands, tupleCommands } from '../benchmarks/validation.ts';
import { distDirectory } from './paths.ts';

export interface CatalogFixture {
  readonly id: string;
  readonly state: readonly number[];
  readonly links: readonly (readonly number[])[];
  readonly expectedActions: number;
}

export function loadCatalog(): readonly CatalogFixture[] {
  return loadPinnedCatalog().map(({ id, state, links, expectedActions }) => ({
    id,
    state,
    links,
    expectedActions,
  }));
}

export function verifySolution(fixture: CatalogFixture, commands: unknown): void {
  const path = tupleCommands(commands);
  assert.equal(path.length, fixture.expectedActions, `${fixture.id}: minimum actions`);
  const definition = {
    state: [...fixture.state],
    links: fixture.links.map((row) => [...row]),
  };
  // The benchmark oracle checks every intermediate division without production imports.
  assert.deepEqual(replayCommands(definition, path), fixture.state.map(() => 4), `${fixture.id}: goal state`);
}

export function loadExpectedSolutions(fixtures: readonly CatalogFixture[]): readonly unknown[] {
  const moduleUrl = pathToFileURL(join(distDirectory, 'gothic-lock-solver.mjs')).href;
  // A subprocess guarantees the native Node loader, outside Playwright's loader.
  const code = `import { solveLock } from ${JSON.stringify(moduleUrl)};
    let input = '';
    for await (const chunk of process.stdin) input += chunk;
    console.log(JSON.stringify(JSON.parse(input).map(({ state, links }) => solveLock(state, links))));`;
  const output = execFileSync(process.execPath, ['--input-type=module', '-e', code], {
    encoding: 'utf8',
    input: JSON.stringify(fixtures),
  });
  const raw: unknown = JSON.parse(output);
  const results = array(raw, 'native Node solutions');
  assert.equal(results.length, fixtures.length);
  for (const [index, fixture] of fixtures.entries()) verifySolution(fixture, results[index]);
  return results;
}
