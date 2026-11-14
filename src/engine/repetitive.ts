import { AIR_FN2, SEA_LEVEL_PRESSURE, WATER_VAPOUR } from './constants'
import type { Environment } from './environment'
import { AIR } from './gas'
import { cnsAfterSurface } from './oxygen'
import { loadTissues, saturatedTissues } from './tissues'
import type { CarryOver } from './types'

/**
 * Stan przed pierwszym nurkowaniem. Nurek niezaaklimatyzowany do wysokości zaczyna
 * z tkankami nasyconymi jak na poziomie morza, czyli z azotem resztkowym.
 */
export function freshDiver(env: Environment, acclimatized = true): CarryOver {
  const tissues = saturatedTissues(env)
  if (!acclimatized) tissues.fill((SEA_LEVEL_PRESSURE - WATER_VAPOUR) * AIR_FN2)
  return { tissues, cns: 0, otu: 0 }
}

/** Odsycanie na powierzchni na powietrzu. OTU sumuje się w obrębie dnia. */
export function surfaceInterval(state: CarryOver, minutes: number, env: Environment): CarryOver {
  return {
    tissues: loadTissues(state.tissues, env.surface, env.surface, minutes, AIR),
    cns: cnsAfterSurface(state.cns, minutes),
    otu: state.otu,
  }
}
