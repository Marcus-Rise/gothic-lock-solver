// Independent verification: deliberately imports none of the production transition/search code.
export function replayCommands({ state, links }, commands) {
  if (!Array.isArray(commands)) throw new Error('Commands must be an array.');
  let current = [...state];
  for (const [index, command] of commands.entries()) {
    if (!command || !Number.isInteger(command.plate) || command.plate < 1
      || command.plate > current.length || !['left', 'right'].includes(command.direction)
      || !Number.isInteger(command.steps) || command.steps < 1 || command.steps > 6) {
      throw new Error(`Invalid command at index ${index}.`);
    }
    const source = command.plate - 1;
    const sign = command.direction === 'left' ? 1 : -1;
    // Every unit click is simultaneous. Only the selected plate's outgoing row is read.
    for (let click = 0; click < command.steps; click += 1) {
      const next = current.map((position, target) => position
        + sign * (target === source ? 1 : links[source][target]));
      if (next.some((position) => !Number.isInteger(position) || position < 1 || position > 7)) {
        throw new Error(`Blocked intermediate click ${click + 1} of command ${index + 1}.`);
      }
      current = next;
    }
  }
  return current;
}

export function commandMetrics(commands) {
  return {
    A: commands.length,
    U: new Set(commands.map((command) => command.plate)).size,
    C: commands.reduce((sum, command) => sum + command.steps, 0),
    plateSwitches: commands.reduce((sum, command, index) => sum
      + Number(index > 0 && commands[index - 1].plate !== command.plate), 0),
  };
}

export function groupReferenceClicks(sequence) {
  if (sequence === null) return null;
  if (!Array.isArray(sequence)) throw new Error('Invalid reference result.');
  const commands = [];
  for (const click of sequence) {
    if (!click || !Number.isInteger(click.plate) || click.plate < 0
      || (click.d !== 1 && click.d !== -1)) {
      throw new Error('Invalid reference unit click.');
    }
    const direction = click.d === 1 ? 'left' : 'right';
    const last = commands.at(-1);
    if (last?.plate === click.plate + 1 && last.direction === direction) {
      last.steps += 1;
    } else {
      commands.push({ plate: click.plate + 1, direction, steps: 1 });
    }
  }
  return commands;
}
