import { Badge, Card, Input } from '@bighat/ui'
import { useI18n } from '../i18n/context'
import { gasSettingsError, planGas, type GasProfile, type GasSettings, type GasWarning } from '../tables/gasPlan'
import { parseGas, type GasForm } from './gasForm'
import { Stats } from './Stats'

const FIELDS: (keyof GasSettings)[] = ['volume', 'pressure', 'sac', 'stressSac', 'reserve']

export function GasSettingsCard({ form, onChange }: { form: GasForm; onChange: (form: GasForm) => void }) {
  const { t } = useI18n()
  const problem = gasSettingsError(parseGas(form))
  return (
    <Card ariaLabel={t.gas.title}>
      <div className="sr-stack">
        <h2 className="sr-heading">{t.gas.title}</h2>
        <div className="sr-fields">
          {FIELDS.map((key) => (
            <Input
              key={key}
              label={t.gas.fields[key]}
              type="number"
              inputMode="decimal"
              min={0}
              value={form[key]}
              onChange={(e) => onChange({ ...form, [key]: e.target.value })}
            />
          ))}
        </div>
        <p className="sr-note">{problem ? t.gas.problems[problem] : t.gas.note}</p>
      </div>
    </Card>
  )
}

const TONES: Record<GasWarning, 'critical' | 'warning'> = {
  insufficient: 'critical',
  'below-reserve': 'warning',
  'below-minimum-gas': 'warning',
}

/** Zużycie gazu dla jednego nurkowania; nic nie pokazuje, gdy ustawienia są niepełne. */
export function GasResult({ profile, form }: { profile: GasProfile; form: GasForm }) {
  const { t } = useI18n()
  const gas = parseGas(form)
  if (gasSettingsError(gas)) return null
  const plan = planGas(profile, gas)
  return (
    <div className="sr-stack">
      <Stats
        items={[
          { label: t.gas.used, value: String(Math.round(plan.usedBar)) },
          { label: t.gas.left, value: String(Math.round(plan.remainingBar)) },
          { label: t.gas.minimum, value: String(Math.round(plan.minGasBar)) },
        ]}
      />
      <div className="sr-row">
        {plan.warnings.length === 0 ? (
          <Badge tone="success">{t.gas.enough}</Badge>
        ) : (
          plan.warnings.map((w) => (
            <Badge key={w} tone={TONES[w]}>
              {t.gas.warnings[w]}
            </Badge>
          ))
        )}
      </div>
      <p className="sr-note">{t.gas.explain(Math.round(Math.max(plan.minGasBar, gas.reserve)))}</p>
    </div>
  )
}
