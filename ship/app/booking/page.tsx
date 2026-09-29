"use client"

import type React from "react"
import { useEffect, useRef, useState } from "react"
import { Footer } from "@/components/footer"
import { AnimatedHeader } from "@/components/animated-header"
import { Phone } from "lucide-react"
import Image from "next/image"
import { SITE } from "@/lib/site"
import {
  newIdempotencyKey,
  networkMessage,
  postJson,
} from "@/lib/net"

type ReservationResponse = {
  ok: boolean
  error?: string
  reservationNo?: number
  status?: string
  reservedAt?: string
  demo?: boolean
  date?: string
  time?: string
  guests?: number
}

const IS_DEMO =
  process.env.NEXT_PUBLIC_PREPNEST_DEMO_MODE === "1"

// Ejerens live-writes flag: reservationer er RIGTIGE og sendes til live.
const IS_DEMO_LIVE_WRITES =
  process.env.NEXT_PUBLIC_PREPNEST_DEMO_LIVE_WRITES === "1"

const IS_ISOLATED_DEMO = IS_DEMO && !IS_DEMO_LIVE_WRITES

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

  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<ReservationResponse | null>(
    null,
  )

  const idem = useRef(newIdempotencyKey())
  const cloudName = "dlt6bojfp"

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" })
  }, [])

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault()
    setBusy(true)
    setError(null)

    try {
      const data = await postJson<ReservationResponse>(
        "/api/reservations",
        {
          ...formData,
          guests: Number(formData.guests),
          idempotencyKey: idem.current,
        },
      )

      if (!data.ok) {
        setError(
          data.error ??
            "Reservationen kunne ikke oprettes.",
        )
        return
      }

      setDone(data)
      idem.current = newIdempotencyKey()
      // Demo-local kopi så reservationen kan vises uden server-persistence.
      try {
        if ((data.demo ?? IS_ISOLATED_DEMO) && data.reservationNo) {
          localStorage.setItem(
            `ji-demo-reservation-${data.reservationNo}`,
            JSON.stringify({
              reservationNo: data.reservationNo,
              status: data.status,
              reservedAt: data.reservedAt,
              date: data.date ?? formData.date,
              time: data.time ?? formData.time,
              guests: data.guests ?? Number(formData.guests),
            }),
          )
        }
      } catch {}
    } catch (error) {
      setError(networkMessage(error))
    } finally {
      setBusy(false)
    }
  }

  function handleChange(
    event:
      | React.ChangeEvent<HTMLInputElement>
      | React.ChangeEvent<HTMLSelectElement>
      | React.ChangeEvent<HTMLTextAreaElement>,
  ) {
    setFormData((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }))
  }

  const today = new Date().toLocaleDateString("sv-SE")

  return (
    <div className="min-h-screen bg-sumi">
      <AnimatedHeader />

      <section className="relative h-[300px] flex items-center justify-center">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-sumi">
          <Image
            src={`https://res.cloudinary.com/${cloudName}/image/upload/f_auto,q_auto/476074314_590290353868131_7759230199772088947_n_phlpv7`}
            alt="Ji Sushi restaurant"
            fill
            className="object-cover opacity-40"
          />
        </div>

        <div className="relative z-10 text-center px-6">
          <h1 className="ji-display text-[clamp(2.2rem,6.5vw,3.6rem)] text-white mb-4">
            Bestil Bord
          </h1>

          <p className="ji-body text-[17px] leading-[1.85] text-white/75">
            Send din reservation — Ji Sushi bekræfter den.
          </p>
          {IS_DEMO && (
            <p
              role="note"
              className="inline-block mt-4 border border-gold/50 px-4 py-2 ji-accent text-[12px] tracking-[0.18em] uppercase text-gold"
            >
              {IS_DEMO_LIVE_WRITES
                ? "Demo-preview — OBS: reservationen er RIGTIG"
                : "Demo — ingen rigtig reservation"}
            </p>
          )}
        </div>
      </section>

      <section className="max-w-2xl mx-auto px-6 py-16">
        {done ? (
          <div className="border border-gold/30 p-8 text-center">
            {(done.demo ?? IS_ISOLATED_DEMO) && (
              <p
                role="note"
                className="inline-block border border-gold/50 px-4 py-2 ji-accent text-[12px] tracking-[0.18em] uppercase text-gold mb-4"
              >
                Demo — ingen rigtig reservation
              </p>
            )}
            {done.demo === false && IS_DEMO && (
              <p
                role="note"
                className="inline-block border border-gold/50 px-4 py-2 ji-accent text-[12px] tracking-[0.18em] uppercase text-gold mb-4"
              >
                Demo-preview — reservationen er RIGTIG og sendt til Ji Sushi
              </p>
            )}
            <p className="ji-eyebrow text-gold">
              Reservation modtaget
            </p>

            <h2 className="ji-display text-3xl mt-4">
              Reservation #{done.reservationNo}
            </h2>

            <p className="ji-body text-white/75 mt-6 leading-[1.8]">
              Vi har modtaget din bordreservation.
              Du får en e-mail som kvittering for modtagelsen.
              Reservationen er først bekræftet, når Ji Sushi har godkendt den.
            </p>

            <button
              onClick={() => {
                setDone(null)
                setFormData({
                  name: "",
                  email: "",
                  phone: "",
                  date: "",
                  time: "",
                  guests: "2",
                  message: "",
                })
              }}
              className="mt-8 border border-white/25 px-6 py-3 ji-accent text-sm uppercase tracking-[0.15em]"
            >
              Lav en ny reservation
            </button>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="border border-white/15 p-6 md:p-8"
          >
            <div className="grid md:grid-cols-2 gap-5">
              <label className="block">
                <span className="ji-eyebrow text-white/70">
                  Navn
                </span>

                <input
                  name="name"
                  required
                  value={formData.name}
                  onChange={handleChange}
                  autoComplete="name"
                  className="mt-2 w-full bg-transparent border border-white/25 px-4 py-3 outline-none focus:border-gold"
                />
              </label>

              <label className="block">
                <span className="ji-eyebrow text-white/70">
                  Telefon
                </span>

                <input
                  name="phone"
                  required
                  value={formData.phone}
                  onChange={handleChange}
                  autoComplete="tel"
                  inputMode="tel"
                  className="mt-2 w-full bg-transparent border border-white/25 px-4 py-3 outline-none focus:border-gold"
                />
              </label>

              <label className="block md:col-span-2">
                <span className="ji-eyebrow text-white/70">
                  E-mail
                </span>

                <input
                  name="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  autoComplete="email"
                  className="mt-2 w-full bg-transparent border border-white/25 px-4 py-3 outline-none focus:border-gold"
                />
              </label>

              <label className="block">
                <span className="ji-eyebrow text-white/70">
                  Dato
                </span>

                <input
                  name="date"
                  type="date"
                  required
                  min={today}
                  value={formData.date}
                  onChange={handleChange}
                  className="mt-2 w-full bg-transparent border border-white/25 px-4 py-3 outline-none focus:border-gold"
                />
              </label>

              <label className="block">
                <span className="ji-eyebrow text-white/70">
                  Tidspunkt
                </span>

                <input
                  name="time"
                  type="time"
                  required
                  value={formData.time}
                  onChange={handleChange}
                  className="mt-2 w-full bg-transparent border border-white/25 px-4 py-3 outline-none focus:border-gold"
                />
              </label>

              <label className="block">
                <span className="ji-eyebrow text-white/70">
                  Antal gæster
                </span>

                <select
                  name="guests"
                  value={formData.guests}
                  onChange={handleChange}
                  className="mt-2 w-full bg-sumi border border-white/25 px-4 py-3 outline-none focus:border-gold"
                >
                  {Array.from({ length: 12 }, (_, i) => i + 1).map(
                    (guest) => (
                      <option key={guest} value={guest}>
                        {guest}
                      </option>
                    ),
                  )}
                </select>
              </label>

              <label className="block md:col-span-2">
                <span className="ji-eyebrow text-white/70">
                  Bemærkning
                </span>

                <textarea
                  name="message"
                  rows={4}
                  value={formData.message}
                  onChange={handleChange}
                  placeholder="Fx barnestol, allergi eller andet."
                  className="mt-2 w-full bg-transparent border border-white/25 px-4 py-3 outline-none focus:border-gold"
                />
              </label>
            </div>

            {error && (
              <p
                role="alert"
                className="mt-6 border-l-2 border-gold pl-4 text-white/80"
              >
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={busy}
              className="w-full mt-8 bg-gold text-sumi py-5 ji-accent uppercase tracking-[0.18em] disabled:opacity-50"
            >
              {busy
                ? "Sender reservation…"
                : "Send reservation"}
            </button>
          </form>
        )}

        <div className="mt-12 text-center">
          <p className="ji-body text-white/60 mb-4">
            Vil du hellere ringe?
          </p>

          <a
            href={SITE.phoneHref}
            className="inline-flex items-center gap-3 text-gold"
          >
            <Phone className="w-5 h-5" />
            {SITE.phoneDisplay}
          </a>
        </div>
      </section>

      <Footer />
    </div>
  )
}
