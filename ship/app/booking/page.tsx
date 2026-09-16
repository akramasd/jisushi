"use client"

import type React from "react"
import { useEffect } from "react"
import { useState } from "react"
import { Footer } from "@/components/footer"
import { AnimatedHeader } from "@/components/animated-header"
import { Phone } from "lucide-react"
import Image from "next/image"
import { SITE } from "@/lib/site"

export default function BookingPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    date: "",
    time: "",
    guests: "2",
    message: "",
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    console.log("[v0] Booking submitted:", formData)
    alert("Tak for din reservation! Vi kontakter dig snart for at bekræfte.")
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
  }

  const cloudName = "dlt6bojfp"

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" })
  }, [])

  return (
    <div className="min-h-screen bg-sumi">
      <AnimatedHeader />

      <section className="relative h-[300px] flex items-center justify-center">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-sumi">
          <Image
            src={`https://res.cloudinary.com/${cloudName}/image/upload/f_auto,q_auto/476074314_590290353868131_7759230199772088947_n_phlpv7`}
            alt="Restaurant atmosphere"
            fill
            className="object-cover opacity-40"
          />
        </div>
        <div className="relative z-10 text-center">
          <h1 className="ji-display text-[clamp(2.2rem,6.5vw,3.6rem)] text-white mb-4">Bestil Bord</h1>
          <p className="ji-body text-[17px] leading-[1.85] text-white/75">Ring til os for at reservere bord</p>
        </div>
      </section>

      <section className="max-w-3xl mx-auto px-6 py-16">
        {/* Contact Info */}
        <div className="mt-12 text-center">
          <p className="ji-body text-[16px] leading-[1.8] text-white/70 mb-4">{"Ring til os 👇🏻"}</p>
          <div className="space-y-2 text-white">
            <a
              href={SITE.phoneHref}
              className="inline-flex items-center gap-4 bg-gold text-white px-12 py-6 hover:bg-gold-lit transition-all hover:scale-105 group"
            >
              <Phone className="w-8 h-8 group-hover:rotate-12 transition-transform" />
              <span className="text-3xl">{SITE.phoneDisplay}</span>
            </a>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
