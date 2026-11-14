import { N2_A, N2_B } from './constants'
import { depthAt, type Environment } from './environment'

/**
 * Najniższe tolerowane ciśnienie otoczenia (bar) dla danego gradient factor.
 * gf = 1 daje oryginalną M-wartość Bühlmanna.
 */
export function ceilingPressure(tissues: number[], gf: number): number {
  let max = 0
  for (let i = 0; i < tissues.length; i++) {
    const tolerated = (tissues[i] - N2_A[i] * gf) / (gf / N2_B[i] + 1 - gf)
    if (tolerated > max) max = tolerated
  }
  return max
}

/** Sufit w metrach (0, gdy można wyjść na powierzchnię). */
export function ceilingDepth(tissues: number[], gf: number, env: Environment): number {
  return Math.max(0, depthAt(ceilingPressure(tissues, gf), env))
}
