import { CNS_HALF_TIME, NOAA_CNS } from './constants'

/**
 * Dopuszczalny czas ekspozycji (min) dla danego ppO2, interpolacja liniowa tabeli NOAA.
 * Tabela kończy się na 1,6 bara. Powyżej przedłużamy ostatni odcinek tabeli (1,5 -> 1,6),
 * z dolnym ograniczeniem 1 min; to ekstrapolacja, nie wartość NOAA, a planer i tak zgłasza
 * przekroczenie ppO2 jako osobne ostrzeżenie.
 */
export function cnsLimitMinutes(ppO2: number): number {
  if (ppO2 <= 0.5) return Infinity
  const first = NOAA_CNS[0]
  if (ppO2 <= first[0]) return first[1]
  for (let i = 1; i < NOAA_CNS.length; i++) {
    const [p1, t1] = NOAA_CNS[i]
    if (ppO2 <= p1) {
      const [p0, t0] = NOAA_CNS[i - 1]
      return t0 + ((ppO2 - p0) / (p1 - p0)) * (t1 - t0)
    }
  }
  const [pLast, tLast] = NOAA_CNS[NOAA_CNS.length - 1]
  const [pPrev, tPrev] = NOAA_CNS[NOAA_CNS.length - 2]
  return Math.max(1, tLast + ((ppO2 - pLast) / (pLast - pPrev)) * (tLast - tPrev))
}

/** Przyrost CNS w procentach za odcinek o średnim ppO2. */
export function cnsFor(ppO2: number, minutes: number): number {
  return (minutes / cnsLimitMinutes(ppO2)) * 100
}

/** Jednostki toksyczności płucnej za odcinek o średnim ppO2. */
export function otuFor(ppO2: number, minutes: number): number {
  if (ppO2 <= 0.5) return 0
  return minutes * Math.pow((ppO2 - 0.5) / 0.5, 0.8333)
}

export function cnsAfterSurface(cns: number, minutes: number): number {
  return cns * Math.pow(0.5, minutes / CNS_HALF_TIME)
}
