import { createContext, useContext, type Accessor } from "solid-js";
import type { NodeGroup } from "motion-dom";

export interface LayoutGroupContextValue {
  id?: string;
  group?: NodeGroup;
  forceRender?: VoidFunction;
  forceRenderVersion?: Accessor<number>;
}

export const LayoutGroupContext = createContext<LayoutGroupContextValue>({});

export const useLayoutGroupContext = () => useContext(LayoutGroupContext);
