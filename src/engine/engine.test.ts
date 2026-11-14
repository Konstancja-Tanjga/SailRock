import { describe, expect, it } from 'vitest'
import { ceilingDepth } from './ceiling'
import {
  AIR,
  DEFAULT_SETTINGS,
  bestMix,
  ead,
  environment,
  mod,
  nitrox,
  noDecoLimit,
  planDay,
  planDive,
  surfacePressure,
  type Cylinder,
  type DiveInput,
  type Settings,
} from './index'
import { cnsLimitMinutes, otuFor } from './oxygen'
import { loadTissues, saturatedTissues } from './tissues'

const sea = environment({ altitude: 0, water: 'salt' })
const cyl = (percent: number, volume = 15, pressure = 200): Cylinder => ({
  gas: nitrox(percent),
  volume,
  pressure,
})
const dive = (
  depth: number,
  time: number,
  over: Partial<DiveInput> = {},
  settings: Partial<Settings> = {},
): DiveInput => ({
  levels: [{ depth, time }],
  bottom: cyl(21),
  deco: [],
  ...over,
  settings: { ...DEFAULT_SETTINGS, ...settings },
})
const ndl = (depth: number, percent: number, settings: Partial<Settings> = {}) => {
  const s = { ...DEFAULT_SETTINGS, ...settings }
  const env = environment(s)
  return noDecoLimit(depth, nitrox(percent), saturatedTissues(env), s, env)
}

describe('środowisko i gazy', () => {
  it('ciśnienie na poziomie morza i na wysokości', () => {
    expect(surfacePressure(0)).toBeCloseTo(1.01325, 5)
    expect(surfacePressure(1000)).toBeCloseTo(0.8988, 3)
    expect(surfacePressure(2000)).toBeCloseTo(0.795, 3)
  })

  it('MOD, EAD i najlepszy mix', () => {
    expect(mod(nitrox(32), 1.4, sea)).toBeCloseTo(33.3, 1)
    expect(mod(nitrox(36), 1.4, sea)).toBeCloseTo(28.5, 1)
    expect(mod(nitrox(50), 1.6, sea)).toBeCloseTo(21.6, 1)
    expect(mod(nitrox(100), 1.6, sea)).toBeCloseTo(5.8, 1)
    expect(ead(nitrox(32), 30, sea)).toBeCloseTo(24.4, 1)
    expect(ead(AIR, 30, sea)).toBeCloseTo(30, 6)
    expect(Math.round(bestMix(30, 1.4, sea).fO2 * 100)).toBe(34)
    expect(Math.round(bestMix(60, 1.4, sea).fO2 * 100)).toBe(21)
  })
})

describe('tkanki i sufit', () => {
  it('tkanki nasycone na powierzchni nie mają sufitu i nie zmieniają się na powierzchni', () => {
    const t = saturatedTissues(sea)
    expect(ceilingDepth(t, 0.3, sea)).toBe(0)
    const later = loadTissues(t, sea.surface, sea.surface, 600, AIR)
    later.forEach((p, i) => expect(p).toBeCloseTo(t[i], 9))
  })

  it('równanie Schreinera jest spójne: jeden odcinek = dwa odcinki', () => {
    const t = saturatedTissues(sea)
    const whole = loadTissues(t, 1, 5, 4, AIR)
    const half = loadTissues(loadTissues(t, 1, 3, 2, AIR), 3, 5, 2, AIR)
    whole.forEach((p, i) => expect(p).toBeCloseTo(half[i], 9))
  })

  it('po bardzo długim czasie tkanki dochodzą do ciśnienia wdychanego azotu', () => {
    const t = loadTissues(saturatedTissues(sea), 4, 4, 100000, AIR)
    t.forEach((p) => expect(p).toBeCloseTo((4 - 0.0627) * 0.79, 4))
  })
})

