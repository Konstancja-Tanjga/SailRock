import { ceilingDepth, ceilingPressure } from './ceiling'
import {
  NDL_CAP,
  PPO2_TOLERANCE,
  SAFETY_STOP_DEPTH,
  SAFETY_STOP_MIN_DEPTH,
  SAFETY_STOP_MINUTES,
} from './constants'
import { pressureAt, type Environment } from './environment'
import { ppO2, sameGas } from './gas'
import { loadTissues } from './tissues'
import type { Gas, Level, Segment, SegmentKind, Settings } from './types'

const EPS = 1e-9
const MAX_STOP_MINUTES = 2000

/** Stan symulacji jednego nurkowania. */
export interface Sim {
  depth: number
  runtime: number
  tissues: number[]
  gas: Gas
  segments: Segment[]
  /** głębokość pierwszego przystanku: punkt zaczepienia GF low */
  anchor: number | null
}

export function cloneSim(sim: Sim): Sim {
  return { ...sim, tissues: sim.tissues.slice(), segments: sim.segments.slice() }
}

function gfAt(depth: number, sim: Sim, s: Settings): number {
  if (sim.anchor === null || sim.anchor <= 0) return s.gfLow
  return s.gfHigh + (s.gfLow - s.gfHigh) * Math.min(1, depth / sim.anchor)
}

function move(
  sim: Sim,
  kind: SegmentKind,
  toDepth: number,
  minutes: number,
  s: Settings,
  env: Environment,
): void {
  if (minutes <= 0 && toDepth === sim.depth) return
  const startDepth = sim.depth
  sim.tissues = loadTissues(
    sim.tissues,
    pressureAt(startDepth, env),
    pressureAt(toDepth, env),
    minutes,
    sim.gas,
  )
  sim.depth = toDepth
  sim.runtime += minutes
  const ceiling = ceilingDepth(sim.tissues, gfAt(toDepth, sim, s), env)
  const last = sim.segments[sim.segments.length - 1]
  const stationary = startDepth === toDepth
  if (
    last &&
    stationary &&
    last.kind === kind &&
    last.startDepth === last.endDepth &&
    last.endDepth === toDepth &&
    sameGas(last.gas, sim.gas)
  ) {
    sim.segments[sim.segments.length - 1] = {
      ...last,
      duration: last.duration + minutes,
      runtime: sim.runtime,
      ceiling,
    }
    return
  }
  sim.segments.push({
    kind,
    startDepth,
    endDepth: toDepth,
    duration: minutes,
    gas: sim.gas,
    runtime: sim.runtime,
    ceiling,
  })
}

/** Zejście i poziomy denne. Zwraca true, jeśli po drodze naruszono sufit. */
export function runLevels(sim: Sim, levels: Level[], s: Settings, env: Environment): boolean {
  let violated = false
  for (const level of levels) {
    const delta = level.depth - sim.depth
    const travel = delta >= 0 ? delta / s.descentRate : -delta / s.ascentRate
    move(sim, delta >= 0 ? 'descent' : 'ascent', level.depth, travel, s, env)
    if (ceilingDepth(sim.tissues, s.gfLow, env) > level.depth + EPS) violated = true
    move(sim, 'level', level.depth, Math.max(0, level.time - travel), s, env)
  }
  return violated
}

function nextStopDepth(depth: number, s: Settings): number {
  const next = Math.ceil(depth / s.stopStep - EPS) * s.stopStep - s.stopStep
  return next < s.lastStop ? 0 : next
}

function betterDecoGas(sim: Sim, decoGases: Gas[], s: Settings, env: Environment): Gas | null {
  let best: Gas | null = null
  for (const gas of decoGases) {
    if (gas.fO2 <= sim.gas.fO2 + EPS) continue
    if (ppO2(gas, sim.depth, env) > s.ppO2Deco + PPO2_TOLERANCE) continue
    if (!best || gas.fO2 > best.fO2) best = gas
  }
  return best
}

/**
 * Wynurzenie z przystankami dekompresyjnymi wg Bühlmanna z gradient factors.
 * GF low obowiązuje na pierwszym przystanku, GF high na powierzchni, pomiędzy liniowo.
 * Do pierwszego przystanku obowiązuje ascentRate, od pierwszego przystanku decoAscentRate.
 * Zwraca true, jeśli potrzebny był choć jeden przystanek dekompresyjny.
 */
