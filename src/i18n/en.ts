import type { PlanErrorInfo } from '../tables/errors'
import type { Dictionary } from './pl'

const number = (value: number, digits: number) => value.toFixed(digits)

function planError(info: PlanErrorInfo): string {
  switch (info.code) {
    case 'depth-nonpositive':
      return 'Depth must be greater than zero'
    case 'time-nonpositive':
      return 'Time must be greater than zero'
    case 'depth-range':
      return `${info.depth} m is deeper than the table goes (${info.max} m at most)`
    case 'time-range':
      return `${info.time} min is longer than the table goes for ${info.tableDepth} m (${info.max} min at most)`
    case 'penalty':
      return `${info.time} min and a time penalty of ${info.penalty} min make ${info.time + info.penalty} min. ${planError(info.inner)}`
    case 'over-limit':
      return `${info.time} min is over the no-decompression limit of ${info.limit} min for ${info.tableDepth} m`
    case 'dive-over-limit':
      return `Dive ${info.dive}: ${info.time} min and ${info.residual} min of residual nitrogen are over the limit of ${info.limit} min for ${info.tableDepth} m`
    case 'group-at-depth':
      return `Pressure group ${info.group} cannot dive to ${info.tableDepth} m`
    case 'unknown-group':
      return `Unknown pressure group ${info.group}`
    case 'no-transition':
      return `Group ${info.from} cannot become group ${info.to}`
  }
}

