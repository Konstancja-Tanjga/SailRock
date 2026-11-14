import { AIR_FN2 } from './constants'
import { depthAt, pressureAt, type Environment } from './environment'
import type { Gas } from './types'

export const AIR: Gas = { fO2: 0.21, fHe: 0 }

export function nitrox(percentO2: number): Gas {
  return { fO2: percentO2 / 100, fHe: 0 }
}

export function fN2(gas: Gas): number {
  return 1 - gas.fO2 - gas.fHe
}

export function sameGas(a: Gas, b: Gas): boolean {
  return Math.abs(a.fO2 - b.fO2) < 1e-6 && Math.abs(a.fHe - b.fHe) < 1e-6
}

export function ppO2(gas: Gas, depth: number, env: Environment): number {
  return gas.fO2 * pressureAt(depth, env)
}

/** Maksymalna głębokość operacyjna w metrach dla zadanego limitu ppO2. */
export function mod(gas: Gas, maxPpO2: number, env: Environment): number {
  return depthAt(maxPpO2 / gas.fO2, env)
}

/** Równoważna głębokość powietrzna w metrach (może być ujemna dla bogatych mieszanek płytko). */
export function ead(gas: Gas, depth: number, env: Environment): number {
  return depthAt((pressureAt(depth, env) * fN2(gas)) / AIR_FN2, env)
}

/** Najbogatszy nitrox (pełne procenty, 21..100) mieszczący się w limicie ppO2 na danej głębokości. */
export function bestMix(depth: number, maxPpO2: number, env: Environment): Gas {
  const percent = Math.floor((maxPpO2 / pressureAt(depth, env)) * 100 + 1e-9)
  return nitrox(Math.max(21, Math.min(100, percent)))
}

export function gasLabel(gas: Gas): string {
  const percent = Math.round(gas.fO2 * 100)
  if (percent === 21) return 'Powietrze'
  if (percent === 100) return 'Tlen'
  return `EAN${percent}`
}
