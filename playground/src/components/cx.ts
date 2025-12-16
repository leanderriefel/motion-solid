import clsx, { type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cx(...values: ClassValue[]) {
  return twMerge(clsx(values))
}
