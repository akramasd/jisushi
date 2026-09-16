import type React from "react"
import type { Metadata, Viewport } from "next"
import { Cormorant_Garamond, EB_Garamond, Inter, Shippori_Mincho } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import "./globals.css"
import { SITE_URL } from "@/lib/site"

// Three tiers from the brand sheet: an elegant primary serif for display, a
// secondary serif built for body copy, and a clean sans for micro-copy.
const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-cormorant",
  display: "swap",
})
const ebGaramond = EB_Garamond({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-eb-garamond",
  display: "swap",
})
// Contact details, dates, prices — anything that must stay unambiguous small.
const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-inter",
  display: "swap",
})
// Kanji only. The Latin serifs carry no CJK glyphs.
const shippori = Shippori_Mincho({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-shippori",
  display: "swap",
})



export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Ji Sushi — En moderne japansk restaurant i Frederikshavn",
    template: "%s — Ji Sushi",
  },
  description:
    "All You Can Eat sushi og takeaway i Frederikshavn. Frisk sushi lavet til bestilling — bestil online eller ring og book bord.",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "da_DK",
    siteName: "Ji Sushi",
    title: "Ji Sushi — En moderne japansk restaurant i Frederikshavn",
    description: "All You Can Eat sushi og takeaway i Frederikshavn.",
    url: SITE_URL,
  },
}

export const viewport: Viewport = { themeColor: "#0E0F11" }

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="da"
      className={`${cormorant.variable} ${ebGaramond.variable} ${inter.variable} ${shippori.variable}`}
    >
      <body className="ji-body antialiased bg-sumi text-white">
        <a href="#indhold" className="sr-only focus:not-sr-only">Gå til indhold</a>
        {children}
        <Analytics />
      </body>
    </html>
  )
}
