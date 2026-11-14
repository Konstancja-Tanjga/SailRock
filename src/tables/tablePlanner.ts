import {
  STOP_STEP,
  SURFACE_INTERVALS,
  TABLE,
  TIME_PENALTY,
  type DepthTable,
  type Group,
} from './buhlmannHahn0_250'

export interface TableStop {
  /** głębokość przystanku w metrach */
  depth: number
  minutes: number
}

export interface TablePlan {
  /** głębokość i czas podane przez nurka */
  depth: number
  time: number
  /** wiersz tabeli użyty do odczytu (pierwsza większa głębokość, pierwszy dłuższy czas) */
  tableDepth: number
  tableTime: number
  /** czas bezdekompresyjny dla głębokości tabelarycznej */
  noStop: number
  stops: TableStop[]
  decoTime: number
  group: Group
}

export class OutOfTableError extends Error {}

/** Wiersze tabeli dla głębokości: dokładna albo pierwsza większa. Zakazana interpolacja. */
export function depthTable(depth: number): DepthTable {
  if (!(depth > 0)) throw new OutOfTableError('Głębokość musi być większa od zera')
  const found = TABLE.find((t) => t.depth >= depth)
  if (!found) {
    throw new OutOfTableError(`Głębokość ${depth} m jest poza zakresem tabeli (maks. 63 m)`)
  }
  return found
}

/** Odczyt z tabeli: przystanki i grupa powtórzeń dla głębokości i czasu dennego. */
export function lookup(depth: number, time: number): TablePlan {
  if (!(time > 0)) throw new OutOfTableError('Czas musi być większy od zera')
  const table = depthTable(depth)
  const row = table.rows.find((r) => r[0] >= time)
  if (!row) {
    const max = table.rows[table.rows.length - 1][0]
    throw new OutOfTableError(
      `Czas ${time} min jest poza zakresem tabeli dla ${table.depth} m (maks. ${max} min)`,
    )
  }
  const [tableTime, group, ...minutes] = row
  const stops = minutes.map((m, i) => ({ depth: (minutes.length - i) * STOP_STEP, minutes: m }))
  return {
    depth,
    time,
    tableDepth: table.depth,
    tableTime,
    noStop: table.noStop,
    stops,
    decoTime: minutes.reduce((a, b) => a + b, 0),
    group,
  }
}

export type Penalty =
  /** przerwa dłuższa niż największa wartość w tabeli: nurkowanie liczone jako pierwsze */
  | { kind: 'first'; minutes: 0 }
  /** przerwa krótsza niż najmniejsza wartość: dodajemy czas poprzedniego nurkowania */
  | { kind: 'previous'; minutes: number }
  | { kind: 'table'; minutes: number }

/**
 * Zwiększenie czasu podstawowego dla nurkowania powtórnego.
 * Przerwa równa wartości granicznej liczy się do krótszego przedziału.
 */
export function timePenalty(
  group: Group,
  surfaceMinutes: number,
  depth: number,
  previousTime: number,
): Penalty {
  const { columns, reset } = SURFACE_INTERVALS[group]
  if (surfaceMinutes > reset) return { kind: 'first', minutes: 0 }
  let column = -1
  columns.forEach((from, i) => {
    if (from !== null && surfaceMinutes > from) column = i
  })
  if (column < 0) return { kind: 'previous', minutes: previousTime }
  return { kind: 'table', minutes: TIME_PENALTY[depthTable(depth).depth][column] }
}

export interface RepetitivePlan extends TablePlan {
  penalty: Penalty
}

/**
 * Nurkowanie powtórne: do planowanego czasu dodajemy zwiększenie czasu podstawowego
 * i dla sumy odczytujemy dekompresję. Przy przerwie krótszej niż najmniejsza w tabeli
 * bierzemy większą z głębokości obu nurkowań.
 */
export function lookupRepetitive(
  previous: TablePlan,
  surfaceMinutes: number,
  depth: number,
  time: number,
): RepetitivePlan {
  const penalty = timePenalty(previous.group, surfaceMinutes, depth, previous.tableTime)
  const usedDepth = penalty.kind === 'previous' ? Math.max(depth, previous.depth) : depth
  const plan = lookup(usedDepth, time + penalty.minutes)
  return { ...plan, depth, time, penalty }
}

/** Najdłuższy czas denny bez przystanków dla nurkowania powtórnego (0, gdy brak). */
export function maxNoStopTime(depth: number, penaltyMinutes = 0): number {
  const table = depthTable(depth)
  const rows = table.rows.filter((r) => r.length === 2)
  if (rows.length === 0) return 0
  return Math.max(0, rows[rows.length - 1][0] - penaltyMinutes)
}
