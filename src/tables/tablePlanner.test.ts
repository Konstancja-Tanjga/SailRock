import { describe, expect, it } from 'vitest'
import { SURFACE_INTERVALS, TABLE, TIME_PENALTY } from './buhlmannHahn0_250'
import { lookup, lookupRepetitive, OutOfTableError, timePenalty } from './tablePlanner'

const stops = (depth: number, time: number) =>
  lookup(depth, time).stops.map((s) => `${s.depth}m:${s.minutes}`)

describe('tabela Bühlmann/Hahn 0–250 m: spójność przepisanych danych', () => {
  it('głębokości co 3 m od 9 do 63 m, czasy rosnące', () => {
    expect(TABLE.map((t) => t.depth)).toEqual(Array.from({ length: 19 }, (_, i) => 9 + i * 3))
    for (const t of TABLE) {
      for (let i = 1; i < t.rows.length; i++) expect(t.rows[i][0]).toBeGreaterThan(t.rows[i - 1][0])
    }
  })

  it('czas bezdekompresyjny maleje z głębokością i zgadza się z wierszami', () => {
    for (let i = 1; i < TABLE.length; i++) {
      expect(TABLE[i].noStop).toBeLessThanOrEqual(TABLE[i - 1].noStop)
    }
    for (const t of TABLE) {
      for (const [time, , ...s] of t.rows) {
        // wiersz bez przystanków mieści się w czasie bezdekompresyjnym, z przystankami nie
        if (s.length === 0) expect(time).toBeLessThanOrEqual(t.noStop)
        else expect(time).toBeGreaterThan(t.noStop)
      }
    }
  })

  it('dekompresja i grupa nie maleją z czasem na tej samej głębokości', () => {
    for (const t of TABLE) {
      for (let i = 1; i < t.rows.length; i++) {
        const [, g0, ...s0] = t.rows[i - 1]
        const [, g1, ...s1] = t.rows[i]
        const sum = (a: number[]) => a.reduce((x, y) => x + y, 0)
        expect(sum(s1)).toBeGreaterThanOrEqual(sum(s0))
        expect(s1.length).toBeGreaterThanOrEqual(s0.length)
        expect(g1 >= g0).toBe(true)
      }
    }
  })

  it('zwiększenie czasu maleje wzdłuż kolumn i z głębokością', () => {
    const depths = Object.keys(TIME_PENALTY).map(Number)
    expect(depths).toEqual(TABLE.map((t) => t.depth))
    depths.forEach((d, i) => {
      const row = TIME_PENALTY[d]
      expect(row).toHaveLength(6)
      for (let c = 1; c < 6; c++) expect(row[c]).toBeLessThanOrEqual(row[c - 1])
      if (i > 0) row.forEach((v, c) => expect(v).toBeLessThanOrEqual(TIME_PENALTY[depths[i - 1]][c]))
    })
    for (const { columns, reset } of Object.values(SURFACE_INTERVALS)) {
      const used = columns.filter((c): c is number => c !== null)
      for (let i = 1; i < used.length; i++) expect(used[i]).toBeGreaterThan(used[i - 1])
      expect(reset).toBeGreaterThan(used[used.length - 1])
    }
  })
})

describe('odczyt z tabeli', () => {
  it('wiersze podane przez użytkowniczkę', () => {
    expect(stops(30, 25)).toEqual(['3m:3'])
    expect(stops(42, 30)).toEqual(['12m:1', '9m:4', '6m:6', '3m:18'])
    expect(stops(39, 30)).toEqual(['9m:3', '6m:5', '3m:14'])
  })

  it('pierwsza większa głębokość i pierwszy dłuższy czas, bez interpolacji', () => {
    const p = lookup(40, 30)
    expect(p.tableDepth).toBe(42)
    expect(p.tableTime).toBe(30)
    expect(lookup(6, 30).tableDepth).toBe(9)
    expect(lookup(18, 41).tableTime).toBe(60)
  })

  it('poza zakresem tabeli', () => {
    expect(() => lookup(64, 10)).toThrow(OutOfTableError)
    expect(() => lookup(18, 91)).toThrow(OutOfTableError)
  })
})

describe('przykłady ze strony nurkomania.pl (tabele Bühlmann/Hahn, zadania)', () => {
  it('przykład 1: 16 m / 55 min -> 18 m / 60 min, grupa F, bez dekompresji', () => {
    const p = lookup(16, 55)
    expect([p.tableDepth, p.tableTime, p.group, p.decoTime]).toEqual([18, 60, 'F', 0])
  })

  it('przykład 2: 20 m / 41 min -> 21 m / 50 min, grupa F, 2 min na 3 m', () => {
    const p = lookup(20, 41)
    expect([p.tableDepth, p.tableTime, p.group]).toEqual([21, 50, 'F'])
    expect(p.stops).toEqual([{ depth: 3, minutes: 2 }])
  })

  it('przykład 3: grupa F, przerwa 1:10, 18 m -> czas dodatkowy 25 min; po 1:31 -> 14 min', () => {
    expect(timePenalty('F', 70, 18, 50)).toEqual({ kind: 'table', minutes: 25 })
    expect(timePenalty('F', 91, 18, 50)).toEqual({ kind: 'table', minutes: 14 })
    // wartość graniczna liczy się do krótszego przedziału
    expect(timePenalty('F', 90, 18, 50)).toEqual({ kind: 'table', minutes: 17 })

    const first = lookup(20, 41)
    const long = lookupRepetitive(first, 91, 18, 70)
    expect([long.tableTime, long.group]).toEqual([90, 'G'])
    expect(lookupRepetitive(first, 91, 18, 66).tableTime).toBe(80)
    // 70 + 25 = 95 min przekracza maksimum tabeli (90 min)
    expect(() => lookupRepetitive(first, 70, 18, 70)).toThrow(OutOfTableError)
  })

  it('przykład 3: grupa B po ponad dwóch godzinach to nurkowanie pierwsze', () => {
    expect(timePenalty('B', 121, 18, 10)).toEqual({ kind: 'first', minutes: 0 })
    expect(timePenalty('B', 120, 18, 10)).toEqual({ kind: 'table', minutes: 14 })
  })

  it('przykład 4: 24 m / 20 min (grupa D), przerwa 8 min, znów 24 m / 20 min -> 40 min, 3 min na 3 m', () => {
    const first = lookup(24, 20)
    expect([first.group, first.decoTime]).toEqual(['D', 0])
    const second = lookupRepetitive(first, 8, 24, 20)
    expect(second.penalty).toEqual({ kind: 'previous', minutes: 20 })
    expect(second.tableTime).toBe(40)
    expect(second.stops).toEqual([{ depth: 3, minutes: 3 }])
    // wariant z ramki „Pamiętaj!": 20 + 24 = 44 min -> 6 min na 3 m
    expect(lookup(24, 44).stops).toEqual([{ depth: 3, minutes: 6 }])
  })

  it('przerwa krótsza niż najmniejsza w tabeli: większa z głębokości obu nurkowań', () => {
    const first = lookup(30, 15)
    const second = lookupRepetitive(first, 5, 18, 20)
    expect(second.tableDepth).toBe(30)
    expect(second.tableTime).toBe(35)
  })
})
