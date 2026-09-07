import { readFile, writeFile } from 'node:fs/promises';
import { solveLock } from './index.mjs';
import { parseLockDefinition } from './lock-definition.mjs';
import { formatConsoleResult } from './result.mjs';

export function parseArgs(argv) {
  const isPath = (value) => value.length > 0 && !value.startsWith('--');

  if (argv.length === 1 && isPath(argv[0])) {
    return { inputPath: argv[0], outputPath: null };
  }
  if (argv.length === 3 && isPath(argv[0]) && argv[1] === '--output' && isPath(argv[2])) {
    return { inputPath: argv[0], outputPath: argv[2] };
  }
  throw new Error('Использование: node solve-lock.mjs <lock.json> [--output <solution.json>]');
}

export async function runCli(argv, streams = {}) {
  const stdout = streams.stdout ?? process.stdout;
  const stderr = streams.stderr ?? process.stderr;

  try {
    const { inputPath, outputPath } = parseArgs(argv);
    const definition = parseLockDefinition(await readFile(inputPath, 'utf8'));
    const result = solveLock(definition);

    if (outputPath !== null) {
      await writeFile(outputPath, `${JSON.stringify(result, null, 2)}\n`, 'utf8');
    }
    stdout.write(`${formatConsoleResult(result)}\n`);
    return result.status === 'unsolvable' ? 2 : 0;
  } catch (error) {
    stderr.write(`Ошибка: ${error.message}\n`);
    return 1;
  }
}
