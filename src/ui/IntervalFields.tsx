import { Input } from '@bighat/ui'
import { useI18n } from '../i18n/context'
import { formatMinutes, surfaceInterval } from './format'

/** Przerwa na powierzchni podawana godzinami zegarowymi, jak w zadaniach z tabel. */
export function IntervalFields({
  end,
  start,
  onChange,
}: {
  end: string
  start: string
  onChange: (patch: { end?: string; start?: string }) => void
}) {
  const { t } = useI18n()
  const interval = surfaceInterval(end, start)
  return (
    <div className="sr-stack" role="group" aria-label={t.interval.label}>
      <div className="sr-fields">
        <Input label={t.interval.end} type="time" value={end} onChange={(e) => onChange({ end: e.target.value })} />
        <Input
          label={t.interval.start}
          type="time"
          value={start}
          onChange={(e) => onChange({ start: e.target.value })}
        />
      </div>
      <p className="sr-note">
        {Number.isFinite(interval) ? t.interval.result(formatMinutes(interval, t)) : t.interval.hint}
      </p>
    </div>
  )
}
