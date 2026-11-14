/**
 * Tabela wynurzania Bühlmann/Hahn dla akwenów 0–250 m n.p.m., prędkość wynurzania 10 m/min.
 * Przepisana ze skanów:
 *   https://nurkomania.pl/images/teoria/tabele-buhlman-0-250-strona1.jpg
 *   https://nurkomania.pl/images/teoria/tabele-buhlman-0-250-strona2.jpg
 * Przepisanie wymaga sprawdzenia z papierową tabelą przed użyciem do planowania.
 */

export type Group = 'B' | 'C' | 'D' | 'E' | 'F' | 'G'

/** [czas denny w min, grupa powtórzeń, przystanki w min od najgłębszego do 3 m] */
export type TableRow = [time: number, group: Group, ...stops: number[]]

export interface DepthTable {
  /** głębokość w metrach */
  depth: number
  /** czas bezdekompresyjny w minutach („Czas bez.") */
  noStop: number
  rows: TableRow[]
}

export const STOP_STEP = 3
export const ASCENT_RATE = 10

export const TABLE: DepthTable[] = [
  { depth: 9, noStop: 653, rows: [[20, 'B'], [40, 'C'], [80, 'D'], [120, 'E']] },
  { depth: 12, noStop: 192, rows: [[15, 'B'], [30, 'C'], [45, 'D'], [60, 'E'], [90, 'F']] },
  { depth: 15, noStop: 99, rows: [[15, 'C'], [30, 'D'], [45, 'E'], [60, 'F'], [90, 'G']] },
  {
    depth: 18,
    noStop: 65,
    rows: [
      [10, 'B'],
      [20, 'C'],
      [30, 'D'],
      [40, 'E'],
      [60, 'F'],
      [70, 'G', 2],
      [80, 'G', 6],
      [90, 'G', 12],
    ],
  },
  {
    depth: 21,
    noStop: 40,
    rows: [
      [10, 'B'],
      [20, 'D'],
      [30, 'E'],
      [40, 'F'],
      [50, 'F', 2],
      [55, 'G', 4],
      [60, 'G', 8],
      [65, 'G', 10],
      [70, 'G', 14],
      [75, 'G', 18],
    ],
  },
  {
    depth: 24,
    noStop: 27,
    rows: [
      [10, 'C'],
      [20, 'D'],
      [30, 'E', 1],
      [40, 'F', 3],
      [45, 'F', 6],
      [50, 'G', 10],
      [55, 'G', 13],
      [60, 'G', 18],
      [65, 'G', 1, 22],
      [70, 'G', 2, 25],
      [75, 'G', 5, 27],
    ],
  },
  {
    depth: 27,
    noStop: 21,
    rows: [
      [10, 'C'],
      [20, 'D'],
      [25, 'E', 1],
      [30, 'F', 3],
      [35, 'F', 5],
      [40, 'F', 8],
      [45, 'F', 1, 12],
      [50, 'G', 2, 16],
      [55, 'G', 4, 20],
      [60, 'G', 6, 24],
    ],
  },
  {
    depth: 30,
    noStop: 17,
    rows: [
      [10, 'C'],
      [15, 'D'],
      [20, 'D', 1],
      [25, 'E', 3],
      [30, 'F', 1, 5],
      [35, 'F', 2, 8],
      [40, 'G', 3, 13],
      [45, 'G', 5, 17],
      [50, 'G', 7, 22],
      [55, 'G', 10, 26],
      [60, 'G', 1, 13, 28],
    ],
  },
  {
    depth: 33,
    noStop: 15,
    rows: [
      [5, 'B'],
      [10, 'C'],
      [15, 'D'],
      [20, 'E', 3],
      [25, 'F', 1, 5],
      [30, 'F', 3, 7],
      [35, 'G', 4, 13],
      [40, 'G', 1, 5, 18],
      [45, 'G', 2, 8, 23],
      [50, 'G', 3, 11, 27],
    ],
  },
  {
    depth: 36,
    noStop: 9,
    rows: [
      [5, 'B'],
      [10, 'C', 1],
      [15, 'D', 2],
      [20, 'E', 1, 4],
      [25, 'F', 3, 6],
      [30, 'G', 1, 4, 11],
      [35, 'G', 2, 6, 16],
      [40, 'G', 3, 8, 23],
      [45, 'G', 5, 11, 27],
    ],
  },
  {
    depth: 39,
    noStop: 7,
    rows: [
      [5, 'C'],
      [10, 'D', 1],
      [15, 'E', 4],
      [20, 'F', 3, 4],
      [25, 'G', 1, 4, 8],
      [30, 'G', 3, 5, 14],
      [35, 'G', 1, 3, 8, 21],
      [40, 'G', 1, 5, 11, 26],
    ],
  },
  {
    depth: 42,
    noStop: 6,
    rows: [
      [5, 'C'],
      [10, 'D', 1],
      [15, 'E', 1, 4],
      [20, 'F', 1, 3, 6],
      [25, 'G', 3, 4, 12],
      [30, 'G', 1, 4, 6, 18],
      [35, 'G', 2, 5, 10, 25],
    ],
  },
  {
    depth: 45,
    noStop: 5,
    rows: [
      [3, 'B'],
      [6, 'D', 1],
      [9, 'E', 1],
      [12, 'E', 4],
      [15, 'E', 3, 4],
      [18, 'F', 1, 4, 5],
      [21, 'G', 3, 4, 9],
      [24, 'G', 1, 3, 5, 14],
      [27, 'G', 2, 3, 6, 18],
      [30, 'G', 3, 4, 8, 23],
    ],
  },
  {
    depth: 48,
    noStop: 4,
    rows: [
      [3, 'C'],
      [6, 'D', 1],
      [9, 'E', 2],
      [12, 'E', 1, 4],
      [15, 'F', 4, 5],
      [18, 'F', 2, 4, 7],
      [21, 'F', 1, 3, 5, 12],
      [24, 'G', 2, 4, 5, 17],
      [27, 'G', 3, 4, 8, 22],
    ],
  },
  {
    depth: 51,
    noStop: 4,
    rows: [
      [3, 'C'],
      [6, 'D', 1],
      [9, 'E', 3],
      [12, 'F', 3, 4],
      [15, 'F', 2, 4, 5],
      [18, 'F', 4, 4, 8],
      [21, 'G', 2, 4, 5, 15],
    ],
  },
  {
    depth: 54,
    noStop: 3,
    rows: [
      [6, 'D', 1],
      [9, 'E', 1, 4],
      [12, 'F', 4, 4],
      [15, 'F', 3, 4, 7],
      [18, 'F', 2, 3, 5, 12],
      [21, 'G', 1, 3, 3, 7, 17],
    ],
  },
  {
    depth: 57,
    noStop: 3,
    rows: [
      [6, 'D', 1],
      [9, 'E', 2, 4],
      [12, 'E', 2, 3, 5],
      [15, 'F', 1, 3, 4, 9],
      [18, 'F', 3, 4, 5, 15],
      [21, 'G', 2, 3, 4, 8, 21],
    ],
  },
  {
    depth: 60,
    noStop: 3,
    rows: [
      [6, 'D', 3],
      [9, 'E', 3, 4],
      [12, 'F', 3, 4, 5],
      [15, 'F', 2, 4, 4, 12],
      [18, 'F', 1, 3, 4, 6, 17],
      [21, 'G', 3, 3, 5, 9, 24],
    ],
  },
  {
    depth: 63,
    noStop: 2,
    rows: [
      [6, 'E', 4],
      [9, 'F', 1, 3, 4],
      [12, 'F', 1, 3, 4, 7],
      [15, 'G', 1, 3, 3, 5, 14],
      [18, 'G', 3, 3, 4, 8, 21],
    ],
  },
]

