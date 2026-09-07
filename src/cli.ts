#!/usr/bin/env node
import { realpathSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { validateSolverConfig } from './config.ts';
import { createSolverConfig, solveLock } from './index.ts';
import { LockModel } from './lock.ts';
import type { Command, Position } from './types.ts';

interface TextWriter {
  write(text: string): unknown;
}

interface Streams {
  readonly stdout: TextWriter;
  readonly stderr: TextWriter;
}

interface CliCommand {
  readonly plate: number;
  readonly direction: 'left' | 'right';
  readonly steps: number;
}

interface ResultBase {
  readonly initialState: readonly Position[];
  readonly targetState: readonly Position[];
  readonly commands: readonly CliCommand[];
}

type CliResult = ResultBase & (
  | { readonly status: 'unsolvable' }
  | {
    readonly status: 'solved';
    readonly finalState: readonly Position[];
    readonly metrics: { readonly commands: number; readonly divisions: number; readonly plateSwitches: number };
  }
);

const usage = 'Использование: gothic-lock-solver <lock.json> [--config <solver.config.json>] [--output <solution.json>]\n       gothic-lock-solver --help';

function parseArgs(argv: readonly string[]): { inputPath: string; configPath: string | null; outputPath: string | null } {
  const inputPath = argv[0];
  if (typeof inputPath !== 'string' || inputPath.length === 0 || inputPath.startsWith('--')) throw new Error(usage);
  let configPath: string | null = null;
  let outputPath: string | null = null;
  for (let index = 1; index < argv.length; index += 2) {
    const flag = argv[index];
    const path = argv[index + 1];
    if (typeof path !== 'string' || path.length === 0 || path.startsWith('--')) throw new Error(usage);
    if (flag === '--config' && configPath === null) {
      configPath = path;
    } else if (flag === '--output' && outputPath === null) {
      outputPath = path;
    } else {
      throw new Error(usage);
    }
  }
  return { inputPath, configPath, outputPath };
}

function parseJson(json: string): unknown {
  try {
    return JSON.parse(json);
  } catch {
    throw new Error('Некорректный JSON.');
  }
}

function parseInput(json: string): LockModel {
  const value = parseJson(json);
  if (typeof value !== 'object' || value === null || Array.isArray(value) || !('state' in value) || !('links' in value)) {
    throw new Error('Ожидается объект с полями state и links.');
  }
  return new LockModel(value.state, value.links);
}

/** CLI files use one-based plates and physical-direction notation. */
function createResult(state: readonly Position[], solution: readonly Command[] | null): CliResult {
  const initialState = [...state];
  const targetState = state.map((): Position => 4);
  if (solution === null) return { status: 'unsolvable', initialState, targetState, commands: [] };
  let previous: number | undefined;
  let divisions = 0;
  let plateSwitches = 0;
  const commands: CliCommand[] = [];
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
    if (argv.length === 1 && argv[0] === '--help') {
      streams.stdout.write(`${usage}\n`);
      return 0;
    }
    const { inputPath, configPath, outputPath } = parseArgs(argv);
    const model = parseInput(await readFile(inputPath, 'utf8'));
    const config = configPath === null
      ? createSolverConfig()
      : createSolverConfig(validateSolverConfig(parseJson(await readFile(configPath, 'utf8')), true));
    const result = createResult(model.state, solveLock(model.state, model.links, config));
    if (outputPath !== null) await writeFile(outputPath, `${JSON.stringify(result, null, 2)}\n`, 'utf8');
    streams.stdout.write(`${formatResult(result)}\n`);
    return result.status === 'unsolvable' ? 2 : 0;
  } catch (error) {
    streams.stderr.write(`Ошибка: ${error instanceof Error ? error.message : String(error)}\n`);
    return 1;
  }
}

function isEntryPoint(): boolean {
  const entryPath = process.argv[1];
  if (entryPath === undefined) return false;
  try {
    return realpathSync(entryPath) === realpathSync(fileURLToPath(import.meta.url));
  } catch {
    return false;
  }
}

if (isEntryPoint()) process.exitCode = await runCli(process.argv.slice(2));
