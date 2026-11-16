import { createContext, useContext } from 'react'
import { pl, type Dictionary } from './pl'

export type Lang = 'pl' | 'en'

export interface I18n {
  lang: Lang
  setLang: (lang: Lang) => void
  t: Dictionary
}

export const I18nContext = createContext<I18n>({ lang: 'pl', setLang: () => {}, t: pl })

export const useI18n = () => useContext(I18nContext)

/** Polski dla przeglądarki ustawionej na polski, angielski dla każdej innej. */
export function defaultLang(): Lang {
  const preferred = typeof navigator === 'undefined' ? 'pl' : navigator.language
  return preferred.toLowerCase().startsWith('pl') ? 'pl' : 'en'
}
