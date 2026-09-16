"use client"
import { useEffect, useState } from "react"
import { SITE } from "@/lib/site"

/**
 * Facebook posts, loaded only after the visitor asks for them.
 *
 * The Facebook SDK sets third-party tracking cookies the moment it loads. Under
 * the ePrivacy rules Denmark applies, that needs prior consent — so loading it
 * on page view means every visitor is tracked before they have agreed to
 * anything, and the site needs a cookie banner it does not have.
 *
 * Click-to-load solves it properly: no third-party request, and therefore no
 * consent obligation, until someone chooses. It is also faster for everyone who
 * never clicks, which is most people.
 */
export function FacebookFeed({ posts }: { posts: { href: string; caption: string }[] }) {
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (!loaded) return
    const s = document.createElement("script")
    s.src = "https://connect.facebook.net/da_DK/sdk.js#xfbml=1&version=v24.0"
    s.async = true
    s.defer = true
    s.crossOrigin = "anonymous"
    document.body.appendChild(s)
    return () => {
      s.remove()
    }
  }, [loaded])

  if (!loaded) {
    return (
      <div className="border border-white/15 px-6 py-12 text-center max-w-2xl mx-auto">
        <p className="ji-body text-[17px] leading-[1.85] text-white/75">
          Vores Facebook-opslag indlæses fra Facebook. Gør du det, sætter
          Facebook cookies på din enhed.
        </p>
        <div className="flex flex-wrap gap-3 justify-center mt-8">
          <button
            onClick={() => setLoaded(true)}
            className="ji-accent text-[13px] tracking-[0.2em] uppercase bg-gold text-sumi px-7 py-4"
          >
            Vis opslag
          </button>
          <a
            href={SITE.facebook}
            target="_blank"
            rel="noopener noreferrer"
            className="ji-accent text-[13px] tracking-[0.2em] uppercase border border-white/30 px-7 py-4 hover:border-gold hover:text-gold transition-colors"
          >
            Åbn på Facebook
          </a>
        </div>
      </div>
    )
  }

  return (
    <>
      <div id="fb-root" />
      <div className="grid md:grid-cols-3 gap-8">
        {posts.map((p) => (
          <div key={p.href} className="flex justify-center">
            <div className="fb-post" data-href={p.href} data-width="500" data-show-text="true">
              <blockquote cite={p.href} className="fb-xfbml-parse-ignore">
                <a href={SITE.facebook}>{p.caption}</a>
              </blockquote>
            </div>
          </div>
        ))}
      </div>
    </>
  )
}
