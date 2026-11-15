import { Badge, Card, Input } from '@bighat/ui'
import {
  gasSettingsError,
  planGas,
  type GasProfile,
  type GasSettings,
  type GasWarning,
} from '../tables/gasPlan'
import { parseNumber } from './format'
import { Stats } from './Stats'

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

const FIELDS: { key: keyof GasSettings; label: string }[] = [
  { key: 'volume', label: 'Butla (l)' },
  { key: 'pressure', label: 'Ciśnienie (bar)' },
  { key: 'sac', label: 'Zużycie SAC (l/min)' },
  { key: 'stressSac', label: 'Zużycie awaryjne (l/min)' },
  { key: 'reserve', label: 'Rezerwa (bar)' },
]

export function GasSettingsCard({ form, onChange }: { form: GasForm; onChange: (form: GasForm) => void }) {
  const error = gasSettingsError(parseGas(form))
  return (
    <Card ariaLabel="Butla i zużycie gazu">
      <div className="sr-stack">
        <h2 className="sr-heading">Butla i zużycie gazu</h2>
        <div className="sr-fields">
          {FIELDS.map(({ key, label }) => (
            <Input
              key={key}
              label={label}
              type="number"
              inputMode="decimal"
              min={0}
              value={form[key]}
              onChange={(e) => onChange({ ...form, [key]: e.target.value })}
            />
          ))}
        </div>
        <p className="sr-note">
          {error
            ? `${error}, żeby zobaczyć zużycie gazu przy nurkowaniach.`
            : 'Każde nurkowanie liczone jest z pełnej butli. Cały czas denny liczony na największej głębokości, wynurzanie 10 m/min.'}
        </p>
      </div>
    </Card>
  )
}

const WARNINGS: Record<GasWarning, { tone: 'critical' | 'warning'; text: string }> = {
  insufficient: { tone: 'critical', text: 'Za mało gazu na to nurkowanie' },
  'below-reserve': { tone: 'warning', text: 'Wynurzenie poniżej rezerwy' },
  'below-minimum-gas': { tone: 'warning', text: 'Na dnie mniej niż minimum gas' },
}

const bar = (value: number) => `${Math.round(value)} bar`

/** Zużycie gazu dla jednego nurkowania; nic nie pokazuje, gdy ustawienia są niepełne. */
export function GasResult({ profile, form }: { profile: GasProfile; form: GasForm }) {
  const gas = parseGas(form)
  if (gasSettingsError(gas)) return null
  const plan = planGas(profile, gas)
  return (
    <div className="sr-stack">
      <Stats
        items={[
          { label: 'Zużycie (bar)', value: String(Math.round(plan.usedBar)) },
          { label: 'Zostanie (bar)', value: String(Math.round(plan.remainingBar)) },
          { label: 'Min. gas (bar)', value: String(Math.round(plan.minGasBar)) },
        ]}
      />
      <div className="sr-row">
        {plan.warnings.length === 0 ? (
          <Badge tone="success">Gazu wystarczy z rezerwą</Badge>
        ) : (
          plan.warnings.map((w) => (
            <Badge key={w} tone={WARNINGS[w].tone}>
              {WARNINGS[w].text}
            </Badge>
          ))
        )}
      </div>
      <p className="sr-note">
        Minimum gas to ciśnienie potrzebne na awaryjne wynurzenie dwóch nurków z jednej butli.
        Wynurzanie zacznij najpóźniej przy {bar(Math.max(plan.minGasBar, gas.reserve))}.
      </p>
    </div>
  )
}
