/** Liczba z pola tekstowego; NaN dla pustego lub błędnego wpisu. */
export function parseNumber(text: string): number {
  if (text.trim() === '') return NaN
  return Number(text.replace(',', '.'))
}

/** Minuty jako „1 h 10 min" albo „45 min". */
export function formatMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = Math.round(minutes - h * 60)
  if (h === 0) return `${m} min`
  return m === 0 ? `${h} h` : `${h} h ${m} min`
}

export function formatDecimal(value: number, digits = 1): string {
  return value.toFixed(digits).replace('.', ',')
}
