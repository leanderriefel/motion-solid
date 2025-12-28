import {
  transformProps as motionDomTransformProps,
  transformPropOrder as motionDomTransformPropOrder,
  getValueAsType,
  numberValueTypes,
  isCSSVariableName,
} from "motion-dom";

type TransformState = Record<string, string | number>;

type TransformTemplate = (
  transform: TransformState,
  generatedTransform: string,
) => string;

export interface HTMLRenderState {
  style: Record<string, string>;
  vars: Record<string, string | number>;
  transform: TransformState;
  transformOrigin: {
    originX?: string | number;
    originY?: string | number;
    originZ?: string | number;
  };
}

const translateAlias: Record<string, string> = {
  x: "translateX",
  y: "translateY",
  z: "translateZ",
  transformPerspective: "perspective",
};

const originKeyMap: Record<string, "originX" | "originY" | "originZ"> = {
  "origin-x": "originX",
  "origin-y": "originY",
  "origin-z": "originZ",
};

const camelToKebab = (key: string): string =>
  key.replace(/[A-Z]/g, (char) => `-${char.toLowerCase()}`);

const kebabToCamel = (key: string): string =>
  key.replace(/-([a-z])/g, (_match, char: string) => char.toUpperCase());

const transformProps = new Set(
  Array.from(motionDomTransformProps, (key) => camelToKebab(key)),
);

const transformPropOrder = motionDomTransformPropOrder.map(camelToKebab);

const getValueType = (key: string) =>
  numberValueTypes[key] ?? numberValueTypes[kebabToCamel(key)];

export const isTransformProp = (key: string): boolean =>
  transformProps.has(key);

export const toMotionDomTransformKey = (key: string): string =>
  kebabToCamel(key);

export const buildTransform = (
  latestValues: Record<string, string | number>,
  transform: TransformState,
  transformTemplate?: TransformTemplate,
): string => {
  let transformString = "";
  let transformIsDefault = true;

  const numTransforms = transformPropOrder.length;
  for (let i = 0; i < numTransforms; i++) {
    const key = transformPropOrder[i];
    if (key === undefined) continue;

    const value = latestValues[key];

    if (value === undefined) continue;

    const motionDomKey = toMotionDomTransformKey(key);

    let valueIsDefault = true;
    if (typeof value === "number") {
      valueIsDefault = value === (key.startsWith("scale") ? 1 : 0);
    } else {
      valueIsDefault = parseFloat(value) === 0;
    }

    if (!valueIsDefault || transformTemplate) {
      const valueAsType =
        getValueAsType(value, numberValueTypes[motionDomKey]) ?? String(value);

      if (!valueIsDefault) {
        transformIsDefault = false;
        const transformName = translateAlias[motionDomKey] || motionDomKey;
        transformString += `${transformName}(${valueAsType}) `;
      }

      if (transformTemplate) {
        transform[key] = valueAsType;
      }
    }
  }

  transformString = transformString.trim();

  if (transformTemplate) {
    transformString = transformTemplate(
      transform,
      transformIsDefault ? "" : transformString,
    );
  } else if (transformIsDefault) {
    transformString = "none";
  }

  return transformString;
};

export const buildHTMLStyles = (
  renderState: HTMLRenderState,
  latestValues: Record<string, string | number>,
  transformTemplate?: TransformTemplate,
): void => {
  const { style, vars, transformOrigin } = renderState;

  let hasTransform = false;
  let hasTransformOrigin = false;

  for (const key in latestValues) {
    const value = latestValues[key];
    if (value === undefined) continue;

    if (isTransformProp(key)) {
      hasTransform = true;
      continue;
    } else if (isCSSVariableName(key)) {
      vars[key] = value;
      continue;
    } else {
      const valueAsType =
        getValueAsType(value, getValueType(key)) ?? String(value);

      const originKey = originKeyMap[key];
      if (originKey) {
        hasTransformOrigin = true;
        transformOrigin[originKey] = valueAsType;
      } else {
        style[key] = valueAsType;
      }
    }
  }

  if (!latestValues.transform) {
    if (hasTransform || transformTemplate) {
      style.transform = buildTransform(
        latestValues,
        renderState.transform,
        transformTemplate,
      );
    } else if (style.transform) {
      style.transform = "none";
    }
  }

  if (hasTransformOrigin) {
    const { originX = "50%", originY = "50%", originZ = 0 } = transformOrigin;
    style["transform-origin"] = `${originX} ${originY} ${originZ}`;
  }
};

export const createRenderState = (): HTMLRenderState => ({
  style: {},
  vars: {},
  transform: {},
  transformOrigin: {},
});
