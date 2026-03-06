import { HTMLVisualElement, SVGVisualElement } from "motion-dom";
import type { VisualElementOptions } from "motion-dom";
import type { ElementTag } from "../types";
import { isSVGElement } from "../types";

export const createDomVisualElement = (
  tag: ElementTag | string,
  options: VisualElementOptions<HTMLElement | SVGElement>,
) => {
  return isSVGElement(tag as ElementTag)
    ? new SVGVisualElement(options)
    : new HTMLVisualElement(options, {
        allowProjection: true,
      });
};
