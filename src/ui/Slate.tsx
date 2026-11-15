import { Button, Dialog } from '@bighat/ui'
import { useState } from 'react'

export interface SlateEntry {
  /** np. „Nurkowanie 1" albo „Nurkowanie 2 · po 1 h 10 min" */
  label: string
  /** najważniejsza linia: głębokość i czas */
  headline: string
  lines: string[]
}

/** Przycisk otwierający plan dnia dużą czcionką, do przepisania na tabliczkę. */
export function Slate({ title, entries }: { title: string; entries: SlateEntry[] }) {
  const [open, setOpen] = useState(false)
  if (entries.length === 0) return null
  return (
    <>
      <Button variant="primary" onClick={() => setOpen(true)}>
        Pokaż tabliczkę
      </Button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Tabliczka"
        description={title}
        size="lg"
        footer={<Button onClick={() => setOpen(false)}>Zamknij</Button>}
      >
        <ol className="sr-slate">
          {entries.map((entry) => (
            <li className="sr-slate-item" key={entry.label}>
              <span className="sr-slate-label">{entry.label}</span>
              <span className="sr-figure">{entry.headline}</span>
              {entry.lines.map((line) => (
                <span className="sr-slate-line" key={line}>
                  {line}
                </span>
              ))}
            </li>
          ))}
        </ol>
      </Dialog>
    </>
  )
}
