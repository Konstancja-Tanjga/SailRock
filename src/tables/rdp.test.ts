import { describe, expect, it } from 'vitest'
import {
  GROUPS,
  RdpError,
  adjustedNoDecoLimit,
  emergencyDecompression,
  groupAfterDive,
  groupAfterSurface,
  minSurfaceInterval,
  noDecoLimit,
  planRdpDay,
  residualNitrogenTime,
  safetyStopRequired,
  type RdpTable,
} from './rdp'
import { RDP_AIR, RDP_EAN32, RDP_EAN36, RDP_SURFACE } from './rdpData'

const tables: RdpTable[] = [RDP_AIR, RDP_EAN32, RDP_EAN36]

describe('tabele RDP: spójność przepisanych danych', () => {
  it('tabela 1: czasy rosną w dół kolumny i nie rosną w prawo wzdłuż wiersza', () => {
    for (const t of tables) {
      t.depths.forEach((_, c) => {
        let prev = 0
        let ended = false
        for (const g of GROUPS) {
          const v = t.times[g][c]
          if (v == null) {
            // po czarnej komórce (limit) kolumna jest pusta; strzałki tylko przed pierwszą wartością serii
            if (prev > 0 && GROUPS.slice(GROUPS.indexOf(g)).every((x) => t.times[x][c] == null))
              ended = true
            continue
          }
          expect(ended).toBe(false)
          expect(v).toBeGreaterThan(prev)
          prev = v
        }
      })
      for (const g of GROUPS) {
        const row = t.times[g].filter((v): v is number => v != null)
        for (let i = 1; i < row.length; i++) expect(row[i]).toBeLessThanOrEqual(row[i - 1])
      }
    }
  })

  it('limity bezdekompresyjne odczytane z kart', () => {
    const limits = (t: RdpTable) => t.depths.map((d) => noDecoLimit(t, d))
    expect(limits(RDP_AIR)).toEqual([219, 147, 98, 72, 56, 45, 37, 29, 20, 14, 9, 8])
    expect(limits(RDP_EAN32)).toEqual([205, 130, 95, 75, 60, 50, 40, 30, 20, 16])
    expect(limits(RDP_EAN36)).toEqual([185, 125, 95, 70, 60, 50, 40, 35, 28])
  })

  it('tabela 2: przedziały ciągłe, grupa A trwa równo 3 godziny, koniec po 6 godzinach', () => {
    GROUPS.forEach((g, i) => {
      const row = RDP_SURFACE[g]
      expect(row.map(([n]) => n)).toEqual(GROUPS.slice(0, i + 1).reverse())
      for (let k = 1; k < row.length; k++) expect(row[k][1]).toBeGreaterThan(row[k - 1][1])
      const startOfA = row.length > 1 ? row[row.length - 2][1] + 1 : 0
      expect(row[row.length - 1][1] - startOfA).toBe(180)
    })
    expect(RDP_SURFACE.Z[25][1]).toBe(360)
    expect(RDP_SURFACE.B).toEqual([
      ['B', 47],
      ['A', 228],
    ])
  })
})

describe('odczyt z tabel RDP', () => {
  it('pierwsza większa głębokość i pierwszy dłuższy czas', () => {
    expect(groupAfterDive(RDP_AIR, 18, 45)).toBe(groupAfterDive(RDP_AIR, 17, 44))
    expect(noDecoLimit(RDP_AIR, 31)).toBe(14) // 31 m -> 35 m
    expect(noDecoLimit(RDP_AIR, 6)).toBe(219) // płycej niż 10 m -> 10 m
    expect(() => groupAfterDive(RDP_AIR, 18, 57)).toThrow(RdpError)
    expect(() => noDecoLimit(RDP_AIR, 43)).toThrow(RdpError)
  })

  it('strzałka w tabeli 1: obowiązuje następna grupa', () => {
    expect(RDP_AIR.times.A[10]).toBeNull()
    expect(groupAfterDive(RDP_AIR, 40, 3)).toBe('B')
    // tabela 3 drukuje dla grupy A na 40 m własną wartość: 2 min, limit 7 min
    expect(residualNitrogenTime(RDP_AIR, 'A', 40)).toBe(2)
    expect(adjustedNoDecoLimit(RDP_AIR, 'A', 40)).toBe(7)
    // strzałki bez własnej wartości: D na 40 m = E (7), E na 35 m = F (9)
    expect(residualNitrogenTime(RDP_AIR, 'D', 40)).toBe(7)
    expect(residualNitrogenTime(RDP_AIR, 'E', 35)).toBe(9)
  })

  it('tabela 3 odczytana osobno ze skanu: wybrane komórki', () => {
    // [czas azotu resztkowego, limit zaktualizowany]
    const cell = (t: RdpTable, g: string, d: number) => [
      residualNitrogenTime(t, g, d),
      adjustedNoDecoLimit(t, g, d),
    ]
    expect(cell(RDP_AIR, 'A', 35)).toEqual([3, 11])
    expect(cell(RDP_AIR, 'B', 35)).toEqual([5, 9])
    expect(cell(RDP_AIR, 'B', 40)).toEqual([5, 4])
    expect(cell(RDP_AIR, 'Y', 10)).toEqual([199, 20])
    expect(cell(RDP_EAN32, 'A', 30)).toEqual([4, 26])
    expect(cell(RDP_EAN32, 'K', 30)).toEqual([21, 9])
    expect(cell(RDP_EAN32, 'A', 36)).toEqual([3, 17])
  })

  it('awaryjna dekompresja', () => {
    expect(emergencyDecompression(4)).toEqual({ stopMinutes: 8, noDivingHours: 6 })
    expect(emergencyDecompression(5)).toEqual({ stopMinutes: 15, noDivingHours: 24 })
  })

  it('przystanek bezpieczeństwa: limit i trzy grupy przed nim oraz 30 m i głębiej', () => {
    // EANx36, 28 m: limit w grupie T, szare komórki Q–S
    expect(safetyStopRequired(RDP_EAN36, 28, 'P')).toBe(false)
    for (const g of ['Q', 'R', 'S', 'T']) expect(safetyStopRequired(RDP_EAN36, 28, g)).toBe(true)
    expect(safetyStopRequired(RDP_AIR, 30, 'A')).toBe(true)
    expect(safetyStopRequired(RDP_AIR, 18, 'A')).toBe(false)
  })

  it('przerwa powierzchniowa', () => {
    expect(groupAfterSurface(RDP_SURFACE, 'B', 47)).toBe('B')
    expect(groupAfterSurface(RDP_SURFACE, 'B', 48)).toBe('A')
    expect(groupAfterSurface(RDP_SURFACE, 'B', 229)).toBeNull()
    expect(groupAfterSurface(RDP_SURFACE, 'Z', 361)).toBeNull()
  })
})