/**
 * Tabela przerw na powierzchni. Dla każdej grupy: dolne granice przerwy (w minutach) dla
 * sześciu kolumn tabeli zwiększenia czasu podstawowego (null = kolumna niedostępna dla grupy)
 * oraz czas z kolumny z samolotem, po którym kolejne nurkowanie liczy się jako pierwsze.
 */
export const SURFACE_INTERVALS: Record<Group, { columns: (number | null)[]; reset: number }> = {
  G: { columns: [25, 45, 60, 75, 100, 130], reset: 720 },
  F: { columns: [null, 20, 30, 45, 75, 90], reset: 480 },
  E: { columns: [null, null, 10, 15, 25, 45], reset: 240 },
  D: { columns: [null, null, null, 10, 15, 30], reset: 180 },
  C: { columns: [null, null, null, null, 10, 25], reset: 180 },
  B: { columns: [null, null, null, null, null, 20], reset: 120 },
}

/** Zwiększenie czasu podstawowego [min]: głębokość powtórnego nurkowania -> 6 kolumn. */
export const TIME_PENALTY: Record<number, number[]> = {
  9: [305, 211, 116, 75, 56, 25],
  12: [111, 81, 57, 33, 24, 19],
  15: [88, 61, 42, 28, 19, 16],
  18: [69, 44, 34, 25, 17, 14],
  21: [54, 37, 28, 23, 15, 12],
  24: [44, 30, 24, 20, 13, 11],
  27: [37, 26, 21, 18, 12, 10],
  30: [31, 22, 19, 16, 10, 9],
  33: [27, 20, 17, 14, 9, 8],
  36: [24, 18, 15, 13, 8, 7],
  39: [21, 16, 14, 11, 8, 7],
  42: [19, 15, 12, 10, 7, 6],
  45: [18, 14, 11, 9, 6, 6],
  48: [16, 13, 11, 8, 6, 6],
  51: [15, 12, 10, 7, 5, 5],
  54: [14, 11, 9, 7, 5, 5],
  57: [13, 10, 9, 6, 5, 5],
  60: [12, 10, 8, 6, 4, 4],
  63: [12, 10, 8, 6, 4, 4],
}
