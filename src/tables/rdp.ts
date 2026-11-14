/**
 * Planer nurkowania rekreacyjnego wg tabel RDP (powietrze, EANx32, EANx36).
 * Tylko nurkowania bezdekompresyjne. Zasady wg https://nurkomania.pl/nurkowanie-tabele-rdp.html
 * i tekstu na kartach RDP.
 */

export const GROUPS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')
export type PressureGroup = string

export interface RdpTable {
  name: string
  /** frakcja tlenu w mieszance, dla której tabela jest policzona */
  fO2: number
  /** głębokości kolumn tabeli 1 w metrach */
  depths: number[]
  /**
   * Tabela 1: dla każdej grupy czasy (min) w kolejności kolumn `depths`.
   * null = brak wartości (strzałka w dół albo poza limitem bezdekompresyjnym).
   */
  times: Record<PressureGroup, (number | null)[]>
  /** głębokości pokazane „tylko dla ciągłości planowania" (ppO2 ponad 1,4 ata) */
  continuityOnly?: number[]
  /**
   * Wartości tabeli 3 (czas resztkowego azotu), które różnią się od tabeli 1:
   * grupa -> głębokość -> minuty.
   */
  residual?: Record<PressureGroup, Record<number, number>>
}

/** Tabela 2: dla grupy początkowej lista [nowa grupa, koniec przedziału w minutach]. */
export type SurfaceTable = Record<PressureGroup, [group: PressureGroup, until: number][]>

export class RdpError extends Error {}

export const SAFETY_STOP = { depth: 5, minutes: 3 }
/** Przystanek bezpieczeństwa jest wymagany od tej głębokości. */
export const SAFETY_STOP_FROM_DEPTH = 30
export const ASCENT_RATE_MAX = 18
/** Po przerwie dłuższej niż 6 godzin kolejne nurkowanie liczy się jako pierwsze. */
export const FRESH_AFTER_MINUTES = 6 * 60
/** Dodatek do głębokości przy zimnej wodzie lub trudnych warunkach. */
export const COLD_EXTRA_DEPTH = 4

function column(table: RdpTable, depth: number): number {
  if (!(depth > 0)) throw new RdpError('Głębokość musi być większa od zera')
  const i = table.depths.findIndex((d) => d >= depth)
  if (i < 0) {
    const max = table.depths[table.depths.length - 1]
    throw new RdpError(`Głębokość ${depth} m jest poza zakresem tabeli ${table.name} (maks. ${max} m)`)
  }
  return i
}

/** Głębokość tabelaryczna: dokładna albo pierwsza większa; płycej niż pierwsza kolumna = pierwsza kolumna. */
export function tableDepth(table: RdpTable, depth: number): number {
  return table.depths[column(table, depth)]
}

/** Limit bezdekompresyjny (min) dla głębokości. */
export function noDecoLimit(table: RdpTable, depth: number): number {
  const c = column(table, depth)
  let limit = 0
  for (const g of GROUPS) {
    const t = table.times[g]?.[c]
    if (t != null) limit = Math.max(limit, t)
  }
  return limit
}

/** Grupa ciśnieniowa po nurkowaniu: pierwsza grupa z czasem równym lub dłuższym. */
export function groupAfterDive(table: RdpTable, depth: number, time: number): PressureGroup {
  if (!(time > 0)) throw new RdpError('Czas musi być większy od zera')
  const c = column(table, depth)
  for (const g of GROUPS) {
    const t = table.times[g]?.[c]
    if (t != null && t >= time) return g
  }
  throw new RdpError(
    `Czas ${time} min przekracza limit bezdekompresyjny ${noDecoLimit(table, depth)} min dla ${table.depths[c]} m`,
  )
}

/** Grupa graniczna (limit bezdekompresyjny) dla głębokości. */
function limitGroupIndex(table: RdpTable, depth: number): number {
  const c = column(table, depth)
  let last = -1
  GROUPS.forEach((g, i) => {
    if (table.times[g]?.[c] != null) last = i
  })
  return last
}

/**
 * Przystanek bezpieczeństwa (3 min na 5 m) jest wymagany, gdy nurkowanie kończy się na
 * limicie bezdekompresyjnym lub w jednej z trzech grup przed nim, albo na 30 m i głębiej.
 */
export function safetyStopRequired(table: RdpTable, depth: number, group: PressureGroup): boolean {
  if (tableDepth(table, depth) >= SAFETY_STOP_FROM_DEPTH) return true
  return GROUPS.indexOf(group) >= limitGroupIndex(table, depth) - 3
}

/** Grupa po przerwie powierzchniowej; null = nurkowanie liczone jako pierwsze. */
export function groupAfterSurface(
  surface: SurfaceTable,
  group: PressureGroup,
  minutes: number,
): PressureGroup | null {
  if (minutes > FRESH_AFTER_MINUTES) return null
  const row = surface[group]
  if (!row) throw new RdpError(`Nieznana grupa ciśnieniowa ${group}`)
  for (const [next, until] of row) if (minutes <= until) return next
  return null
}

/** Najkrótsza przerwa (min), po której nurek z grupy `from` znajdzie się w grupie `to`. */
export function minSurfaceInterval(
  surface: SurfaceTable,
  from: PressureGroup,
  to: PressureGroup | null,
): number {
  const row = surface[from]
  if (to === null) return row[row.length - 1][1] + 1
  const i = row.findIndex(([g]) => g === to)
  if (i < 0) throw new RdpError(`Z grupy ${from} nie da się przejść do grupy ${to}`)
  return i === 0 ? 0 : row[i - 1][1] + 1
}

