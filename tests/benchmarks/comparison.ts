import type { Metrics } from './validation.ts';

export type Quality = 'passed' | 'regression';
export const metricNames = ['A', 'U', 'C', 'plateSwitches'] as const;
export type MetricComparison = {
  quality: Quality;
  deltas: Metrics;
  regressions: string[];
};

export function compareMetrics(candidate: Metrics, baseline: Metrics): MetricComparison {
  const deltas = {
    A: candidate.A - baseline.A,
    U: candidate.U - baseline.U,
    C: candidate.C - baseline.C,
    plateSwitches: candidate.plateSwitches - baseline.plateSwitches,
  };
  const regressions = metricNames.filter((name) => deltas[name] > 0);
  return {
    quality: regressions.length === 0 ? 'passed' : 'regression',
    deltas,
    regressions,
  };
}

export function statistics(samples: readonly number[]): { min: number; median: number; p95: number; max: number } {
  if (samples.length === 0 || samples.some((sample) => !Number.isFinite(sample) || sample < 0)) {
    throw new Error('Invalid measurement samples.');
  }
  const sorted = [...samples].sort((a, b) => a - b);
  const first = sorted[0];
  const last = sorted.at(-1);
  const middle = Math.floor(sorted.length / 2);
  const high = sorted[middle];
  const low = sorted[Math.max(0, middle - 1)];
  const p95 = sorted[Math.ceil(sorted.length * 0.95) - 1];
  if (first === undefined || last === undefined || high === undefined || low === undefined || p95 === undefined) {
    throw new Error('Missing sample.');
  }
  return {
    min: first,
    median: sorted.length % 2 === 0 ? (low + high) / 2 : high,
    p95,
    max: last,
  };
}

export function historicalRatio(current: number, previous: number): number | null {
  return previous === 0 ? null : current / previous;
}
