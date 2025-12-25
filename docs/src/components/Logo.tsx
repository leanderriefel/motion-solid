import { motion } from "motion-solid";
import { ComponentProps, splitProps } from "solid-js";

export const Logo = (props: ComponentProps<"svg">) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 455.73 339.52"
      {...props}
    >
      <path
        d="M417.87,337.34s-70.6.23-113.68.23c-22,0-48.85-26.38-77.1-58.59v0c-45.77-50.51-101.8-116.3-145-116.3,0,0,70.6-.23,113.67-.23,22,0,48.86,26.38,77.11,58.59v0C318.69,271.55,374.72,337.34,417.87,337.34Z"
        transform="translate(-22.13 -80.24)"
      />
      <path
        d="M212.92,303.23v0c-28.25-32.22-55.06-58.6-77.1-58.6-43.08,0-113.68.23-113.68.23,43.15,0,99.18,65.79,145,116.31h0c28.25,32.22,55.06,58.6,77.1,58.6,43.08,0,113.68-.23,113.68-.23C314.72,419.53,258.69,353.74,212.92,303.23Z"
        transform="translate(-22.13 -80.24)"
      />
      <path
        d="M332.92,138.85h0c-28.25-32.22-55.06-58.6-77.1-58.6-43.08,0-113.68.23-113.68.23,43.15,0,99.18,65.79,145,116.3v0c28.25,32.22,55.06,58.6,77.1,58.6,43.08,0,113.68-.23,113.68-.23C434.72,255.16,378.69,189.37,332.92,138.85Z"
        transform="translate(-22.13 -80.24)"
      />
    </svg>
  );
};

export const AnimatedLogo = (props: ComponentProps<"svg">) => {
  const [_, rest] = splitProps(props, [
    "onAnimationStart",
    "onAnimationEnd",
    "onAnimationIteration",
    "onDrag",
    "onDragEnd",
    "onDragStart",
  ]);

  return (
    <motion.svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 30 456 440"
      {...rest}
      whileHover="hover"
      style="overflow: visible;"
    >
      <motion.path
        d="M332.92,138.85h0c-28.25-32.22-55.06-58.6-77.1-58.6-43.08,0-113.68.23-113.68.23,43.15,0,99.18,65.79,145,116.3v0c28.25,32.22,55.06,58.6,77.1,58.6,43.08,0,113.68-.23,113.68-.23C434.72,255.16,378.69,189.37,332.92,138.85Z"
        variants={{
          hover: {
            y: -75,
          },
        }}
        transition={{ type: "spring", stiffness: 300, damping: 10 }}
      />
      <motion.path
        d="M417.87,337.34s-70.6.23-113.68.23c-22,0-48.85-26.38-77.1-58.59v0c-45.77-50.51-101.8-116.3-145-116.3,0,0,70.6-.23,113.67-.23,22,0,48.86,26.38,77.11,58.59v0C318.69,271.55,374.72,337.34,417.87,337.34Z"
        variants={{
          hover: {
            y: 0,
          },
        }}
        transition={{ type: "spring", stiffness: 300, damping: 10 }}
      />

      <motion.path
        d="M212.92,303.23v0c-28.25-32.22-55.06-58.6-77.1-58.6-43.08,0-113.68.23-113.68.23,43.15,0,99.18,65.79,145,116.31h0c28.25,32.22,55.06,58.6,77.1,58.6,43.08,0,113.68-.23,113.68-.23C314.72,419.53,258.69,353.74,212.92,303.23Z"
        variants={{
          hover: {
            y: 75,
          },
        }}
        transition={{ type: "spring", stiffness: 300, damping: 10 }}
      />
    </motion.svg>
  );
};
