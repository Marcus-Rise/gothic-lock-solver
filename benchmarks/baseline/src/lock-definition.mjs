export class LockInputError extends Error {
  constructor(message, options) {
    super(message, options);
    this.name = 'LockInputError';
  }
}

export function validateLockDefinition(value) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new LockInputError('Определение замка должно быть JSON-объектом.');
  }

  const { state, links } = value;
  if (!Array.isArray(state) || state.length < 2 || state.length > 7) {
    throw new LockInputError('state должен содержать от 2 до 7 пластин.');
  }

  state.forEach((position, index) => {
    if (!Number.isInteger(position) || position < 1 || position > 7) {
      throw new LockInputError(`state[${index}] должен быть целым числом от 1 до 7.`);
    }
  });

  if (!Array.isArray(links) || links.length !== state.length) {
    throw new LockInputError(`links должен быть матрицей ${state.length}x${state.length}.`);
  }

  links.forEach((row, rowIndex) => {
    if (!Array.isArray(row) || row.length !== state.length) {
      throw new LockInputError(`links[${rowIndex}] должен содержать ${state.length} элементов.`);
    }
    row.forEach((coefficient, columnIndex) => {
      if (![-1, 0, 1].includes(coefficient)) {
        throw new LockInputError(`links[${rowIndex}][${columnIndex}] должен быть -1, 0 или 1.`);
      }
      if (rowIndex === columnIndex && coefficient !== 0) {
        throw new LockInputError(`links[${rowIndex}][${columnIndex}] на диагонали должен быть 0.`);
      }
    });
  });

  return {
    state: [...state],
    links: links.map((row) => [...row]),
  };
}

export function parseLockDefinition(text) {
  try {
    return validateLockDefinition(JSON.parse(text));
  } catch (error) {
    if (error instanceof LockInputError) {
      throw error;
    }
    throw new LockInputError(`Некорректный JSON: ${error.message}`, { cause: error });
  }
}
