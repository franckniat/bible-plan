import { describe, expect, it } from "vitest"

import { balancedPartition, minimalGroups } from "./partition"

/** Load of each group, from the group ends returned by balancedPartition. */
const loads = (weights: number[], ends: number[]) =>
  ends.map((end, index) =>
    weights
      .slice(index === 0 ? 0 : ends[index - 1], end)
      .reduce((a, b) => a + b, 0)
  )

describe("minimalGroups", () => {
  it("counts the groups needed under a maximum load", () => {
    expect(minimalGroups([3, 3, 3, 3], 6)).toBe(2)
    expect(minimalGroups([3, 3, 3, 3], 5)).toBe(4)
    expect(minimalGroups([3, 7], 5)).toBe(Infinity)
  })
})

describe("balancedPartition", () => {
  it("splits evenly when possible", () => {
    const weights = [10, 10, 10, 10, 10, 10]
    expect(loads(weights, balancedPartition(weights, 3))).toEqual([20, 20, 20])
  })

  it("prefers even days over a single small one", () => {
    // Luke 19-22 (48, 47, 38, 71 verses) in 2 days: 95 + 109 rather than
    // 133 + 71 or 48 + 156.
    expect(
      loads([48, 47, 38, 71], balancedPartition([48, 47, 38, 71], 2))
    ).toEqual([95, 109])
  })

  it("never leaves a group empty", () => {
    const weights = [100, 1, 1, 1, 1]
    expect(balancedPartition(weights, 5)).toEqual([1, 2, 3, 4, 5])
  })

  it("respects a maximum load", () => {
    const weights = [5, 5, 5, 5, 5, 5]
    const groupLoads = loads(weights, balancedPartition(weights, 4, 10))
    expect(groupLoads).toHaveLength(4)
    expect(Math.max(...groupLoads)).toBeLessThanOrEqual(10)
    expect(groupLoads.reduce((a, b) => a + b, 0)).toBe(30)
  })

  it("handles long sequences quickly", () => {
    const weights = Array.from({ length: 5000 }, (_, index) => 1 + (index % 40))
    const ends = balancedPartition(weights, 730)
    expect(ends).toHaveLength(730)
    expect(ends.at(-1)).toBe(5000)
  })

  it("rejects impossible splits", () => {
    expect(() => balancedPartition([1, 2], 3)).toThrow(RangeError)
    expect(() => balancedPartition([1, 2], 0)).toThrow(RangeError)
    expect(() => balancedPartition([5, 5, 5], 1, 10)).toThrow(RangeError)
  })
})
