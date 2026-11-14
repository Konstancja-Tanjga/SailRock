import { pressureAt, type Environment } from './environment'
import { sameGas } from './gas'
import type { Cylinder, CylinderUse, Level, Segment, Settings } from './types'

function isBottomPhase(seg: Segment): boolean {
  return seg.kind === 'descent' || seg.kind === 'level'
}

/** Litry (w przeliczeniu na 1 bar) zużyte na odcinku przez jednego nurka. */
export function segmentLiters(seg: Segment, sac: number, env: Environment): number {
  const avgPressure = (pressureAt(seg.startDepth, env) + pressureAt(seg.endDepth, env)) / 2
  return sac * avgPressure * seg.duration
}

export function gasUse(
  segments: Segment[],
  bottom: Cylinder,
  deco: Cylinder[],
  s: Settings,
  env: Environment,
): CylinderUse[] {
  const all: { cylinder: Cylinder; role: 'bottom' | 'deco' }[] = [
    { cylinder: bottom, role: 'bottom' },
    ...deco.map((cylinder) => ({ cylinder, role: 'deco' as const })),
  ]
  return all.map(({ cylinder, role }) => {
    let usedLiters = 0
    for (const seg of segments) {
      // Gaz denny i deko o tym samym składzie: odcinek przypisujemy butli dennej.
      const owner = all.find((c) => sameGas(c.cylinder.gas, seg.gas))
      if (owner?.cylinder !== cylinder) continue
      usedLiters += segmentLiters(seg, isBottomPhase(seg) ? s.sacBottom : s.sacDeco, env)
    }
    const usedBar = usedLiters / cylinder.volume
    return { cylinder, role, usedLiters, usedBar, remainingBar: cylinder.pressure - usedBar }
  })
}

/**
 * Minimum gas dla butli dennej: dwóch nurków oddychających w tempie awaryjnym (sacStress),
 * 1 minuta na rozwiązanie problemu na największej głębokości, wynurzenie stamtąd do
 * ostatniego poziomu, a potem całe zaplanowane wynurzenie na gazie dennym (z przystankami)
 * do powierzchni lub do zmiany gazu. Utratę gazu deko sprawdza osobne ostrzeżenie.
 */
export function minimumGas(
  segments: Segment[],
  levels: Level[],
  bottom: Cylinder,
  s: Settings,
  env: Environment,
): number {
  let lastLevel = -1
  segments.forEach((seg, i) => {
    if (seg.kind === 'level') lastLevel = i
  })
  if (lastLevel < 0) return 0
  const maxDepth = Math.max(...levels.map((l) => l.depth))
  const lastDepth = segments[lastLevel].endDepth
  let liters = s.sacStress * pressureAt(maxDepth, env) * 1
  const toLast = (maxDepth - lastDepth) / s.ascentRate
  liters += (s.sacStress * (pressureAt(maxDepth, env) + pressureAt(lastDepth, env)) * toLast) / 2
  for (const seg of segments.slice(lastLevel + 1)) {
    if (!sameGas(seg.gas, bottom.gas)) break
    liters += segmentLiters(seg, s.sacStress, env)
  }
  return liters * 2
}
