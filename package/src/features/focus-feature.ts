import { Feature, addDomEvent } from "motion-dom";

export class FocusFeature extends Feature<Element> {
  private isActive = false;

  private onFocus() {
    let isFocusVisible = false;

    try {
      isFocusVisible = this.node.current?.matches(":focus-visible") ?? false;
    } catch {
      isFocusVisible = true;
    }

    if (!isFocusVisible || !this.node.animationState) return;

    this.node.animationState.setActive("whileFocus", true);
    this.isActive = true;
  }

  private onBlur() {
    if (!this.isActive || !this.node.animationState) return;

    this.node.animationState.setActive("whileFocus", false);
    this.isActive = false;
  }

  override mount() {
    const current = this.node.current;
    if (!current) return;

    const removeFocus = addDomEvent(current, "focus", () => this.onFocus());
    const removeBlur = addDomEvent(current, "blur", () => this.onBlur());

    this.unmount = () => {
      removeFocus();
      removeBlur();
    };
  }

  override unmount() {}
}
