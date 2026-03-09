import { Feature, frame, hover, type VisualElement } from "motion-dom";

const createEventInfo = (event: PointerEvent) => ({
  point: { x: event.clientX, y: event.clientY },
});

const handleHoverEvent = (
  node: VisualElement<Element>,
  event: PointerEvent,
  lifecycle: "Start" | "End",
) => {
  const { props } = node;

  if (node.animationState && props.whileHover) {
    node.animationState.setActive("whileHover", lifecycle === "Start");
  }

  const eventName = `onHover${lifecycle}` as "onHoverStart" | "onHoverEnd";
  const callback = props[eventName];
  if (callback) {
    frame.postRender(() => callback(event, createEventInfo(event)));
  }
};

export class HoverFeature extends Feature<Element> {
  override mount() {
    const { current } = this.node;
    if (!current) return;

    this.unmount = hover(current, (_element, startEvent) => {
      handleHoverEvent(this.node, startEvent, "Start");
      return (endEvent) => handleHoverEvent(this.node, endEvent, "End");
    });
  }

  override unmount() {}
}
