/**
 * Dlaczego plan nie mieści się w tabeli. Komunikat błędu jest po polsku (dla testów
 * i logów); interfejs buduje własny tekst z `info`, w języku użytkownika.
 */
export type PlanErrorInfo =
  | { code: 'depth-nonpositive' }
  | { code: 'time-nonpositive' }
  /** głębokość poza tabelą */
  | { code: 'depth-range'; depth: number; max: number }
  /** czas poza tabelą wynurzania dla danej głębokości */
  | { code: 'time-range'; time: number; tableDepth: number; max: number }
  /** czas po doliczeniu zwiększenia czasu podstawowego poza tabelą */
  | { code: 'penalty'; time: number; penalty: number; inner: PlanErrorInfo }
  /** czas ponad limit bezdekompresyjny */
  | { code: 'over-limit'; time: number; limit: number; tableDepth: number }
  /** nurkowanie powtórzeniowe: czas + azot resztkowy ponad limit */
  | { code: 'dive-over-limit'; dive: number; time: number; residual: number; limit: number; tableDepth: number }
  | { code: 'group-at-depth'; group: string; tableDepth: number }
  | { code: 'unknown-group'; group: string }
  | { code: 'no-transition'; from: string; to: string }

export class PlanError extends Error {
  readonly info: PlanErrorInfo
  constructor(message: string, info: PlanErrorInfo) {
    super(message)
    this.info = info
  }
}