describe('limity bezdekompresyjne', () => {
  it('maleją z głębokością', () => {
    const limits = [12, 18, 24, 30, 36, 40].map((d) => ndl(d, 21))
    for (let i = 1; i < limits.length; i++) expect(limits[i]).toBeLessThan(limits[i - 1])
  })

  it('są w rozsądnym zakresie dla powietrza (GF 40/85)', () => {
    expect(ndl(18, 21)).toBeGreaterThan(35)
    expect(ndl(18, 21)).toBeLessThan(70)
    expect(ndl(30, 21)).toBeGreaterThan(9)
    expect(ndl(30, 21)).toBeLessThan(22)
    expect(ndl(40, 21)).toBeGreaterThan(3)
    expect(ndl(40, 21)).toBeLessThan(11)
  })

  it('nitrox wydłuża limit, a niższy GF high go skraca', () => {
    expect(ndl(30, 32)).toBeGreaterThan(ndl(30, 21))
    expect(ndl(30, 21, { gfHigh: 0.7 })).toBeLessThan(ndl(30, 21))
  })

  it('wysokość skraca limit', () => {
    expect(ndl(24, 21, { altitude: 2000, water: 'fresh' })).toBeLessThan(
      ndl(24, 21, { water: 'fresh' }),
    )
  })

  it('nurkowanie na granicy NDL nie ma deko, minutę dłuższe ma', () => {
    const limit = ndl(30, 21)
    expect(planDive(dive(30, limit)).decoTime).toBe(0)
    expect(planDive(dive(30, limit + 1)).decoTime).toBeGreaterThan(0)
  })
})

describe('planer', () => {
  it('nurkowanie bez deko dostaje przystanek bezpieczeństwa 3 min na 5 m', () => {
    const r = planDive(dive(18, 30))
    expect(r.decoTime).toBe(0)
    expect(r.stops).toHaveLength(1)
    expect(r.stops[0]).toMatchObject({ kind: 'safety', endDepth: 5, duration: 3 })
    // 30 min dna + 13 m w górę + 3 min + 5 m w górę
    expect(r.runtime).toBeCloseTo(30 + 13 / 18 + 3 + 5 / 18, 6)
    expect(r.warnings).toEqual([])
  })

  it('nurkowanie deko: przystanki co 3 m, coraz płytsze, kończy na powierzchni', () => {
    const r = planDive(dive(40, 30, { bottom: cyl(21, 24) }))
    const stops = r.stops.filter((s) => s.kind === 'stop')
    expect(stops.length).toBeGreaterThan(1)
    stops.forEach((s) => expect(s.endDepth % 3).toBe(0))
    for (let i = 1; i < stops.length; i++) {
      expect(stops[i].endDepth).toBeLessThan(stops[i - 1].endDepth)
    }
    expect(stops[stops.length - 1].endDepth).toBe(3)
    expect(r.segments[r.segments.length - 1].endDepth).toBe(0)
    expect(r.warnings.map((w) => w.code)).toContain('deco')
    expect(r.warnings.map((w) => w.code)).toContain('depth-cert')
  })

  it('po wyjściu tkanki mieszczą się w GF high na powierzchni', () => {
    const r = planDive(dive(45, 25, { bottom: cyl(21, 24) }))
    expect(ceilingDepth(r.end.tissues, DEFAULT_SETTINGS.gfHigh, sea)).toBe(0)
    // ...i są blisko limitu: plan nie jest przesadnie długi
    expect(ceilingDepth(r.end.tissues, DEFAULT_SETTINGS.gfHigh - 0.1, sea)).toBeGreaterThan(0)
  })

  it('bardziej zachowawcze GF wydłużają dekompresję', () => {
    const base = planDive(dive(40, 30, { bottom: cyl(21, 24) }))
    const safer = planDive(dive(40, 30, { bottom: cyl(21, 24) }, { gfLow: 0.3, gfHigh: 0.7 }))
    expect(safer.decoTime).toBeGreaterThan(base.decoTime)
  })

  it('gaz deko skraca dekompresję i jest włączany na swoim MOD', () => {
    const air = planDive(dive(40, 30, { bottom: cyl(21, 24) }))
    const ean50 = planDive(dive(40, 30, { bottom: cyl(21, 24), deco: [cyl(50, 7)] }))
    expect(ean50.decoTime).toBeLessThan(air.decoTime)
    const sw = ean50.stops.find((s) => s.kind === 'switch')!
    expect(sw.endDepth).toBe(21)
    expect(Math.round(sw.gas.fO2 * 100)).toBe(50)
    const deeper = ean50.segments.filter((s) => s.startDepth > 21.7)
    deeper.forEach((s) => expect(Math.round(s.gas.fO2 * 100)).toBe(21))
  })

  it('ostatni przystanek na 6 m', () => {
    const r = planDive(dive(40, 30, { bottom: cyl(21, 24) }, { lastStop: 6 }))
    const stops = r.stops.filter((s) => s.kind === 'stop')
    expect(stops[stops.length - 1].endDepth).toBe(6)
  })

  it('profil wielopoziomowy', () => {
    const r = planDive({
      ...dive(30, 15),
      levels: [
        { depth: 30, time: 15 },
        { depth: 18, time: 20 },
      ],
    })
    expect(r.maxDepth).toBe(30)
    expect(r.segments.filter((s) => s.kind === 'level').map((s) => s.endDepth)).toEqual([30, 18])
    expect(r.segments[r.segments.length - 1].endDepth).toBe(0)
  })

  it('ostrzega o przekroczeniu ppO2 i o gazie ponad uprawnienia', () => {
    const r = planDive(dive(40, 10, { bottom: cyl(32) }))
    expect(r.warnings).toContainEqual({ code: 'ppo2-bottom', level: 'danger' })
    const d = planDive(dive(30, 30, { deco: [cyl(50, 7)] }))
    expect(d.warnings.map((w) => w.code)).toContain('gas-cert')
  })
})

