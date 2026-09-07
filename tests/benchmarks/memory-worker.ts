import { readPeakRss } from './rss.ts';
import { loadCatalog } from './catalog.ts';
import { loadImplementation } from './harness.ts';
import { commandMetrics, replayCommands } from './validation.ts';

const startupRssBytes = process.memoryUsage().rss;
const startupPeak = readPeakRss();
const [modulePath, format, fixtureId] = process.argv.slice(2);
if (modulePath === undefined || (format !== 'tuple' && format !== 'legacy')) throw new Error('Invalid RSS worker arguments.');
const solver = await loadImplementation(modulePath, format, 'RSS worker');
const loadedRssBytes = process.memoryUsage().rss;
const loadedPeak = readPeakRss();
const catalog = loadCatalog(); const selectedIds = fixtureId === undefined ? null : new Set(fixtureId.split(','));
const locks = selectedIds === null ? catalog : catalog.filter((lock) => selectedIds.has(lock.id));
if (locks.length === 0) throw new Error('RSS fixture not found.');
for (const lock of locks) {
  const commands = solver.normalize(solver.solve(structuredClone({ state: lock.state, links: lock.links })));
  if (commands === null || replayCommands(lock, commands).some((position) => position !== 4)) throw new Error('RSS worker solution did not reach target.');
  if (commandMetrics(commands).A !== lock.expectedActions) throw new Error('RSS worker action regression.');
}
const finalPeak = readPeakRss();
process.stdout.write(JSON.stringify({ status: 'passed', startupRssBytes, loadedRssBytes,
  peakRssBytes: finalPeak.peakRssBytes, peakRssMetric: finalPeak.metric, startupPeakRssBytes: startupPeak.peakRssBytes, loadedPeakRssBytes: loadedPeak.peakRssBytes,
  resourceUsageMaxRssBytes: finalPeak.resourceUsageMaxRssBytes, startupResourceUsageMaxRssBytes: startupPeak.resourceUsageMaxRssBytes,
  resourceUsageLaunchFloorDetected: startupPeak.resourceUsageMaxRssBytes > startupPeak.peakRssBytes, lockCount: locks.length }));
