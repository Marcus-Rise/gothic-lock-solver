import { createTargetState } from './state-codec.mjs';
import { applyCommand } from './transition.mjs';

export function createSolveResult(definition, commands) {
  const initialState = [...definition.state];
  const targetState = createTargetState(initialState.length);

  if (commands === null) {
    return { status: 'unsolvable', initialState, targetState, commands: [] };
  }

  let finalState = [...initialState];
  for (const command of commands) {
    const nextState = applyCommand(finalState, definition.links, command);
    if (nextState === null) {
      throw new Error('Решатель вернул заблокированную команду.');
    }
    finalState = nextState;
  }

  if (!finalState.every((position) => position === 4)) {
    throw new Error('Решатель не привел замок к целевому состоянию.');
  }

  const plateSwitches = commands.reduce((count, command, index) => {
    if (index === 0 || command.plate === commands[index - 1].plate) {
      return count;
    }
    return count + 1;
  }, 0);

  return {
    status: 'solved',
    initialState,
    targetState,
    commands: commands.map((command) => ({ ...command })),
    finalState,
    metrics: {
      commands: commands.length,
      divisions: commands.reduce((sum, command) => sum + command.steps, 0),
      plateSwitches,
    },
  };
}

export function formatConsoleResult(result) {
  if (result.status === 'unsolvable') {
    return 'Решение не найдено.';
  }
  if (result.commands.length === 0) {
    return 'Замок уже открыт.';
  }

  const directionNames = { left: 'влево', right: 'вправо' };
  const lines = result.commands.map((command, index) => (
    `${index + 1}. Пластина ${command.plate} - ${directionNames[command.direction]} x${command.steps}`
  ));
  return [`Найдено команд: ${result.commands.length}`, ...lines].join('\n');
}
