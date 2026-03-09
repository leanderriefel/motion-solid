import { Feature, frame, press, type VisualElement } from "motion-dom";

const createTapInfo = (event: PointerEvent) => ({
  point: { x: event.clientX, y: event.clientY },
});

type TapPropagation = {
  tap?: boolean;
};

const handlePressEvent = (
  node: VisualElement<Element>,
  event: PointerEvent,
  lifecycle: "Start" | "End" | "Cancel",
) => {
  const { props } = node;

  if (node.current instanceof HTMLButtonElement && node.current.disabled) {
    return;
  }

  if (node.animationState && props.whileTap) {
    node.animationState.setActive("whileTap", lifecycle === "Start");
  }

  const eventName = `onTap${lifecycle === "End" ? "" : lifecycle}` as
    | "onTapStart"
    | "onTap"
    | "onTapCancel";
  const callback = props[eventName];

  if (callback) {
    frame.postRender(() => callback(event, createTapInfo(event)));
  }
};

export class PressFeature extends Feature<Element> {
  override mount() {
    const current = this.node.current;
    if (!current) return;

    const propagate = this.node.props.propagate as TapPropagation | undefined;

    this.unmount = press(
      current,
      (_element, startEvent) => {
        handlePressEvent(this.node, startEvent, "Start");

        return (endEvent, { success }) =>
          handlePressEvent(this.node, endEvent, success ? "End" : "Cancel");
      },
      {
        useGlobalTarget: this.node.props.globalTapTarget,
        stopPropagation: propagate?.tap === false,
      },
    );
  }

  override unmount() {}
}
