import { Button, Card, Input, List, ListItem, StateBlock } from '@bighat/ui'
import { useState } from 'react'
import { useI18n } from '../i18n/context'
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
  const { t } = useI18n()
  const [plans, setPlans] = usePersistentState<SavedPlan<T>[]>(storageKey, [])
  const [name, setName] = useState('')
  const [problem, setProblem] = useState<'name' | 'plan' | null>(null)

  const save = () => {
    const trimmed = name.trim()
    if (!trimmed) return setProblem('name')
    if (!canSave) return setProblem('plan')
    const plan: SavedPlan<T> = {
      id: `${Date.now()}`,
      name: trimmed,
      savedAt: new Date().toISOString(),
      data: current,
    }
    setPlans([plan, ...plans.filter((p) => p.name !== trimmed)])
    setName('')
    setProblem(null)
  }

  return (
    <Card ariaLabel={t.saved.title}>
      <div className="sr-stack">
        <h2 className="sr-heading">{t.saved.title}</h2>
        <Input
          label={t.saved.name}
          value={name}
          error={problem === 'name' ? t.saved.needName : problem === 'plan' ? t.saved.needPlan : undefined}
          onChange={(e) => {
            setName(e.target.value)
            setProblem(null)
          }}
          description={t.saved.nameHint}
        />
        <div className="sr-row">
          <Button variant="secondary" onClick={save}>
            {t.saved.save}
          </Button>
        </div>
        {plans.length === 0 ? (
          <StateBlock state="empty" scope="inline" title={t.saved.emptyTitle} description={t.saved.emptyHint} />
        ) : (
          <List ariaLabel={t.saved.title} dividers>
            {plans.map((plan) => (
              <ListItem
                key={plan.id}
                title={plan.name}
                description={t.saved.item(summary(plan.data), new Date(plan.savedAt).toLocaleDateString(t.locale))}
                trailing={
                  <div className="sr-row">
                    <Button
                      size="sm"
                      variant="secondary"
                      aria-label={t.saved.loadLabel(plan.name)}
                      onClick={() => onLoad(plan.data)}
                    >
                      {t.saved.load}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      tone="critical"
                      aria-label={t.saved.removeLabel(plan.name)}
                      onClick={() => setPlans(plans.filter((p) => p.id !== plan.id))}
                    >
                      {t.saved.remove}
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
