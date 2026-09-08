import { readPeakRss } from './rss.ts';
import { loadCatalog } from './catalog.ts';
import { loadImplementation, runBenchmark } from './harness.ts';

const startupRssBytes = process.memoryUsage().rss;
const startupPeak = readPeakRss();
const [modulePath, fixtureIds] = process.argv.slice(2);
if (modulePath === undefined) {
  throw new Error('Missing RSS worker module.');
}
const solve = await loadImplementation(modulePath);
const loadedRssBytes = process.memoryUsage().rss;
const loadedPeak = readPeakRss();
const catalog = loadCatalog();
const selected = fixtureIds === undefined ? null : new Set(fixtureIds.split(','));
const locks = selected === null ? catalog : catalog.filter((lock) => selected.has(lock.id));
if (locks.length === 0 || (selected !== null && locks.length !== selected.size)) {
  throw new Error('RSS fixture not found.');
}
runBenchmark({ locks, solve, warmups: 0, repetitions: 1 });
const finalPeak = readPeakRss();
process.stdout.write(JSON.stringify({
  status: 'passed',
  startupRssBytes,
  loadedRssBytes,
  peakRssBytes: finalPeak.peakRssBytes,
  peakRssMetric: finalPeak.metric,
  startupPeakRssBytes: startupPeak.peakRssBytes,
  loadedPeakRssBytes: loadedPeak.peakRssBytes,
  resourceUsageMaxRssBytes: finalPeak.resourceUsageMaxRssBytes,
  startupResourceUsageMaxRssBytes: startupPeak.resourceUsageMaxRssBytes,
  resourceUsageLaunchFloorDetected: startupPeak.resourceUsageMaxRssBytes > startupPeak.peakRssBytes,
  lockCount: locks.length,
}));
