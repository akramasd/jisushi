"use client"

import { useEffect } from "react"
import { AnimatedHeader } from "@/components/animated-header"
import { Footer } from "@/components/footer"
import { Mail } from "lucide-react"
import { SITE } from "@/lib/site"

export default function JobsPage() {
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" })
  }, [])

  return (
    <div className="min-h-screen bg-sumi text-white flex flex-col">
      <AnimatedHeader />

      <main className="flex-1 flex items-center justify-center px-6 py-20">
        <div className="text-center">
          <Mail className="w-16 h-16 text-gold mx-auto mb-8" />
          <h1 className="ji-display text-[clamp(2.2rem,6.5vw,3.6rem)] mb-6 text-white">Send din ansøgning til</h1>
          <a
            href={`mailto:${SITE.email}`}
            className="text-4xl md:text-5xl text-white hover:text-gold transition-colors"
          >
            {SITE.email}
          </a>
        </div>
      </main>

      <Footer />
    </div>
  )
}
