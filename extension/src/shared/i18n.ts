export type Lang = "en" | "bg"

export const DEFAULT_LANG: Lang = "bg"

const translations = {
  // Panel
  stats: { en: "Stats", bg: "Статистика" },
  listings: { en: "Listings", bg: "Обяви" },
  totalListings: { en: "Total Listings", bg: "Общо обяви" },
  medianPrice: { en: "Median Price", bg: "Медианна цена" },
  medianKm: { en: "Median km", bg: "Медианни км" },
  priceEur: { en: "Price (EUR)", bg: "Цена (EUR)" },
  mileageKm: { en: "Mileage (km)", bg: "Пробег (км)" },
  noData: { en: "Not enough data", bg: "Недостатъчно данни" },
  noListings: { en: "No listings collected yet", bg: "Все още няма обяви" },
  navigateToSearch: {
    en: "Navigate to a search results page to see stats",
    bg: "Отворете страница с резултати, за да видите статистика",
  },
  showAll: { en: "Show all", bg: "Покажи всички" },

  // Sort
  price: { en: "Price", bg: "Цена" },
  year: { en: "Year", bg: "Година" },
  mileage: { en: "Mileage", bg: "Пробег" },

  // Range chart
  median: { en: "Median", bg: "Медиана" },

  // Market position labels
  greatDeal: { en: "Great deal", bg: "Страхотна цена" },
  goodPrice: { en: "Good price", bg: "Добра цена" },
  aboveMedian: { en: "Above median", bg: "Над медианата" },
  expensive: { en: "Expensive", bg: "Скъпа" },
  noPriceData: { en: "No price data", bg: "Няма данни за цена" },

  // Badge tooltip
  pricePosition: { en: "Price position", bg: "Позиция по цена" },
  mileagePosition: { en: "Mileage position", bg: "Позиция по пробег" },

  // Popup
  combinedListings: { en: "Combined Listings", bg: "Обединени обяви" },
  source: { en: "Source", bg: "Източник" },
  title: { en: "Title", bg: "Заглавие" },
  noDataYet: {
    en: "No data yet. Open a car listings search page.",
    bg: "Няма данни. Отворете страница с резултати от търсене на автомобили.",
  },

  // Price my car tab
  priceMyCar: { en: "Price my car", bg: "Оцени моята" },
  yourCar: { en: "Your car", bg: "Вашата кола" },
  yourMileage: { en: "Mileage (km)", bg: "Пробег (км)" },
  yourYear: { en: "Year (optional)", bg: "Година (по желание)" },
  urgency: { en: "How fast do you want to sell?", bg: "Колко бързо искате да продадете?" },
  urgencyPatient: { en: "Patient", bg: "Търпелив" },
  urgencyBalanced: { en: "Balanced", bg: "Балансирано" },
  urgencyUrgent: { en: "Urgent", bg: "Спешно" },
  condition: { en: "General condition", bg: "Общо състояние" },
  conditionPoor: { en: "Poor", bg: "Лошо" },
  conditionExcellent: { en: "Excellent", bg: "Отлично" },
  extras: { en: "Level of extras", bg: "Ниво екстри" },
  extrasBare: { en: "Bare", bg: "Базови" },
  extrasLoaded: { en: "Loaded", bg: "С всички" },
  recommendedAsk: { en: "Recommended ask", bg: "Препоръчителна цена" },
  quickSale: { en: "Quick sale", bg: "Бърза продажба" },
  fairAsk: { en: "Fair ask", bg: "Честна цена" },
  patientAsk: { en: "Patient", bg: "Търпелива" },
  basedOn: { en: "Based on", bg: "На базата на" },
  comparables: { en: "comparables", bg: "подобни обяви" },
  confidenceLow: { en: "Low confidence", bg: "Ниска точност" },
  confidenceMedium: { en: "Medium confidence", bg: "Средна точност" },
  confidenceHigh: { en: "High confidence", bg: "Висока точност" },
  yearBandApplied: { en: "± years", bg: "± години" },
  yearBandDropped: { en: "Year filter dropped (too few matches)", bg: "Филтърът по година е пропуснат" },
  perKmDepreciation: { en: "Depreciation", bg: "Амортизация" },
  perKmUnit: { en: "/km", bg: "/км" },
  similarListings: { en: "Most similar listings", bg: "Най-подобни обяви" },
  enterMileage: { en: "Enter your mileage to get a recommendation", bg: "Въведете пробег за препоръка" },
  notEnoughData: { en: "Not enough comparables yet — wait for the crawl to finish", bg: "Недостатъчно данни — изчакайте обходването" },

  // Welcome / empty state
  welcomeTitle: { en: "Start with a search", bg: "Започнете с търсене" },
  welcomeBody: {
    en: "Pick a make, model, and filters. We'll analyze the matching listings and recommend a fair price for your car.",
    bg: "Изберете марка, модел и филтри. Ще анализираме подходящите обяви и ще ви предложим справедлива цена за вашия автомобил.",
  },

  // Empty state (new, redesigned)
  emptyEyebrow: { en: "Ready to analyze", bg: "Готов за анализ" },
  emptyTitle: {
    en: "Tell me what you're<br/><em>hunting</em> for, I'll<br/>find the truth.",
    bg: "Кажи ми какво<br/><em>търсиш</em>, аз<br/>намирам истината.",
  },
  emptyBodyBefore: { en: "Open a search on", bg: "Отвори търсене в" },
  emptyBodyOr: { en: "or", bg: "или" },
  emptyBodyAfter: {
    en: ". Джамбаз will scan every listing, compute the fair price, and flag who's trying to cheat you.",
    bg: ". Джамбаз ще сканира всичките обяви, ще пресметне справедливата цена и ще флагира кой се опитва да те излъже.",
  },
  emptyBullet1: { en: "Median price and distribution", bg: "Медианна цена и разпределение" },
  emptyBullet2: { en: "Valuation for your car ± confidence", bg: "Оценка за твоята кола ± доверие" },
  emptyBullet3: { en: "Similar listings, sorted by deal", bg: "Подобни обяви, сортирани по сделка" },
  emptyBullet4: { en: "Flag for suspiciously low prices", bg: "Флаг за подозрително занижени цени" },
  emptyFoot: { en: "local analysis · no data to third parties", bg: "локален анализ · без данни към трети страни" },

  // Scan bar
  scan: { en: "scan", bg: "скан" },

  // Stats tab
  market: { en: "Market", bg: "Пазар" },
  base: { en: "Sample", bg: "База" },
  listingsShort: { en: "listings", bg: "обяви" },
  rangeShort: { en: "range", bg: "диапазон" },
  medianYear: { en: "Median year", bg: "Медианна година" },

  // Insight callout
  insightTitle: { en: "Suspicious listing", bg: "Подозрителна обява" },
  insightBody1: {
    en: "listing flagged as an outlier — likely a price typo or scam.",
    bg: "обява е флагирана като аутлайер — вероятно грешка в цената или скам.",
  },
  insightBodyN: {
    en: "listings flagged as outliers — likely price typos or scams.",
    bg: "обяви са флагирани като аутлайери — вероятно грешки в цената или скам.",
  },

  // Listings tab — verdicts
  under: { en: "under market", bg: "под пазара" },
  fair: { en: "fair", bg: "справедлива" },
  over: { en: "over market", bg: "над пазара" },
  outlier: { en: "outlier", bg: "аутлайер" },
  sort: { en: "Sort", bg: "Сорт." },
  sortDeal: { en: "Deal", bg: "Сделка" },
  filter: { en: "Filter", bg: "Филтър" },
  filterAll: { en: "All", bg: "Всички" },
  filterDeals: { en: "Deals", bg: "Сделки" },
  filterOutliers: { en: "Outliers", bg: "Аутлайери" },

  // Price mine
  yourMileageShort: { en: "Mileage", bg: "Пробег" },
  yourYearShort: { en: "Year", bg: "Година" },
  optionalShort: { en: "opt.", bg: "опц." },
  confidenceLabel: { en: "Confidence", bg: "Доверие" },

  // Settings
  settingsTitle: { en: "Settings", bg: "Настройки" },
  settingsBehavior: { en: "Behavior", bg: "Поведение" },
  settingsData: { en: "Data", bg: "Данни" },
  settingAutoOpen: { en: "Auto-open on new search", bg: "Отвори при ново търсене" },
  settingAutoOpenDesc: {
    en: "When you change the search criteria, the drawer opens automatically.",
    bg: "При промяна на търсенето, панелът се отваря автоматично.",
  },
  settingCrossSite: { en: "Scan the other site too", bg: "Сканирай и другия сайт" },
  settingCrossSiteDesc: {
    en: "Also crawl mobile.bg when you're on cars.bg, and vice versa.",
    bg: "Обходи и mobile.bg когато си на cars.bg, и обратно.",
  },
  settingNewTab: { en: "Open listings in a new tab", bg: "Обяви в нов таб" },
  settingNewTabDesc: {
    en: "Off — clicking a listing replaces the current tab.",
    bg: "Изкл. — кликването зарежда обявата в текущия таб.",
  },
  settingOutlierAlerts: { en: "Show outlier alerts", bg: "Показвай аутлайер флагове" },
  settingOutlierAlertsDesc: {
    en: "Highlight suspicious listings in the Stats tab.",
    bg: "Отбелязва подозрителни обяви в таба Статистика.",
  },
  settingClearData: { en: "Clear cached listings", bg: "Изчисти запазените обяви" },
  settingClearDataDesc: {
    en: "Forgets the last crawl so the next search starts fresh.",
    bg: "Забравя последното обхождане — следващото ще започне на чисто.",
  },
  settingsBackLabel: { en: "Back", bg: "Назад" },
  settingsFoot: {
    en: "Preferences stored locally — never transmitted.",
    bg: "Настройките се пазят локално — не се изпращат никъде.",
  },
} as const

export type TranslationKey = keyof typeof translations

export function t(key: TranslationKey, lang: Lang): string {
  return translations[key][lang]
}
