import type { PlanErrorInfo } from '../tables/errors'
import type { GasSettingsProblem, GasWarning } from '../tables/gasPlan'
import type { RdpWarning } from '../tables/rdp'

const number = (value: number, digits: number) => value.toFixed(digits).replace('.', ',')

function planError(info: PlanErrorInfo): string {
  switch (info.code) {
    case 'depth-nonpositive':
      return 'Głębokość musi być większa od zera'
    case 'time-nonpositive':
      return 'Czas musi być większy od zera'
    case 'depth-range':
      return `Głębokość ${info.depth} m jest poza zakresem tabeli (maks. ${info.max} m)`
    case 'time-range':
      return `Czas ${info.time} min jest poza zakresem tabeli dla ${info.tableDepth} m (maks. ${info.max} min)`
    case 'penalty':
      return `${info.time} min + ${info.penalty} min zwiększenia czasu podstawowego = ${info.time + info.penalty} min. ${planError(info.inner)}`
    case 'over-limit':
      return `Czas ${info.time} min przekracza limit bezdekompresyjny ${info.limit} min dla ${info.tableDepth} m`
    case 'dive-over-limit':
      return `Nurkowanie ${info.dive}: ${info.time} min + ${info.residual} min azotu resztkowego przekracza limit ${info.limit} min dla ${info.tableDepth} m`
    case 'group-at-depth':
      return `Z grupą ${info.group} nie można nurkować na ${info.tableDepth} m`
    case 'unknown-group':
      return `Nieznana grupa ciśnieniowa ${info.group}`
    case 'no-transition':
      return `Z grupy ${info.from} nie da się przejść do grupy ${info.to}`
  }
}

