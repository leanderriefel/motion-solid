import type { Measurements } from "../node/types";
import { copyBoxInto } from "../geometry/copy";
import { createBox } from "../geometry/models";

type StackNode = any;

const addUniqueItem = <T>(arr: T[], item: T): void => {
  if (arr.includes(item)) return;
  arr.push(item);
};

const removeItem = <T>(arr: T[], item: T): void => {
  const index = arr.indexOf(item);
  if (index !== -1) {
    arr.splice(index, 1);
  }
};

const cloneSnapshot = (snapshot: Measurements): Measurements => {
  const measuredBox = createBox();
  const layoutBox = createBox();
  copyBoxInto(measuredBox, snapshot.measuredBox);
  copyBoxInto(layoutBox, snapshot.layoutBox);
  return {
    ...snapshot,
    measuredBox,
    layoutBox,
    latestValues: { ...snapshot.latestValues },
  };
};

const resolveSnapshot = (node: StackNode): Measurements | undefined => {
  const existing = node.snapshot ?? node.layout;
  if (existing) {
    const snapshot = cloneSnapshot(existing);
    const latestValues = node.animationValues || node.latestValues;
    if (latestValues) {
      snapshot.latestValues = { ...latestValues };
    }
    return snapshot;
  }

  if (node.instance && typeof node.measure === "function") {
    const measured = node.measure();
    const snapshot = cloneSnapshot(measured);
    const latestValues = node.animationValues || node.latestValues;
    if (latestValues) {
      snapshot.latestValues = { ...latestValues };
    }
    return snapshot;
  }

  return undefined;
};

export class NodeStack {
  lead?: StackNode;
  prevLead?: StackNode;
  snapshot?: Measurements;
  members: StackNode[] = [];

  add(node: StackNode): void {
    addUniqueItem(this.members, node);
    node.scheduleRender();
  }

  recordSnapshot(node: StackNode, force = false): void {
    if (!force && this.lead && node !== this.lead) {
      return;
    }
    const snapshot = resolveSnapshot(node);
    if (!snapshot) {
      return;
    }
    this.snapshot = snapshot;

    if (this.lead && this.lead !== node && !this.lead.snapshot) {
      this.lead.snapshot = cloneSnapshot(snapshot);
    }
  }

  remove(node: StackNode): void {
    removeItem(this.members, node);
    if (node === this.prevLead) {
      this.prevLead = undefined;
    }
    if (node === this.lead) {
      const prevLead = this.members[this.members.length - 1];
      if (prevLead) {
        this.promote(prevLead);
      } else {
        this.lead = undefined;
      }
    }
  }

  relegate(node: StackNode): boolean {
    const indexOfNode = this.members.findIndex((member) => node === member);
    if (indexOfNode === 0) return false;

    if (node === this.lead) {
      this.recordSnapshot(node);
    }

    let prevLead: StackNode | undefined;
    for (let i = indexOfNode; i >= 0; i--) {
      const member = this.members[i];
      if (member && member.isPresent !== false) {
        prevLead = member;
        break;
      }
    }

    if (prevLead) {
      this.promote(prevLead);
      return true;
    }

    return false;
  }

  promote(node: StackNode, preserveFollowOpacity?: boolean): void {
    const prevLead = this.lead;

    if (node === prevLead) return;

    this.prevLead = prevLead;
    this.lead = node;

    node.show();

    if (prevLead) {
      prevLead.instance && prevLead.scheduleRender();
      node.scheduleRender();
      node.resumeFrom = prevLead;

      if (preserveFollowOpacity && node.resumeFrom) {
        node.resumeFrom.preserveOpacity = true;
      }

      const snapshot =
        resolveSnapshot(prevLead) ??
        (this.snapshot ? cloneSnapshot(this.snapshot) : undefined);

      if (snapshot) {
        node.snapshot = snapshot;
        this.snapshot = cloneSnapshot(snapshot);
      }

      if (node.root && node.root.isUpdating) {
        node.isLayoutDirty = true;
      }

      const { crossfade } = node.options;
      if (crossfade === false) {
        prevLead.hide();
      }
    } else if (this.snapshot) {
      node.snapshot = cloneSnapshot(this.snapshot);
    }
  }

  exitAnimationComplete(): void {
    this.members.forEach((node) => {
      const { options, resumingFrom } = node;

      options.onExitComplete && options.onExitComplete();

      if (resumingFrom) {
        resumingFrom.options.onExitComplete &&
          resumingFrom.options.onExitComplete();
      }
    });
  }

  scheduleRender(): void {
    this.members.forEach((node) => {
      node.instance && node.scheduleRender(false);
    });
  }

  removeLeadSnapshot(): void {
    if (this.lead && this.lead.snapshot) {
      this.lead.snapshot = undefined;
    }
  }
}
