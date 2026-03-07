import { createContext, useContext } from "solid-js";
import type { VisualElement } from "motion-dom";

export interface MotionContextValue<Instance = unknown> {
  visualElement?: VisualElement<Instance>;
  initial?: false | string | string[];
  animate?: string | string[];
}

export const MotionContext = createContext<MotionContextValue>({});

export const useMotionContext = () => useContext(MotionContext);
