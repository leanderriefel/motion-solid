import type { MotionOptions } from "../types";
import { isValidMotionProp } from "./valid-prop";

export const filterProps = (
  props: MotionOptions & Record<string, unknown>,
  isDom: boolean,
  forwardMotionProps: boolean,
) => {
  const filteredProps: Record<string, unknown> = {};

  for (const key in props) {
    if (key === "values" && typeof props.values === "object") continue;

    if (
      !isValidMotionProp(key) ||
      (forwardMotionProps && isValidMotionProp(key)) ||
      (!isDom && !isValidMotionProp(key)) ||
      (props.draggable === true && key.startsWith("onDrag"))
    ) {
      filteredProps[key] = props[key];
    }
  }

  return filteredProps;
};
