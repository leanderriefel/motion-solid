import { createContext, useContext } from "solid-js";
import type { SetStoreFunction } from "solid-js/store";
import type { MotionState } from "../types";

export const MotionStateContext = createContext<
  [MotionState, SetStoreFunction<MotionState>] | null
>(null);

export const useMotionState = () => useContext(MotionStateContext);
