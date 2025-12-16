import { describe, expect, test } from "bun:test"
import { AnimatePresence, Presence, motion } from "motion-solid"
import { transform as transformFromRoot } from "motion-solid"
import { transform } from "motion-solid/transform"

describe("motion-solid", () => {
  test("motion.<tag> is cached and callable", () => {
    expect(typeof motion.div).toBe("function")
    expect(motion.div).toBe(motion.div)
  })

  test("AnimatePresence is an alias of Presence", () => {
    expect(AnimatePresence).toBe(Presence)
  })

  test("transform subpath export works", () => {
    expect(transform(50, [0, 100], [0, 1])).toBe(0.5)
  })

  test("transform root export works", () => {
    expect(transformFromRoot(50, [0, 100], [0, 1])).toBe(0.5)
  })
})
