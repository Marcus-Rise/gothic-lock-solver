const DIRECTIONS = ['left', 'right'];

export function applyCommand(state, links, command) {
  const sourceIndex = command.plate - 1;
  const directionDelta = command.direction === 'left' ? 1 : -1;
  const nextState = [...state];

  for (let targetIndex = 0; targetIndex < state.length; targetIndex += 1) {
    const coefficient = targetIndex === sourceIndex
      ? 1
      : links[sourceIndex][targetIndex];

    if (coefficient === 0) {
      continue;
    }

    const nextPosition = state[targetIndex]
      + directionDelta * coefficient * command.steps;
    if (nextPosition < 1 || nextPosition > 7) {
      return null;
    }
    nextState[targetIndex] = nextPosition;
  }

  return nextState;
}

export function generateTransitions(state, links) {
  const transitions = [];
  for (let plate = 1; plate <= state.length; plate += 1) {
    const sourcePosition = state[plate - 1];
    for (const direction of DIRECTIONS) {
      const sourceLimit = direction === 'left'
        ? 7 - sourcePosition
        : sourcePosition - 1;
      for (let steps = sourceLimit; steps >= 1; steps -= 1) {
        const command = { plate, direction, steps };
        const nextState = applyCommand(state, links, command);
        if (nextState !== null) {
          transitions.push({ command, state: nextState });
        }
      }
    }
  }
  return transitions;
}