export const en: Dictionary = {
  locale: 'en-GB',
  number,
  planError,
  duration: (h, m) => (h === 0 ? `${m} min` : m === 0 ? `${h} h` : `${h} h ${m} min`),

  app: {
    title: 'Dive planner',
    tabsLabel: 'Kind of planning',
    tabNoDeco: 'No deco',
    tabDeco: 'Deco',
    tabNitrox: 'Nitrox',
    language: 'Language',
    footer:
      'The tables were transcribed from scans: before a dive, compare the result with the printed table. The app does not replace training or a dive computer.',
    noticeTitle: 'Before you start',
    noticeLead: 'SailRock helps to plan dives from the RDP and the Bühlmann/Hahn tables.',
    noticePoints: [
      'The tables were transcribed from scans. Compare every plan with the printed table.',
      'The app does not replace training, a dive computer, or planning with your buddy.',
      'Plan within your certification.',
    ],
    noticeOk: 'I understand',
  },

  dive: {
    heading: (n) => `Dive ${n}`,
    remove: 'Remove',
    removeLabel: (n) => `Remove dive ${n}`,
    depth: 'Depth (m)',
    time: 'Bottom time (min)',
    emptyFirst: 'Enter depth and time',
    emptyNext: 'Enter the times, depth, and bottom time',
    emptyHint: 'The result appears as soon as every value is in.',
    blocked: 'Correct the previous dive first',
    clear: 'Clear plan',
    changed: 'The plan was changed.',
    undo: 'Undo last change',
    details: 'Details of the reading',
    group: 'Group',
  },

  interval: {
    label: 'Surface interval',
    end: 'Previous dive ended',
    start: 'This dive starts',
    result: (text) => `Surface interval: ${text}.`,
    hint: 'Enter the time you surfaced from the previous dive and the time this one starts.',
  },

  rdp: {
    intro: (rate) =>
      `The Recreational Dive Planner (RDP), for no-decompression dives only. Ascend no faster than ${rate} m/min. Plan every repetitive dive shallower than the one before.`,
    gas: 'Gas',
    air: 'Air',
    cold: 'Cold water or strenuous conditions',
    coldHint: 'Planned as a dive 4 m deeper.',
    margin: 'Margin',
    maxTime: 'Max time',
    minutes: (n) => `${n} min`,
    stopRequired: 'Safety stop required',
    stopRecommended: 'Safety stop recommended',
    atLimit: 'At the limit',
    tableDepth: 'Depth in the table',
    limit: 'No-decompression limit',
    safetyStop: 'Safety stop',
    safetyStopValue: (minutes, depth) => `${minutes} min at ${depth} m`,
    groupBefore: 'Group after the interval',
    residual: 'Residual nitrogen time',
    adjusted: 'Adjusted limit',
    total: 'Total bottom time (actual and residual)',
    ppO2: 'Oxygen partial pressure',
    blockedHint: 'A repetitive dive starts from the pressure group of the dive before it.',
    errorTitle: 'The plan is outside the RDP',
    errorHint:
      'The RDP is not for planning decompression dives: shorten the time, reduce the depth, or lengthen the interval.',
    add: 'Add a repetitive dive',
    slateTitle: (gas) => `RDP, ${gas}`,
    slateMax: (n) => `Max ${n} min`,
    slateStop: (minutes, depth, required) => `Stop ${minutes}′ at ${depth} m${required ? ' (required)' : ''}`,
    warnings: {
      'deeper-than-previous': 'This repetitive dive is deeper than the one before; plan the deepest dive first.',
      'repetitive-deeper-than-30': 'Limit repetitive dives to 30 m or shallower.',
      'deeper-than-40': 'Do not dive deeper than 40 m; 42 m is in the table for emergencies only.',
      'wx-interval': 'After group W or X, the minimum interval between all following dives is 1 hour.',
      'yz-interval': 'After group Y or Z, the minimum interval between all following dives is 3 hours.',
      'continuity-only-depth':
        'This depth is in the table for planning continuity only: the oxygen partial pressure is over 1.4 ata.',
      'at-limit': 'The plan reaches the no-decompression limit. Never dive to the limits of the table.',
    },
  },

  deco: {
    intro: (rate) =>
      `The Bühlmann/Hahn ascent table for waters at 0–250 m above sea level. Time runs from the start of the descent to the start of the ascent; the ascent rate is ${rate} m/min. The app takes the next greater depth and the next longer time in the table.`,
    decompression: 'Deco time',
    none: 'none',
    ascent: 'Ascent',
    decoDive: 'Decompression dive',
    noStops: 'No decompression stops',
    beyond: 'Beyond AOWD and nitrox certification',
    stops: 'Decompression stops',
    stopDepth: 'Depth',
    stopTime: 'Time',
    row: 'Table row',
    rowValue: (depth, time) => `${depth} m / ${time} min`,
    noStop: 'No-stop time',
    penalty: 'Time penalty',
    penaltyFirst: '0 min — the interval is long enough for this dive to count as a first dive',
    penaltyPrevious: (n) =>
      `${n} min — the interval is shorter than the shortest in the table, so the time of the previous dive is added`,
    ascentValue: (rate) => `${rate} m/min plus stops`,
    beyondNote: (deep, deco) =>
      `The plan is beyond AOWD and nitrox certification: ${[deep && 'deeper than 30 m', deco && 'mandatory decompression'].filter(Boolean).join(' and ')}.`,
    blockedHint: 'A repetitive dive starts from the repetitive group of the dive before it.',
    errorTitle: 'This dive is not in the table',
    errorHint: 'The table must not be interpolated or extended: shorten the time or reduce the depth.',
    add: 'Add a repetitive dive',
    slateTitle: 'Bühlmann/Hahn, 0–250 m above sea level, ascent 10 m/min',
    slateNoStops: 'No deco stops',
  },

  slate: {
    show: 'Show the slate',
    title: 'Slate',
    close: 'Close',
    first: 'Dive 1',
    next: (n, interval) => `Dive ${n} · after ${interval} on the surface`,
    group: (group) => `Group ${group}`,
    turn: (bar) => `Ascend from ${bar} bar`,
  },

  gas: {
    title: 'Cylinder and gas consumption',
    fields: {
      volume: 'Cylinder (l)',
      pressure: 'Pressure (bar)',
      sac: 'SAC rate (l/min)',
      stressSac: 'Emergency rate (l/min)',
      reserve: 'Reserve (bar)',
    },
    note: 'Every dive starts from a full cylinder. The whole bottom time is counted at the greatest depth; the ascent at 10 m/min.',
    problems: {
      cylinder: 'Enter the cylinder size and pressure to see gas consumption for each dive.',
      rate: 'Enter a consumption rate greater than zero to see gas consumption for each dive.',
      reserve: 'The reserve cannot be negative.',
    },
    used: 'Used (bar)',
    left: 'Left (bar)',
    minimum: 'Min. gas (bar)',
    enough: 'Enough gas, reserve included',
    warnings: {
      insufficient: 'Not enough gas for this dive',
      'below-reserve': 'Surfacing below the reserve',
      'below-minimum-gas': 'Less than minimum gas at the bottom',
    },
    explain: (bar) =>
      `Minimum gas is the pressure two divers need to surface on one cylinder in an emergency. Start the ascent at ${bar} bar at the latest.`,
  },

  saved: {
    title: 'Saved plans',
    name: 'Plan name',
    nameHint: 'A plan with the same name is replaced.',
    save: 'Save the current plan',
    needName: 'Enter a name for the plan',
    needPlan: 'Enter depth and time first',
    emptyTitle: 'No saved plans',
    emptyHint: 'Saved plans stay on this device and work without network.',
    load: 'Load',
    loadLabel: (name) => `Load plan ${name}`,
    remove: 'Delete',
    removeLabel: (name) => `Delete plan ${name}`,
    item: (summary, date) => `${summary} · saved ${date}`,
  },

  nitrox: {
    intro:
      'Nitrox calculations with 10 m of water as 1 ata. The working limit of oxygen partial pressure is 1.4 ata; the contingency limit is 1.6 ata.',
    card: 'Nitrox calculator',
    oxygen: 'Oxygen in the mix (%)',
    oxygenError: 'Enter a value from 21 to 100%',
    depth: 'Planned depth (m)',
    depthNote: 'Depth is optional: it gives the oxygen partial pressure and the equivalent air depth.',
    over16: 'Over the contingency limit of 1.6 ata',
    over14: 'Over the working limit of 1.4 ata',
    within: 'Within the limit of 1.4 ata',
    results: 'Results for the mix',
    mod14: 'Max depth at 1.4 ata',
    mod16: 'Max depth at 1.6 ata',
    ppO2: 'Oxygen partial pressure',
    ead: 'Equivalent air depth (EAD)',
    best: 'Richest mix for this depth (1.4 ata)',
    bestValue: (percent) => `${percent}% oxygen`,
    emptyTitle: 'Enter the oxygen content',
    emptyHint: 'Air is 21%; the most common nitrox mixes are 32% and 36%.',
  },
}
