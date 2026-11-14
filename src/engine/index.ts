import { CERT_MAX_DEPTH, CERT_MAX_FO2, OTU_DAILY_LIMIT, PPO2_TOLERANCE } from './constants'
import { gasUse, minimumGas } from './consumption'
import { environment, pressureAt } from './environment'
import { ppO2 } from './gas'
import { cnsFor, otuFor } from './oxygen'
import { ascend, canSurface, cloneSim, decoAscent, noDecoLimit, runLevels, type Sim } from './planner'
import { freshDiver, surfaceInterval } from './repetitive'
import type { CarryOver, DiveInput, PlanResult, Settings, Warning } from './types'

export * from './types'
export * from './constants'
export * from './environment'
export * from './gas'
export { freshDiver, surfaceInterval } from './repetitive'
export { noDecoLimit } from './planner'

/** Zwraca opis pierwszego błędu w ustawieniach albo null. */
export function settingsError(s: Settings): string | null {
  const positive = (n: number) => Number.isFinite(n) && n > 0
  if (!(positive(s.gfLow) && s.gfLow <= s.gfHigh && s.gfHigh <= 1))
    return 'Gradient factors muszą spełniać 0 < GF low ≤ GF high ≤ 100%'
  if (!positive(s.descentRate) || !positive(s.ascentRate) || !positive(s.decoAscentRate))
    return 'Prędkości zanurzania i wynurzania muszą być większe od zera'
  if (!positive(s.stopStep)) return 'Odstęp między przystankami musi być większy od zera'
  if (!positive(s.lastStop) || Math.abs(s.lastStop / s.stopStep - Math.round(s.lastStop / s.stopStep)) > 1e-9)
    return 'Ostatni przystanek musi być wielokrotnością odstępu między przystankami'
  if (!positive(s.sacBottom) || !positive(s.sacDeco) || !positive(s.sacStress))
    return 'Zużycie gazu (SAC) musi być większe od zera'
  if (!positive(s.ppO2Bottom) || !positive(s.ppO2Deco)) return 'Limity ppO2 muszą być większe od zera'
  if (!Number.isFinite(s.altitude) || s.altitude < 0 || s.altitude > 5000)
    return 'Wysokość musi mieścić się w zakresie 0–5000 m n.p.m.'
  if (!(s.switchStop >= 0) || !(s.reservePressure >= 0)) return 'Nieprawidłowe ustawienia'
  return null
}

