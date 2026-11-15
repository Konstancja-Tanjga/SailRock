import { Badge, Button, Card, DescriptionList, Input, StateBlock, Table } from '@bighat/ui'
import type { DescriptionItem } from '@bighat/ui'
import { ASCENT_RATE } from '../tables/buhlmannHahn0_250'
import {
  lookup,
  lookupRepetitive,
  type RepetitivePlan,
  type TablePlan,
  type TableStop,
} from '../tables/tablePlanner'
import { formatMinutes, parseNumber } from './format'
import { GasResult, GasSettingsCard, type GasForm } from './GasSection'
import { SavedPlans } from './SavedPlans'
import { Stats } from './Stats'
import { useState } from 'react'
import { usePersistentState } from './usePersistentState'

type DiveForm = { depth: string; time: string; hours: string; minutes: string }

type Outcome =
  | { status: 'empty' }
  | { status: 'blocked' }
  | { status: 'error'; message: string }
  | { status: 'ok'; plan: TablePlan | RepetitivePlan }

const EMPTY: DiveForm = { depth: '', time: '', hours: '1', minutes: '0' }

function plan(dives: DiveForm[]): Outcome[] {
  const outcomes: Outcome[] = []
  dives.forEach((dive, i) => {
    const depth = parseNumber(dive.depth)
    const time = parseNumber(dive.time)
    const interval = parseNumber(dive.hours || '0') * 60 + parseNumber(dive.minutes || '0')
    if (!(depth > 0) || !(time > 0) || (i > 0 && !(interval >= 0))) {
      outcomes.push({ status: 'empty' })
      return
    }
    const previous = i > 0 ? outcomes[i - 1] : null
    if (previous && previous.status !== 'ok') {
      outcomes.push({ status: 'blocked' })
      return
    }
    try {
      outcomes.push({
        status: 'ok',
        plan: previous ? lookupRepetitive(previous.plan, interval, depth, time) : lookup(depth, time),
      })
    } catch (error) {
      outcomes.push({ status: 'error', message: error instanceof Error ? error.message : String(error) })
    }
  })
  return outcomes
}

function penaltyText(p: RepetitivePlan): string {
  if (p.penalty.kind === 'first') return '0 min — przerwa na tyle długa, że to nurkowanie liczy się jako pierwsze'
  if (p.penalty.kind === 'previous')
    return `${p.penalty.minutes} min — przerwa krótsza niż najmniejsza w tabeli, dodany czas poprzedniego nurkowania`
  return `${p.penalty.minutes} min`
}

function Result({ plan: p, gas }: { plan: TablePlan | RepetitivePlan; gas: GasForm }) {
  const ascent = Math.ceil(p.depth / ASCENT_RATE) + p.decoTime
  const items: DescriptionItem[] = [
    { term: 'Odczyt z tabeli', value: `${p.tableDepth} m / ${p.tableTime} min` },
    { term: 'Czas bezdekompresyjny', value: `${p.noStop} min` },
  ]
  if ('penalty' in p) {
    items.push({ term: 'Zwiększenie czasu podstawowego', value: penaltyText(p), wide: true })
  }
  items.push({ term: 'Wynurzenie', value: `${ASCENT_RATE} m/min + przystanki` })
  const beyond = p.tableDepth > 30 || p.decoTime > 0
  return (
    <div className="sr-stack">
      <Stats
        items={[
          { label: 'Dekompresja', value: p.decoTime > 0 ? `${p.decoTime} min` : 'brak' },
          { label: 'Wynurzenie', value: formatMinutes(ascent) },
          { label: 'Grupa', value: p.group },
        ]}
      />
      <div className="sr-row">
        <Badge tone={p.decoTime > 0 ? 'warning' : 'success'}>
          {p.decoTime > 0 ? 'Nurkowanie dekompresyjne' : 'Bez przystanków dekompresyjnych'}
        </Badge>
        {beyond && <Badge tone="warning">Poza uprawnieniami AOWD + nitrox</Badge>}
      </div>
      {p.stops.length > 0 && (
        <Table<TableStop>
          caption="Przystanki dekompresyjne"
          columns={[
            { key: 'depth', header: 'Głębokość', cell: (s) => `${s.depth} m` },
            { key: 'minutes', header: 'Czas', cell: (s) => `${s.minutes} min`, numeric: true },
          ]}
          rows={p.stops}
          rowKey={(s) => String(s.depth)}
          density="compact"
          responsive="scroll"
        />
      )}
      <DescriptionList items={items} density="compact" ariaLabel="Szczegóły odczytu" />
      <GasResult
        form={gas}
        profile={{ depth: p.depth, time: p.time, stops: p.stops, ascentRate: ASCENT_RATE }}
      />
      {beyond && (
        <p className="sr-note">
          Plan wychodzi poza uprawnienia AOWD + nitrox:{' '}
          {[p.tableDepth > 30 && 'głębokość ponad 30 m', p.decoTime > 0 && 'obowiązkowa dekompresja']
            .filter(Boolean)
            .join(' i ')}
          .
        </p>
      )}
    </div>
  )
}

export function BuhlmannPlanner({ gas, onGasChange }: { gas: GasForm; onGasChange: (gas: GasForm) => void }) {
  const [dives, setDives] = usePersistentState<DiveForm[]>('sailrock.buhlmann', [EMPTY])
  const [undo, setUndo] = useState<DiveForm[] | null>(null)
  const outcomes = plan(dives)
  const update = (i: number, patch: Partial<DiveForm>) =>
    setDives(dives.map((d, k) => (k === i ? { ...d, ...patch } : d)))

  return (
    <div className="sr-stack-loose">
      <p className="sr-text">
        Tabela wynurzania Bühlmann/Hahn dla akwenów 0–250 m n.p.m. Czas liczony od zanurzenia do
        rozpoczęcia wynurzania, prędkość wynurzania {ASCENT_RATE} m/min. Aplikacja bierze pierwszą
        większą głębokość i pierwszy dłuższy czas z tabeli.
      </p>
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
                  max={63}
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
              {outcome.status === 'ok' && <Result plan={outcome.plan} gas={gas} />}
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
                  description="Nurkowanie powtórne liczy się od grupy powtórzeń poprzedniego."
                />
              )}
              {outcome.status === 'error' && (
                <StateBlock
                  state="error"
                  scope="inline"
                  title="Tego nurkowania nie ma w tabeli"
                  description={`${outcome.message}. Tabeli nie wolno interpolować ani przedłużać: skróć czas albo zmniejsz głębokość.`}
                />
              )}
            </div>
          </Card>
        )
      })}
      <div className="sr-row">
        <Button variant="secondary" onClick={() => setDives([...dives, EMPTY])}>
          Dodaj nurkowanie powtórne
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
      <GasSettingsCard form={gas} onChange={onGasChange} />
      <SavedPlans<DiveForm[]>
        storageKey="sailrock.saved.buhlmann"
        current={dives}
        canSave={outcomes.some((o) => o.status === 'ok')}
        summary={(saved) =>
          saved
            .filter((d) => d.depth && d.time)
            .map((d) => `${d.depth} m / ${d.time} min`)
            .join(', ')
        }
        onLoad={(saved) => {
          setUndo(dives)
          setDives(saved)
        }}
      />
    </div>
  )
}
