// Deliberately independent of production types, transitions, encoders and search.
export type TupleCommand = readonly [index: number, delta: number];
export type Definition = { state: number[]; links: number[][] };
export type Metrics = { A: number; U: number; C: number; plateSwitches: number };

export function record(value: unknown, label = 'value'): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new Error(`Invalid ${label}: expected object.`);
  // Object.entries exposes own properties only; no unchecked structural assertion.
  return Object.fromEntries(Object.entries(value));
}
export function array(value: unknown, label = 'value'): unknown[] {
  if (!Array.isArray(value)) throw new Error(`Invalid ${label}: expected array.`);
  return Array.from(value, (item: unknown) => item);
}
export function integer(value: unknown, label = 'value'): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value)) throw new Error(`Invalid ${label}: expected integer.`);
  return value;
}
export function string(value: unknown, label = 'value'): string {
  if (typeof value !== 'string') throw new Error(`Invalid ${label}: expected string.`);
  return value;
}
export function tupleCommands(value: unknown): TupleCommand[] {
  return array(value, 'commands').map((command) => {
    const tuple = array(command, 'command');
    const index = integer(tuple[0], 'command index');
    const delta = integer(tuple[1], 'command delta');
    if (tuple.length !== 2 || index < 0 || delta === 0 || Math.abs(delta) > 6) throw new Error('Invalid command coordinates.');
    return [index, delta];
  });
}
export function legacyCommands(value: unknown): TupleCommand[] {
  return array(value, 'legacy commands').map((command) => {
    const item = record(command, 'legacy command');
    const plate = integer(item['plate'], 'legacy command plate');
    const steps = integer(item['steps'], 'legacy command steps');
    const direction = item['direction'];
    if (plate < 1 || steps < 1 || steps > 6 || (direction !== 'left' && direction !== 'right')) throw new Error('Invalid legacy command.');
    return [plate - 1, direction === 'left' ? steps : -steps];
  });
}
export function groupReferenceClicks(value: unknown): TupleCommand[] | null {
  if (value === null) return null;
  const commands: [number, number][] = [];
  for (const raw of array(value, 'reference result')) {
    const click = record(raw, 'reference click');
    const index = integer(click['plate'], 'reference plate');
    const delta = integer(click['d'], 'reference delta');
    if (index < 0 || Math.abs(delta) !== 1) throw new Error('Invalid reference unit click.');
    const last = commands.at(-1);
    if (last !== undefined && last[0] === index && Math.sign(last[1]) === delta) last[1] += delta;
    else commands.push([index, delta]);
  }
  return tupleCommands(commands);
}
export function replayCommands(definition: Definition, value: unknown): number[] {
  let state = [...definition.state];
  for (const [index, delta] of tupleCommands(value)) {
    const row = definition.links[index];
    if (index >= state.length || row === undefined) throw new Error('Invalid command plate index.');
    for (let click = 0; click < Math.abs(delta); click += 1) {
      const next = state.map((position, target) => {
        const link = row[target];
        if (link === undefined) throw new Error('Invalid link matrix.');
        return position + Math.sign(delta) * (target === index ? 1 : link);
      });
      if (next.some((position) => position < 1 || position > 7 || !Number.isInteger(position))) throw new Error('Blocked intermediate command click.');
      state = next;
    }
  }
  return state;
}
export function commandMetrics(value: unknown): Metrics {
  const commands = tupleCommands(value);
  return { A: commands.length, U: new Set(commands.map(([index]) => index)).size,
    C: commands.reduce((sum, [, delta]) => sum + Math.abs(delta), 0),
    plateSwitches: commands.reduce((sum, [index], position) => sum + Number(position > 0 && commands[position - 1]?.[0] !== index), 0) };
}
