/** Frakcje gazów (0..1). fHe zawsze 0 w v1, pole zostawione pod trimiks. */
export interface Gas {
  fO2: number
  fHe: number
}

export interface Cylinder {
  gas: Gas
  /** pojemność wodna w litrach */
  volume: number
  /** ciśnienie początkowe w barach */
  pressure: number
}

export interface Level {
  /** głębokość w metrach */
  depth: number
  /** czas w minutach, liczony od opuszczenia poprzedniego poziomu (zawiera dojście) */
  time: number
}

export type Water = 'salt' | 'fresh'

export interface Settings {
  /** gradient factors jako ułamki, np. 0.4 i 0.85 */
  gfLow: number
  gfHigh: number
  /** m/min */
  descentRate: number
  /** wynurzanie do pierwszego przystanku deko oraz w nurkowaniach bez deko */
  ascentRate: number
  /** wynurzanie od pierwszego przystanku deko w górę */
  decoAscentRate: number
  /** odstęp między przystankami w metrach */
  stopStep: number
  /** głębokość ostatniego przystanku: 3 lub 6 m */
  lastStop: number
  ppO2Bottom: number
  ppO2Deco: number
  /** zużycie powierzchniowe w l/min */
  sacBottom: number
  sacDeco: number
  /** zużycie w sytuacji awaryjnej (na nurka), do liczenia minimum gas, l/min */
  sacStress: number
  /** minimalne ciśnienie w butli dennej po wynurzeniu, bar */
  reservePressure: number
  /** wysokość n.p.m. w metrach */
  altitude: number
  /** false = przyjazd z poziomu morza tuż przed nurkowaniem (tkanki nasycone jak na 0 m n.p.m.) */
  acclimatized: boolean
  water: Water
  safetyStop: boolean
  /** minuty postoju przy zmianie gazu */
  switchStop: number
}

export interface DiveInput {
  levels: Level[]
  bottom: Cylinder
  deco: Cylinder[]
  settings: Settings
}

/** Stan przenoszony między nurkowaniami tego samego dnia. */
export interface CarryOver {
  tissues: number[]
  cns: number
  otu: number
}

export type SegmentKind = 'descent' | 'level' | 'ascent' | 'stop' | 'switch' | 'safety'

export interface Segment {
  kind: SegmentKind
  startDepth: number
  endDepth: number
  /** minuty */
  duration: number
  gas: Gas
  /** runtime na końcu odcinka, minuty */
  runtime: number
  /** sufit dekompresyjny na końcu odcinka, metry (0 = brak) */
  ceiling: number
}

export interface CylinderUse {
  cylinder: Cylinder
  role: 'bottom' | 'deco'
  usedLiters: number
  usedBar: number
  remainingBar: number
}

export type WarningCode =
  | 'ppo2-bottom'
  | 'cns'
  | 'otu'
  | 'lost-deco-gas'
  | 'gas-insufficient'
  | 'gas-reserve'
  | 'deco'
  | 'depth-cert'
  | 'gas-cert'
  | 'ceiling-violation'

export interface Warning {
  code: WarningCode
  /** 'danger' = plan nie do wykonania w tej postaci, 'caution' = wymaga uwagi */
  level: 'danger' | 'caution'
}

export interface PlanResult {
  segments: Segment[]
  /** przystanki (deko, zmiana gazu, bezpieczeństwa) w kolejności wykonywania */
  stops: Segment[]
  runtime: number
  maxDepth: number
  /** suma minut obowiązkowych przystanków dekompresyjnych */
  decoTime: number
  firstStopDepth: number | null
  /** limit bezdekompresyjny dla pierwszego poziomu w minutach; Infinity gdy powyżej zakresu */
  ndl: number
  cns: number
  otu: number
  gasUse: CylinderUse[]
  /** minimum gas dla butli dennej */
  minGasLiters: number
  minGasBar: number
  warnings: Warning[]
  end: CarryOver
}
