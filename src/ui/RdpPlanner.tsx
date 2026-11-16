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
import { useState } from 'react'
import { useI18n } from '../i18n/context'
import type { Dictionary } from '../i18n/pl'
import type { GasProfile } from '../tables/gasPlan'
import {
  ASCENT_RATE_MAX,
  SAFETY_STOP,
  planRdpDay,
  type RdpDive,
  type RdpDiveResult,
  type RdpTable,
} from '../tables/rdp'
import { RDP_AIR, RDP_EAN32, RDP_EAN36, RDP_SURFACE } from '../tables/rdpData'
import { errorText, formatMinutes, parseNumber, surfaceInterval } from './format'
import { turnPressure, type GasForm } from './gasForm'
import { GasResult, GasSettingsCard } from './GasSection'
import { IntervalFields } from './IntervalFields'
import { SavedPlans } from './SavedPlans'
import { Slate, type SlateEntry } from './Slate'
import { Stats } from './Stats'
import { usePersistentState } from './usePersistentState'

type DiveForm = { depth: string; time: string; end: string; start: string; cold: boolean }

type Outcome =
  | { status: 'empty' }
  | { status: 'blocked' }
  | { status: 'error'; error: unknown }
  | { status: 'ok'; result: RdpDiveResult; dive: RdpDive }

const EMPTY: DiveForm = { depth: '', time: '', end: '', start: '', cold: false }

const TABLES: Record<string, RdpTable> = { air: RDP_AIR, ean32: RDP_EAN32, ean36: RDP_EAN36 }

const gasName = (gas: string, t: Dictionary) => (gas === 'ean32' ? 'EANx32' : gas === 'ean36' ? 'EANx36' : t.rdp.air)

function plan(table: RdpTable, dives: DiveForm[]): Outcome[] {
  const parsed: (RdpDive | null)[] = dives.map((d, i) => {
    const depth = parseNumber(d.depth)
    const time = parseNumber(d.time)
    const interval = i > 0 ? surfaceInterval(d.end, d.start) : 0
    if (!(depth > 0) || !(time > 0) || !Number.isFinite(interval)) return null
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
      outcomes.push({ status: 'error', error })
    }
  })
  return outcomes
}

/** Do gazu liczymy zawsze przystanek bezpieczeństwa i wynurzanie 10 m/min. */
const gasProfile = (dive: RdpDive): GasProfile => ({
  depth: dive.depth,
  time: dive.time,
  stops: dive.depth > SAFETY_STOP.depth ? [SAFETY_STOP] : [],
  ascentRate: 10,
})

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
  const { t } = useI18n()
  const items: DescriptionItem[] = [
    { term: t.rdp.tableDepth, value: `${r.tableDepth} m` },
    { term: t.rdp.limit, value: t.rdp.minutes(r.noDecoLimit) },
    { term: t.rdp.safetyStop, value: t.rdp.safetyStopValue(SAFETY_STOP.minutes, SAFETY_STOP.depth) },
  ]
  if (r.groupBefore !== null) {
    items.push(
      { term: t.rdp.groupBefore, value: r.groupBefore },
      { term: t.rdp.residual, value: t.rdp.minutes(r.residualNitrogenTime) },
      { term: t.rdp.adjusted, value: t.rdp.minutes(r.adjustedNoDecoLimit) },
      { term: t.rdp.total, value: t.rdp.minutes(r.totalBottomTime) },
    )
  }
  if (table.fO2 > 0.21) {
    const ppO2 = table.fO2 * (r.tableDepth / 10 + 1)
    items.push({ term: t.rdp.ppO2, value: `${t.number(ppO2, 2)} ata` })
  }
  const left = r.adjustedNoDecoLimit - dive.time
  return (
    <div className="sr-stack">
      <Stats
        items={[
          { label: t.rdp.margin, value: t.rdp.minutes(left) },
          { label: t.rdp.maxTime, value: t.rdp.minutes(r.adjustedNoDecoLimit) },
          { label: t.dive.group, value: r.groupAfter },
        ]}
      />
      <div className="sr-row">
        <Badge tone={r.safetyStop ? 'warning' : 'success'}>
          {r.safetyStop ? t.rdp.stopRequired : t.rdp.stopRecommended}
        </Badge>
        {left === 0 && <Badge tone="critical">{t.rdp.atLimit}</Badge>}
      </div>
      <DescriptionList items={items} density="compact" ariaLabel={t.dive.details} />
      <GasResult form={gas} profile={gasProfile(dive)} />
      {r.warnings.length > 0 && (
        <ul className="sr-list">
          {r.warnings.map((w) => (
            <li key={w}>{t.rdp.warnings[w]}</li>
          ))}
        </ul>
      )}
    </div>
  )
}

