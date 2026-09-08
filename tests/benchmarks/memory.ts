import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { array, integer, record, string } from './validation.ts';
import { statistics } from './comparison.ts';

export type RssMetric = 'linux-proc-VmHWM' | 'node-resourceUsage-maxRSS';
export type RssSample = {
  peakRssBytes: number;
  startupRssBytes: number;
  loadedRssBytes: number;
  lockCount: number;
  peakRssMetric: RssMetric;
  startupPeakRssBytes: number;
  loadedPeakRssBytes: number;
  resourceUsageMaxRssBytes: number;
  startupResourceUsageMaxRssBytes: number;
  resourceUsageLaunchFloorDetected: boolean;
};
export type MemoryMeasurement = {
  metric: RssMetric;
  limitations: string;
  browser: { available: false; reason: string };
  samples: RssSample[];
  peakRssBytes: ReturnType<typeof statistics>;
};

function positive(value: unknown): number {
  const result = integer(value, 'RSS measurement');
  if (result <= 0) {
    throw new Error('Invalid positive RSS measurement.');
  }
  return result;
}

function metric(value: unknown): RssMetric {
  if (value !== 'linux-proc-VmHWM' && value !== 'node-resourceUsage-maxRSS') {
    throw new Error('Unknown RSS metric.');
  }
  return value;
}

function parseSample(raw: unknown): RssSample {
  const value = record(raw, 'RSS sample');
  if (typeof value['resourceUsageLaunchFloorDetected'] !== 'boolean') {
    throw new Error('Missing RSS launch-floor diagnostic.');
  }
  return {
    peakRssBytes: positive(value['peakRssBytes']),
    startupRssBytes: positive(value['startupRssBytes']),
    loadedRssBytes: positive(value['loadedRssBytes']),
    lockCount: positive(value['lockCount']),
    peakRssMetric: metric(value['peakRssMetric']),
    startupPeakRssBytes: positive(value['startupPeakRssBytes']),
    loadedPeakRssBytes: positive(value['loadedPeakRssBytes']),
    resourceUsageMaxRssBytes: positive(value['resourceUsageMaxRssBytes']),
    startupResourceUsageMaxRssBytes: positive(value['startupResourceUsageMaxRssBytes']),
    resourceUsageLaunchFloorDetected: value['resourceUsageLaunchFloorDetected'],
  };
}

export function parseMemory(raw: unknown, repetitions: number): MemoryMeasurement {
  const value = record(raw, 'memory measurement');
  const samples = array(value['samples'], 'RSS samples').map(parseSample);
  const rssMetric = metric(value['metric']);
  if (samples.length !== repetitions || samples.some((sample) => sample.lockCount !== 45 || sample.peakRssMetric !== rssMetric)) {
    throw new Error('RSS sample count, workload or metric mismatch.');
  }
  const peakRssBytes = statistics(samples.map((sample) => sample.peakRssBytes));
  assert.deepEqual(value['peakRssBytes'], peakRssBytes, 'RSS statistics mismatch.');
  const browser = record(value['browser'], 'browser memory limitation');
  if (browser['available'] !== false) {
    throw new Error('Node RSS cannot establish browser memory.');
  }
  return {
    metric: rssMetric,
    limitations: string(value['limitations']),
    browser: { available: false, reason: string(browser['reason']) },
    samples,
    peakRssBytes,
  };
}

export function measureRss(modulePath: string, fixtureIds?: readonly string[]): RssSample {
  const worker = fileURLToPath(new URL('./memory-worker.ts', import.meta.url));
  const args = [worker, modulePath];
  if (fixtureIds !== undefined) {
    args.push(fixtureIds.join(','));
  }
  const stdout = execFileSync(process.execPath, args, {
    encoding: 'utf8',
    timeout: 120_000,
    maxBuffer: 1_048_576,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const parsed: unknown = JSON.parse(stdout);
  const value = record(parsed, 'RSS worker result');
  if (value['status'] !== 'passed') {
    throw new Error('RSS worker failed.');
  }
  const sample = parseSample(value);
  if (sample.lockCount !== (fixtureIds?.length ?? 45)) {
    throw new Error('RSS worker measured a different workload.');
  }
  return sample;
}

export function collectMemory(modulePath: string, repetitions = 3, onProgress?: (text: string) => void): MemoryMeasurement {
  if (!Number.isSafeInteger(repetitions) || repetitions < 1) {
    throw new Error('Invalid memory repetition count.');
  }
  const samples: RssSample[] = [];
  for (let round = 0; round < repetitions; round += 1) {
    samples.push(measureRss(modulePath));
    onProgress?.(`RSS whole-catalog observation ${round + 1}/${repetitions}`);
  }
  return {
    metric: process.platform === 'linux' ? 'linux-proc-VmHWM' : 'node-resourceUsage-maxRSS',
    limitations: [
      'Approximate whole-process peak RSS in fresh Node processes running all 45 locks.',
      'Includes Node, the TypeScript loader, module and fixture loading, independent replay, and solver allocations.',
      'Linux uses /proc/self/status VmHWM; other platforms use process.resourceUsage().maxRSS × 1024',
      'with platform-dependent launch high-water behavior.',
      'Startup diagnostics are observations, not exact allocation subtraction.',
      'Historical hosts and runtimes can differ.',
    ].join(' '),
    browser: {
      available: false,
      reason: 'Node RSS is not browser memory; no portable browser peak-memory API is measured.',
    },
    samples,
    peakRssBytes: statistics(samples.map((sample) => sample.peakRssBytes)),
  };
}
