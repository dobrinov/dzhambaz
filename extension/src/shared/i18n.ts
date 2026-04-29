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

  // Popup guidance states
  popupGuideStep: { en: "Step", bg: "Стъпка" },
  popupGuideOpenSiteEyebrow: { en: "Get started", bg: "Да започнем" },
  popupGuideOpenSiteTitle: {
    en: "Open mobile.bg or cars.bg",
    bg: "Отвори mobile.bg или cars.bg",
  },
  popupGuideOpenSiteBody: {
    en: "Джамбаз reads listings from these sites. Open one and run a search to see real market prices.",
    bg: "Джамбаз чете обяви от тези сайтове. Отвори единия и направи търсене, за да видиш реалните пазарни цени.",
  },
  popupGuideSearchEyebrow: { en: "Almost there", bg: "Почти готово" },
  popupGuideSearchTitle: { en: "Run a search", bg: "Направи търсене" },
  popupGuideSearchBody: {
    en: "Pick a make, model, and filters on this page. The Джамбаз panel opens on the right with stats and price flags.",
    bg: "Избери марка, модел и филтри на тази страница. Панелът на Джамбаз се отваря отдясно със статистика и флагове за цени.",
  },
  popupScanningTitle: { en: "Scanning…", bg: "Сканиране…" },
  popupScanningBody: {
    en: "Reading listings from this search. Stats will appear here in a moment.",
    bg: "Чета обявите от това търсене. Статистиката ще се появи след малко.",
  },

  // Welcome page (tabs/welcome)
  welcomeEyebrow: {
    en: "Installed · Ready to go",
    bg: "Инсталиран · Готов за работа",
  },
  welcomeHeroTitle: {
    en: "Welcome to",
    bg: "Добре дошли в",
  },
  welcomeHeroAccent: { en: "Джамбаз", bg: "Джамбаз" },
  welcomeLede: {
    en: "Open mobile.bg or cars.bg, run a search, and Джамбаз will tell you the real market price — instantly, in your browser.",
    bg: "Отвори mobile.bg или cars.bg, направи търсене и Джамбаз ще ти каже реалната пазарна цена — мигновено, в браузъра.",
  },
  welcomeOpenMobileBg: { en: "Open mobile.bg", bg: "Отвори mobile.bg" },
  welcomeOpenCarsBg: { en: "Open cars.bg", bg: "Отвори cars.bg" },
  welcomeSupportedLabel: { en: "Works on", bg: "Работи на" },

  welcomeStepsKicker: { en: "Quick start", bg: "Бърз старт" },
  welcomeStepsTitle: { en: "Three steps to a fair price", bg: "Три стъпки до справедлива цена" },
  welcomeStepsLede: {
    en: "No setup, no signup. Just browse like you normally would.",
    bg: "Без настройка, без регистрация. Просто разглеждай както обикновено.",
  },
  welcomeStep1Title: { en: "Open a supported site", bg: "Отвори поддържан сайт" },
  welcomeStep1Body: {
    en: "Go to mobile.bg or cars.bg. The extension wakes up automatically — no toolbar clicking needed.",
    bg: "Отиди на mobile.bg или cars.bg. Разширението се събужда автоматично — без нужда от клик в лентата.",
  },
  welcomeStep2Title: { en: "Run a search", bg: "Направи търсене" },
  welcomeStep2Body: {
    en: "Pick a make, model, and any filters you want. Use the site's normal search form.",
    bg: "Избери марка, модел и каквито филтри искаш. Използвай обичайното търсене на сайта.",
  },
  welcomeStep3Title: { en: "Read the verdict", bg: "Прочети присъдата" },
  welcomeStep3Body: {
    en: "The Джамбаз panel slides in on the right with median, distribution, and a flag on every listing — under, fair, over, or outlier.",
    bg: "Панелът на Джамбаз се появява отдясно с медиана, разпределение и флаг на всяка обява — под, справедлива, над или аутлайер.",
  },

  welcomePrivacyKicker: { en: "Local by design", bg: "Локално по подразбиране" },
  welcomePrivacyTitle: { en: "Your searches stay on your machine", bg: "Търсенията остават на твоя компютър" },
  welcomePrivacyBody: {
    en: "Джамбаз reads listings only from the page you're already viewing. Nothing is sent to third parties — no tracking, no accounts, no ads.",
    bg: "Джамбаз чете обяви само от страницата, която вече разглеждаш. Нищо не се изпраща до трети страни — без проследяване, без акаунти, без реклами.",
  },
  welcomePrivacyBullet1: { en: "No accounts or signup", bg: "Без акаунти или регистрация" },
  welcomePrivacyBullet2: { en: "No tracking pixels", bg: "Без проследяващи пиксели" },
  welcomePrivacyBullet3: { en: "Stats computed locally", bg: "Статистиката се смята локално" },

  welcomeFooterTip: {
    en: "Tip: pin Джамбаз in the Chrome toolbar for one-click access to combined stats.",
    bg: "Съвет: закачи Джамбаз в лентата на Chrome за бърз достъп до обединената статистика.",
  },
  welcomeGetStarted: { en: "Get started", bg: "Започни" },

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
  emptyTitleLine1: { en: "Tell me what you're", bg: "Кажи ми какво" },
  emptyTitleAccent: { en: "hunting", bg: "търсиш" },
  emptyTitleAfterAccent: { en: " for, I'll", bg: ", аз" },
  emptyTitleLine3: { en: "find the truth.", bg: "намирам истината." },
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

  // Share
  share: { en: "Share", bg: "Сподели" },

  // Settings
  settingsTitle: { en: "Settings", bg: "Настройки" },
  settingsBehavior: { en: "Behavior", bg: "Поведение" },
  settingsData: { en: "Data", bg: "Данни" },
  settingAutoOpen: { en: "Auto-open on new search", bg: "Отвори при ново търсене" },
  settingAutoOpenDescOn: {
    en: "On — when you change make, model, or filters, the panel opens automatically.",
    bg: "Вкл. — при смяна на марка, модел или филтри, панелът се отваря автоматично.",
  },
  settingAutoOpenDescOff: {
    en: "Off — the panel stays as you left it. Open it manually with the icon.",
    bg: "Изкл. — панелът остава както е. Отвори го ръчно с иконата.",
  },
  settingCrossSite: { en: "Scan the other site too", bg: "Сканирай и другия сайт" },
  settingCrossSiteDescOn: {
    en: "On — scanning both mobile.bg and cars.bg, so stats use the full sample. Slower, but more data.",
    bg: "Вкл. — сканираме и mobile.bg, и cars.bg, статистиката е от двата. По-бавно, но повече данни.",
  },
  settingCrossSiteDescOff: {
    en: "Off — only scanning the site you're on. Faster, but smaller sample.",
    bg: "Изкл. — сканираме само сайта, който гледаш. По-бързо, но по-малко данни.",
  },
  settingNewTab: { en: "Open listings in a new tab", bg: "Обяви в нов таб" },
  settingNewTabDescOn: {
    en: "On — clicking a listing opens it in a new tab. Your search stays put.",
    bg: "Вкл. — кликването на обява я отваря в нов таб. Търсенето остава.",
  },
  settingNewTabDescOff: {
    en: "Off — clicking a listing replaces the current tab. Use Back to return.",
    bg: "Изкл. — кликването зарежда обявата в текущия таб. Назад за връщане.",
  },
  settingOutlierAlerts: { en: "Show outlier alerts", bg: "Показвай аутлайер флагове" },
  settingOutlierAlertsDescOn: {
    en: "On — the Stats tab calls out listings that look like price typos or scams.",
    bg: "Вкл. — табът Статистика откроява обяви, които приличат на грешки в цената или скам.",
  },
  settingOutlierAlertsDescOff: {
    en: "Off — outliers still appear in the list, just without a separate callout.",
    bg: "Изкл. — аутлайерите остават в списъка, но без отделен флаг.",
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
