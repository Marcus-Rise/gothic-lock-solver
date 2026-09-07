export interface SearchNode {
  readonly key: number;
  g: number;
  readonly h: number;
  readonly r: readonly number[];
  previous: SearchNode | null;
  plate: number;
  delta: number;
  readonly sequence: number;
  heapIndex: number;
  closed: boolean;
}

/** One entry per open state; decrease-key never leaves obsolete heap nodes. */
export class IndexedHeap {
  private readonly nodes: SearchNode[] = [];

  get size(): number { return this.nodes.length; }

  private before(a: SearchNode, b: SearchNode): boolean {
    return a.g + a.h < b.g + b.h ||
      (a.g + a.h === b.g + b.h && (a.h < b.h || (a.h === b.h && a.sequence < b.sequence)));
  }

  up(node: SearchNode): void {
    let index = node.heapIndex;
    while (index > 0) {
      const parent = Math.floor((index - 1) / 2);
      const parentNode = this.nodes[parent];
      if (parentNode === undefined) throw new Error('Internal heap parent invariant failed.');
      if (!this.before(node, parentNode)) break;
      this.nodes[index] = parentNode;
      parentNode.heapIndex = index;
      index = parent;
    }
    this.nodes[index] = node;
    node.heapIndex = index;
  }

  push(node: SearchNode): void {
    node.heapIndex = this.nodes.length;
    this.nodes.push(node);
    this.up(node);
  }

  pop(): SearchNode {
    const first = this.nodes[0];
    if (first === undefined) throw new Error('Internal empty-heap invariant failed.');
    const last = this.nodes.pop();
    if (last === undefined) throw new Error('Internal empty-heap invariant failed.');
    first.heapIndex = -1;
    if (this.nodes.length === 0) return first;
    let index = 0;
    while (true) {
      let child = index * 2 + 1;
      if (child >= this.nodes.length) break;
      let childNode = this.nodes[child];
      if (childNode === undefined) throw new Error('Internal heap child invariant failed.');
      if (child + 1 < this.nodes.length) {
        const right = this.nodes[child + 1];
        if (right === undefined) throw new Error('Internal heap child invariant failed.');
        if (this.before(right, childNode)) { child += 1; childNode = right; }
      }
      if (!this.before(childNode, last)) break;
      this.nodes[index] = childNode;
      childNode.heapIndex = index;
      index = child;
    }
    this.nodes[index] = last;
    last.heapIndex = index;
    return first;
  }
}
