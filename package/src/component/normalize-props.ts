import type {
  ElementTag,
  MotionAnimationDefinition,
  MotionOptions,
  MotionStyle,
  MotionTarget,
  MotionTargetAndTransition,
  MotionWhileDefinition,
  Transition,
  Variant,
  Variants,
} from "../types";

const kebabToCamel = (key: string): string =>
  key.replace(/-([a-z])/g, (_match, char: string) => char.toUpperCase());

const normalizeKey = (key: string) => {
  if (key.startsWith("--")) return key;
  return kebabToCamel(key);
};

const normalizeRecord = (
  value: Record<string, unknown> | undefined,
): Record<string, unknown> | undefined => {
  if (!value) return value;

  const normalized: Record<string, unknown> = {};

  for (const key in value) {
    if (key === "transition") {
      normalized.transition = normalizeTransition(
        value.transition as Transition<ElementTag> | undefined,
      );
      continue;
    }

    if (key === "transitionEnd") {
      normalized.transitionEnd = normalizeRecord(
        value.transitionEnd as Record<string, unknown> | undefined,
      );
      continue;
    }

    normalized[normalizeKey(key)] = value[key];
  }

  return normalized;
};

const normalizeStyle = (style?: MotionStyle): MotionStyle | undefined => {
  if (!style || typeof style === "string") return style;
  return normalizeRecord(
    style as unknown as Record<string, unknown>,
  ) as MotionStyle;
};

const normalizeTransition = (
  transition?: Transition<ElementTag>,
): Transition<ElementTag> | undefined => {
  if (!transition) return transition;

  const normalized: Record<string, unknown> = {};

  for (const key in transition) {
    normalized[key === "default" ? key : normalizeKey(key)] =
      transition[key as keyof Transition<ElementTag>];
  }

  return normalized as Transition<ElementTag>;
};

const normalizeAnimationDefinition = (
  definition?:
    | MotionAnimationDefinition<ElementTag>
    | MotionOptions<ElementTag>["animate"],
):
  | MotionAnimationDefinition<ElementTag>
  | MotionOptions<ElementTag>["animate"]
  | undefined => {
  if (
    definition === undefined ||
    definition === false ||
    typeof definition === "string" ||
    Array.isArray(definition)
  ) {
    return definition;
  }

  if (typeof definition === "object" && "subscribe" in definition) {
    return definition;
  }

  return normalizeRecord(
    definition as unknown as Record<string, unknown>,
  ) as MotionTargetAndTransition<ElementTag>;
};

const normalizeWhileDefinition = (
  definition?: MotionWhileDefinition<ElementTag>,
): MotionWhileDefinition<ElementTag> | undefined => {
  if (
    definition === undefined ||
    typeof definition === "string" ||
    Array.isArray(definition)
  ) {
    return definition;
  }

  return normalizeRecord(
    definition as unknown as Record<string, unknown>,
  ) as MotionTargetAndTransition<ElementTag>;
};

const normalizeVariant = (
  variant: Variant<ElementTag>,
): Variant<ElementTag> => {
  if (typeof variant === "function") {
    return ((custom, current, velocity) => {
      const resolved = variant(custom, current, velocity);
      return typeof resolved === "string"
        ? resolved
        : (normalizeRecord(
            resolved as unknown as Record<string, unknown>,
          ) as MotionTargetAndTransition<ElementTag>);
    }) as Variant<ElementTag>;
  }

  return normalizeRecord(
    variant as unknown as Record<string, unknown>,
  ) as MotionTargetAndTransition<ElementTag>;
};

const normalizeVariants = (
  variants?: Variants<ElementTag>,
): Variants<ElementTag> | undefined => {
  if (!variants) return variants;

  const normalized: Record<string, Variant<ElementTag>> = {};

  for (const key in variants) {
    const variant = variants[key];
    if (!variant) continue;
    normalized[key] = normalizeVariant(variant);
  }

  return normalized;
};

export const normalizeMotionOptions = (
  options: MotionOptions<ElementTag>,
): MotionOptions<ElementTag> => {
  return {
    ...options,
    style: normalizeStyle(options.style),
    initial: normalizeAnimationDefinition(
      options.initial,
    ) as MotionOptions<ElementTag>["initial"],
    animate: normalizeAnimationDefinition(
      options.animate,
    ) as MotionOptions<ElementTag>["animate"],
    exit: normalizeWhileDefinition(options.exit),
    whileHover: normalizeWhileDefinition(options.whileHover),
    whileTap: normalizeWhileDefinition(options.whileTap),
    whileFocus: normalizeWhileDefinition(options.whileFocus),
    whileInView: normalizeWhileDefinition(options.whileInView),
    whileDrag: normalizeWhileDefinition(options.whileDrag),
    variants: normalizeVariants(
      options.variants as Variants<ElementTag> | undefined,
    ),
    transition: normalizeTransition(
      options.transition as Transition<ElementTag> | undefined,
    ),
    dragTransition: normalizeTransition(
      options.dragTransition as Transition<ElementTag> | undefined,
    ),
  };
};

export const normalizeTarget = (
  target?: MotionTargetAndTransition<ElementTag> | MotionTarget<ElementTag>,
) => {
  return normalizeRecord(
    target as unknown as Record<string, unknown> | undefined,
  ) as
    | MotionTargetAndTransition<ElementTag>
    | MotionTarget<ElementTag>
    | undefined;
};
