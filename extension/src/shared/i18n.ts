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
} as const

export type TranslationKey = keyof typeof translations

export function t(key: TranslationKey, lang: Lang): string {
  return translations[key][lang]
}