describe('przykłady zadań RDP ze strony nurkomania.pl', () => {
  it('zadanie 1: 18 m / 45 min, minimalna przerwa przed powtórzeniem to 1 h 47 min', () => {
    const after = groupAfterDive(RDP_AIR, 18, 45)
    // najwyższa grupa, z którą 45 min na 18 m mieści się w limicie
    const target = [...GROUPS]
      .reverse()
      .find((g) => adjustedNoDecoLimit(RDP_AIR, g, 18) >= 45 && GROUPS.indexOf(g) <= GROUPS.indexOf(after))!
    expect(minSurfaceInterval(RDP_SURFACE, after, target)).toBe(107)
  })

  it('zadanie 2: 18 m / 51 min, po godzinie maks. 34 min na 18 m, z przystankiem bezpieczeństwa', () => {
    const after = groupAfterDive(RDP_AIR, 18, 51)
    const before = groupAfterSurface(RDP_SURFACE, after, 60)
    expect(adjustedNoDecoLimit(RDP_AIR, before, 18)).toBe(34)
    const day = planRdpDay(RDP_AIR, RDP_SURFACE, [
      { depth: 18, time: 51 },
      { depth: 18, time: 34, surfaceInterval: 60 },
    ])
    expect(day[1].safetyStop).toBe(true)
    expect(day[1].warnings).toContain('at-limit')
  })

  it('zadanie 3: 23 m / 20 min, 45 min przerwy, 15 m / 37 min, godzina przerwy, 16 m: maks. 47 min', () => {
    const day = planRdpDay(RDP_AIR, RDP_SURFACE, [
      { depth: 23, time: 20 },
      { depth: 15, time: 37, surfaceInterval: 45 },
    ])
    const before = groupAfterSurface(RDP_SURFACE, day[1].groupAfter, 60)
    expect(adjustedNoDecoLimit(RDP_AIR, before, 16)).toBe(47)
  })

  it('zadanie 5: zimno, 20 m / 28 min -> 25 m, grupa P; po godzinie grupa E; 18 m -> 22 m, maks. 22 min', () => {
    const [first] = planRdpDay(RDP_AIR, RDP_SURFACE, [{ depth: 20, time: 28, cold: true }])
    expect([first.tableDepth, first.groupAfter]).toEqual([25, 'P'])
    const before = groupAfterSurface(RDP_SURFACE, 'P', 60)
    expect(before).toBe('E')
    expect(adjustedNoDecoLimit(RDP_AIR, before, 18 + 4)).toBe(22)
  })

  it('zadanie 8: zimno, 18 m / 50 min przekracza tabelę', () => {
    expect(() => planRdpDay(RDP_AIR, RDP_SURFACE, [{ depth: 18, time: 50, cold: true }])).toThrow(
      RdpError,
    )
  })
})

describe('zasady nurkowań powtórzeniowych', () => {
  it('ostrzega przed nurkowaniem głębszym niż poprzednie i o zasadzie WX/YZ', () => {
    const day = planRdpDay(RDP_AIR, RDP_SURFACE, [
      { depth: 12, time: 140 },
      { depth: 14, time: 20, surfaceInterval: 90 },
      { depth: 10, time: 20, surfaceInterval: 30 },
    ])
    expect('YZ').toContain(day[0].groupAfter)
    expect(day[1].warnings).toContain('deeper-than-previous')
    expect(day[1].warnings).toContain('yz-interval')
    expect(day[2].warnings).toContain('yz-interval')
  })

  it('głębokości EANx pokazane tylko dla ciągłości planowania dają ostrzeżenie', () => {
    const [d] = planRdpDay(RDP_EAN32, RDP_SURFACE, [{ depth: 36, time: 10 }])
    expect(d.warnings).toContain('continuity-only-depth')
  })
})