describe('tlen', () => {
  it('limity CNS z tabeli NOAA i interpolacja', () => {
    expect(cnsLimitMinutes(0.4)).toBe(Infinity)
    expect(cnsLimitMinutes(1.0)).toBe(300)
    expect(cnsLimitMinutes(1.4)).toBe(150)
    expect(cnsLimitMinutes(1.6)).toBe(45)
    expect(cnsLimitMinutes(1.35)).toBeCloseTo(165, 6)
  })

  it('OTU: 1 jednostka na minutę przy 1,0 bara', () => {
    expect(otuFor(1.0, 10)).toBeCloseTo(10, 6)
    expect(otuFor(0.5, 10)).toBe(0)
  })

  it('CNS rośnie z ppO2', () => {
    const air = planDive(dive(30, 20))
    const ean = planDive(dive(30, 20, { bottom: cyl(32) }))
    expect(ean.cns).toBeGreaterThan(air.cns)
    expect(ean.cns).toBeGreaterThan(5)
    expect(ean.cns).toBeLessThan(30)
  })
})

describe('zużycie gazu', () => {
  it('odcinek denny: SAC × ciśnienie × czas', () => {
    // 20 min na 20 m bez zejścia się nie da, więc liczymy ręcznie zejście + dno
    const r = planDive(dive(20, 20, {}, { safetyStop: false }))
    const p20 = sea.surface + 20 * sea.barPerMeter
    const descent = 20 * ((sea.surface + p20) / 2) * (20 / 18)
    const level = 20 * p20 * (20 - 20 / 18)
    const ascent = 16 * ((sea.surface + p20) / 2) * (20 / 18)
    expect(r.gasUse[0].usedLiters).toBeCloseTo(descent + level + ascent, 6)
    expect(r.gasUse[0].usedBar).toBeCloseTo(r.gasUse[0].usedLiters / 15, 9)
  })

  it('gaz deko jest liczony z własnej butli', () => {
    const r = planDive(dive(40, 30, { bottom: cyl(21, 24), deco: [cyl(50, 7)] }))
    expect(r.gasUse).toHaveLength(2)
    expect(r.gasUse[1].role).toBe('deco')
    expect(r.gasUse[1].usedLiters).toBeGreaterThan(0)
    const total = r.gasUse[0].usedLiters + r.gasUse[1].usedLiters
    const airOnly = planDive(dive(40, 30, { bottom: cyl(21, 24) }))
    expect(r.gasUse[0].usedLiters).toBeLessThan(airOnly.gasUse[0].usedLiters)
    expect(total).toBeGreaterThan(0)
  })

  it('za mała butla daje ostrzeżenie', () => {
    const r = planDive(dive(30, 40, { bottom: cyl(21, 10) }))
    expect(r.warnings).toContainEqual({ code: 'gas-insufficient', level: 'danger' })
    const tight = planDive(dive(30, 18, { bottom: cyl(21, 10) }))
    expect(tight.warnings.map((w) => w.code)).toContain('gas-reserve')
  })

  it('minimum gas rośnie z głębokością', () => {
    expect(planDive(dive(30, 15)).minGasLiters).toBeGreaterThan(
      planDive(dive(18, 15)).minGasLiters,
    )
  })
})

