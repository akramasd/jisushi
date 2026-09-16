"use client"

import { useState, useEffect, useCallback } from "react"
import Image from "next/image"
import Link from "next/link"
import { ChevronLeft, ChevronRight } from "lucide-react"

const images = [
  { src: "https://cdn.designfast.io/image/2026-02-07/64959fbb-47f1-4d2e-b991-e7725453e90c.jpeg", alt: "Sushi udvalg" },
  { src: "https://cdn.designfast.io/image/2026-02-07/02c38a9d-347b-4832-afbd-7c2a9ae73191.jpeg", alt: "Sushi platter" },
  { src: "https://cdn.designfast.io/image/2026-02-07/448f4591-f91c-412c-830b-47e117cba082.jpeg", alt: "Maki rolls" },
  { src: "https://cdn.designfast.io/image/2026-02-07/7f62211a-af87-40e6-b4e1-86732705c7b1.jpeg", alt: "Nigiri selection" },
  { src: "https://cdn.designfast.io/image/2026-02-07/7cd4c7c0-8cc9-493b-be0c-4c89ebd28bc3.jpeg", alt: "Sashimi" },
  { src: "https://cdn.designfast.io/image/2026-02-07/c8bc62dc-18ea-47f4-ab6e-d0cc0b0721f3.jpeg", alt: "Sushi box" },
  { src: "https://cdn.designfast.io/image/2026-02-07/6f13e75b-ae33-4aac-b8db-f721e0792678.jpeg", alt: "Forretter" },
  { src: "https://cdn.designfast.io/image/2026-02-07/a1eae993-7299-4583-9019-50f635798347.jpeg", alt: "Tempura" },
  { src: "https://cdn.designfast.io/image/2026-02-07/d933d7bf-80c7-47b2-a022-d5f084fb2a9e.jpeg", alt: "Restaurant" },
]

export function ImageSlideshow() {
  const [current, setCurrent] = useState(0)
  const [isTransitioning, setIsTransitioning] = useState(false)

  const goTo = useCallback(
    (index: number) => {
      if (isTransitioning) return
      setIsTransitioning(true)
      setCurrent(index)
      setTimeout(() => setIsTransitioning(false), 600)
    },
    [isTransitioning],
  )

  const next = useCallback(() => {
    goTo((current + 1) % images.length)
  }, [current, goTo])

  const prev = useCallback(() => {
    goTo((current - 1 + images.length) % images.length)
  }, [current, goTo])

  useEffect(() => {
    const timer = setInterval(next, 4000)
    return () => clearInterval(timer)
  }, [next])

  return (
    <section className="max-w-6xl mx-auto px-6 py-20">
      <h2 className="text-3xl md:text-4xl font-light mb-10 text-center text-white">
        Galleri
      </h2>

      <div className="relative aspect-[16/9] md:aspect-[21/9] rounded-lg overflow-hidden group">
        {images.map((image, index) => (
          <div
            key={image.src}
            className={`absolute inset-0 transition-opacity duration-[600ms] ease-in-out ${
              index === current ? "opacity-100 z-10" : "opacity-0 z-0"
            }`}
          >
            <Image
              src={image.src || "/placeholder.svg"}
              alt={image.alt}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 1152px"
              priority={index === 0}
            />
          </div>
        ))}

        <div className="absolute inset-0 z-20 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />

        <button
          onClick={prev}
          className="absolute left-4 top-1/2 -translate-y-1/2 z-30 bg-sumi/50 hover:bg-gold text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-300"
          aria-label="Forrige billede"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        <button
          onClick={next}
          className="absolute right-4 top-1/2 -translate-y-1/2 z-30 bg-sumi/50 hover:bg-gold text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-300"
          aria-label="Naeste billede"
        >
          <ChevronRight className="w-6 h-6" />
        </button>

        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 flex gap-2">
          {images.map((_, index) => (
            <button
              key={`dot-${index}`}
              onClick={() => goTo(index)}
              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                index === current ? "bg-gold w-6" : "bg-white/50 hover:bg-white/80"
              }`}
              aria-label={`Ga til billede ${index + 1}`}
            />
          ))}
        </div>
      </div>

      <div className="text-center mt-8">
        <Link
          href="/billeder"
          className="inline-block border border-gold text-gold hover:bg-gold hover:text-sumi font-light px-8 py-3 rounded-lg text-lg transition-all duration-300"
        >
          Se alle billeder
        </Link>
      </div>
    </section>
  )
}
