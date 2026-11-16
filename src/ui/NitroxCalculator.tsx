import { Badge, Card, DescriptionList, Input, StateBlock } from '@bighat/ui'
import { useI18n } from '../i18n/context'
import { parseNumber } from './format'
import { usePersistentState } from './usePersistentState'

/** Jak na kartach RDP: 10 m wody = 1 ata, na powierzchni 1 ata. */
const ata = (depth: number) => depth / 10 + 1
const mod = (fO2: number, ppO2: number) => (ppO2 / fO2 - 1) * 10
const ead = (fO2: number, depth: number) => ((1 - fO2) / 0.79) * (depth + 10) - 10
const bestMix = (depth: number, ppO2: number) =>
  Math.max(21, Math.min(100, Math.floor((ppO2 / ata(depth)) * 100 + 1e-9)))

export function NitroxCalculator() {
  const { t } = useI18n()
  const [form, setForm] = usePersistentState('sailrock.nitrox', { oxygen: '32', depth: '' })
  const percent = parseNumber(form.oxygen)
  const depth = parseNumber(form.depth)
  const validMix = percent >= 21 && percent <= 100
  const fO2 = percent / 100
  const ppO2 = validMix && depth > 0 ? fO2 * ata(depth) : NaN

  return (
    <div className="sr-stack-loose">
      <p className="sr-text">{t.nitrox.intro}</p>
      <Card ariaLabel={t.nitrox.card}>
        <div className="sr-stack">
          <div className="sr-fields">
            <Input
              label={t.nitrox.oxygen}
              type="number"
              inputMode="numeric"
              min={21}
              max={100}
              value={form.oxygen}
              onChange={(e) => setForm({ ...form, oxygen: e.target.value })}
              error={form.oxygen !== '' && !validMix ? t.nitrox.oxygenError : undefined}
            />
            <Input
              label={t.nitrox.depth}
              type="number"
              inputMode="decimal"
              min={1}
              value={form.depth}
              onChange={(e) => setForm({ ...form, depth: e.target.value })}
            />
          </div>
          <p className="sr-note">{t.nitrox.depthNote}</p>
          {validMix ? (
            <div className="sr-stack">
              {Number.isFinite(ppO2) && (
                <div className="sr-row">
                  <Badge tone={ppO2 > 1.6 ? 'critical' : ppO2 > 1.4 ? 'warning' : 'success'}>
                    {ppO2 > 1.6 ? t.nitrox.over16 : ppO2 > 1.4 ? t.nitrox.over14 : t.nitrox.within}
                  </Badge>
                </div>
              )}
              <DescriptionList
                density="compact"
                ariaLabel={t.nitrox.results}
                items={[
                  { term: t.nitrox.mod14, value: `${t.number(mod(fO2, 1.4), 1)} m` },
                  { term: t.nitrox.mod16, value: `${t.number(mod(fO2, 1.6), 1)} m` },
                  ...(Number.isFinite(ppO2)
                    ? [
                        { term: t.nitrox.ppO2, value: `${t.number(ppO2, 2)} ata` },
                        { term: t.nitrox.ead, value: `${t.number(Math.max(0, ead(fO2, depth)), 1)} m` },
                        { term: t.nitrox.best, value: t.nitrox.bestValue(bestMix(depth, 1.4)) },
                      ]
                    : []),
                ]}
              />
            </div>
          ) : (
            <StateBlock state="empty" scope="inline" title={t.nitrox.emptyTitle} description={t.nitrox.emptyHint} />
          )}
        </div>
      </Card>
    </div>
  )
}
