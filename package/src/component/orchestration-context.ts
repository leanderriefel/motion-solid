import { createContext, useContext, type Accessor } from "solid-js";

export type WhenOrchestration = false | "beforeChildren" | "afterChildren";

export interface OrchestrationContextValue {
  /**
   * Promise that resolves when children can start animating.
   * For "beforeChildren", this resolves after parent animation completes.
   * For normal/no orchestration, this is already resolved.
   */
  childrenCanStart: Accessor<Promise<void>>;

  /**
   * Signal parent that this child has completed its animation.
   * Used for "afterChildren" to know when all children are done.
   */
  signalChildComplete: () => void;

  /**
   * Get the stagger delay for this child based on its index.
   * Returns delay in seconds.
   */
  getChildDelay: (childIndex: number) => number;

  /**
   * Register as a child and get assigned index.
   */
  registerChild: () => number;

  /**
   * Get the total number of registered children.
   */
  getChildCount: () => number;

  /**
   * Get the current 'when' orchestration mode.
   */
  getWhen: () => WhenOrchestration | undefined;

  /**
   * For "afterChildren" mode: returns a promise that resolves when all
   * registered children have signaled completion.
   */
  waitForChildren: () => Promise<void>;

  /**
   * Signal that the parent's animation has completed.
   * Used for "beforeChildren" to allow children to start.
   */
  signalParentComplete: () => void;
}

export const OrchestrationContext =
  createContext<OrchestrationContextValue | null>(null);

export const useOrchestration = () => useContext(OrchestrationContext);
