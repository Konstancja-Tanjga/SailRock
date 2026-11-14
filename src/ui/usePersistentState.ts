import { useEffect, useState } from 'react'

/** Stan zapamiętywany w localStorage; działa także, gdy pamięć jest niedostępna. */
export function usePersistentState<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key)
      return raw === null ? initial : (JSON.parse(raw) as T)
    } catch {
      return initial
    }
  })
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value))
    } catch {
      // tryb prywatny lub pełna pamięć: plan po prostu nie zostanie zapamiętany
    }
  }, [key, value])
  return [value, setValue] as const
}
