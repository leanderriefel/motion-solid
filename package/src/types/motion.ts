import type { Accessor, JSX } from "solid-js";
import type {
  AnyResolvedKeyframe,
  MotionValue,
  MotionNodeOptions,
  ValueAnimationTransition,
  ValueTransition,
  VariantLabels,
} from "motion-dom";
import type { AnimationType } from "../animation/types";
import type { BoundingBox } from "motion-utils";
import type { ElementTag, SVGElements } from "./elements";

/**
 * Transform shortcut properties that can be used in the style prop.
 * These are converted to CSS transform strings at runtime.
 */
export interface StyleTransformShortcuts {
  x?: string | number;
  y?: string | number;
  z?: string | number;
  rotate?: string | number;
  "rotate-x"?: string | number;
  "rotate-y"?: string | number;
  "rotate-z"?: string | number;
  scale?: string | number;
  "scale-x"?: string | number;
  "scale-y"?: string | number;
  "scale-z"?: string | number;
  skew?: string | number;
  "skew-x"?: string | number;
  "skew-y"?: string | number;
  "translate-x"?: string | number;
  "translate-y"?: string | number;
  "translate-z"?: string | number;
  perspective?: string | number;
  "transform-perspective"?: string | number;
}

/**
 * Extended style prop type that includes transform shortcuts.
 * Allows using `x`, `y`, `scale`, etc. directly in the style prop.
 */
export type MotionStyle = JSX.CSSProperties & StyleTransformShortcuts;

export type MotionElement = HTMLElement | SVGElement;

export type MotionValues = Record<
  string,
  MotionValue<number> | MotionValue<string>
>;

export type MotionGoals = Record<string, AnyResolvedKeyframe>;

type MotionKeyframe = AnyResolvedKeyframe;

type MotionKeyframesDefinition =
  | MotionKeyframe
  | MotionKeyframe[]
  | Array<MotionKeyframe | null>;

type KnownKeys<T> = {
  [K in keyof T]-?: string extends K
    ? never
    : number extends K
      ? never
      : symbol extends K
        ? never
        : K;
}[keyof T];

type KeysMatching<T, Value> = {
  [K in KnownKeys<T>]-?: T[K] extends Value ? K : never;
}[KnownKeys<T>];

type CamelToKebab<S extends string> = S extends `${infer First}${infer Rest}`
  ? Rest extends Uncapitalize<Rest>
    ? `${Lowercase<First>}${CamelToKebab<Rest>}`
    : `${Lowercase<First>}-${CamelToKebab<Rest>}`
  : S;

type SvgAttributeValues = string | number | undefined;

type SvgAttributeKeys =
  JSX.SVGElementTags[keyof JSX.SVGElementTags] extends infer T
    ? T extends any
      ? KeysMatching<T, SvgAttributeValues>
      : never
    : never;

type KebabSvgAttributeKeys = SvgAttributeKeys extends string
  ? CamelToKebab<Exclude<SvgAttributeKeys, "type">>
  : never;

type MotionCssPropertyKeys = Exclude<
  Extract<KnownKeys<JSX.CSSProperties>, string>,
  "transition" | "direction" | "type"
>;

type MotionTransformKeys =
  | keyof StyleTransformShortcuts
  | "origin-x"
  | "origin-y"
  | "origin-z";

type MotionTargetKey<Tag extends ElementTag> =
  | MotionCssPropertyKeys
  | MotionTransformKeys
  | ([Tag] extends [keyof SVGElements] ? KebabSvgAttributeKeys : never);

type MotionTargetValues<Tag extends ElementTag> = Partial<
  Record<MotionTargetKey<Tag>, MotionKeyframe>
>;

export type MotionTarget<Tag extends ElementTag = ElementTag> = Partial<
  Record<MotionTargetKey<Tag>, MotionKeyframesDefinition>
>;

type BaseTransition = Omit<ValueAnimationTransition, "type"> & {
  type?: "spring" | "tween" | false;
};

type TransitionOverrideValue = ValueTransition | BaseTransition["type"];

type TransitionOverrides<Tag extends ElementTag> = Partial<
  Record<MotionTargetKey<Tag>, TransitionOverrideValue>
> & {
  default?: ValueTransition;
  layout?: ValueTransition;
};

export type Transition<Tag extends ElementTag = ElementTag> = BaseTransition &
  TransitionOverrides<Tag>;

export type MotionTargetAndTransition<Tag extends ElementTag = ElementTag> =
  MotionTarget<Tag> & {
    transition?: Transition<Tag>;
    transitionEnd?: MotionTargetValues<Tag>;
  };

