import {
  Badge,
  Button,
  Card,
  DescriptionList,
  Input,
  SegmentedControl,
  StateBlock,
  Switch,
} from '@bighat/ui'
import type { DescriptionItem } from '@bighat/ui'
import {
  ASCENT_RATE_MAX,
  SAFETY_STOP,
  planRdpDay,
  type RdpDive,
  type RdpDiveResult,
  type RdpTable,
  type RdpWarning,
} from '../tables/rdp'
import { RDP_AIR, RDP_EAN32, RDP_EAN36, RDP_SURFACE } from '../tables/rdpData'
import { useState } from 'react'
import { formatDecimal, parseNumber } from './format'
import { GasResult, GasSettingsCard, type GasForm } from './GasSection'
import { SavedPlans } from './SavedPlans'
import { Stats } from './Stats'
import { usePersistentState } from './usePersistentState'

type DiveForm = { depth: string; time: string; hours: string; minutes: string; cold: boolean }

type Outcome =
  | { status: 'empty' }
  | { status: 'blocked' }
  | { status: 'error'; message: string }
  | { status: 'ok'; result: RdpDiveResult; dive: RdpDive }

const EMPTY: DiveForm = { depth: '', time: '', hours: '1', minutes: '0', cold: false }

const TABLES: Record<string, RdpTable> = { air: RDP_AIR, ean32: RDP_EAN32, ean36: RDP_EAN36 }

const WARNINGS: Record<RdpWarning, string> = {
  'deeper-than-previous': 'Nurkowanie powtórzeniowe jest głębsze niż poprzednie; planuj od najgłębszego.',
  'repetitive-deeper-than-30': 'Nurkowania powtórzeniowe ogranicz do 30 m lub płycej.',
  'deeper-than-40': 'Nie nurkuj głębiej niż 40 m; 42 m jest w tabeli tylko na sytuacje awaryjne.',
  'wx-interval':
    'Po grupie W lub X minimalna przerwa między wszystkimi kolejnymi nurkowaniami to 1 godzina.',
  'yz-interval':
    'Po grupie Y lub Z minimalna przerwa między wszystkimi kolejnymi nurkowaniami to 3 godziny.',
  'continuity-only-depth':
    'Ta głębokość jest w tabeli tylko dla ciągłości planowania: ciśnienie parcjalne tlenu przekracza 1,4 ata.',
  'at-limit': 'Plan sięga limitu bezdekompresyjnego. Nigdy nie nurkuj do granic tabeli.',
}

function plan(table: RdpTable, dives: DiveForm[]): Outcome[] {
  const parsed: (RdpDive | null)[] = dives.map((d, i) => {
    const depth = parseNumber(d.depth)
    const time = parseNumber(d.time)
    const interval = parseNumber(d.hours || '0') * 60 + parseNumber(d.minutes || '0')
    if (!(depth > 0) || !(time > 0) || (i > 0 && !(interval >= 0))) return null
    return { depth, time, surfaceInterval: interval, cold: d.cold }
  })
  const outcomes: Outcome[] = []
  parsed.forEach((dive, i) => {
    if (!dive) return outcomes.push({ status: 'empty' })
    if (i > 0 && outcomes[i - 1].status !== 'ok') return outcomes.push({ status: 'blocked' })
    try {
      const day = planRdpDay(table, RDP_SURFACE, parsed.slice(0, i + 1) as RdpDive[])
      outcomes.push({ status: 'ok', result: day[i], dive })
    } catch (error) {
      outcomes.push({ status: 'error', message: error instanceof Error ? error.message : String(error) })
    }
  })
  return outcomes
}

