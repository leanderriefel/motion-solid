import { rootProjectionNode } from "motion-dom";

export const useInstantLayoutTransition = () => {
  return (callback: VoidFunction) => {
    const root = rootProjectionNode.current;
    root?.blockUpdate();
    callback();
    queueMicrotask(() => {
      root?.unblockUpdate();
      root?.didUpdate();
    });
  };
};

export const useResetProjection = () => {
  return () => {
    const root = rootProjectionNode.current;
    root?.resetTree();
  };
};
