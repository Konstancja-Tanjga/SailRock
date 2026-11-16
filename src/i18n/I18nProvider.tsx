import { useEffect, type ReactNode } from 'react'
import { usePersistentState } from '../ui/usePersistentState'
import { I18nContext, defaultLang, type Lang } from './context'
import { en } from './en'
import { pl } from './pl'

const DICTIONARIES = { pl, en }

export function I18nProvider({ children }: { children: ReactNode }) {
  const [stored, setLang] = usePersistentState<Lang>('sailrock.lang', defaultLang())
  const lang: Lang = stored === 'en' ? 'en' : 'pl'
  useEffect(() => {
    document.documentElement.lang = lang
  }, [lang])
  return <I18nContext.Provider value={{ lang, setLang, t: DICTIONARIES[lang] }}>{children}</I18nContext.Provider>
}
