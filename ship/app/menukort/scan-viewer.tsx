"use client"
import { useState, useEffect, useCallback } from "react"
import Image from "next/image"
import { scanUrl } from "@/lib/site"

export default function ScanViewer({ scans }: { scans: { id: string; label: string }[] }) {
  const [index, setIndex] = useState<number | null>(null)
  const isOpen = index !== null

  const close = useCallback(() => setIndex(null), [])
  const next = useCallback(() => setIndex((i) => (i === null ? i : (i + 1) % scans.length)), [scans.length])
  const prev = useCallback(() => setIndex((i) => (i === null ? i : (i - 1 + scans.length) % scans.length)), [scans.length])

  // Arrow keys and Escape are what people already expect from a photo viewer.
  useEffect(() => {
    if (!isOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close()
      else if (e.key === "ArrowRight") next()
      else if (e.key === "ArrowLeft") prev()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [isOpen, close, next, prev])

  useEffect(() => {
    if (!isOpen) return
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => { document.body.style.overflow = prevOverflow }
  }, [isOpen])

  const active = index === null ? null : scans[index]

  return (
    <>
      <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 list-none p-0 m-0">
        {scans.map((s, i) => (
          <li key={s.id}>
            <button
              onClick={() => setIndex(i)}
              aria-label={`Vis ${s.label} i stort format`}
              className="group block w-full border border-white/15 hover:border-gold transition-colors overflow-hidden"
            >
              <Image
                src={scanUrl(s.id, 800)}
                alt={s.label}
                width={800}
                height={1000}
                unoptimized
                className="w-full h-auto"
              />
              <span className="ji-accent block text-[12px] tracking-[0.14em] uppercase text-white/70 group-hover:text-gold py-3 transition-colors">
                {s.label}
              </span>
            </button>
          </li>
        ))}
      </ul>

      {isOpen && active && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`${active.label} — ${index + 1} af ${scans.length}`}
          onClick={close}
          className="fixed inset-0 z-50 bg-sumi/[0.97] flex items-center justify-center p-4"
        >
          <button onClick={close} aria-label="Luk" className="absolute top-5 right-5 z-10 text-white/70 hover:text-white p-3 text-3xl leading-none">×</button>
          <button onClick={(e) => { e.stopPropagation(); prev() }} aria-label="Forrige" className="absolute left-2 z-10 text-white/60 hover:text-gold p-4 text-4xl leading-none">‹</button>
          <figure onClick={(e) => e.stopPropagation()} className="max-h-[88svh] overflow-auto">
            <Image src={scanUrl(active.id, 1400)} alt={active.label} width={1400} height={1800} unoptimized className="w-auto max-w-full h-auto" />
            <figcaption className="ji-accent text-center text-sm text-white/70 py-3">
              {active.label} <span className="text-white/50 tabular-nums ml-2">{index + 1} / {scans.length}</span>
            </figcaption>
          </figure>
          <button onClick={(e) => { e.stopPropagation(); next() }} aria-label="Næste" className="absolute right-2 z-10 text-white/60 hover:text-gold p-4 text-4xl leading-none">›</button>
        </div>
      )}
    </>
  )
}
