export const NOT_QUEUED = -1;

export interface SearchNode {
  readonly state: number;
  actionCount: number;
  readonly estimate: number;
  readonly remainingShifts: readonly number[];
  previous: SearchNode | null;
  plate: number;
  delta: number;
  readonly sequence: number;
  heapIndex: number;
  closed: boolean;
}

/** One entry per open state; decreasing priority never leaves obsolete nodes. */
export class IndexedHeap {
  private readonly nodes: SearchNode[] = [];

  get size(): number {
    return this.nodes.length;
  }

  private hasHigherPriority(left: SearchNode, right: SearchNode): boolean {
    const leftTotal = left.actionCount + left.estimate;
    const rightTotal = right.actionCount + right.estimate;
    if (leftTotal !== rightTotal) {
      return leftTotal < rightTotal;
    }
    if (left.estimate !== right.estimate) {
      return left.estimate < right.estimate;
    }
    return left.sequence < right.sequence;
  }

  decreasePriority(node: SearchNode): void {
    let index = node.heapIndex;
    while (index > 0) {
      const parentIndex = Math.floor((index - 1) / 2);
      const parent = this.nodes[parentIndex];
      if (parent === undefined) {
        throw new Error('Internal heap parent invariant failed.');
      }
      if (!this.hasHigherPriority(node, parent)) {
        break;
      }
      this.nodes[index] = parent;
      parent.heapIndex = index;
      index = parentIndex;
    }
    this.nodes[index] = node;
    node.heapIndex = index;
  }

  push(node: SearchNode): void {
    node.heapIndex = this.nodes.length;
    this.nodes.push(node);
    this.decreasePriority(node);
  }

  pop(): SearchNode {
    const first = this.nodes[0];
    const last = this.nodes.pop();
    if (first === undefined || last === undefined) {
      throw new Error('Internal empty-heap invariant failed.');
    }
    first.heapIndex = NOT_QUEUED;
    if (this.nodes.length === 0) {
      return first;
    }

    let index = 0;
    while (true) {
      let childIndex = index * 2 + 1;
      if (childIndex >= this.nodes.length) {
        break;
      }
      let child = this.nodes[childIndex];
      if (child === undefined) {
        throw new Error('Internal heap child invariant failed.');
      }
      if (childIndex + 1 < this.nodes.length) {
        const rightChild = this.nodes[childIndex + 1];
        if (rightChild === undefined) {
          throw new Error('Internal heap child invariant failed.');
        }
        if (this.hasHigherPriority(rightChild, child)) {
          childIndex += 1;
          child = rightChild;
        }
      }
      if (!this.hasHigherPriority(child, last)) {
        break;
      }
      this.nodes[index] = child;
      child.heapIndex = index;
      index = childIndex;
    }
    this.nodes[index] = last;
    last.heapIndex = index;
    return first;
  }
}
