import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { array, integer, record, string, type Definition, type Metrics } from './validation.ts';

export const catalogSha256 = '902a57e0c867b7ed7513af09257fde765396593ab45738bb60967b412b4bcd69';
export type Fixture = Definition & { id: string; expectedActions: number };
export function sha256(value: string | Uint8Array): string { return createHash('sha256').update(value).digest('hex'); }
export function jsonFile(path: string | URL): unknown { const parsed: unknown = JSON.parse(readFileSync(path, 'utf8')); return parsed; }
export function readMetrics(value: unknown): Metrics {
  const item = record(value, 'metrics');
  return { A: integer(item['A']), U: integer(item['U']), C: integer(item['C']), plateSwitches: integer(item['plateSwitches']) };
}
export function loadCatalog(): Fixture[] {
  const bytes = readFileSync(new URL('./fixtures.json', import.meta.url));
  if (sha256(bytes) !== catalogSha256) throw new Error('Fixture hash differs from the fixed 45-input pin.');
  const parsed: unknown = JSON.parse(bytes.toString('utf8'));
  const locks = array(parsed, 'fixtures').map((raw, index): Fixture => {
    const lock = record(raw, 'fixture');
    if (Object.keys(lock).sort().join(',') !== 'expectedActions,id,links,state') throw new Error('Unexpected fixture fields.');
    const id = string(lock['id']);
    const state = array(lock['state']).map((value) => integer(value));
    const links = array(lock['links']).map((row) => array(row).map((value) => integer(value)));
    const expectedActions = integer(lock['expectedActions']);
    if (id !== `lock-${String(index + 1).padStart(3, '0')}` || expectedActions < 0 || state.length === 0
        || state.some((value) => value < 1 || value > 7) || links.length !== state.length
        || links.some((row) => row.length !== state.length || row.some((value) => value < -1 || value > 1))) throw new Error('Invalid fixed fixture.');
    return { id, state, links, expectedActions };
  });
  if (locks.length !== 45) throw new Error('Expected 45 unique fixed inputs.');
  return locks;
}
export function git(directory: string, args: readonly string[]): string {
  return execFileSync('git', ['-C', directory, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}

export function assertArtifactOutput(path: string): void {
  const root = fileURLToPath(new URL('../../', import.meta.url));
  const local = relative(root, resolve(path));
  if (local !== 'artifacts' && !local.startsWith('artifacts/')) throw new Error('Benchmark output must be under the ignored artifacts directory.');
}
