import { Input } from '@bighat/ui'
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
  const interval = surfaceInterval(end, start)
  return (
    <div className="sr-stack" role="group" aria-label="Przerwa na powierzchni">
      <div className="sr-fields">
        <Input
          label="Koniec poprzedniego"
          type="time"
          value={end}
          onChange={(e) => onChange({ end: e.target.value })}
        />
        <Input
          label="Początek tego"
          type="time"
          value={start}
          onChange={(e) => onChange({ start: e.target.value })}
        />
      </div>
      <p className="sr-note">
        {Number.isFinite(interval)
          ? `Przerwa na powierzchni: ${formatMinutes(interval)}.`
          : 'Podaj godzinę wynurzenia z poprzedniego nurkowania i godzinę zanurzenia w tym.'}
      </p>
    </div>
  )
}
