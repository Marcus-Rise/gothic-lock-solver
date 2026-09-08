import { readFileSync } from 'node:fs';
export type PeakRss = { peakRssBytes: number; metric: 'linux-proc-VmHWM' | 'node-resourceUsage-maxRSS'; resourceUsageMaxRssBytes: number };
export function readPeakRss(): PeakRss {
  const resourceUsageMaxRssBytes = process.resourceUsage().maxRSS * 1024;
  if (process.platform === 'linux') {
    // VmHWM belongs to the current process image; getrusage can retain the heavy launcher high-water across exec.
    const match = /^VmHWM:\s+(\d+)\s+kB$/m.exec(readFileSync('/proc/self/status', 'utf8'));
    const digits = match?.[1];
    const peakRssBytes = digits === undefined ? NaN : Number(digits) * 1024;
    if (!Number.isSafeInteger(peakRssBytes) || peakRssBytes <= 0) throw new Error('Linux /proc/self/status has no valid VmHWM RSS observation.');
    return { peakRssBytes, metric: 'linux-proc-VmHWM', resourceUsageMaxRssBytes };
  }
  return { peakRssBytes: resourceUsageMaxRssBytes, metric: 'node-resourceUsage-maxRSS', resourceUsageMaxRssBytes };
}