function Result({
  result: r,
  dive,
  table,
  gas,
}: {
  result: RdpDiveResult
  dive: RdpDive
  table: RdpTable
  gas: GasForm
}) {
  const items: DescriptionItem[] = [
    { term: 'Głębokość w tabeli', value: `${r.tableDepth} m` },
    { term: 'Limit bezdekompresyjny', value: `${r.noDecoLimit} min` },
    { term: 'Przystanek bezpieczeństwa', value: `${SAFETY_STOP.minutes} min na ${SAFETY_STOP.depth} m` },
  ]
  if (r.groupBefore !== null) {
    items.push(
      { term: 'Grupa po przerwie', value: r.groupBefore },
      { term: 'Czas azotu resztkowego', value: `${r.residualNitrogenTime} min` },
      { term: 'Zaktualizowany limit', value: `${r.adjustedNoDecoLimit} min` },
      { term: 'Czas łączny (rzeczywisty + resztkowy)', value: `${r.totalBottomTime} min` },
    )
  }
  if (table.fO2 > 0.21) {
    const ppO2 = table.fO2 * (r.tableDepth / 10 + 1)
    items.push({ term: 'Ciśnienie parcjalne tlenu', value: `${formatDecimal(ppO2, 2)} ata` })
  }
  const left = r.adjustedNoDecoLimit - dive.time
  return (
    <div className="sr-stack">
      <Stats
        items={[
          { label: 'Zapas', value: `${left} min` },
          { label: 'Maks. czas', value: `${r.adjustedNoDecoLimit} min` },
          { label: 'Grupa', value: r.groupAfter },
        ]}
      />
      <div className="sr-row">
        <Badge tone={r.safetyStop ? 'warning' : 'success'}>
          {r.safetyStop ? 'Przystanek bezpieczeństwa wymagany' : 'Przystanek bezpieczeństwa zalecany'}
        </Badge>
        {left === 0 && <Badge tone="critical">Na granicy limitu</Badge>}
      </div>
      <DescriptionList items={items} density="compact" ariaLabel="Szczegóły odczytu" />
      <GasResult
        form={gas}
        profile={{
          depth: dive.depth,
          time: dive.time,
          stops: dive.depth > SAFETY_STOP.depth ? [SAFETY_STOP] : [],
          ascentRate: 10,
        }}
      />
      {r.warnings.length > 0 && (
        <ul className="sr-list">
          {r.warnings.map((w) => (
            <li key={w}>{WARNINGS[w]}</li>
          ))}
        </ul>
      )}
    </div>
  )
}

