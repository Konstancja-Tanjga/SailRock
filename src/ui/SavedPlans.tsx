import { Button, Card, Input, List, ListItem, StateBlock } from '@bighat/ui'
import { useState } from 'react'
import { usePersistentState } from './usePersistentState'

interface SavedPlan<T> {
  id: string
  name: string
  savedAt: string
  data: T
}

/**
 * Lista zapisanych planów jednego planera. Plany są przechowywane na urządzeniu.
 * `summary` opisuje plan jednym zdaniem na liście.
 */
export function SavedPlans<T>({
  storageKey,
  current,
  canSave,
  summary,
  onLoad,
}: {
  storageKey: string
  current: T
  canSave: boolean
  summary: (data: T) => string
  onLoad: (data: T) => void
}) {
  const [plans, setPlans] = usePersistentState<SavedPlan<T>[]>(storageKey, [])
  const [name, setName] = useState('')
  const [error, setError] = useState<string | undefined>()

  const save = () => {
    const trimmed = name.trim()
    if (!trimmed) return setError('Podaj nazwę planu')
    if (!canSave) return setError('Najpierw wpisz głębokość i czas')
    const plan: SavedPlan<T> = {
      id: `${Date.now()}`,
      name: trimmed,
      savedAt: new Date().toISOString(),
      data: current,
    }
    setPlans([plan, ...plans.filter((p) => p.name !== trimmed)])
    setName('')
    setError(undefined)
  }

  return (
    <Card ariaLabel="Zapisane plany">
      <div className="sr-stack">
        <h2 className="sr-heading">Zapisane plany</h2>
        <Input
          label="Nazwa planu"
          value={name}
          error={error}
          onChange={(e) => {
            setName(e.target.value)
            setError(undefined)
          }}
          description="Plan o tej samej nazwie zostanie zastąpiony."
        />
        <div className="sr-row">
          <Button variant="secondary" onClick={save}>
            Zapisz bieżący plan
          </Button>
        </div>
        {plans.length === 0 ? (
          <StateBlock
            state="empty"
            scope="inline"
            title="Brak zapisanych planów"
            description="Zapisane plany zostają na tym urządzeniu i działają bez internetu."
          />
        ) : (
          <List ariaLabel="Zapisane plany" dividers>
            {plans.map((plan) => (
              <ListItem
                key={plan.id}
                title={plan.name}
                description={`${summary(plan.data)} · zapisano ${new Date(plan.savedAt).toLocaleDateString('pl-PL')}`}
                trailing={
                  <div className="sr-row">
                    <Button
                      size="sm"
                      variant="secondary"
                      aria-label={`Wczytaj plan ${plan.name}`}
                      onClick={() => onLoad(plan.data)}
                    >
                      Wczytaj
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      tone="critical"
                      aria-label={`Usuń plan ${plan.name}`}
                      onClick={() => setPlans(plans.filter((p) => p.id !== plan.id))}
                    >
                      Usuń
                    </Button>
                  </div>
                }
              />
            ))}
          </List>
        )}
      </div>
    </Card>
  )
}