/**
 * Czas resztkowego azotu (RNT) dla grupy na danej głębokości. Tabela 3 powtarza wartości
 * tabeli 1; tam, gdzie tabela 1 ma strzałkę, obowiązuje wartość następnej grupy, chyba że
 * tabela 3 drukuje własną wartość (`residual`).
 * null = z tą grupą nie wolno nurkować na tę głębokość.
 */
export function residualNitrogenTime(
  table: RdpTable,
  group: PressureGroup,
  depth: number,
): number | null {
  const c = column(table, depth)
  const printed = table.residual?.[group]?.[table.depths[c]]
  if (printed != null) return printed
  for (let i = GROUPS.indexOf(group); i < GROUPS.length; i++) {
    const t = table.times[GROUPS[i]]?.[c]
    if (t != null) return t
  }
  return null
}

/** Zaktualizowany limit bezdekompresyjny (ABT max) dla nurkowania powtórzeniowego. */
export function adjustedNoDecoLimit(
  table: RdpTable,
  group: PressureGroup | null,
  depth: number,
): number {
  const ndl = noDecoLimit(table, depth)
  if (group === null) return ndl
  const rnt = residualNitrogenTime(table, group, depth)
  return rnt === null ? 0 : Math.max(0, ndl - rnt)
}

export interface RdpDive {
  depth: number
  time: number
  /** przerwa powierzchniowa przed nurkowaniem w minutach (ignorowana dla pierwszego) */
  surfaceInterval?: number
  /** zimna woda lub trudne warunki: planuj jak o 4 m głębiej */
  cold?: boolean
}

export type RdpWarning =
  | 'deeper-than-previous'
  | 'repetitive-deeper-than-30'
  | 'deeper-than-40'
  | 'wx-interval'
  | 'yz-interval'
  | 'continuity-only-depth'
  | 'at-limit'

export interface RdpDiveResult {
  /** głębokość użyta do odczytu (z dodatkiem za zimno, zaokrąglona do kolumny tabeli) */
  tableDepth: number
  groupBefore: PressureGroup | null
  residualNitrogenTime: number
  /** czas rzeczywisty + czas resztkowego azotu */
  totalBottomTime: number
  noDecoLimit: number
  adjustedNoDecoLimit: number
  groupAfter: PressureGroup
  safetyStop: boolean
  warnings: RdpWarning[]
}

/** Planowanie serii nurkowań jednego dnia. Rzuca RdpError, gdy plan wychodzi poza tabelę. */
export function planRdpDay(table: RdpTable, surface: SurfaceTable, dives: RdpDive[]): RdpDiveResult[] {
  const results: RdpDiveResult[] = []
  let group: PressureGroup | null = null
  let previousDepth: number | null = null
  // minimalna przerwa wymuszona zasadą WX/YZ, licząc od pierwszego nurkowania dnia
  let requiredInterval = 0
  dives.forEach((dive, index) => {
    const warnings: RdpWarning[] = []
    const interval = dive.surfaceInterval ?? 0
    const before = index === 0 || group === null ? null : groupAfterSurface(surface, group, interval)
    const planned = dive.depth + (dive.cold ? COLD_EXTRA_DEPTH : 0)
    const depth = tableDepth(table, planned)
    const ndl = noDecoLimit(table, planned)
    const rnt = before === null ? 0 : residualNitrogenTime(table, before, planned)
    if (rnt === null) {
      throw new RdpError(`Z grupą ${before} nie można nurkować na ${depth} m`)
    }
    const total = dive.time + rnt
    if (total > ndl) {
      throw new RdpError(
        `Nurkowanie ${index + 1}: ${dive.time} min + ${rnt} min azotu resztkowego przekracza limit ${ndl} min dla ${depth} m`,
      )
    }
    const after = groupAfterDive(table, planned, total)

    if (index > 0) {
      if (previousDepth !== null && dive.depth > previousDepth) warnings.push('deeper-than-previous')
      if (dive.depth > 30) warnings.push('repetitive-deeper-than-30')
      if (dives.length >= 3 && interval < requiredInterval) {
        warnings.push(requiredInterval >= 180 ? 'yz-interval' : 'wx-interval')
      }
    }
    if (dive.depth > 40) warnings.push('deeper-than-40')
    if (table.continuityOnly?.includes(depth)) warnings.push('continuity-only-depth')
    if (total === ndl) warnings.push('at-limit')

    if ('YZ'.includes(after)) requiredInterval = Math.max(requiredInterval, 180)
    else if ('WX'.includes(after)) requiredInterval = Math.max(requiredInterval, 60)

    results.push({
      tableDepth: depth,
      groupBefore: before,
      residualNitrogenTime: rnt,
      totalBottomTime: total,
      noDecoLimit: ndl,
      adjustedNoDecoLimit: ndl - rnt,
      groupAfter: after,
      safetyStop: safetyStopRequired(table, planned, after),
      warnings,
    })
    group = after
    previousDepth = dive.depth
  })
  return results
}

/**
 * Awaryjna dekompresja po przekroczeniu limitu bezdekompresyjnego:
 * mniej niż 5 min ponad limit: 8 min na 5 m i 6 godzin bez nurkowania;
 * 5 min lub więcej: co najmniej 15 min na 5 m i 24 godziny bez nurkowania.
 */
export function emergencyDecompression(overLimitMinutes: number): {
  stopMinutes: number
  noDivingHours: number
} {
  return overLimitMinutes < 5
    ? { stopMinutes: 8, noDivingHours: 6 }
    : { stopMinutes: 15, noDivingHours: 24 }
}
