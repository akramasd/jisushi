"use client"

import { useEffect, useRef, useState } from "react"

export function NewYearBanner() {
  const [leaves, setLeaves] = useState<
    Array<{ id: number; x: number; delay: number; duration: number; rotation: number; startY: number }>
  >([])
  const [isVisible, setIsVisible] = useState(false)
  const bannerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const leafElements = Array.from({ length: 20 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      delay: Math.random() * 5,
      duration: 10 + Math.random() * 5,
      rotation: Math.random() * 360,
      startY: -100 - Math.random() * 300, // Start leaves at various heights above viewport
    }))
    setLeaves(leafElements)

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true)
          }
        })
      },
      { threshold: 0.2 },
    )

    if (bannerRef.current) {
      observer.observe(bannerRef.current)
    }

    return () => observer.disconnect()
  }, [])

  return (
    null
  )
}
