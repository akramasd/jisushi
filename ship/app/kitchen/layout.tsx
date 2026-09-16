import type { Metadata } from "next"

/** Staff-only surface — never surface it in search results. */
export const metadata: Metadata = {
  title: "Køkken",
  robots: { index: false, follow: false },
}

export default function KitchenLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
