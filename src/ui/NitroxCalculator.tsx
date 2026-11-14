import { Badge, Card, DescriptionList, Input, StateBlock } from '@bighat/ui'
import { formatDecimal, parseNumber } from './format'
import { usePersistentState } from './usePersistentState'

/** Jak na kartach RDP: 10 m wody = 1 ata, na powierzchni 1 ata. */
const ata = (depth: number) => depth / 10 + 1
const mod = (fO2: number, ppO2: number) => (ppO2 / fO2 - 1) * 10
const ead = (fO2: number, depth: number) => ((1 - fO2) / 0.79) * (depth + 10) - 10
const bestMix = (depth: number, ppO2: number) =>
  Math.max(21, Math.min(100, Math.floor((ppO2 / ata(depth)) * 100 + 1e-9)))

export function NitroxCalculator() {
  const [form, setForm] = usePersistentState('sailrock.nitrox', { oxygen: '32', depth: '' })
  const percent = parseNumber(form.oxygen)
  const depth = parseNumber(form.depth)
  const validMix = percent >= 21 && percent <= 100
  const fO2 = percent / 100
  const ppO2 = validMix && depth > 0 ? fO2 * ata(depth) : NaN

  return (
    <div className="sr-stack-loose">
      <p className="sr-text">
        Obliczenia dla nitroksu przy założeniu 10 m wody = 1 ata. Limit roboczy ciśnienia
        parcjalnego tlenu to 1,4 ata, limit awaryjny 1,6 ata.
      </p>
      <Card ariaLabel="Kalkulator nitroksu">
        <div className="sr-stack">
          <div className="sr-fields">
            <Input
              label="Tlen w mieszance (%)"
              type="number"
              inputMode="numeric"
              min={21}
              max={100}
              value={form.oxygen}
              onChange={(e) => setForm({ ...form, oxygen: e.target.value })}
              error={
                form.oxygen !== '' && !validMix ? 'Podaj wartość od 21 do 100%' : undefined
              }
            />
            <Input
              label="Planowana głębokość (m)"
              type="number"
              inputMode="decimal"
              min={1}
              value={form.depth}
              onChange={(e) => setForm({ ...form, depth: e.target.value })}
            />
          </div>
          <p className="sr-note">
            Głębokość jest opcjonalna: służy do policzenia ciśnienia parcjalnego tlenu i EAD.
          </p>
          {validMix ? (
            <div className="sr-stack">
              {Number.isFinite(ppO2) && (
                <div className="sr-row">
                  <Badge tone={ppO2 > 1.6 ? 'critical' : ppO2 > 1.4 ? 'warning' : 'success'}>
                    {ppO2 > 1.6
                      ? 'Ponad limit awaryjny 1,6 ata'
                      : ppO2 > 1.4
                        ? 'Ponad limit roboczy 1,4 ata'
                        : 'W limicie 1,4 ata'}
                  </Badge>
                </div>
              )}
              <DescriptionList
                density="compact"
                ariaLabel="Wyniki dla mieszanki"
                items={[
                  { term: 'Maks. głębokość przy 1,4 ata', value: `${formatDecimal(mod(fO2, 1.4))} m` },
                  { term: 'Maks. głębokość przy 1,6 ata', value: `${formatDecimal(mod(fO2, 1.6))} m` },
                  ...(Number.isFinite(ppO2)
                    ? [
                        { term: 'Ciśnienie parcjalne tlenu', value: `${formatDecimal(ppO2, 2)} ata` },
                        {
                          term: 'Równoważna głębokość powietrzna (EAD)',
                          value: `${formatDecimal(Math.max(0, ead(fO2, depth)))} m`,
                        },
                        {
                          term: 'Najbogatsza mieszanka na tę głębokość (1,4 ata)',
                          value: `${bestMix(depth, 1.4)}% tlenu`,
                        },
                      ]
                    : []),
                ]}
              />
            </div>
          ) : (
            <StateBlock
              state="empty"
              scope="inline"
              title="Podaj zawartość tlenu"
              description="Powietrze to 21%, najczęstsze nitroksy to 32% i 36%."
            />
          )}
        </div>
      </Card>
    </div>
  )
}
