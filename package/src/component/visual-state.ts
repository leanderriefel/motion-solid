import {
  buildHTMLStyles,
  buildSVGAttrs,
  isAnimationControls,
  isControllingVariants,
  isSVGTag,
  isVariantNode,
  type MotionNodeOptions,
  resolveMotionValue,
  resolveVariantFromProps,
  scrapeHTMLMotionValuesFromProps,
  scrapeSVGMotionValuesFromProps,
  type AnyResolvedKeyframe,
  type HTMLRenderState,
  type ResolvedValues,
  type SVGRenderState,
} from "motion-dom";
import type { MotionContextValue } from "./motion-context";
import type { MotionOptions } from "../types";

export interface VisualState<Instance, RenderState> {
  latestValues: ResolvedValues;
  renderState: RenderState;
  onMount?: (instance: Instance) => void;
}

export const createHtmlRenderState = (): HTMLRenderState => ({
  style: {},
  transform: {},
  transformOrigin: {},
  vars: {},
});

export const createSvgRenderState = (): SVGRenderState => ({
  ...createHtmlRenderState(),
  attrs: {},
});

const createLatestValues = (
  props: MotionOptions,
  context: MotionContextValue,
  presenceContext: {
    initial: boolean;
    custom: unknown;
  } | null,
  isSVG: boolean,
) => {
  const values: ResolvedValues = {};
  const scrapeMotionValues = isSVG
    ? scrapeSVGMotionValuesFromProps
    : scrapeHTMLMotionValuesFromProps;
  const motionProps = props as unknown as MotionNodeOptions;
  const motionValues = scrapeMotionValues(motionProps, {}, undefined);

  for (const key in motionValues) {
    values[key] = resolveMotionValue(motionValues[key]);
  }

  let { initial, animate } = props;
  const controlsVariants = isControllingVariants(motionProps);
  const variantNode = isVariantNode(motionProps);

  if (context && variantNode && !controlsVariants && props.inherit !== false) {
    if (initial === undefined) initial = context.initial;
    if (animate === undefined) animate = context.animate;
  }

  let blockInitialAnimation = presenceContext
    ? presenceContext.initial === false
    : false;
  blockInitialAnimation ||= initial === false;

  const variantToSet = blockInitialAnimation ? animate : initial;

  if (
    variantToSet &&
    typeof variantToSet !== "boolean" &&
    !isAnimationControls(variantToSet)
  ) {
    const list = Array.isArray(variantToSet) ? variantToSet : [variantToSet];

    for (let i = 0; i < list.length; i++) {
      const resolved = resolveVariantFromProps(
        motionProps,
        list[i] as Exclude<MotionNodeOptions["initial"], boolean | undefined>,
        presenceContext?.custom,
      );

      if (!resolved) continue;

      const { transition, transitionEnd, ...target } = resolved;
      void transition;

      for (const key in target) {
        let valueTarget = target[key as keyof typeof target] as
          | AnyResolvedKeyframe
          | Array<AnyResolvedKeyframe | null>
          | null
          | undefined;

        if (Array.isArray(valueTarget)) {
          const index = blockInitialAnimation ? valueTarget.length - 1 : 0;
          valueTarget = valueTarget[index] ?? undefined;
        }

        if (valueTarget !== null && valueTarget !== undefined) {
          values[key] = valueTarget as AnyResolvedKeyframe;
        }
      }

      for (const key in transitionEnd) {
        values[key] = transitionEnd[
          key as keyof typeof transitionEnd
        ] as AnyResolvedKeyframe;
      }
    }
  }

  return values;
};

export const createVisualState = (
  props: MotionOptions,
  context: MotionContextValue,
  presenceContext: {
    initial: boolean;
    custom: unknown;
  } | null,
  isSVG: boolean,
): VisualState<HTMLElement | SVGElement, HTMLRenderState | SVGRenderState> => {
  return {
    latestValues: createLatestValues(props, context, presenceContext, isSVG),
    renderState: isSVG ? createSvgRenderState() : createHtmlRenderState(),
  };
};

export const createInitialVisualProps = (
  tag: string,
  props: MotionOptions,
  latestValues: ResolvedValues,
  isSVG: boolean,
) => {
  if (isSVG) {
    const state = createSvgRenderState();
    buildSVGAttrs(
      state,
      latestValues,
      isSVGTag(tag),
      props.transformTemplate as unknown as Parameters<typeof buildSVGAttrs>[3],
      props.style,
    );

    return {
      ...state.attrs,
      style: { ...state.style },
    };
  }

  const state = createHtmlRenderState();
  buildHTMLStyles(
    state,
    latestValues,
    props.transformTemplate as unknown as Parameters<typeof buildHTMLStyles>[2],
  );

  return {
    style: {
      ...state.vars,
      ...state.style,
    },
  };
};