describe('nurkowania powtórzeniowe', () => {
  const second = (interval: number) =>
    planDay([
      { input: dive(30, 18), surfaceInterval: 0 },
      { input: dive(24, 20), surfaceInterval: interval },
    ])[1]

  it('drugie nurkowanie ma krótszy NDL niż pierwsze na tej samej głębokości', () => {
    expect(second(10).ndl).toBeLessThan(planDive(dive(24, 20)).ndl)
  })

  it('dłuższa przerwa powierzchniowa wydłuża NDL', () => {
    expect(second(180).ndl).toBeGreaterThan(second(10).ndl)
  })

  it('po bardzo długiej przerwie wynik jak dla pierwszego nurkowania', () => {
    expect(second(60 * 72).ndl).toBe(planDive(dive(24, 20)).ndl)
  })

  it('CNS zanika na powierzchni, OTU się sumuje', () => {
    const [first, next] = planDay([
      { input: dive(30, 18, { bottom: cyl(32) }), surfaceInterval: 0 },
      { input: dive(24, 20, { bottom: cyl(32) }), surfaceInterval: 90 },
    ])
    const alone = planDive(dive(24, 20, { bottom: cyl(32) }))
    expect(next.cns).toBeCloseTo(first.cns / 2 + alone.cns, 6)
    expect(next.otu).toBeCloseTo(first.otu + alone.otu, 6)
  })
})

