/**
 * Splitting a sequence of weights (verses per unit) into contiguous groups
 * (days) of similar weight, without changing the order.
 */

/**
 * For each start index j, the end (exclusive) of the longest group starting
 * at j whose load stays within `maxLoad`. Every weight must fit in `maxLoad`.
 */
function farthestEnds(weights: readonly number[], maxLoad: number): number[] {
  const ends: number[] = []
  let end = 0
  let load = 0
  for (let start = 0; start < weights.length; start++) {
    if (end < start) {
      end = start
      load = 0
    }
    while (end < weights.length && load + weights[end]! <= maxLoad) {
      load += weights[end]!
      end++
    }
    ends.push(end)
    load -= weights[start]!
  }
  return ends
}

/**
 * For each start index j (0 to n), the smallest number of groups of load at
 * most `maxLoad` that cover the weights from j to the end. It never increases
 * with j.
 */
function minimalGroupsFrom(
  weights: readonly number[],
  maxLoad: number
): number[] {
  const ends = farthestEnds(weights, maxLoad)
  const groups = new Array<number>(weights.length + 1).fill(0)
  for (let start = weights.length - 1; start >= 0; start--) {
    groups[start] = 1 + groups[ends[start]!]!
  }
  return groups
}

/** Smallest number of groups whose load stays within `maxLoad`. */
export function minimalGroups(
  weights: readonly number[],
  maxLoad: number
): number {
  if (weights.some((weight) => weight > maxLoad)) return Infinity
  return minimalGroupsFrom(weights, maxLoad)[0]!
}

/** First index in [low, high] where `predicate` holds (it must stay true after). */
function firstIndex(
  low: number,
  high: number,
  predicate: (index: number) => boolean
): number {
  while (low < high) {
    const middle = Math.floor((low + high) / 2)
    if (predicate(middle)) high = middle
    else low = middle + 1
  }
  return low
}

/**
 * A valid split found greedily: each group ends as close as possible to its
 * share of the total (group i near i × total / groups), within `maxLoad`,
 * while leaving enough units for the remaining groups.
 */
function targetPartition(
  prefix: readonly number[],
  weights: readonly number[],
  groups: number,
  maxLoad: number
): number[] {
  const count = weights.length
  const total = prefix[count]!
  const farthest = farthestEnds(weights, maxLoad)
  const groupsFrom = minimalGroupsFrom(weights, maxLoad)

  const ends: number[] = []
  let start = 0
  for (let group = 1; group < groups; group++) {
    const remaining = groups - group
    // The group must fit in maxLoad, leave one unit per remaining group, and
    // leave a rest that `remaining` groups can cover.
    const high = Math.min(farthest[start]!, count - remaining)
    const low = firstIndex(
      start + 1,
      high,
      (end) => groupsFrom[end]! <= remaining
    )
    const target = (group * total) / groups
    let end = firstIndex(low, high, (index) => prefix[index]! >= target)
    if (
      end > low &&
      target - prefix[end - 1]! <= Math.abs(prefix[end]! - target)
    ) {
      end--
    }
    ends.push(end)
    start = end
  }
  ends.push(count)
  return ends
}

/** Group ends tried around each target, on each side. */
const CANDIDATES_PER_SIDE = 8

/**
 * Splits `weights` into exactly `groups` non-empty contiguous groups, each
 * with a load of at most `maxLoad`, as evenly as possible: it minimizes the
 * sum of squared differences between each load and the average (linear
 * partition). To stay fast on long plans, group i may only end near its
 * target i × total / groups, or where the greedy targetPartition ends it,
 * so a valid split is always found and never worse than the greedy one.
 *
 * Returns the end index (exclusive) of each group. Requires
 * 1 ≤ groups ≤ weights.length and a `maxLoad` that allows the split.
 */
export function balancedPartition(
  weights: readonly number[],
  groups: number,
  maxLoad = Infinity
): number[] {
  const count = weights.length
  if (!Number.isInteger(groups) || groups < 1 || groups > count) {
    throw new RangeError(`Cannot split ${count} units into ${groups} groups`)
  }
  if (minimalGroups(weights, maxLoad) > groups) {
    throw new RangeError(`No split into ${groups} groups within ${maxLoad}`)
  }

  const prefix = [0]
  for (const weight of weights) prefix.push(prefix.at(-1)! + weight)
  const average = prefix[count]! / groups
  const greedy = targetPartition(prefix, weights, groups, maxLoad)

  // Possible end of each group; the last group always ends at `count`.
  const candidates: number[][] = [[0]]
  for (let group = 1; group < groups; group++) {
    const nearest = firstIndex(
      1,
      count - 1,
      (index) => prefix[index]! >= group * average
    )
    const ends = new Set([greedy[group - 1]!])
    const from = Math.max(1, nearest - CANDIDATES_PER_SIDE)
    const to = Math.min(count - 1, nearest + CANDIDATES_PER_SIDE - 1)
    for (let end = from; end <= to; end++) ends.add(end)
    candidates.push([...ends].sort((a, b) => a - b))
  }
  candidates.push([count])

  // cost[g].get(end): best cost of groups 1..g when group g ends at `end`.
  const cost: Map<number, number>[] = [new Map([[0, 0]])]
  const previous: Map<number, number>[] = [new Map()]
  for (let group = 1; group <= groups; group++) {
    const costs = new Map<number, number>()
    const parents = new Map<number, number>()
    for (const end of candidates[group]!) {
      for (const [start, startCost] of cost[group - 1]!) {
        const load = prefix[end]! - prefix[start]!
        if (start >= end || load > maxLoad) continue
        const total = startCost + (load - average) ** 2
        if (total < (costs.get(end) ?? Infinity)) {
          costs.set(end, total)
          parents.set(end, start)
        }
      }
    }
    cost.push(costs)
    previous.push(parents)
  }

  const ends = [count]
  for (let group = groups; group > 1; group--) {
    ends.unshift(previous[group]!.get(ends[0]!)!)
  }
  return ends
}
