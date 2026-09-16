import type { Metadata } from "next"
import { AnimatedHeader } from "@/components/animated-header"
import { Footer } from "@/components/footer"
import StatusClient from "./status-client"

export const metadata: Metadata = {
  title: "Din bestilling",
  // A receipt link should never end up in search results.
  robots: { index: false, follow: false },
}

export default async function OrderStatusPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  return (
    <div className="min-h-screen bg-sumi text-white flex flex-col">
      <AnimatedHeader />
      <main id="indhold" className="flex-1">
        <StatusClient token={token} />
      </main>
      <Footer />
    </div>
  )
}
