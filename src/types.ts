/** A pin's numbered position; all pins are open at position 4. */
export type Position = 1 | 2 | 3 | 4 | 5 | 6 | 7;
/** Direct influence from links[source][target]; the diagonal must be zero. */
export type Link = -1 | 0 | 1;
/** Signed numeric pin displacement in one action; zero is not an action. */
export type Delta = -6 | -5 | -4 | -3 | -2 | -1 | 1 | 2 | 3 | 4 | 5 | 6;
export type State = readonly [Position, Position, ...Position[]];
export type Command = readonly [index: number, delta: Delta];
/** A square matrix when S has a fixed tuple length; runtime-checked otherwise. */
export type Links<S extends readonly Position[] = readonly Position[]> = {
  readonly [Row in keyof S]: { readonly [Column in keyof S]: Link };
};