export function planDive(input: DiveInput, start?: CarryOver): PlanResult {
  const s = input.settings
  const invalid = settingsError(s)
  if (invalid) throw new Error(invalid)
  for (const c of [input.bottom, ...input.deco]) {
    if (!(c.gas.fO2 >= 0.21 && c.gas.fO2 <= 1) || !(c.volume > 0) || !(c.pressure > 0))
      throw new Error('Nieprawidłowe dane butli lub gazu')
  }
  const env = environment(s)
  const begin = start ?? freshDiver(env, s.acclimatized)
  const levels = input.levels.filter((l) => l.depth > 0 && l.time > 0)
  if (levels.length === 0) throw new Error('Plan wymaga co najmniej jednego poziomu')
  const maxDepth = Math.max(...levels.map((l) => l.depth))

  const descent: Sim = {
    depth: 0,
    runtime: 0,
    tissues: begin.tissues.slice(),
    gas: input.bottom.gas,
    segments: [],
    anchor: null,
  }
  const ceilingViolated = runLevels(descent, levels, s, env)
  const { sim, mandatoryDeco } = ascend(
    descent,
    input.deco.map((c) => c.gas),
    maxDepth,
    s,
    env,
  )
  // Ostatnia linia obrony: żaden zwrócony plan nie może kończyć się powyżej GF high.
  if (!canSurface(sim.tissues, s, env)) {
    throw new Error('Błąd planera: plan kończy się powyżej GF high')
  }

  let cns = begin.cns
  let otu = begin.otu
  for (const seg of sim.segments) {
    const avgPressure = (pressureAt(seg.startDepth, env) + pressureAt(seg.endDepth, env)) / 2
    const pp = seg.gas.fO2 * avgPressure
    cns += cnsFor(pp, seg.duration)
    otu += otuFor(pp, seg.duration)
  }

  const use = gasUse(sim.segments, input.bottom, input.deco, s, env)
  const minGasLiters = minimumGas(sim.segments, levels, input.bottom, s, env)
  const minGasBar = minGasLiters / input.bottom.volume
  const stops = sim.segments.filter(
    (seg) => seg.kind === 'stop' || seg.kind === 'switch' || seg.kind === 'safety',
  )
  const decoTime = stops
    .filter((seg) => seg.kind === 'stop')
    .reduce((sum, seg) => sum + seg.duration, 0)

  // Utrata gazu deko: czy całą dekompresję da się dokończyć na samym gazie dennym.
  let lostDecoGas = false
  if (mandatoryDeco && input.deco.length > 0) {
    try {
      const alone = cloneSim(descent)
      decoAscent(alone, [], s, env)
      lostDecoGas = gasUse(alone.segments, input.bottom, [], s, env)[0].remainingBar < 0
    } catch {
      lostDecoGas = true
    }
  }

  const warnings: Warning[] = []
  const add = (code: Warning['code'], level: Warning['level']) => warnings.push({ code, level })
  if (ppO2(input.bottom.gas, maxDepth, env) > s.ppO2Bottom + PPO2_TOLERANCE)
    add('ppo2-bottom', 'danger')
  if (ceilingViolated) add('ceiling-violation', 'danger')
  if (use.some((u) => u.remainingBar < 0)) add('gas-insufficient', 'danger')
  else if (
    use.some((u) =>
      u.role === 'bottom'
        ? u.remainingBar < Math.max(minGasBar, s.reservePressure)
        : // gaz deko: zapas 50% ponad plan
          u.usedBar * 1.5 > u.cylinder.pressure,
    )
  )
    add('gas-reserve', 'caution')
  if (lostDecoGas) add('lost-deco-gas', 'caution')
  if (cns > 80) add('cns', cns > 100 ? 'danger' : 'caution')
  if (otu > OTU_DAILY_LIMIT) add('otu', 'caution')
  if (mandatoryDeco) add('deco', 'caution')
  if (maxDepth > CERT_MAX_DEPTH) add('depth-cert', 'caution')
  if ([input.bottom, ...input.deco].some((c) => c.gas.fO2 > CERT_MAX_FO2 + 1e-9))
    add('gas-cert', 'caution')

  return {
    segments: sim.segments,
    stops,
    runtime: sim.runtime,
    maxDepth,
    decoTime,
    firstStopDepth: decoTime > 0 ? stops.find((seg) => seg.kind === 'stop')!.endDepth : null,
    ndl: noDecoLimit(levels[0].depth, input.bottom.gas, begin.tissues, s, env),
    cns,
    otu,
    gasUse: use,
    minGasLiters,
    minGasBar,
    warnings,
    end: { tissues: sim.tissues, cns, otu },
  }
}

export interface DayDive {
  input: DiveInput
  /** przerwa powierzchniowa przed tym nurkowaniem, minuty (ignorowana dla pierwszego) */
  surfaceInterval: number
}

/** Seria nurkowań jednego dnia; tkanki i ekspozycja tlenowa przechodzą na kolejne. */
export function planDay(dives: DayDive[]): PlanResult[] {
  const results: PlanResult[] = []
  let state: CarryOver | undefined
  for (const dive of dives) {
    const env = environment(dive.input.settings)
    const start = state ? surfaceInterval(state, dive.surfaceInterval, env) : undefined
    const result = planDive(dive.input, start)
    results.push(result)
    state = result.end
  }
  return results
}
