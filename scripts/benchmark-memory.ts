import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { mkdir, mkdtemp, rename, rm, writeFile } from 'node:fs/promises';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { collectMetadata, parseBenchmarkArgs } from '../benchmarks/cli.ts';
import { jsonFile, loadCatalog, sha256 } from '../benchmarks/catalog.ts';
import { collectMemory, type MemorySpec } from '../benchmarks/memory.ts';
import { record } from '../benchmarks/validation.ts';

const [priorPath, ...args] = process.argv.slice(2);
if (priorPath === undefined || priorPath.startsWith('--')) throw new Error('Usage: node scripts/benchmark-memory.ts PRIOR_BENCHMARK_JSON [--reference PATH] [--output-dir PATH]');
const options = parseBenchmarkArgs(args);
const metadata = collectMetadata(options);
const previous = record(jsonFile(priorPath));
if (record(record(previous['metadata'])['candidate'])['moduleSha256'] !== metadata.candidate.moduleSha256) throw new Error('Candidate bytes differ from the earlier timing report; run a full new comparison.');
const specs: MemorySpec[] = [ { name: 'candidate', module: options.candidateModule, format: 'tuple' },
  { name: 'baseline', module: options.baselineModule, format: options.baselineFormat },
  { name: 'originalBfs', module: fileURLToPath(new URL('../benchmarks/baseline/src/index.mjs', import.meta.url)), format: 'legacy' } ];
if (options.reference !== undefined) specs.push({ name: 'upstream', module: options.reference, format: 'upstream' });
const catalog = loadCatalog(); const locks = options.smoke ? catalog.slice(0, 2) : catalog;
const memory = collectMemory(locks, specs, options.memoryRepetitions, (line) => process.stderr.write(`${line}\n`));
const createdAt = new Date().toISOString();
const correction = { schemaVersion: 1, createdAt, scope: 'memory-only-correction',
  supersedes: { report: resolve(priorPath), sha256: sha256(readFileSync(priorPath)), component: 'memory',
    reason: 'Earlier raw getrusage peaks retained a pre-exec launch floor. Its memory pass is invalid; timing and deterministic quality remain unchanged.' }, metadata, memory };
const outputRoot = resolve(options.outputDir); await mkdir(outputRoot, { recursive: true });
const staged = await mkdtemp(join(outputRoot, '.memory-'));
const directory = join(outputRoot, `memory-${createdAt.replaceAll(/[^0-9TZ]/g, '')}-${randomUUID().slice(0, 8)}`);
const lines = ['# Corrected isolated RSS evidence', '', `Memory verdict: **${memory.performance.verdict}**. This supplement supersedes the earlier report’s memory measurements and memory pass. Its timing and deterministic quality observations remain valid.`, '',
  memory.metric, '', memory.accuracy, '', '| Implementation | Median peak RSS (MiB) | p95 (MiB) |', '| --- | ---: | ---: |'];
for (const [name, measurement] of Object.entries(memory.wholeCatalog)) lines.push(`| ${name} | ${(measurement.peakRssBytes.median / 1048576).toFixed(2)} | ${(measurement.peakRssBytes.p95 / 1048576).toFixed(2)} |`);
lines.push('', `Method: [Linux kernel /proc documentation](${memory.sources[0]}) and [Node resourceUsage documentation](${memory.sources[1]}). RSS remains approximate process memory, including runtime and measurement infrastructure; browser peak memory is unavailable.`, '', 'The JSON contains every individual peak, startup/current RSS, raw getrusage diagnostic, control sample, bounded repeat, source and artifact hash.', '');
try {
  await writeFile(join(staged, 'memory.json'), `${JSON.stringify(correction, null, 2)}\n`, { flag: 'wx' });
  await writeFile(join(staged, 'memory.md'), lines.join('\n'), { flag: 'wx' });
  await rename(staged, directory);
} catch (error) { await rm(staged, { recursive: true, force: true }); throw error; }
const notice = `# Superseded memory measurements\n\nThe memory measurements and memory pass in this run are invalid: raw Node getrusage maxRSS retained a pre-exec launch high-water. The original hashed files remain unchanged for audit. Use [the corrected RSS supplement](../${basename(directory)}/memory.md) and its full JSON. Timing and deterministic quality observations are unaffected.\n`;
await writeFile(join(dirname(resolve(priorPath)), 'MEMORY-SUPERSEDED.md'), notice, { flag: 'wx' });
console.log(JSON.stringify({ directory, verdict: memory.performance.verdict, supersedes: correction.supersedes }, null, 2));
