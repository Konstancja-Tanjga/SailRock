import { Badge, Button, Card, DescriptionList, Input, StateBlock, Table } from '@bighat/ui'
import type { DescriptionItem } from '@bighat/ui'
import { useState } from 'react'
import { useI18n } from '../i18n/context'
import type { Dictionary } from '../i18n/pl'
import { ASCENT_RATE } from '../tables/buhlmannHahn0_250'
import type { GasProfile } from '../tables/gasPlan'
import {
  lookup,
  lookupRepetitive,
  type RepetitivePlan,
  type TablePlan,
  type TableStop,
} from '../tables/tablePlanner'
import { errorText, formatMinutes, parseNumber, surfaceInterval } from './format'
import { turnPressure, type GasForm } from './gasForm'
import { GasResult, GasSettingsCard } from './GasSection'
import { IntervalFields } from './IntervalFields'
import { SavedPlans } from './SavedPlans'
import { Slate, type SlateEntry } from './Slate'
import { Stats } from './Stats'
import { usePersistentState } from './usePersistentState'

type DiveForm = { depth: string; time: string; end: string; start: string }

type Outcome =
  | { status: 'empty' }
  | { status: 'blocked' }
  | { status: 'error'; error: unknown }
  | { status: 'ok'; plan: TablePlan | RepetitivePlan; interval: number }

const EMPTY: DiveForm = { depth: '', time: '', end: '', start: '' }

function plan(dives: DiveForm[]): Outcome[] {
  const outcomes: Outcome[] = []
  dives.forEach((dive, i) => {
    const depth = parseNumber(dive.depth)
    const time = parseNumber(dive.time)
    const interval = i > 0 ? surfaceInterval(dive.end, dive.start) : 0
    if (!(depth > 0) || !(time > 0) || !Number.isFinite(interval)) {
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
        interval,
        plan: previous ? lookupRepetitive(previous.plan, interval, depth, time) : lookup(depth, time),
      })
    } catch (error) {
      outcomes.push({ status: 'error', error })
    }
  })
  return outcomes
}

const gasProfile = (p: TablePlan): GasProfile => ({
  depth: p.depth,
  time: p.time,
  stops: p.stops,
  ascentRate: ASCENT_RATE,
})

function penaltyText(p: RepetitivePlan, t: Dictionary): string {
  if (p.penalty.kind === 'first') return t.deco.penaltyFirst
  if (p.penalty.kind === 'previous') return t.deco.penaltyPrevious(p.penalty.minutes)
  return t.rdp.minutes(p.penalty.minutes)
}

function Result({ plan: p, gas }: { plan: TablePlan | RepetitivePlan; gas: GasForm }) {
  const { t } = useI18n()
  const ascent = Math.ceil(p.depth / ASCENT_RATE) + p.decoTime
  const items: DescriptionItem[] = [
    { term: t.deco.row, value: t.deco.rowValue(p.tableDepth, p.tableTime) },
    { term: t.deco.noStop, value: t.rdp.minutes(p.noStop) },
  ]
  if ('penalty' in p) {
    items.push({ term: t.deco.penalty, value: penaltyText(p, t), wide: true })
  }
  items.push({ term: t.deco.ascent, value: t.deco.ascentValue(ASCENT_RATE) })
  const deep = p.tableDepth > 30
  const beyond = deep || p.decoTime > 0
  return (
    <div className="sr-stack">
      <Stats
        items={[
          { label: t.deco.decompression, value: p.decoTime > 0 ? t.rdp.minutes(p.decoTime) : t.deco.none },
          { label: t.deco.ascent, value: formatMinutes(ascent, t) },
          { label: t.dive.group, value: p.group },
        ]}
      />
      <div className="sr-row">
        <Badge tone={p.decoTime > 0 ? 'warning' : 'success'}>
          {p.decoTime > 0 ? t.deco.decoDive : t.deco.noStops}
        </Badge>
        {beyond && <Badge tone="warning">{t.deco.beyond}</Badge>}
      </div>
      {p.stops.length > 0 && (
        <Table<TableStop>
          caption={t.deco.stops}
          columns={[
            { key: 'depth', header: t.deco.stopDepth, cell: (s) => `${s.depth} m` },
            { key: 'minutes', header: t.deco.stopTime, cell: (s) => t.rdp.minutes(s.minutes), numeric: true },
          ]}
          rows={p.stops}
          rowKey={(s) => String(s.depth)}
          density="compact"
          responsive="scroll"
        />
      )}
      <DescriptionList items={items} density="compact" ariaLabel={t.dive.details} />
      <GasResult form={gas} profile={gasProfile(p)} />
      {beyond && <p className="sr-note">{t.deco.beyondNote(deep, p.decoTime > 0)}</p>}
    </div>
  )
}

