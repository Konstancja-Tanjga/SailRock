import { gasSettingsError, planGas, type GasProfile, type GasSettings } from '../tables/gasPlan'
import { parseNumber } from './format'

export type GasForm = Record<keyof GasSettings, string>

export const DEFAULT_GAS_FORM: GasForm = {
  volume: '15',
  pressure: '200',
  sac: '20',
  stressSac: '30',
  reserve: '50',
}

export function parseGas(form: GasForm): GasSettings {
  return {
    volume: parseNumber(form.volume),
    pressure: parseNumber(form.pressure),
    sac: parseNumber(form.sac),
    stressSac: parseNumber(form.stressSac),
    reserve: parseNumber(form.reserve),
  }
}

/** Ciśnienie, przy którym najpóźniej trzeba zacząć wynurzanie; null, gdy ustawienia są niepełne. */
export function turnPressure(profile: GasProfile, form: GasForm): number | null {
  const gas = parseGas(form)
  if (gasSettingsError(gas)) return null
  return Math.round(Math.max(planGas(profile, gas).minGasBar, gas.reserve))
}
