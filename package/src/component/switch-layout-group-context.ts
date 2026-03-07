import { createContext, useContext } from "solid-js";
import type { IProjectionNode, Transition } from "motion-dom";

export interface SwitchLayoutGroup {
  register?: (member: IProjectionNode) => void;
  deregister?: (member: IProjectionNode) => void;
}

export interface InitialPromotionConfig {
  transition?: Transition;
  shouldPreserveFollowOpacity?: (member: IProjectionNode) => boolean;
}

export type SwitchLayoutGroupContextValue = SwitchLayoutGroup &
  InitialPromotionConfig;

export const SwitchLayoutGroupContext =
  createContext<SwitchLayoutGroupContextValue>({});

export const useSwitchLayoutGroupContext = () =>
  useContext(SwitchLayoutGroupContext);
