import type { HarnessEvent } from "./harness-client";

export const byType = (events: HarnessEvent[], type: string) =>
  events.filter((event) => event.type === type);

export const byTypeAndNode = (
  events: HarnessEvent[],
  type: string,
  node: string,
) => events.filter((event) => event.type === type && event.node === node);

export const firstByType = (events: HarnessEvent[], type: string) =>
  events.find((event) => event.type === type);

export const firstByTypeAndNode = (
  events: HarnessEvent[],
  type: string,
  node: string,
) => events.find((event) => event.type === type && event.node === node);

export const isInOrder = (
  events: HarnessEvent[],
  chain: Array<{ type: string; node?: string }>,
) => {
  let index = -1;

  for (const expected of chain) {
    const foundIndex = events.findIndex((event, currentIndex) => {
      if (currentIndex <= index) return false;
      if (event.type !== expected.type) return false;
      if (expected.node && event.node !== expected.node) return false;
      return true;
    });

    if (foundIndex === -1) return false;
    index = foundIndex;
  }

  return true;
};
