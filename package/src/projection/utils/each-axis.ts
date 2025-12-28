type AxisName = "x" | "y";

type AxisCallback = (axis: AxisName) => void;

export function eachAxis(callback: AxisCallback): void {
  callback("x");
  callback("y");
}
