import {
  createAnimationState,
  Feature,
  isAnimationControls,
  type VisualElement,
} from "motion-dom";

export class AnimationFeature extends Feature<unknown> {
  private unmountControls?: () => void;

  constructor(node: VisualElement) {
    super(node);
    node.animationState ||= createAnimationState(node);
  }

  private updateControlsSubscription() {
    const { animate } = this.node.getProps();
    if (isAnimationControls(animate)) {
      this.unmountControls = animate.subscribe(this.node);
    }
  }

  override mount() {
    this.updateControlsSubscription();
  }

  override update() {
    const { animate } = this.node.getProps();
    const { animate: prevAnimate } = this.node.prevProps || {};
    if (animate !== prevAnimate) {
      this.updateControlsSubscription();
    }
  }

  override unmount() {
    this.node.animationState?.reset();
    this.unmountControls?.();
  }
}
