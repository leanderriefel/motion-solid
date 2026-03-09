export interface DragControlOptions {
  /**
   * Whether to center the dragged element on the pointer immediately.
   */
  snapToCursor?: boolean;
  /**
   * Reserved for Motion parity. The current VisualElement drag feature starts
   * dragging immediately on pointer down.
   */
  distanceThreshold?: number;
}

type DragControlSubscriber = {
  start: (event: PointerEvent, options?: DragControlOptions) => void;
  cancel?: () => void;
  stop?: () => void;
};

export interface DragControls {
  start: (event: PointerEvent, options?: DragControlOptions) => void;
  cancel: () => void;
  stop: () => void;
}

type DragControlsInternal = DragControls & {
  subscribe: (controls: DragControlSubscriber) => VoidFunction;
};

/**
 * Create a Motion-compatible drag controller for the VisualElement drag feature.
 */
export const createDragControls = (): DragControls => {
  const subscribers = new Set<DragControlSubscriber>();

  const controls: DragControlsInternal = {
    start(event, options) {
      for (const subscriber of subscribers) {
        subscriber.start(event, options);
      }
    },
    cancel() {
      for (const subscriber of subscribers) {
        subscriber.cancel?.();
      }
    },
    stop() {
      for (const subscriber of subscribers) {
        subscriber.stop?.();
      }
    },
    subscribe(subscriber) {
      subscribers.add(subscriber);
      return () => subscribers.delete(subscriber);
    },
  };

  return controls;
};
