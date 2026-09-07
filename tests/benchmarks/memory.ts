import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { record, string } from './validation.ts';
import type { Fixture } from './catalog.ts';
import type { ModuleFormat } from './harness.ts';
import { confirmPerformance, performanceVerdict, statistics } from './comparison.ts';
export type MemorySpec = { name: string; module: string; format: ModuleFormat };
export type RssSample = { peakRssBytes: number; startupRssBytes: number; loadedRssBytes: number; lockCount: number; peakRssMetric: string; startupPeakRssBytes: number; loadedPeakRssBytes: number;
  resourceUsageMaxRssBytes: number; startupResourceUsageMaxRssBytes: number; resourceUsageLaunchFloorDetected: boolean };
function positive(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) throw new Error('Invalid worker RSS measurement.'); return value;
}
export function measureRss(spec: MemorySpec, fixtureId?: string): RssSample {
  const worker = fileURLToPath(new URL('./memory-worker.ts', import.meta.url));
  const args = [worker, spec.module, spec.format]; if (fixtureId !== undefined) args.push(fixtureId);
  const stdout = execFileSync(process.execPath, args, { encoding: 'utf8', timeout: 120_000, maxBuffer: 1_048_576, stdio: ['ignore', 'pipe', 'pipe'] });
  const parsed: unknown = JSON.parse(stdout); const value = record(parsed, 'RSS worker result');
  if (value['status'] !== 'passed') throw new Error(string(value['error'], 'RSS worker error'));
  return { peakRssBytes: positive(value['peakRssBytes']), startupRssBytes: positive(value['startupRssBytes']),
    loadedRssBytes: positive(value['loadedRssBytes']), lockCount: positive(value['lockCount']), peakRssMetric: string(value['peakRssMetric']),
    startupPeakRssBytes: positive(value['startupPeakRssBytes']), loadedPeakRssBytes: positive(value['loadedPeakRssBytes']),
    resourceUsageMaxRssBytes: positive(value['resourceUsageMaxRssBytes']), startupResourceUsageMaxRssBytes: positive(value['startupResourceUsageMaxRssBytes']),
    resourceUsageLaunchFloorDetected: value['resourceUsageLaunchFloorDetected'] === true };
}
export function collectMemory(locks: readonly Fixture[], specs: readonly MemorySpec[], repetitions = 5, onProgress?: (text: string) => void) {
  const baseline = specs.find((spec) => spec.name === 'baseline');
  if (baseline === undefined) throw new Error('Memory baseline missing.');
  const perLock = locks.map((lock, index) => {
    const solvers = Object.fromEntries(specs.map((spec) => [spec.name, measureRss(spec, lock.id)]));
    onProgress?.(`RSS ${index + 1}/${locks.length}: ${lock.id}`);
    return { id: lock.id, solvers, repetitions: 1, verdict: 'inconclusive', reason: 'Single isolated per-lock observation; environmental variation is not estimated per lock.' };
  });
  const selectedIds = locks.map((lock) => lock.id).join(',');
  const groups = [...specs, { ...baseline, name: 'baselineSelfA' }, { ...baseline, name: 'baselineSelfB' }];
  const samples = new Map<string, RssSample[]>(groups.map((spec) => [spec.name, []]));
  for (let round = 0; round < repetitions; round += 1) {
    for (let index = 0; index < groups.length; index += 1) {
      const spec = groups[(index + round) % groups.length]; if (spec === undefined) throw new Error('Missing memory implementation.');
      const values = samples.get(spec.name); if (values === undefined) throw new Error('Missing memory series.');
      values.push(measureRss(spec, selectedIds));
    }
    onProgress?.(`RSS whole-catalog matched round ${round + 1}/${repetitions}`);
  }
  const peaks = (name: string): number[] => (samples.get(name) ?? []).map((sample) => sample.peakRssBytes);
  const firstVerdict = performanceVerdict(peaks('candidate'), peaks('baseline'), peaks('baselineSelfA'), peaks('baselineSelfB'));
  const attempts = [{ ...firstVerdict, samples: Object.fromEntries(samples) }];
  if (firstVerdict.verdict !== 'passed' && repetitions >= 5) {
    const retryGroups = groups.filter((spec) => ['candidate', 'baseline', 'baselineSelfA', 'baselineSelfB'].includes(spec.name));
    const retrySamples = new Map<string, RssSample[]>(retryGroups.map((spec) => [spec.name, []]));
    for (let round = 0; round < repetitions; round += 1) {
      for (let index = 0; index < retryGroups.length; index += 1) {
        const spec = retryGroups[(index + round) % retryGroups.length]; if (spec === undefined) throw new Error('Missing memory retry implementation.');
        retrySamples.get(spec.name)?.push(measureRss(spec, selectedIds));
      }
      onProgress?.(`RSS bounded repeat ${round + 1}/${repetitions}`);
    }
    const retryPeaks = (name: string): number[] => (retrySamples.get(name) ?? []).map((sample) => sample.peakRssBytes);
    attempts.push({ ...performanceVerdict(retryPeaks('candidate'), retryPeaks('baseline'), retryPeaks('baselineSelfA'), retryPeaks('baselineSelfB')),
      samples: Object.fromEntries(retrySamples) });
  }
  const retry = attempts[1];
  const verdict = { ...firstVerdict, verdict: retry === undefined ? firstVerdict.verdict : confirmPerformance(firstVerdict.verdict, retry.verdict),
    reason: retry === undefined ? firstVerdict.reason : `First: ${firstVerdict.verdict}; bounded repeat: ${retry.verdict}. Conflicting observations remain inconclusive.` };
  if ([...samples.values()].flat().some((sample) => sample.peakRssMetric !== 'linux-proc-VmHWM')) {
    verdict.verdict = 'inconclusive'; verdict.reason = 'Non-Linux getrusage fallback is recorded but process-image high-water semantics are not verified for this platform.';
  }
  return { metric: process.platform === 'linux' ? 'Linux /proc/self/status VmHWM × 1024 bytes (current process-image RSS high-water)' : 'Node process.resourceUsage().maxRSS × 1024 bytes (platform fallback; no certified memory verdict)', repetitions,
    sources: ['https://docs.kernel.org/filesystems/proc.html', 'https://nodejs.org/api/process.html#processresourceusage'],
    accuracy: 'Kernel RSS accounting is asynchronous and approximate; this is not an exact allocation count. Raw getrusage maxRSS and startup/current-image peaks are preserved to expose pre-exec launch floors.',
    scope: `Each per-lock observation is a fresh process. Repeated comparison is peak RSS of the selected ${locks.length}-lock workload per fresh process.`,
    includes: 'Node runtime, TypeScript benchmark loader, module loading, fixture loading, normalization, independent replay and solver allocations. Startup and loaded current RSS are recorded separately; subtraction is not exact algorithm allocation.',
    browser: { available: false, reason: 'No portable exact browser peak-memory API; Node RSS is not browser memory.' },
    performance: verdict, attempts, wholeCatalog: Object.fromEntries([...samples].map(([name, values]) => [name, { samples: values, peakRssBytes: statistics(values.map((sample) => sample.peakRssBytes)) }])), perLock };
}
