/**
 * Planowanie gazu dla nurkowania zaplanowanego z tabel.
 * Ciśnienie jak na kartach RDP: 10 m wody = 1 ata, na powierzchni 1 ata.
 */

export interface GasSettings {
  /** pojemność butli w litrach */
  volume: number
  /** ciśnienie początkowe w barach */
  pressure: number
  /** zużycie powierzchniowe w l/min */
  sac: number
  /** zużycie w sytuacji awaryjnej, na nurka, w l/min */
  stressSac: number
  /** minimalne ciśnienie w butli po wynurzeniu, bar */
  reserve: number
}

export const DEFAULT_GAS: GasSettings = {
  volume: 15,
  pressure: 200,
  sac: 20,
  stressSac: 30,
  reserve: 50,
}

export interface GasProfile {
  /** głębokość, dla której liczony jest gaz (największa planowana), metry */
  depth: number
  /** czas denny w minutach, liczony od zanurzenia do rozpoczęcia wynurzania */
  time: number
  /** przystanki podczas wynurzania */
  stops: { depth: number; minutes: number }[]
  /** prędkość wynurzania przyjęta do obliczeń, m/min */
  ascentRate: number
}

export type GasWarning = 'insufficient' | 'below-reserve' | 'below-minimum-gas'

export interface GasPlan {
  /** litry zużyte na dnie (cały czas denny liczony na największej głębokości) */
  bottomLiters: number
  /** litry zużyte na wynurzenie z przystankami */
  ascentLiters: number
  usedBar: number
  remainingBar: number
  /** ciśnienie w butli w chwili rozpoczęcia wynurzania */
  atAscentBar: number
  /** minimum gas: awaryjne wynurzenie dwóch nurków z jednej butli */
  minGasBar: number
  warnings: GasWarning[]
}

const ata = (depth: number) => depth / 10 + 1

/** Litry na wynurzenie z przystankami przy zużyciu `sac` na jednego nurka. */
function ascentLiters(profile: GasProfile, sac: number): number {
  const travel = (profile.depth / profile.ascentRate) * ata(profile.depth / 2)
  const stops = profile.stops.reduce((sum, s) => sum + s.minutes * ata(s.depth), 0)
  return sac * (travel + stops)
}

export function planGas(profile: GasProfile, gas: GasSettings): GasPlan {
  const capacity = gas.volume * gas.pressure
  // Zejście liczone jak pobyt na pełnej głębokości: prosto i z zapasem.
  const bottomLiters = gas.sac * ata(profile.depth) * profile.time
  const ascent = ascentLiters(profile, gas.sac)
  // Minimum gas: 1 minuta na opanowanie sytuacji na dnie, potem wynurzenie we dwoje.
  const minGasLiters = 2 * (gas.stressSac * ata(profile.depth) * 1 + ascentLiters(profile, gas.stressSac))

  const usedBar = (bottomLiters + ascent) / gas.volume
  const remainingBar = gas.pressure - usedBar
  const atAscentBar = (capacity - bottomLiters) / gas.volume
  const minGasBar = minGasLiters / gas.volume

  const warnings: GasWarning[] = []
  if (remainingBar < 0) warnings.push('insufficient')
  else if (remainingBar < gas.reserve) warnings.push('below-reserve')
  if (atAscentBar < minGasBar) warnings.push('below-minimum-gas')
  return {
    bottomLiters,
    ascentLiters: ascent,
    usedBar,
    remainingBar,
    atAscentBar,
    minGasBar,
    warnings,
  }
}

export type GasSettingsProblem = 'cylinder' | 'rate' | 'reserve'

/** Zwraca, czego brakuje w ustawieniach gazu, albo null. */
export function gasSettingsError(gas: GasSettings): GasSettingsProblem | null {
  const positive = (n: number) => Number.isFinite(n) && n > 0
  if (!positive(gas.volume) || !positive(gas.pressure)) return 'cylinder'
  if (!positive(gas.sac) || !positive(gas.stressSac)) return 'rate'
  if (!(gas.reserve >= 0)) return 'reserve'
  return null
}