export type MotionTargetResolver<Tag extends ElementTag = ElementTag> = {
  bivarianceHack(
    custom: unknown,
    current: MotionTargetValues<Tag>,
    velocity: MotionTargetValues<Tag>,
  ): MotionTargetAndTransition<Tag> | string;
}["bivarianceHack"];

export type Variant<Tag extends ElementTag = ElementTag> =
  | MotionTargetAndTransition<Tag>
  | MotionTargetResolver<Tag>;

export type Variants<Tag extends ElementTag = ElementTag> = Record<
  string,
  Variant<Tag>
>;

export type MotionAnimationDefinition<Tag extends ElementTag = ElementTag> =
  | MotionTargetAndTransition<Tag>
  | VariantLabels
  | boolean;

export type MotionWhileDefinition<Tag extends ElementTag = ElementTag> =
  | MotionTargetAndTransition<Tag>
  | VariantLabels;

export interface LegacyAnimationControls<Tag extends ElementTag = ElementTag> {
  subscribe(visualElement: unknown): () => void;
  start(
    definition: MotionAnimationDefinition<Tag>,
    transitionOverride?: Transition<Tag>,
  ): Promise<any>;
  set(definition: MotionAnimationDefinition<Tag>): void;
  stop(): void;
  mount(): () => void;
}

export interface MotionGesturesState {
  hover: boolean;
  tap: boolean;
  focus: boolean;
  drag: boolean;
  inView: boolean;
}

export type MotionVariantsState = Partial<
  Record<AnimationType | "initial", VariantLabels>
>;

/**
 * SolidJS-friendly viewport options.
 * Unlike motion-dom's ViewportOptions which expects React-style refs ({ current: Element }),
 * this accepts direct Element references as used in SolidJS.
 */
export interface SolidViewportOptions {
  root?: Element | Document | null;
  once?: boolean;
  margin?: string;
  amount?: "some" | "all" | number;
}

/**
 * `motion-dom` currently includes some `any`-typed escape hatches (e.g. `custom`).
 * We keep our public surface `unknown`-typed and let callers refine it.
 *
 * We also override `viewport` to use SolidJS-friendly types that accept
 * direct element references instead of requiring React-style ref objects.
 */
export type MotionOptions<Tag extends ElementTag = ElementTag> = Omit<
  MotionNodeOptions,
  | "custom"
  | "dragControls"
  | "viewport"
  | "dragConstraints"
  | "transition"
  | "dragTransition"
  | "initial"
  | "animate"
  | "exit"
  | "variants"
  | "whileHover"
  | "whileTap"
  | "whileFocus"
  | "whileInView"
  | "whileDrag"
  | "transformTemplate"
  | "onAnimationStart"
  | "onAnimationComplete"
> & {
  custom?: unknown;
  dragControls?: unknown;
  viewport?: SolidViewportOptions;
  dragConstraints?: false | Partial<BoundingBox> | Element;
  transition?: Transition<Tag>;
  dragTransition?: Transition<Tag>;
  variants?: Variants<Tag>;
  initial?: MotionAnimationDefinition<Tag>;
  animate?: MotionAnimationDefinition<Tag> | LegacyAnimationControls<Tag>;
  exit?: MotionWhileDefinition<Tag>;
  whileHover?: MotionWhileDefinition<Tag>;
  whileTap?: MotionWhileDefinition<Tag>;
  whileFocus?: MotionWhileDefinition<Tag>;
  whileInView?: MotionWhileDefinition<Tag>;
  whileDrag?: MotionWhileDefinition<Tag>;
  transformTemplate?: (
    transform: Record<string, string | number>,
    generatedTransform: string,
  ) => string;
  onAnimationStart?: (definition: MotionAnimationDefinition<Tag>) => void;
  onAnimationComplete?: (definition: MotionAnimationDefinition<Tag>) => void;
  layoutDependencies?: Accessor<unknown>[];
};

export interface MotionState {
  /**
   * The underlying DOM element reference
   */
  element: MotionElement | null;

  /**
   * For all the different animation keys we store the corresponding MotionValue if they exist
   */
  values: MotionValues;

  /**
   * For all the different animation keys we store the latest goal value
   */
  goals: MotionGoals;

  /**
   * Latest resolved values from MotionValues (kept in sync via subscriptions)
   */
  resolvedValues: MotionGoals;

  /**
   * active state of gestures (hover, tap, focus, drag, inView)
   */
  activeGestures: MotionGesturesState;

  /**
   * current variant names being applied for each animation type
   */
  activeVariants: MotionVariantsState;

  /**
   * The props/options provided to the motion component
   */
  options: MotionOptions;

  /**
   * parent state for variant propagation
   */
  parent: MotionState | null;
}
