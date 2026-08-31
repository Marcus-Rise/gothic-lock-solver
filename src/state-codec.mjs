export function stateSpaceSize(plateCount) {
  return 7 ** plateCount;
}

export function encodeState(state) {
  let code = 0;
  for (const position of state) {
    code = code * 7 + (position - 1);
  }
  return code;
}

export function decodeState(code, plateCount) {
  const state = new Array(plateCount);
  let remainder = code;
  for (let index = plateCount - 1; index >= 0; index -= 1) {
    state[index] = (remainder % 7) + 1;
    remainder = Math.floor(remainder / 7);
  }
  return state;
}

export function createTargetState(plateCount) {
  return Array.from({ length: plateCount }, () => 4);
}
