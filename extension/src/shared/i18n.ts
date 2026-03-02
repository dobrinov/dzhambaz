export type Lang = "en" | "bg"

export const DEFAULT_LANG: Lang = "en"

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
    en: "No data yet. Visit mobile.bg or cars.bg search pages.",
    bg: "Няма данни. Посетете търсене в mobile.bg или cars.bg.",
  },
} as const

export type TranslationKey = keyof typeof translations

export function t(key: TranslationKey, lang: Lang): string {
  return translations[key][lang]
}
