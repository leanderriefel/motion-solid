import type { Accessor, FlowComponent, JSX } from "solid-js";
import { createContext, createMemo, useContext } from "solid-js";
import type { Transition } from "motion-dom";

export interface MotionConfigContextValue {
  transition: Accessor<Transition | undefined>;
}

export const MotionConfigContext =
  createContext<MotionConfigContextValue | null>(null);

export const useMotionConfig = () => useContext(MotionConfigContext);

export interface MotionConfigProps {
  transition?: Transition;
  children?: JSX.Element;
}

export const MotionConfig: FlowComponent<MotionConfigProps> = (props) => {
  const parent = useMotionConfig();

  const transition = createMemo<Transition | undefined>(() => {
    return props.transition ?? parent?.transition();
  });

  return (
    <MotionConfigContext.Provider value={{ transition }}>
      {props.children}
    </MotionConfigContext.Provider>
  );
};
