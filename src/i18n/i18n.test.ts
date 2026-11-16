import { describe, expect, it } from 'vitest'
import type { PlanErrorInfo } from '../tables/errors'
import { OutOfTableError, lookup } from '../tables/tablePlanner'
import { en } from './en'
import { pl } from './pl'

const samples: PlanErrorInfo[] = [
  { code: 'depth-nonpositive' },
  { code: 'time-nonpositive' },
  { code: 'depth-range', depth: 70, max: 63 },
  { code: 'time-range', time: 95, tableDepth: 18, max: 90 },
  { code: 'penalty', time: 90, penalty: 44, inner: { code: 'time-range', time: 134, tableDepth: 18, max: 90 } },
  { code: 'over-limit', time: 60, limit: 56, tableDepth: 18 },
  { code: 'dive-over-limit', dive: 2, time: 30, residual: 30, limit: 56, tableDepth: 18 },
  { code: 'group-at-depth', group: 'Z', tableDepth: 40 },
  { code: 'unknown-group', group: '?' },
  { code: 'no-transition', from: 'A', to: 'Z' },
]

describe('słowniki', () => {
  it('każdy błąd planera ma tekst w obu językach, a teksty się różnią', () => {
    for (const info of samples) {
      expect(pl.planError(info).length).toBeGreaterThan(10)
      expect(en.planError(info).length).toBeGreaterThan(10)
      expect(en.planError(info)).not.toBe(pl.planError(info))
    }
  })

  it('błąd rzucony przez planer niesie dane do przetłumaczenia', () => {
    try {
      lookup(18, 95)
      throw new Error('powinno rzucić')
    } catch (error) {
      expect(error).toBeInstanceOf(OutOfTableError)
      const info = (error as OutOfTableError).info
      expect(info).toEqual({ code: 'time-range', time: 95, tableDepth: 18, max: 90 })
      expect(en.planError(info)).toBe('95 min is longer than the table goes for 18 m (90 min at most)')
      expect(pl.planError(info)).toBe((error as Error).message)
    }
  })

  it('liczby: przecinek po polsku, kropka po angielsku', () => {
    expect(pl.number(1.28, 2)).toBe('1,28')
    expect(en.number(1.28, 2)).toBe('1.28')
  })

  it('oba słowniki mają te same klucze', () => {
    const keys = (o: object, prefix = ''): string[] =>
      Object.entries(o).flatMap(([k, v]) =>
        v && typeof v === 'object' && !Array.isArray(v) ? keys(v, `${prefix}${k}.`) : [`${prefix}${k}`],
      )
    expect(keys(en)).toEqual(keys(pl))
  })
})
