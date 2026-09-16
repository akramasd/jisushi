"use client"

/**
 * Last-resort boundary: this replaces the root layout, so it cannot rely on
 * fonts, tokens, or anything the layout provides. Everything here is inline
 * on purpose — a fallback that depends on the thing that failed is not a
 * fallback.
 */
export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <html lang="da">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          background: "#0E0F11",
          color: "#fff",
          fontFamily: "ui-sans-serif, system-ui, sans-serif",
          padding: "1.5rem",
        }}
      >
        <div style={{ maxWidth: "26rem" }}>
          <h1 style={{ fontSize: "1.75rem", fontWeight: 300, margin: "0 0 1rem" }}>
            Ji Sushi er midlertidigt utilgængelig
          </h1>
          <p style={{ lineHeight: 1.8, color: "rgba(255,255,255,.75)", margin: "0 0 2rem" }}>
            Vi er tilbage om lidt. Ring til os på{" "}
            <a href="tel:+4531334486" style={{ color: "#C1AB7F" }}>
              31 33 44 86
            </a>{" "}
            — vi tager gerne din bestilling over telefonen.
          </p>
          <button
            onClick={reset}
            style={{
              background: "#C1AB7F",
              color: "#0E0F11",
              border: 0,
              padding: "1rem 1.5rem",
              letterSpacing: ".2em",
              textTransform: "uppercase",
              fontSize: ".8rem",
              cursor: "pointer",
            }}
          >
            Prøv igen
          </button>
        </div>
      </body>
    </html>
  )
}
