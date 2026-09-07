import { loadCatalog } from '../benchmarks/catalog.mjs';
import { collectMetadata, defaultImplementations, loadReference, parseBenchmarkArgs, runAndPublish } from '../benchmarks/harness.mjs';

try {
  const options = parseBenchmarkArgs(process.argv.slice(2));
  if (options.help) {
    console.log('Usage: node scripts/benchmark.mjs [--repetitions 5] [--warmups 1] [--output-dir docs/benchmarks] [--reference /path/to/unlockmyloot] [--smoke]');
    console.log('Reports are published together in a new run-* directory. --smoke uses the first two catalog entries and labels the report as a subset.');
  } else {
    const reference = options.reference ? loadReference(options.reference) : null;
    const metadata = collectMetadata(reference?.metadata);
    const catalog = loadCatalog();
    const result = await runAndPublish({
      locks: options.smoke ? catalog.slice(0, 2) : catalog,
      implementations: defaultImplementations(reference?.implementation),
      repetitions: options.repetitions, warmups: options.warmups,
      metadata, outputDir: options.outputDir,
      onProgress: ({ completed, total, id }) => process.stderr.write(`[${completed}/${total}] ${id}: correctness gates passed\n`),
    });
    console.log(JSON.stringify({ correctness: result.report.correctness.passed,
      lockCount: result.report.config.lockCount, jsonPath: result.jsonPath,
      markdownPath: result.markdownPath, comparisons: result.report.comparisons }, null, 2));
  }
} catch (error) {
  console.error(`Benchmark failed: ${error.message}`);
  process.exitCode = 1;
}
