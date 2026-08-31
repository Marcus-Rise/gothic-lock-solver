import {
  createTargetState,
  decodeState,
  encodeState,
  stateSpaceSize,
} from './state-codec.mjs';
import { generateTransitions } from './transition.mjs';

const UNSEEN = -2;
const ROOT = -1;

export function packCommand(command) {
  const directionBit = command.direction === 'left' ? 0 : 1;
  return (((command.plate - 1) * 2 + directionBit) * 6) + command.steps - 1;
}

export function unpackCommand(packed) {
  const steps = (packed % 6) + 1;
  const plateDirection = Math.floor(packed / 6);
  return {
    plate: Math.floor(plateDirection / 2) + 1,
    direction: plateDirection % 2 === 0 ? 'left' : 'right',
    steps,
  };
}

function reconstructCommands(startCode, targetCode, parents, actions) {
  const commands = [];
  let code = targetCode;
  while (code !== startCode) {
    commands.push(unpackCommand(actions[code]));
    code = parents[code];
  }
  commands.reverse();
  return commands;
}

export function findShortestCommands({ state, links }) {
  const plateCount = state.length;
  const startCode = encodeState(state);
  const targetCode = encodeState(createTargetState(plateCount));
  if (startCode === targetCode) {
    return [];
  }

  const size = stateSpaceSize(plateCount);
  const parents = new Int32Array(size);
  parents.fill(UNSEEN);
  const actions = new Uint8Array(size);
  const queue = new Int32Array(size);

  parents[startCode] = ROOT;
  let head = 0;
  let tail = 0;
  queue[tail] = startCode;
  tail += 1;

  while (head < tail) {
    const currentCode = queue[head];
    head += 1;
    const currentState = decodeState(currentCode, plateCount);

    for (const transition of generateTransitions(currentState, links)) {
      const nextCode = encodeState(transition.state);
      if (parents[nextCode] !== UNSEEN) {
        continue;
      }

      parents[nextCode] = currentCode;
      actions[nextCode] = packCommand(transition.command);
      if (nextCode === targetCode) {
        return reconstructCommands(startCode, targetCode, parents, actions);
      }
      queue[tail] = nextCode;
      tail += 1;
    }
  }

  return null;
}
