/** Single source of truth for the restaurant's details. */
export const SITE = {
  name: 'Ji Sushi',
  tagline: 'En moderne japansk restaurant',
  street: 'Lodsgade 10',
  city: '9900 Frederikshavn',
  phoneDisplay: '31 33 44 86',
  phoneHref: 'tel:+4531334486',
  email: 'info@jisushi.dk',
  founded: 2023,
  facebook: 'https://www.facebook.com/people/Ji-Sushi-Frederikshavn/100086615153169/',
  /** Fødevarestyrelsen kontrolrapport — a trust signal Danish guests look for. */
  smiley: 'https://www.findsmiley.dk/1272682',
  mapsUrl:
    'https://www.google.com/maps/search/?api=1&query=' +
    encodeURIComponent('Ji Sushi, Lodsgade 10, 9900 Frederikshavn'),
}

/** Canonical origin. One definition, used by layout, robots and sitemap alike. */
/**
 * Business identification.
 *
 * Danish e-commerce law (e-handelsloven §7) requires a trading business to show
 * its legal name, address, email, phone and CVR number on the site. The CVR is
 * the one value only the owner has — set it before launch.
 */
export const COMPANY = {
  /**
   * The legal entity, not the trade name.
   *
   * CVR 32325971 registers "Ji Sushi" (Lodsgade 10, 9900 Frederikshavn) as a
   * production unit of RESTAURANT ASIA ApS, trading since 20.09.2022. A privacy
   * policy names the data controller, which is the company — so both appear.
   *
   * Verified against three independent sources (Proff, VORES Frederikshavn,
   * a public job listing). Worth a glance at virk.dk if the company is ever
   * restructured.
   */
  legalName: 'RESTAURANT ASIA ApS',
  tradingAs: 'Ji Sushi',
  cvr: '32325971',
  pNumber: '1028594441',
} as const

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.jisushi.dk'

/**
 * Schema.org Restaurant data. Google reads this for the local-business panel —
 * for a restaurant it is worth more than most on-page SEO.
 *
 * Takes the raw HOURS table rather than the display strings. The display form
 * is "Mandag – Torsdag 12:00 – 21:00", which is not valid schema.org: the spec
 * wants two-letter English day codes and a hyphen with no spaces. Emitting the
 * Danish version produced structured data Google silently discards, which looks
 * identical to having none at all.
 */
const SCHEMA_DAY = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export function restaurantJsonLd(
  hours: { weekday: number; opens: string; closes: string }[],
) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Restaurant',
    name: SITE.name,
    description: SITE.tagline,
    url: SITE_URL,
    telephone: SITE.phoneHref.replace('tel:', ''),
    email: SITE.email,
    servesCuisine: ['Japanese', 'Sushi'],
    priceRange: '$$',
    currenciesAccepted: 'DKK',
    paymentAccepted: 'Cash, Credit Card',
    address: {
      '@type': 'PostalAddress',
      streetAddress: SITE.street,
      postalCode: SITE.city.split(' ')[0],
      addressLocality: SITE.city.split(' ').slice(1).join(' '),
      addressCountry: 'DK',
    },
    sameAs: [SITE.facebook, SITE.smiley],
    hasMenu: `${SITE_URL}/menu`,
    acceptsReservations: `${SITE_URL}/booking`,
    // The structured form, which Google actually parses.
    openingHoursSpecification: hours.map((h) => ({
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: `https://schema.org/${SCHEMA_DAY[h.weekday]}`,
      opens: h.opens,
      closes: h.closes,
    })),
    potentialAction: {
      '@type': 'OrderAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${SITE_URL}/takeaway`,
        inLanguage: 'da-DK',
        actionPlatform: [
          'https://schema.org/DesktopWebPlatform',
          'https://schema.org/MobileWebPlatform',
        ],
      },
      deliveryMethod: ['https://schema.org/OnSitePickup'],
    },
  }
}

/** Danish thousands separator: 1.200 kr, not 1,200 kr. */
export const kr = (n: number) => n.toLocaleString('da-DK')

const CLD = 'https://res.cloudinary.com/dwvvmlteg/image/upload'
export const PHOTOS = {
  logo: `${CLD}/v1/Ji_sushi_logo_1_1_1_fde41q`,
  hero: `${CLD}/f_auto,q_auto,w_1800/Sushi_4_woejxb`,
  platter: `${CLD}/f_auto,q_auto,w_1400/476297839_589640257266474_4179298734876294183_n_adivfr`,
}

/** The scanned paper menu pages already used across the site. */
export const MENU_SCANS = [
  { id: 'Forretter_kvutea', label: 'Forretter, side 1' },
  { id: 'Forretter_2_ryw2rw', label: 'Forretter, side 2' },
  { id: 'sticks_uxx5vx', label: 'Sticks' },
  { id: 'Sashimi_skda8x', label: 'Sashimi' },
  { id: 'Toppet_maki_ltklnu', label: 'Toppet maki, side 1' },
  { id: 'Toppet_maki_2_ybkguw', label: 'Toppet maki, side 2' },
  { id: 'Uramaki_n48trl', label: 'Uramaki' },
  { id: 'Hosomaki_shmref', label: 'Hosomaki' },
  { id: 'Fotomaki_two9ad', label: 'Futomaki' },
  { id: 'Nigiri_ykxytp', label: 'Nigiri, side 1' },
  { id: 'Nigiri_2_ppwe4q', label: 'Nigiri, side 2' },
  { id: 'Rispapir_ruller_i3hhwf', label: 'Rispapir ruller' },
  { id: 'SUSHI_menu_br076r', label: 'Sushi, side 1' },
  { id: 'Sushi_menu_2_hk8ue4', label: 'Sushi, side 2' },
  { id: 'Sushi_box_gcpqni', label: 'Sushi box, side 1' },
  { id: 'Sushi_box_2_sjghga', label: 'Sushi box, side 2' },
  { id: 'Sushi_box_3_uat700', label: 'Sushi box, side 3' },
  { id: 'tilbeh%C3%B8r_zef9ge', label: 'Tilbehør' },
]
export const scanUrl = (id: string, w = 1200) =>
  `${CLD}/f_auto,q_auto,w_${w}/${id}`