export function decoAscent(
  sim: Sim,
  decoGases: Gas[],
  s: Settings,
  env: Environment,
  /** tryb sondy: przerwij i zwróć true, gdy tylko potrzebny jest przystanek */
  probe = false,
): boolean {
  let stopped = false
  while (sim.depth > 0) {
    const better = betterDecoGas(sim, decoGases, s, env)
    if (better) {
      sim.gas = better
      move(sim, 'switch', sim.depth, s.switchStop, s, env)
    }
    const next = nextStopDepth(sim.depth, s)
    let travel = 0
    let waited = 0
    for (;;) {
      travel = (sim.depth - next) / (stopped ? s.decoAscentRate : s.ascentRate)
      const after = loadTissues(
        sim.tissues,
        pressureAt(sim.depth, env),
        pressureAt(next, env),
        travel,
        sim.gas,
      )
      if (ceilingPressure(after, gfAt(next, sim, s)) <= pressureAt(next, env) + EPS) break
      if (sim.anchor === null) {
        sim.anchor = sim.depth
        continue
      }
      if (probe) return true
      if (waited >= MAX_STOP_MINUTES) {
        throw new Error('Dekompresja nie zbiega się: sprawdź gazy i ustawienia')
      }
      move(sim, 'stop', sim.depth, 1, s, env)
      stopped = true
      waited++
    }
    move(sim, 'ascent', next, travel, s, env)
  }
  return stopped
}

/** Bezpośrednie wynurzenie z przystankiem bezpieczeństwa (tylko dla nurkowań bez deko). */
function safetyAscent(sim: Sim, s: Settings, env: Environment): void {
  if (sim.depth > SAFETY_STOP_DEPTH) {
    move(sim, 'ascent', SAFETY_STOP_DEPTH, (sim.depth - SAFETY_STOP_DEPTH) / s.ascentRate, s, env)
    move(sim, 'safety', SAFETY_STOP_DEPTH, SAFETY_STOP_MINUTES, s, env)
  }
  move(sim, 'ascent', 0, sim.depth / s.ascentRate, s, env)
}

/** Czy tkanki mieszczą się w GF high na powierzchni. */
export function canSurface(tissues: number[], s: Settings, env: Environment): boolean {
  return ceilingPressure(tissues, s.gfHigh) <= env.surface + 1e-6
}

export interface Ascent {
  sim: Sim
  /** true, gdy wynurzenie na samym gazie dennym wymaga przystanków dekompresyjnych */
  mandatoryDeco: boolean
}

/**
 * Kompletne wynurzenie. O tym, czy nurkowanie jest dekompresyjne, decyduje wynurzenie na
 * samym gazie dennym: gazy deko skracają dekompresję, ale nie zamieniają nurkowania deko
 * w bezdekompresyjne. Nurkowanie bez deko nie zmienia gazu i dostaje opcjonalny przystanek
 * bezpieczeństwa, o ile po nim tkanki nadal mieszczą się w GF high.
 */
export function ascend(
  sim: Sim,
  decoGases: Gas[],
  maxDepth: number,
  s: Settings,
  env: Environment,
): Ascent {
  const mandatoryDeco = decoAscent(cloneSim(sim), [], s, env, true)
  if (mandatoryDeco) {
    const deco = cloneSim(sim)
    decoAscent(deco, decoGases, s, env)
    return { sim: deco, mandatoryDeco }
  }
  if (s.safetyStop && maxDepth > SAFETY_STOP_MIN_DEPTH) {
    const direct = cloneSim(sim)
    safetyAscent(direct, s, env)
    if (canSurface(direct.tissues, s, env)) return { sim: direct, mandatoryDeco }
  }
  const plain = cloneSim(sim)
  decoAscent(plain, [], s, env)
  return { sim: plain, mandatoryDeco }
}

/**
 * Limit bezdekompresyjny: najdłuższy czas denny (z zejściem, pełne minuty), po którym
 * wynurzenie z prędkością ascentRate nie wymaga żadnego przystanku. Infinity powyżej NDL_CAP.
 */
export function noDecoLimit(
  depth: number,
  gas: Gas,
  startTissues: number[],
  s: Settings,
  env: Environment,
): number {
  const needsStop = (minutes: number): boolean => {
    const sim: Sim = {
      depth: 0,
      runtime: 0,
      tissues: startTissues.slice(),
      gas,
      segments: [],
      anchor: null,
    }
    runLevels(sim, [{ depth, time: minutes }], s, env)
    return decoAscent(sim, [], s, env, true)
  }
  const descent = depth / s.descentRate
  if (needsStop(descent)) return 0
  if (!needsStop(NDL_CAP)) return Infinity
  let lo = Math.floor(descent)
  let hi = NDL_CAP
  while (hi - lo > 1) {
    const mid = Math.floor((lo + hi) / 2)
    if (needsStop(mid)) hi = mid
    else lo = mid
  }
  return lo
}
