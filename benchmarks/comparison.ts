import type { Metrics } from './validation.ts';
export type Verdict = 'passed' | 'regression' | 'inconclusive';
export const metricNames = ['A', 'U', 'C', 'plateSwitches'] as const;

export function compareMetrics(candidate: Metrics, baseline: Metrics): { quality: 'passed' | 'regression'; deltas: Metrics; regressions: string[] } {
  const deltas = { A: candidate.A - baseline.A, U: candidate.U - baseline.U,
    C: candidate.C - baseline.C, plateSwitches: candidate.plateSwitches - baseline.plateSwitches };
  const regressions = metricNames.filter((name) => deltas[name] > 0);
  return { quality: regressions.length === 0 ? 'passed' : 'regression', deltas, regressions };
}
export function statistics(samples: readonly number[]): { min: number; median: number; p95: number; max: number } {
  if (samples.length === 0 || samples.some((sample) => !Number.isFinite(sample) || sample < 0)) throw new Error('Invalid timing samples.');
  const sorted = [...samples].sort((a, b) => a - b);
  const first = sorted[0]; const last = sorted.at(-1);
  const middle = Math.floor(sorted.length / 2);
  const high = sorted[middle]; const low = sorted[Math.max(0, middle - 1)];
  const p95 = sorted[Math.ceil(sorted.length * 0.95) - 1];
  if (first === undefined || last === undefined || high === undefined || low === undefined || p95 === undefined) throw new Error('Missing sample.');
  return { min: first, median: sorted.length % 2 === 0 ? (low + high) / 2 : high, p95, max: last };
}
function interval(samples: readonly number[]): { mean: number; lower: number; upper: number } {
  const mean = samples.reduce((sum, sample) => sum + sample, 0) / samples.length;
  const variance = samples.reduce((sum, sample) => sum + (sample - mean) ** 2, 0) / Math.max(1, samples.length - 1);
  // Conservative t bound >= two-sided 95% t critical for n >= 5. No claimed exact CI.
  const radius = 2.776 * Math.sqrt(variance / samples.length);
  return { mean, lower: mean - radius, upper: mean + radius };
}
export function performanceVerdict(candidate: readonly number[], baseline: readonly number[], selfA: readonly number[], selfB: readonly number[]) {
  const missing = { verdict: 'inconclusive' as Verdict, reason: 'At least five matched positive samples and unchanged-vs-itself calibration are required.',
    ratio: null, noiseRatio: null, lowerRatio: null, upperRatio: null };
  if (candidate.length < 5 || candidate.length !== baseline.length || selfA.length < 5 || selfA.length !== selfB.length
      || [...candidate, ...baseline, ...selfA, ...selfB].some((sample) => !Number.isFinite(sample) || sample <= 0)) return missing;
  const logs = (a: readonly number[], b: readonly number[]): number[] => a.map((value, index) => {
    const other = b[index]; if (other === undefined) throw new Error('Unpaired sample.'); return Math.log(value / other);
  });
  const self = interval(logs(selfA, selfB));
  const measured = interval(logs(candidate, baseline));
  const noise = Math.max(Math.abs(self.lower), Math.abs(self.upper));
  // A noisy control cannot certify equivalence. A clear slowdown still remains a regression.
  const verdict: Verdict = measured.lower > noise ? 'regression'
    : noise <= Math.log(1.25) && measured.upper <= noise ? 'passed' : 'inconclusive';
  return { verdict, reason: verdict === 'regression' ? 'Matched slowdown exceeds the unchanged-control uncertainty envelope.'
    : verdict === 'passed' ? 'Measured upper slowdown bound lies within the calibrated control envelope.'
      : 'Measurement overlaps the control envelope or unchanged-control noise exceeds 25%; no performance pass is established.',
  ratio: Math.exp(measured.mean), noiseRatio: Math.exp(noise), lowerRatio: Math.exp(measured.lower), upperRatio: Math.exp(measured.upper) };
}
export function combineVerdicts(values: readonly Verdict[]): Verdict {
  return values.includes('regression') ? 'regression' : values.includes('inconclusive') ? 'inconclusive' : 'passed';
}
export function confirmPerformance(first: Verdict, second: Verdict): Verdict {
  // A bounded repeat never erases the first signal. Conflicting observations are uncertainty.
  return first === second ? first : 'inconclusive';
}
