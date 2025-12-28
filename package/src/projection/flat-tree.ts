type WithDepth = { depth: number };

const compareByDepth = (a: WithDepth, b: WithDepth): number =>
  a.depth - b.depth;

export class FlatTree<T extends WithDepth> {
  private children: T[] = [];
  private isDirty = false;

  add(child: T): void {
    if (this.children.includes(child)) return;
    this.children.push(child);
    this.isDirty = true;
  }

  remove(child: T): void {
    const index = this.children.indexOf(child);
    if (index !== -1) {
      this.children.splice(index, 1);
      this.isDirty = true;
    }
  }

  forEach(callback: (child: T) => void): void {
    if (this.isDirty) {
      this.children.sort(compareByDepth);
      this.isDirty = false;
    }
    for (let i = 0; i < this.children.length; i++) {
      callback(this.children[i]!);
    }
  }

  get size(): number {
    return this.children.length;
  }
}