function slateEntries(outcomes: Outcome[], gas: GasForm, t: Dictionary): SlateEntry[] {
  const entries: SlateEntry[] = []
  outcomes.forEach((o, i) => {
    if (o.status !== 'ok') return
    const p = o.plan
    const turn = turnPressure(gasProfile(p), gas)
    entries.push({
      label: i === 0 ? t.slate.first : t.slate.next(i + 1, formatMinutes(o.interval, t)),
      headline: `${p.depth} m · ${p.time} min`,
      lines: [
        p.stops.length > 0 ? p.stops.map((s) => `${s.depth} m ${s.minutes}′`).join(' · ') : t.deco.slateNoStops,
        t.slate.group(p.group),
        ...(turn === null ? [] : [t.slate.turn(turn)]),
      ],
    })
  })
  return entries
}

export function BuhlmannPlanner({
  gas,
  onGasChange,
}: {
  gas: GasForm
  onGasChange: (gas: GasForm) => void
}) {
  const { t } = useI18n()
  const [dives, setDives] = usePersistentState<DiveForm[]>('sailrock.buhlmann.v2', [EMPTY])
  const [undo, setUndo] = useState<DiveForm[] | null>(null)
  const outcomes = plan(dives)
  const change = (next: DiveForm[]) => {
    setUndo(dives)
    setDives(next)
  }
  // Każda dalsza edycja unieważnia „Cofnij": inaczej cofnięcie skasowałoby późniejsze zmiany.
  const edit = (next: DiveForm[]) => {
    setUndo(null)
    setDives(next)
  }
  const update = (i: number, patch: Partial<DiveForm>) =>
    edit(dives.map((d, k) => (k === i ? { ...d, ...patch } : d)))

  return (
    <div className="sr-stack-loose">
      <p className="sr-text">{t.deco.intro(ASCENT_RATE)}</p>
      {dives.map((dive, i) => {
        const outcome = outcomes[i]
        return (
          <Card key={i} ariaLabel={t.dive.heading(i + 1)}>
            <div className="sr-stack">
              <div className="sr-row-spread">
                <h2 className="sr-heading">{t.dive.heading(i + 1)}</h2>
                {dives.length > 1 && (
                  <Button
                    variant="ghost"
                    tone="critical"
                    size="sm"
                    aria-label={t.dive.removeLabel(i + 1)}
                    onClick={() => change(dives.filter((_, k) => k !== i))}
                  >
                    {t.dive.remove}
                  </Button>
                )}
              </div>
              {i > 0 && (
                <IntervalFields end={dive.end} start={dive.start} onChange={(patch) => update(i, patch)} />
              )}
              <div className="sr-fields">
                <Input
                  label={t.dive.depth}
                  type="number"
                  inputMode="decimal"
                  min={1}
                  max={63}
                  value={dive.depth}
                  onChange={(e) => update(i, { depth: e.target.value })}
                />
                <Input
                  label={t.dive.time}
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
                  title={i > 0 ? t.dive.emptyNext : t.dive.emptyFirst}
                  description={t.dive.emptyHint}
                />
              )}
              {outcome.status === 'blocked' && (
                <StateBlock state="empty" scope="inline" title={t.dive.blocked} description={t.deco.blockedHint} />
              )}
              {outcome.status === 'error' && (
                <StateBlock
                  state="error"
                  scope="inline"
                  title={t.deco.errorTitle}
                  description={`${errorText(outcome.error, t)}. ${t.deco.errorHint}`}
                />
              )}
            </div>
          </Card>
        )
      })}
      <div className="sr-row">
        <Slate title={t.deco.slateTitle} entries={slateEntries(outcomes, gas, t)} />
        <Button variant="secondary" onClick={() => edit([...dives, EMPTY])}>
          {t.deco.add}
        </Button>
        <Button variant="ghost" onClick={() => change([EMPTY])}>
          {t.dive.clear}
        </Button>
      </div>
      {undo && (
        <div className="sr-row" role="status">
          <p className="sr-text">{t.dive.changed}</p>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setDives(undo)
              setUndo(null)
            }}
          >
            {t.dive.undo}
          </Button>
        </div>
      )}
      <GasSettingsCard form={gas} onChange={onGasChange} />
      <SavedPlans<DiveForm[]>
        storageKey="sailrock.saved.buhlmann.v2"
        current={dives}
        canSave={outcomes.some((o) => o.status === 'ok')}
        summary={(saved) =>
          saved
            .filter((d) => d.depth && d.time)
            .map((d) => `${d.depth} m / ${d.time} min`)
            .join(', ')
        }
        onLoad={change}
      />
    </div>
  )
}
