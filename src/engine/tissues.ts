import { AIR_FN2, N2_HALF_TIMES, WATER_VAPOUR } from './constants'
import type { Environment } from './environment'
import { fN2 } from './gas'
import type { Gas } from './types'

/** Tkanki w równowadze z powietrzem na powierzchni. */
export function saturatedTissues(env: Environment): number[] {
  const p = (env.surface - WATER_VAPOUR) * AIR_FN2
  return N2_HALF_TIMES.map(() => p)
}

/**
 * Równanie Schreinera: nasycenie po odcinku o liniowo zmieniającym się ciśnieniu.
 * Dla stałej głębokości (startPressure === endPressure) sprowadza się do równania Haldane'a.
 */
export function loadTissues(
  tissues: number[],
  startPressure: number,
  endPressure: number,
  minutes: number,
  gas: Gas,
): number[] {
  if (minutes <= 0) return tissues.slice()
  const f = fN2(gas)
  const inspired = (startPressure - WATER_VAPOUR) * f
  const rate = ((endPressure - startPressure) / minutes) * f
  return tissues.map((p0, i) => {
    const k = Math.LN2 / N2_HALF_TIMES[i]
    return inspired + rate * (minutes - 1 / k) - (inspired - p0 - rate / k) * Math.exp(-k * minutes)
  })
}
