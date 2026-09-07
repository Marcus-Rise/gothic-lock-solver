import { readFile, writeFile } from 'node:fs/promises';
import { solveLock } from '../src/index.ts';
import { LockModel } from '../src/lock-model.ts';
import type { Command, Position } from '../src/types.ts';

interface TextWriter {
  write(text: string): unknown;
}

interface Streams {
  readonly stdout: TextWriter;
  readonly stderr: TextWriter;
}

interface LegacyCommand {
  readonly plate: number;
  readonly direction: 'left' | 'right';
  readonly steps: number;
}

interface ResultBase {
  readonly initialState: readonly Position[];
  readonly targetState: readonly Position[];
  readonly commands: readonly LegacyCommand[];
}

type CliResult = ResultBase & (
  | { readonly status: 'unsolvable' }
  | {
    readonly status: 'solved';
    readonly finalState: readonly Position[];
    readonly metrics: { readonly commands: number; readonly divisions: number; readonly plateSwitches: number };
  }
);

function parseArgs(argv: readonly string[]): { inputPath: string; outputPath: string | null } {
  const [input, flag, output] = argv;
  if (typeof input === 'string' && input.length > 0 && !input.startsWith('--')) {
    if (argv.length === 1) return { inputPath: input, outputPath: null };
    if (argv.length === 3 && flag === '--output' && typeof output === 'string' && output.length > 0 && !output.startsWith('--')) {
      return { inputPath: input, outputPath: output };
    }
  }
  throw new Error('Использование: gothic-lock-solver <lock.json> [--output <solution.json>]');
}

function parseInput(json: string): LockModel {
  let value: unknown;
  try {
    value = JSON.parse(json);
  } catch {
    throw new Error('Некорректный JSON.');
  }
  if (typeof value !== 'object' || value === null || Array.isArray(value) || !('state' in value) || !('links' in value)) {
    throw new Error('Ожидается объект с полями state и links.');
  }
  return new LockModel(value.state, value.links);
}

/** Preserve the file/console adapter's historical one-based, physical-direction notation. */
function createResult(state: readonly Position[], solution: readonly Command[] | null): CliResult {
  const initialState = [...state];
  const targetState = state.map((): Position => 4);
  if (solution === null) return { status: 'unsolvable', initialState, targetState, commands: [] };
  let previous: number | undefined;
  let divisions = 0;
  let plateSwitches = 0;
  const commands: LegacyCommand[] = [];
  for (const [index, delta] of solution) {
    if (previous !== undefined && previous !== index) plateSwitches += 1;
    previous = index;
    divisions += Math.abs(delta);
    commands.push({ plate: index + 1, direction: delta > 0 ? 'left' : 'right', steps: Math.abs(delta) });
  }
  return {
    status: 'solved', initialState, targetState, commands, finalState: [...targetState],
    metrics: { commands: commands.length, divisions, plateSwitches },
  };
}

function formatResult(result: CliResult): string {
  if (result.status === 'unsolvable') return 'Решение не найдено.';
  if (result.commands.length === 0) return 'Замок уже открыт.';
  const lines = result.commands.map((command, index) =>
    `${index + 1}. Пластина ${command.plate} - ${command.direction === 'left' ? 'влево' : 'вправо'} x${command.steps}`);
  return [`Найдено команд: ${result.commands.length}`, ...lines].join('\n');
}

/** Exit status: 0 solved, 2 proved unreachable, 1 malformed input/IO/resource failure. */
export async function runCli(argv: readonly string[], streams: Streams = process): Promise<0 | 1 | 2> {
  try {
    const { inputPath, outputPath } = parseArgs(argv);
    const model = parseInput(await readFile(inputPath, 'utf8'));
    const result = createResult(model.state, solveLock(model.state, model.links));
    if (outputPath !== null) await writeFile(outputPath, `${JSON.stringify(result, null, 2)}\n`, 'utf8');
    streams.stdout.write(`${formatResult(result)}\n`);
    return result.status === 'unsolvable' ? 2 : 0;
  } catch (error) {
    streams.stderr.write(`Ошибка: ${error instanceof Error ? error.message : String(error)}\n`);
    return 1;
  }
}
