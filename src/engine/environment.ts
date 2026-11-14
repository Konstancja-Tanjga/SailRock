import { BAR_PER_METER, SEA_LEVEL_PRESSURE } from './constants'
import type { Settings } from './types'

export interface Environment {
  /** ciśnienie atmosferyczne na powierzchni, bar */
  surface: number
  barPerMeter: number
}

/** Ciśnienie atmosferyczne na danej wysokości (wzór barometryczny, atmosfera standardowa). */
export function surfacePressure(altitude: number): number {
  return SEA_LEVEL_PRESSURE * Math.pow(1 - 2.25577e-5 * altitude, 5.25588)
}

export function environment(settings: Pick<Settings, 'altitude' | 'water'>): Environment {
  return {
    surface: surfacePressure(settings.altitude),
    barPerMeter: BAR_PER_METER[settings.water],
  }
}

/** Ciśnienie absolutne na głębokości, bar. */
export function pressureAt(depth: number, env: Environment): number {
  return env.surface + depth * env.barPerMeter
}

export function depthAt(pressure: number, env: Environment): number {
  return (pressure - env.surface) / env.barPerMeter
}
