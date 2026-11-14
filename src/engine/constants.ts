import type { Settings } from './types'

/**
 * Bühlmann ZH-L16C, azot. Wartości sprawdzone w dwóch źródłach:
 * Subsurface core/deco.cpp oraz tabela „ZH-L16C Parameters" w Wikipedii.
 */
export const N2_HALF_TIMES = [
  5.0, 8.0, 12.5, 18.5, 27.0, 38.3, 54.3, 77.0, 109.0, 146.0, 187.0, 239.0, 305.0, 390.0, 498.0,
  635.0,
]
export const N2_A = [
  1.1696, 1.0, 0.8618, 0.7562, 0.62, 0.5043, 0.441, 0.4, 0.375, 0.35, 0.3295, 0.3065, 0.2835,
  0.261, 0.248, 0.2327,
]
export const N2_B = [
  0.5578, 0.6514, 0.7222, 0.7825, 0.8126, 0.8434, 0.8693, 0.891, 0.9092, 0.9222, 0.9319, 0.9403,
  0.9477, 0.9544, 0.9602, 0.9653,
]

/** Ciśnienie pary wodnej w pęcherzykach płucnych, bar (wartość Bühlmanna, RQ = 1.0). */
export const WATER_VAPOUR = 0.0627

export const AIR_FN2 = 0.79

/** Ciśnienie atmosferyczne na poziomie morza, bar. */
export const SEA_LEVEL_PRESSURE = 1.01325

/** Przyrost ciśnienia na metr głębokości, bar/m. */
export const BAR_PER_METER = {
  salt: (1030 * 9.80665) / 1e5,
  fresh: (1000 * 9.80665) / 1e5,
}

/** Limity ekspozycji tlenowej NOAA: [ppO2 w barach, dopuszczalny czas w minutach]. */
export const NOAA_CNS: [number, number][] = [
  [0.6, 720],
  [0.7, 570],
  [0.8, 450],
  [0.9, 360],
  [1.0, 300],
  [1.1, 240],
  [1.2, 210],
  [1.3, 180],
  [1.4, 150],
  [1.5, 120],
  [1.6, 45],
]

/** Półokres zaniku CNS na powierzchni, minuty. */
export const CNS_HALF_TIME = 90

export const DEFAULT_SETTINGS: Settings = {
  gfLow: 0.4,
  gfHigh: 0.85,
  descentRate: 18,
  ascentRate: 18,
  decoAscentRate: 10,
  stopStep: 3,
  lastStop: 3,
  ppO2Bottom: 1.4,
  ppO2Deco: 1.6,
  sacBottom: 20,
  sacDeco: 16,
  sacStress: 30,
  reservePressure: 50,
  altitude: 0,
  acclimatized: true,
  water: 'salt',
  safetyStop: true,
  switchStop: 1,
}

export const SAFETY_STOP_DEPTH = 5
export const SAFETY_STOP_MINUTES = 3
/** Powyżej tej głębokości maksymalnej przystanek bezpieczeństwa jest dodawany. */
export const SAFETY_STOP_MIN_DEPTH = 10

/** Granice uprawnień AOWD + nitrox. */
export const CERT_MAX_DEPTH = 30
export const CERT_MAX_FO2 = 0.4

export const NDL_CAP = 300

/**
 * Tolerancja przy sprawdzaniu limitów ppO2. Model liczy 1,01325 bara na powierzchni
 * i 1030 kg/m³, więc „książkowe" głębokości (tlen na 6 m, EAN40 na 25 m) wypadają
 * o ok. 1% ponad limit; przyjętą praktyką jest traktowanie ich jako mieszczących się w limicie.
 */
export const PPO2_TOLERANCE = 0.025

/** Dzienny limit OTU, powyżej którego planer ostrzega. */
export const OTU_DAILY_LIMIT = 300
