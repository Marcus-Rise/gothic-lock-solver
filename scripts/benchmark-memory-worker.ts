import { readPeakRss } from '../benchmarks/rss.ts';
import { loadCatalog } from '../benchmarks/catalog.ts';
import { loadImplementation, loadUpstream } from '../benchmarks/harness.ts';
import { commandMetrics, replayCommands } from '../benchmarks/validation.ts';

const startupRssBytes = process.memoryUsage().rss;
const startupPeak = readPeakRss();
const [modulePath, format, fixtureId] = process.argv.slice(2);
if (modulePath === undefined || (format !== 'tuple' && format !== 'legacy' && format !== 'upstream')) throw new Error('Invalid RSS worker arguments.');
const solver = format === 'upstream' ? loadUpstream(modulePath) : await loadImplementation(modulePath, format, 'RSS worker');
const loadedRssBytes = process.memoryUsage().rss;
const loadedPeak = readPeakRss();
const catalog = loadCatalog(); const selectedIds = fixtureId === undefined ? null : new Set(fixtureId.split(','));
const locks = selectedIds === null ? catalog : catalog.filter((lock) => selectedIds.has(lock.id));
if (locks.length === 0) throw new Error('RSS fixture not found.');
for (const lock of locks) {
  const commands = solver.normalize(solver.solve(structuredClone(lock.definition)));
  if (commands === null || replayCommands(lock.definition, commands).some((position) => position !== 4)) throw new Error('RSS worker solution did not reach target.');
  if (solver.requiresOptimality && commandMetrics(commands).A !== lock.expectedActions) throw new Error('RSS worker action regression.');
}
const finalPeak = readPeakRss();
process.stdout.write(JSON.stringify({ status: 'passed', startupRssBytes, loadedRssBytes,
  peakRssBytes: finalPeak.peakRssBytes, peakRssMetric: finalPeak.metric, startupPeakRssBytes: startupPeak.peakRssBytes, loadedPeakRssBytes: loadedPeak.peakRssBytes,
  resourceUsageMaxRssBytes: finalPeak.resourceUsageMaxRssBytes, startupResourceUsageMaxRssBytes: startupPeak.resourceUsageMaxRssBytes,
  resourceUsageLaunchFloorDetected: startupPeak.resourceUsageMaxRssBytes > startupPeak.peakRssBytes, lockCount: locks.length }));
