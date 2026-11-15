import { describe, expect, it } from 'vitest'
import { DEFAULT_GAS, gasSettingsError, planGas } from './gasPlan'

const safety = [{ depth: 5, minutes: 3 }]

describe('planowanie gazu', () => {
  it('18 m / 40 min, butla 15 l / 200 bar, SAC 20: obliczenie ręczne', () => {
    const p = planGas({ depth: 18, time: 40, stops: safety, ascentRate: 10 }, DEFAULT_GAS)
    // dno: 20 l/min × 2,8 ata × 40 min
    expect(p.bottomLiters).toBeCloseTo(2240, 6)
    // wynurzenie: 1,8 min × 1,9 ata + 3 min × 1,5 ata = 7,92 „ata·min" × 20 l/min
    expect(p.ascentLiters).toBeCloseTo(158.4, 6)
    expect(p.usedBar).toBeCloseTo(2398.4 / 15, 6)
    expect(p.remainingBar).toBeCloseTo(200 - 2398.4 / 15, 6)
    expect(p.atAscentBar).toBeCloseTo((3000 - 2240) / 15, 6)
    // minimum gas: 2 × 30 l/min × (2,8 + 7,92)
    expect(p.minGasBar).toBeCloseTo((2 * 30 * 10.72) / 15, 6)
    expect(p.warnings).toEqual(['below-reserve'])
  })

  it('krótkie płytkie nurkowanie mieści się z zapasem', () => {
    const p = planGas({ depth: 12, time: 30, stops: safety, ascentRate: 10 }, DEFAULT_GAS)
    expect(p.remainingBar).toBeGreaterThan(50)
    expect(p.warnings).toEqual([])
  })

  it('za mało gazu i wynurzenie poniżej minimum gas', () => {
    const p = planGas({ depth: 30, time: 40, stops: safety, ascentRate: 10 }, DEFAULT_GAS)
    expect(p.remainingBar).toBeLessThan(0)
    expect(p.warnings).toEqual(['insufficient', 'below-minimum-gas'])
  })

  it('przystanki dekompresyjne zwiększają zużycie i minimum gas', () => {
    const profile = { depth: 30, time: 25, ascentRate: 10 }
    const none = planGas({ ...profile, stops: [] }, DEFAULT_GAS)
    const deco = planGas({ ...profile, stops: [{ depth: 3, minutes: 3 }] }, DEFAULT_GAS)
    expect(deco.ascentLiters - none.ascentLiters).toBeCloseTo(20 * 3 * 1.3, 6)
    expect(deco.minGasBar).toBeGreaterThan(none.minGasBar)
  })

  it('większa butla to mniejsze zużycie w barach, ta sama liczba litrów', () => {
    const profile = { depth: 20, time: 30, stops: safety, ascentRate: 10 }
    const small = planGas(profile, { ...DEFAULT_GAS, volume: 10 })
    const big = planGas(profile, { ...DEFAULT_GAS, volume: 15 })
    expect(small.bottomLiters).toBe(big.bottomLiters)
    expect(small.usedBar).toBeCloseTo(big.usedBar * 1.5, 6)
  })

  it('sprawdza ustawienia', () => {
    expect(gasSettingsError(DEFAULT_GAS)).toBeNull()
    expect(gasSettingsError({ ...DEFAULT_GAS, volume: 0 })).not.toBeNull()
    expect(gasSettingsError({ ...DEFAULT_GAS, sac: NaN })).not.toBeNull()
  })
})
