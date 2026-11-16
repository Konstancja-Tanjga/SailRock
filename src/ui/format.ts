import type { Dictionary } from '../i18n/pl'

/** Liczba z pola tekstowego; NaN dla pustego lub błędnego wpisu. */
export function parseNumber(text: string): number {
  if (text.trim() === '') return NaN
  return Number(text.replace(',', '.'))
}

/** Minuty jako „1 h 10 min" albo „45 min". */
export function formatMinutes(minutes: number, t: Dictionary): string {
  const h = Math.floor(minutes / 60)
  return t.duration(h, Math.round(minutes - h * 60))
}

/** Minuty od północy dla wpisu „GG:MM"; NaN dla pustego lub błędnego. */
function clockMinutes(text: string | undefined): number {
  const match = /^(\d{1,2}):(\d{2})$/.exec(text ?? '')
  if (!match) return NaN
  return Number(match[1]) * 60 + Number(match[2])
}

/**
 * Przerwa na powierzchni w minutach między końcem jednego nurkowania a początkiem następnego.
 * Początek wcześniejszy niż koniec oznacza nurkowanie po północy. NaN, gdy brakuje godziny.
 */
export function surfaceInterval(end: string | undefined, start: string | undefined): number {
  const diff = clockMinutes(start) - clockMinutes(end)
  return diff < 0 ? diff + 24 * 60 : diff
}

/** Tekst błędu planera w języku interfejsu. */
export function errorText(error: unknown, t: Dictionary): string {
  if (error && typeof error === 'object' && 'info' in error) {
    return t.planError((error as { info: Parameters<Dictionary['planError']>[0] }).info)
  }
  return error instanceof Error ? error.message : String(error)
}
