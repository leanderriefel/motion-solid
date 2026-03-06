import { createContext, useContext } from "solid-js";
import type { NodeGroup } from "motion-dom";

export interface LayoutGroupContextValue {
  id?: string;
  group?: NodeGroup;
  forceRender?: VoidFunction;
}

export const LayoutGroupContext = createContext<LayoutGroupContextValue>({});

export const useLayoutGroupContext = () => useContext(LayoutGroupContext);