export function RdpPlanner({
  gasForm,
  onGasChange,
}: {
  gasForm: GasForm
  onGasChange: (gas: GasForm) => void
}) {
  const [undo, setUndo] = useState<DiveForm[] | null>(null)
  const [gas, setGas] = usePersistentState('sailrock.rdp.gas', 'air')
  const [dives, setDives] = usePersistentState<DiveForm[]>('sailrock.rdp', [EMPTY])
  const table = TABLES[gas] ?? RDP_AIR
  const outcomes = plan(table, dives)
  const update = (i: number, patch: Partial<DiveForm>) =>
    setDives(dives.map((d, k) => (k === i ? { ...d, ...patch } : d)))
  const maxDepth = table.depths[table.depths.length - 1]

  return (
    <div className="sr-stack-loose">
      <p className="sr-text">
        Planer nurkowania rekreacyjnego (RDP) tylko dla nurkowań bezdekompresyjnych. Wynurzaj się
        nie szybciej niż {ASCENT_RATE_MAX} m/min. Każde nurkowanie powtórzeniowe planuj płycej niż
        poprzednie.
      </p>
      <SegmentedControl
        legend="Gaz"
        showLegend
        fullWidth
        value={gas}
        onChange={setGas}
        options={[
          { value: 'air', label: 'Powietrze' },
          { value: 'ean32', label: 'EANx32' },
          { value: 'ean36', label: 'EANx36' },
        ]}
      />
      {dives.map((dive, i) => {
        const outcome = outcomes[i]
        return (
          <Card key={i} ariaLabel={`Nurkowanie ${i + 1}`}>
            <div className="sr-stack">
              <div className="sr-row-spread">
                <h2 className="sr-heading">Nurkowanie {i + 1}</h2>
                {dives.length > 1 && (
                  <Button
                    variant="ghost"
                    tone="critical"
                    size="sm"
                    aria-label={`Usuń nurkowanie ${i + 1}`}
                    onClick={() => {
                      setUndo(dives)
                      setDives(dives.filter((_, k) => k !== i))
                    }}
                  >
                    Usuń
                  </Button>
                )}
              </div>
              {i > 0 && (
                <div className="sr-fields" role="group" aria-label="Przerwa na powierzchni">
                  <Input
                    label="Przerwa: godziny"
                    type="number"
                    inputMode="numeric"
                    min={0}
                    value={dive.hours}
                    onChange={(e) => update(i, { hours: e.target.value })}
                  />
                  <Input
                    label="Przerwa: minuty"
                    type="number"
                    inputMode="numeric"
                    min={0}
                    max={59}
                    value={dive.minutes}
                    onChange={(e) => update(i, { minutes: e.target.value })}
                  />
                </div>
              )}
              <div className="sr-fields">
                <Input
                  label="Głębokość (m)"
                  type="number"
                  inputMode="decimal"
                  min={1}
                  max={maxDepth}
                  value={dive.depth}
                  onChange={(e) => update(i, { depth: e.target.value })}
                />
                <Input
                  label="Czas denny (min)"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  value={dive.time}
                  onChange={(e) => update(i, { time: e.target.value })}
                />
              </div>
              <Switch
                label="Zimna woda lub trudne warunki"
                description="Plan liczony jak dla głębokości o 4 m większej."
                checked={dive.cold}
                onChange={(cold) => update(i, { cold })}
              />
              {outcome.status === 'ok' && (
                <Result result={outcome.result} dive={outcome.dive} table={table} gas={gasForm} />
              )}
              {outcome.status === 'empty' && (
                <StateBlock
                  state="empty"
                  scope="inline"
                  title="Podaj głębokość i czas"
                  description="Wynik pojawi się od razu po wpisaniu obu wartości."
                />
              )}
              {outcome.status === 'blocked' && (
                <StateBlock
                  state="empty"
                  scope="inline"
                  title="Najpierw popraw poprzednie nurkowanie"
                  description="Nurkowanie powtórzeniowe liczy się od grupy ciśnieniowej poprzedniego."
                />
              )}
              {outcome.status === 'error' && (
                <StateBlock
                  state="error"
                  scope="inline"
                  title="Plan wychodzi poza tabelę RDP"
                  description={`${outcome.message}. RDP nie służy do planowania nurkowań dekompresyjnych: skróć czas, zmniejsz głębokość albo wydłuż przerwę.`}
                />
              )}
            </div>
          </Card>
        )
      })}
      <div className="sr-row">
        <Button variant="secondary" onClick={() => setDives([...dives, EMPTY])}>
          Dodaj nurkowanie powtórzeniowe
        </Button>
        <Button
          variant="ghost"
          onClick={() => {
            setUndo(dives)
            setDives([EMPTY])
          }}
        >
          Wyczyść plan
        </Button>
      </div>
      {undo && (
        <div className="sr-row" role="status">
          <p className="sr-text">Plan został zmieniony.</p>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setDives(undo)
              setUndo(null)
            }}
          >
            Cofnij ostatnią zmianę
          </Button>
        </div>
      )}
      <GasSettingsCard form={gasForm} onChange={onGasChange} />
      <SavedPlans<{ gas: string; dives: DiveForm[] }>
        storageKey="sailrock.saved.rdp"
        current={{ gas, dives }}
        canSave={outcomes.some((o) => o.status === 'ok')}
        summary={(saved) =>
          `${(TABLES[saved.gas] ?? RDP_AIR).name.replace('RDP ', '')}: ` +
          saved.dives
            .filter((d) => d.depth && d.time)
            .map((d) => `${d.depth} m / ${d.time} min`)
            .join(', ')
        }
        onLoad={(saved) => {
          setUndo(dives)
          setGas(saved.gas)
          setDives(saved.dives)
        }}
      />
    </div>
  )
}