describe('regresje po niezależnym przeglądzie', () => {
  it('limity bezdekompresyjne dla powietrza przy ustawieniach domyślnych (wartości przypięte)', () => {
    expect([18, 30, 42].map((d) => ndl(d, 21))).toEqual([44, 14, 8])
  })

  it('gazy deko nie zamieniają nurkowania deko w bezdekompresyjne', () => {
    const r = planDive(dive(30, 22, { deco: [cyl(50, 7), cyl(100, 7)] }))
    expect(r.warnings.map((w) => w.code)).toContain('deco')
    expect(r.stops.some((s) => s.kind === 'safety')).toBe(false)
    expect(r.gasUse[1].usedLiters).toBeGreaterThan(0)
    expect(ceilingDepth(r.end.tissues, DEFAULT_SETTINGS.gfHigh, sea)).toBe(0)
  })

  it('żaden plan nie kończy się powyżej GF high', () => {
    const decoSets = [[], [cyl(50, 7)], [cyl(50, 7), cyl(100, 7)], [cyl(100, 7)]]
    const gfs = [
      [0.4, 0.85],
      [1, 1],
      [0.1, 0.9],
      [0.3, 0.7],
    ]
    let plans = 0
    for (const depth of [9, 12, 18, 21, 25, 30, 37, 45])
      for (const time of [10, 22, 35, 60])
        for (const deco of decoSets)
          for (const [gfLow, gfHigh] of gfs)
            for (const safetyStop of [true, false]) {
              const r = planDive(
                dive(depth, time, { bottom: cyl(21, 100), deco }, { gfLow, gfHigh, safetyStop }),
              )
              expect(ceilingDepth(r.end.tissues, gfHigh, sea)).toBe(0)
              // bez obowiązkowej dekompresji nie ma też zmian gazu
              if (!r.warnings.some((w) => w.code === 'deco')) {
                expect(r.stops.every((s) => s.kind === 'safety')).toBe(true)
              }
              plans++
            }
    expect(plans).toBe(8 * 4 * 4 * 4 * 2)
  })

  it('odrzuca odwrócone gradient factors i inne błędne ustawienia', () => {
    expect(() => planDive(dive(18, 40, {}, { gfLow: 0.85, gfHigh: 0.4 }))).toThrow()
    expect(() => planDive(dive(18, 40, {}, { gfHigh: 1.2 }))).toThrow()
    expect(() => planDive(dive(18, 40, {}, { stopStep: 0 }))).toThrow()
    expect(() => planDive(dive(18, 40, {}, { ascentRate: 0 }))).toThrow()
    expect(() => planDive(dive(18, 40, {}, { lastStop: 4 }))).toThrow()
  })

  it('wynurzanie 18 m/min do pierwszego przystanku, 10 m/min powyżej', () => {
    const rate = (s: { startDepth: number; endDepth: number; duration: number }) =>
      (s.startDepth - s.endDepth) / s.duration
    const noDeco = planDive(dive(18, 30))
    noDeco.segments
      .filter((s) => s.kind === 'ascent')
      .forEach((s) => expect(rate(s)).toBeCloseTo(18, 6))

    const deco = planDive(dive(40, 30, { bottom: cyl(21, 24) }))
    const firstStop = deco.segments.findIndex((s) => s.kind === 'stop')
    deco.segments.forEach((s, i) => {
      if (s.kind !== 'ascent') return
      expect(rate(s)).toBeCloseTo(i < firstStop ? 18 : 10, 6)
    })
  })

  it('ostrzega, gdy po utracie gazu deko nie da się skończyć dekompresji na gazie dennym', () => {
    const tight = planDive(dive(40, 30, { bottom: cyl(21, 20), deco: [cyl(50, 7)] }))
    expect(tight.warnings.map((w) => w.code)).toContain('lost-deco-gas')
    const roomy = planDive(dive(40, 30, { bottom: cyl(21, 30), deco: [cyl(50, 7)] }))
    expect(roomy.warnings.map((w) => w.code)).not.toContain('lost-deco-gas')
  })

  it('minimum gas: tempo awaryjne, największa głębokość, rezerwa 50 bar', () => {
    const p18 = sea.surface + 18 * sea.barPerMeter
    const p5 = sea.surface + 5 * sea.barPerMeter
    const r = planDive(dive(18, 30))
    const expected =
      2 *
      30 *
      (p18 * 1 + ((p18 + p5) / 2) * (13 / 18) + p5 * 3 + ((p5 + sea.surface) / 2) * (5 / 18))
    expect(r.minGasLiters).toBeCloseTo(expected, 6)

    const multi = planDive({
      ...dive(30, 20),
      levels: [
        { depth: 30, time: 20 },
        { depth: 12, time: 5 },
      ],
    })
    expect(multi.minGasLiters).toBeGreaterThan(planDive(dive(12, 25)).minGasLiters * 1.4)

    // 18 m / 40 min na 15 l kończy się poniżej 50 bar
    const low = planDive(dive(18, 40))
    expect(low.gasUse[0].remainingBar).toBeLessThan(50)
    expect(low.warnings.map((w) => w.code)).toContain('gas-reserve')
  })

  it('powietrze na dużej wysokości nie daje fałszywego alarmu', () => {
    const r = planDive(dive(12, 20, {}, { altitude: 2500, water: 'fresh' }))
    expect(r.warnings.filter((w) => w.level === 'danger')).toEqual([])
  })

  it('nurek niezaaklimatyzowany do wysokości ma krótszy limit', () => {
    const at = (acclimatized: boolean) =>
      planDive(dive(18, 20, {}, { altitude: 2500, water: 'fresh', acclimatized })).ndl
    expect(at(false)).toBeLessThan(at(true))
  })

  it('ppO2: książkowe głębokości mieszczą się w limicie, wyraźne przekroczenie nie', () => {
    const codes = (d: number, p: number) =>
      planDive(dive(d, 10, { bottom: cyl(p) })).warnings.map((w) => w.code)
    expect(codes(25, 40)).not.toContain('ppo2-bottom')
    expect(codes(27, 40)).toContain('ppo2-bottom')
  })

  it('CNS powyżej 1,6 bara rośnie szybciej niż przy 1,6', () => {
    expect(cnsLimitMinutes(1.62)).toBeLessThan(45)
    expect(cnsLimitMinutes(1.62)).toBeCloseTo(30, 6)
    expect(cnsLimitMinutes(2.0)).toBe(1)
  })
})