function slateEntries(outcomes: Outcome[], gas: GasForm, t: Dictionary): SlateEntry[] {
  const entries: SlateEntry[] = []
  outcomes.forEach((o, i) => {
    if (o.status !== 'ok') return
    const turn = turnPressure(gasProfile(o.dive), gas)
    entries.push({
      label: i === 0 ? t.slate.first : t.slate.next(i + 1, formatMinutes(o.dive.surfaceInterval ?? 0, t)),
      headline: `${o.dive.depth} m · ${o.dive.time} min`,
      lines: [
        t.rdp.slateMax(o.result.adjustedNoDecoLimit),
        t.rdp.slateStop(SAFETY_STOP.minutes, SAFETY_STOP.depth, o.result.safetyStop),
        t.slate.group(o.result.groupAfter),
        ...(turn === null ? [] : [t.slate.turn(turn)]),
      ],
    })
  })
  return entries
}

export function RdpPlanner({
  gasForm,
  onGasChange,
}: {
  gasForm: GasForm
  onGasChange: (gas: GasForm) => void
}) {
  const { t } = useI18n()
  const [undo, setUndo] = useState<DiveForm[] | null>(null)
  const [gas, setGas] = usePersistentState('sailrock.rdp.gas', 'air')
  const [dives, setDives] = usePersistentState<DiveForm[]>('sailrock.rdp.v2', [EMPTY])
  const table = TABLES[gas] ?? RDP_AIR
  const outcomes = plan(table, dives)
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
  const maxDepth = table.depths[table.depths.length - 1]

  return (
    <div className="sr-stack-loose">
      <p className="sr-text">{t.rdp.intro(ASCENT_RATE_MAX)}</p>
      <SegmentedControl
        legend={t.rdp.gas}
        showLegend
        fullWidth
        value={gas}
        onChange={setGas}
        options={Object.keys(TABLES).map((value) => ({ value, label: gasName(value, t) }))}
      />
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
                  max={maxDepth}
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
              <Switch
                label={t.rdp.cold}
                description={t.rdp.coldHint}
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
                  title={i > 0 ? t.dive.emptyNext : t.dive.emptyFirst}
                  description={t.dive.emptyHint}
                />
              )}
              {outcome.status === 'blocked' && (
                <StateBlock state="empty" scope="inline" title={t.dive.blocked} description={t.rdp.blockedHint} />
              )}
              {outcome.status === 'error' && (
                <StateBlock
                  state="error"
                  scope="inline"
                  title={t.rdp.errorTitle}
                  description={`${errorText(outcome.error, t)}. ${t.rdp.errorHint}`}
                />
              )}
            </div>
          </Card>
        )
      })}
      <div className="sr-row">
        <Slate title={t.rdp.slateTitle(gasName(gas, t))} entries={slateEntries(outcomes, gasForm, t)} />
        <Button variant="secondary" onClick={() => edit([...dives, EMPTY])}>
          {t.rdp.add}
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
      <GasSettingsCard form={gasForm} onChange={onGasChange} />
      <SavedPlans<{ gas: string; dives: DiveForm[] }>
        storageKey="sailrock.saved.rdp.v2"
        current={{ gas, dives }}
        canSave={outcomes.some((o) => o.status === 'ok')}
        summary={(saved) =>
          `${gasName(saved.gas, t)}: ` +
          saved.dives
            .filter((d) => d.depth && d.time)
            .map((d) => `${d.depth} m / ${d.time} min`)
            .join(', ')
        }
        onLoad={(saved) => {
          setGas(saved.gas)
          change(saved.dives)
        }}
      />
    </div>
  )
}
