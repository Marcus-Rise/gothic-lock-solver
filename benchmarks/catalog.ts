import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { array, integer, legacyCommands, record, string, type Definition, type Metrics, type TupleCommand } from './validation.ts';

export const catalogSha256 = '0eb5b641eac4bda105bde24b60399220f1767dd13db6a312b78638b2750ba675';
export const referenceRevision = 'eee0bf50ebcb7fffd2b47954fd76bb015854e365';
export type Fixture = { id: string; title: string; definition: Definition; expectedActions: number;
  baselineCommands: readonly TupleCommand[]; historicalReference: Metrics & { commands: readonly TupleCommand[] } };
export type SourcePin = { revision: string; solver: { path: string; sha256: string; blockSha256: string; startMarker: string; endMarker: string } };
export function sha256(value: string | Uint8Array): string { return createHash('sha256').update(value).digest('hex'); }
export function jsonFile(path: string | URL): unknown { const parsed: unknown = JSON.parse(readFileSync(path, 'utf8')); return parsed; }
export function loadManifest(): Record<string, unknown> { return record(jsonFile(new URL('./fixtures/manifest.json', import.meta.url))); }
export function readMetrics(value: unknown): Metrics {
  const item = record(value, 'metrics');
  return { A: integer(item['A']), U: integer(item['U']), C: integer(item['C']), plateSwitches: integer(item['plateSwitches']) };
}
export function loadCatalog(): Fixture[] {
  const bytes = readFileSync(new URL('./fixtures/catalog.json', import.meta.url));
  if (sha256(bytes) !== catalogSha256 || loadManifest()['catalogSha256'] !== catalogSha256) throw new Error('Catalog hash differs from the immutable 45-fixture pin.');
  const parsed: unknown = JSON.parse(bytes.toString('utf8'));
  const locks = array(parsed, 'catalog').map((raw): Fixture => {
    const lock = record(raw, 'fixture');
    const definition = record(lock['definition']);
    const historical = record(lock['historicalReference']);
    return { id: string(lock['id']), title: string(lock['titleEn'] ?? lock['title']), expectedActions: integer(lock['expectedActions']),
      definition: { state: array(definition['state']).map((value) => integer(value)), links: array(definition['links']).map((row) => array(row).map((value) => integer(value))) },
      baselineCommands: legacyCommands(lock['baselineCommands']), historicalReference: { ...readMetrics(historical), commands: legacyCommands(historical['commands']) } };
  });
  if (locks.length !== 45 || new Set(locks.map((lock) => lock.id)).size !== 45) throw new Error('Expected 45 unique catalog locks.');
  return locks;
}
export function git(directory: string, args: readonly string[]): string {
  return execFileSync('git', ['-C', directory, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}
export function verifySource(directory: string | URL): Record<string, unknown> {
  const root = typeof directory === 'string' ? directory : fileURLToPath(directory);
  const manifest = record(jsonFile(join(root, 'manifest.json')), 'source manifest');
  for (const [path, expected] of Object.entries(record(manifest['files']))) {
    if (path.startsWith('/') || path.split('/').includes('..')) throw new Error('Unsafe source manifest path.');
    if (sha256(readFileSync(join(root, path))) !== string(expected)) throw new Error(`Source hash mismatch: ${path}`);
  }
  return manifest;
}
export function upstreamPin(): SourcePin {
  const source = record(loadManifest()['source']); const solver = record(source['solver']);
  if (source['revision'] !== referenceRevision) throw new Error('Unexpected upstream reference revision pin.');
  return { revision: referenceRevision, solver: { path: string(solver['path']), sha256: string(solver['sha256']), blockSha256: string(solver['blockSha256']),
    startMarker: string(solver['startMarker']), endMarker: string(solver['endMarker']) } };
}
export function verifyReferenceSource(input: { revision: string; html: string }, pin: SourcePin = upstreamPin()): string {
  if (input.revision !== pin.revision) throw new Error(`Reference revision mismatch: ${input.revision}`);
  if (sha256(input.html) !== pin.solver.sha256) throw new Error('Reference file hash mismatch.');
  const start = input.html.indexOf(pin.solver.startMarker); const end = input.html.indexOf(pin.solver.endMarker, start);
  if (start < 0 || end < start) throw new Error('Reference block markers are missing.');
  const block = input.html.slice(start, end + pin.solver.endMarker.length);
  if (sha256(block) !== pin.solver.blockSha256) throw new Error('Reference block hash mismatch.');
  return block;
}