export const pl = {
  locale: 'pl-PL',
  number,
  planError,
  duration: (h: number, m: number) => (h === 0 ? `${m} min` : m === 0 ? `${h} h` : `${h} h ${m} min`),

  app: {
    title: 'Planer nurkowań',
    tabsLabel: 'Rodzaj planowania',
    tabNoDeco: 'Bez deko',
    tabDeco: 'Z deko',
    tabNitrox: 'Nitrox',
    language: 'Język',
    footer:
      'Tabele przepisane ze skanów: przed nurkowaniem porównaj wynik z papierową tabelą. Aplikacja nie zastępuje szkolenia ani komputera nurkowego.',
    noticeTitle: 'Zanim zaczniesz',
    noticeLead: 'SailRock pomaga planować nurkowania według tabel RDP i Bühlmanna/Hahna.',
    noticePoints: [
      'Tabele zostały przepisane ze skanów. Każdy plan porównaj z papierową tabelą.',
      'Aplikacja nie zastępuje szkolenia, komputera nurkowego ani planowania z partnerem.',
      'Planuj w granicach swoich uprawnień.',
    ],
    noticeOk: 'Rozumiem',
  },

  dive: {
    heading: (n: number) => `Nurkowanie ${n}`,
    remove: 'Usuń',
    removeLabel: (n: number) => `Usuń nurkowanie ${n}`,
    depth: 'Głębokość (m)',
    time: 'Czas denny (min)',
    emptyFirst: 'Podaj głębokość i czas',
    emptyNext: 'Podaj godziny, głębokość i czas',
    emptyHint: 'Wynik pojawi się od razu po wpisaniu wszystkich wartości.',
    blocked: 'Najpierw popraw poprzednie nurkowanie',
    clear: 'Wyczyść plan',
    changed: 'Plan został zmieniony.',
    undo: 'Cofnij ostatnią zmianę',
    details: 'Szczegóły odczytu',
    group: 'Grupa',
  },

  interval: {
    label: 'Przerwa na powierzchni',
    end: 'Koniec poprzedniego',
    start: 'Początek tego',
    result: (text: string) => `Przerwa na powierzchni: ${text}.`,
    hint: 'Podaj godzinę wynurzenia z poprzedniego nurkowania i godzinę zanurzenia w tym.',
  },

  rdp: {
    intro: (rate: number) =>
      `Planer nurkowania rekreacyjnego (RDP) tylko dla nurkowań bezdekompresyjnych. Wynurzaj się nie szybciej niż ${rate} m/min. Każde nurkowanie powtórzeniowe planuj płycej niż poprzednie.`,
    gas: 'Gaz',
    air: 'Powietrze',
    cold: 'Zimna woda lub trudne warunki',
    coldHint: 'Plan liczony jak dla głębokości o 4 m większej.',
    margin: 'Zapas',
    maxTime: 'Maks. czas',
    minutes: (n: number) => `${n} min`,
    stopRequired: 'Przystanek bezpieczeństwa wymagany',
    stopRecommended: 'Przystanek bezpieczeństwa zalecany',
    atLimit: 'Na granicy limitu',
    tableDepth: 'Głębokość w tabeli',
    limit: 'Limit bezdekompresyjny',
    safetyStop: 'Przystanek bezpieczeństwa',
    safetyStopValue: (minutes: number, depth: number) => `${minutes} min na ${depth} m`,
    groupBefore: 'Grupa po przerwie',
    residual: 'Czas azotu resztkowego',
    adjusted: 'Zaktualizowany limit',
    total: 'Czas łączny (rzeczywisty + resztkowy)',
    ppO2: 'Ciśnienie parcjalne tlenu',
    blockedHint: 'Nurkowanie powtórzeniowe liczy się od grupy ciśnieniowej poprzedniego.',
    errorTitle: 'Plan wychodzi poza tabelę RDP',
    errorHint:
      'RDP nie służy do planowania nurkowań dekompresyjnych: skróć czas, zmniejsz głębokość albo wydłuż przerwę.',
    add: 'Dodaj nurkowanie powtórzeniowe',
    slateTitle: (gas: string) => `RDP, ${gas}`,
    slateMax: (n: number) => `Maks. ${n} min`,
    slateStop: (minutes: number, depth: number, required: boolean) =>
      `Przystanek ${minutes}′ na ${depth} m${required ? ' (wymagany)' : ''}`,
    warnings: {
      'deeper-than-previous': 'Nurkowanie powtórzeniowe jest głębsze niż poprzednie; planuj od najgłębszego.',
      'repetitive-deeper-than-30': 'Nurkowania powtórzeniowe ogranicz do 30 m lub płycej.',
      'deeper-than-40': 'Nie nurkuj głębiej niż 40 m; 42 m jest w tabeli tylko na sytuacje awaryjne.',
      'wx-interval': 'Po grupie W lub X minimalna przerwa między wszystkimi kolejnymi nurkowaniami to 1 godzina.',
      'yz-interval': 'Po grupie Y lub Z minimalna przerwa między wszystkimi kolejnymi nurkowaniami to 3 godziny.',
      'continuity-only-depth':
        'Ta głębokość jest w tabeli tylko dla ciągłości planowania: ciśnienie parcjalne tlenu przekracza 1,4 ata.',
      'at-limit': 'Plan sięga limitu bezdekompresyjnego. Nigdy nie nurkuj do granic tabeli.',
    } satisfies Record<RdpWarning, string>,
  },

  deco: {
    intro: (rate: number) =>
      `Tabela wynurzania Bühlmann/Hahn dla akwenów 0–250 m n.p.m. Czas liczony od zanurzenia do rozpoczęcia wynurzania, prędkość wynurzania ${rate} m/min. Aplikacja bierze pierwszą większą głębokość i pierwszy dłuższy czas z tabeli.`,
    decompression: 'Dekompresja',
    none: 'brak',
    ascent: 'Wynurzenie',
    decoDive: 'Nurkowanie dekompresyjne',
    noStops: 'Bez przystanków dekompresyjnych',
    beyond: 'Poza uprawnieniami AOWD + nitrox',
    stops: 'Przystanki dekompresyjne',
    stopDepth: 'Głębokość',
    stopTime: 'Czas',
    row: 'Odczyt z tabeli',
    rowValue: (depth: number, time: number) => `${depth} m / ${time} min`,
    noStop: 'Czas bezdekompresyjny',
    penalty: 'Zwiększenie czasu podstawowego',
    penaltyFirst: '0 min — przerwa na tyle długa, że to nurkowanie liczy się jako pierwsze',
    penaltyPrevious: (n: number) =>
      `${n} min — przerwa krótsza niż najmniejsza w tabeli, dodany czas poprzedniego nurkowania`,
    ascentValue: (rate: number) => `${rate} m/min + przystanki`,
    beyondNote: (deep: boolean, deco: boolean) =>
      `Plan wychodzi poza uprawnienia AOWD + nitrox: ${[deep && 'głębokość ponad 30 m', deco && 'obowiązkowa dekompresja'].filter(Boolean).join(' i ')}.`,
    blockedHint: 'Nurkowanie powtórne liczy się od grupy powtórzeń poprzedniego.',
    errorTitle: 'Tego nurkowania nie ma w tabeli',
    errorHint: 'Tabeli nie wolno interpolować ani przedłużać: skróć czas albo zmniejsz głębokość.',
    add: 'Dodaj nurkowanie powtórne',
    slateTitle: 'Bühlmann/Hahn, 0–250 m n.p.m., wynurzanie 10 m/min',
    slateNoStops: 'Bez przystanków deko',
  },

  slate: {
    show: 'Pokaż tabliczkę',
    title: 'Tabliczka',
    close: 'Zamknij',
    first: 'Nurkowanie 1',
    next: (n: number, interval: string) => `Nurkowanie ${n} · po ${interval} przerwy`,
    group: (group: string) => `Grupa ${group}`,
    turn: (bar: number) => `Wynurzenie od ${bar} bar`,
  },

  gas: {
    title: 'Butla i zużycie gazu',
    fields: {
      volume: 'Butla (l)',
      pressure: 'Ciśnienie (bar)',
      sac: 'Zużycie SAC (l/min)',
      stressSac: 'Zużycie awaryjne (l/min)',
      reserve: 'Rezerwa (bar)',
    },
    note: 'Każde nurkowanie liczone jest z pełnej butli. Cały czas denny liczony na największej głębokości, wynurzanie 10 m/min.',
    problems: {
      cylinder: 'Podaj pojemność i ciśnienie butli, żeby zobaczyć zużycie gazu przy nurkowaniach.',
      rate: 'Podaj zużycie gazu większe od zera, żeby zobaczyć zużycie gazu przy nurkowaniach.',
      reserve: 'Rezerwa nie może być ujemna.',
    } satisfies Record<GasSettingsProblem, string>,
    used: 'Zużycie (bar)',
    left: 'Zostanie (bar)',
    minimum: 'Min. gas (bar)',
    enough: 'Gazu wystarczy z rezerwą',
    warnings: {
      insufficient: 'Za mało gazu na to nurkowanie',
      'below-reserve': 'Wynurzenie poniżej rezerwy',
      'below-minimum-gas': 'Na dnie mniej niż minimum gas',
    } satisfies Record<GasWarning, string>,
    explain: (bar: number) =>
      `Minimum gas to ciśnienie potrzebne na awaryjne wynurzenie dwóch nurków z jednej butli. Wynurzanie zacznij najpóźniej przy ${bar} bar.`,
  },

  saved: {
    title: 'Zapisane plany',
    name: 'Nazwa planu',
    nameHint: 'Plan o tej samej nazwie zostanie zastąpiony.',
    save: 'Zapisz bieżący plan',
    needName: 'Podaj nazwę planu',
    needPlan: 'Najpierw wpisz głębokość i czas',
    emptyTitle: 'Brak zapisanych planów',
    emptyHint: 'Zapisane plany zostają na tym urządzeniu i działają bez internetu.',
    load: 'Wczytaj',
    loadLabel: (name: string) => `Wczytaj plan ${name}`,
    remove: 'Usuń',
    removeLabel: (name: string) => `Usuń plan ${name}`,
    item: (summary: string, date: string) => `${summary} · zapisano ${date}`,
  },

  nitrox: {
    intro:
      'Obliczenia dla nitroksu przy założeniu 10 m wody = 1 ata. Limit roboczy ciśnienia parcjalnego tlenu to 1,4 ata, limit awaryjny 1,6 ata.',
    card: 'Kalkulator nitroksu',
    oxygen: 'Tlen w mieszance (%)',
    oxygenError: 'Podaj wartość od 21 do 100%',
    depth: 'Planowana głębokość (m)',
    depthNote: 'Głębokość jest opcjonalna: służy do policzenia ciśnienia parcjalnego tlenu i EAD.',
    over16: 'Ponad limit awaryjny 1,6 ata',
    over14: 'Ponad limit roboczy 1,4 ata',
    within: 'W limicie 1,4 ata',
    results: 'Wyniki dla mieszanki',
    mod14: 'Maks. głębokość przy 1,4 ata',
    mod16: 'Maks. głębokość przy 1,6 ata',
    ppO2: 'Ciśnienie parcjalne tlenu',
    ead: 'Równoważna głębokość powietrzna (EAD)',
    best: 'Najbogatsza mieszanka na tę głębokość (1,4 ata)',
    bestValue: (percent: number) => `${percent}% tlenu`,
    emptyTitle: 'Podaj zawartość tlenu',
    emptyHint: 'Powietrze to 21%, najczęstsze nitroksy to 32% i 36%.',
  },
}

export type Dictionary = typeof pl
