/**
 * PrepNest demo-mode — gratis, isoleret, uden live writes.
 *
 * Aktiveres med PREPNEST_DEMO_MODE=1 (server) eller
 * NEXT_PUBLIC_PREPNEST_DEMO_MODE=1 (client/build). Begge tjekkes server-side
 * så Preview-envs kun behøver den public variant.
 *
 * Når demo er OFF er al production-adfærd uændret — hver guard returnerer
 * false og ruterne kører den eksisterende Supabase V3-kode.
 *
 * Token-semantik:
 * - Production: /^[a-f0-9]{32}$/ (tilfældig public_token fra DB)
 * - Demo: /^demo-[a-f0-9]{32}$/ — prefixet kan aldrig kollidere med production,
 *   og den eksisterende 32-hex validering afviser demo-tokens i prod.
 */

export const DEMO_TOKEN_PREFIX = "demo-";

export function isDemoMode(): boolean {
  return (
    process.env.PREPNEST_DEMO_MODE === "1" ||
    process.env.NEXT_PUBLIC_PREPNEST_DEMO_MODE === "1"
  );
}

export function isDemoModeClient(): boolean {
  return process.env.NEXT_PUBLIC_PREPNEST_DEMO_MODE === "1";
}

/**
 * EKSPLICIT FRAVÆLGELSE af isolationen: demo-siden sender RIGTIGE ordrer og
 * reservationer til live Supabase/køkken/Sheets/notifikationer.
 *
 * Kræver BÅDE demo-mode OG PREPNEST_DEMO_LIVE_WRITES=1 (server) eller
 * NEXT_PUBLIC_PREPNEST_DEMO_LIVE_WRITES=1 (client/build). Uden flaget er demo
 * 100% isoleret som før. Dette flag må ALDRIG sættes på et offentligt preview —
 * kun lokalt eller eftertrykkeligt ejer-samtykke, da hver testordre lander i
 * det rigtige køkken og udløser rigtige notifikationer.
 */
export function isDemoLiveWrites(): boolean {
  return (
    process.env.PREPNEST_DEMO_LIVE_WRITES === "1" ||
    process.env.NEXT_PUBLIC_PREPNEST_DEMO_LIVE_WRITES === "1"
  );
}

/** Demo er isoleret netop når demo er aktiv UDEN live-writes flaget. */
export function isIsolatedDemo(): boolean {
  return isDemoMode() && !isDemoLiveWrites();
}

export function isDemoToken(token: string): boolean {
  if (!token.startsWith(DEMO_TOKEN_PREFIX)) return false;
  const hex = token.slice(DEMO_TOKEN_PREFIX.length);
  return /^[a-f0-9]{32}$/.test(hex);
}

function randomHex32(): string {
  // crypto.randomUUID() -> 32 hex uden bindestreger. Web Crypto findes både i
  // Node 19+, Edge og browsere, så samme kode virker server og client.
  if (
    typeof crypto !== "undefined" &&
    "randomUUID" in crypto &&
    typeof (crypto as Crypto).randomUUID === "function"
  ) {
    return (crypto as Crypto).randomUUID().replace(/-/g, "");
  }
  return Array.from({ length: 32 }, () =>
    Math.floor(Math.random() * 16).toString(16),
  ).join("");
}

export function newDemoToken(): string {
  return `${DEMO_TOKEN_PREFIX}${randomHex32()}`;
}

/** Realistisk falsk ordrenummer — bevidst i 9000-serien så demo aldrig ligner live. */
export function newDemoOrderNo(): number {
  return 9000 + Math.floor(Math.random() * 1000);
}

/** Realistisk falsk reservationsnummer — bevidst i 7000-serien. */
export function newDemoReservationNo(): number {
  return 7000 + Math.floor(Math.random() * 1000);
}

export function demoAcceptBy(from: Date = new Date()): string {
  return new Date(from.getTime() + 10 * 60_000).toISOString();
}

export function demoStorageKey(token: string): string {
  return `ji-demo-order-${token}`;
}

export function demoReservationKey(no: number | string): string {
  return `ji-demo-reservation-${no}`;
}

/**
 * Site-URL der aldrig hardcoder jisushi.dk i demo-mode.
 * Prioritet i demo: NEXT_PUBLIC_SITE_URL -> VERCEL_URL -> localhost.
 */
export function demoSafeSiteUrl(fallbackLive: string): string {
  if (!isDemoMode()) return fallbackLive;
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit && explicit.trim().length > 0) return explicit.trim();
  const vercel = process.env.VERCEL_URL;
  if (vercel && vercel.trim().length > 0) {
    const host = vercel.trim().replace(/^https?:\/\//, "");
    return `https://${host}`;
  }
  return "http://localhost:3000";
}
