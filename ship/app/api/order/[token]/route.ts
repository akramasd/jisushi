import { NextResponse } from "next/server"
import { serviceClient } from "@/lib/supabase"
import { rateLimit, clientIp } from "@/lib/rate-limit"
import { isDemoMode, isDemoToken, isIsolatedDemo } from "@/lib/demo"

export const dynamic = "force-dynamic"

function demoOrderNoForToken(token: string): number {
  const hex = token.replace(/^demo-/, "").slice(0, 4)
  const n = parseInt(hex, 16)
  if (!Number.isFinite(n)) return 9001
  return 9000 + (n % 1000)
}

export async function GET(
  req: Request,
  ctx: { params: Promise<{ token: string }> },
) {
  const { token } = await ctx.params

  // --------------------------------------------------------
  // ISOLERET DEMO — stateless, uden live DB. Demo-tokens starter med demo- og
  // kan aldrig kollidere med production /^[a-f0-9]{32}$/.
  // Klienten lægger den fulde ordre i localStorage efter checkout; denne
  // server-fallback sikrer at direkte navigation/refresh stadig viser en
  // realistisk ordre uden persistence.
  // Med ejerens live-writes flag bruges den ægte DB-vej nedenfor i stedet.
  // --------------------------------------------------------
  if (isIsolatedDemo()) {
    if (!isDemoToken(token)) {
      return NextResponse.json(
        { ok: false, error: "Ukendt ordre.", demo: true },
        { status: 404 },
      )
    }

    const gate = rateLimit(`status-demo:${clientIp(req)}`, {
      limit: 60,
      windowMs: 60_000,
    })

    if (!gate.ok) {
      return NextResponse.json(
        { ok: false, error: "Prøv igen om lidt." },
        { status: 429 },
      )
    }

    const now = new Date()
    const acceptBy = new Date(now.getTime() + 10 * 60_000).toISOString()
    return NextResponse.json({
      ok: true,
      demo: true,
      order: {
        orderNo: demoOrderNoForToken(token),
        status: "pending_owner_confirmation",
        items: [
          { name: "California (8 stk.)", price: 79, qty: 2, quantity: 2 },
          { name: "Edamame", price: 45, qty: 1, quantity: 1 },
        ],
        total: 203,
        pickupMinutes: 30,
        createdAt: now.toISOString(),
        readyEstimate: null,
        acceptBy,
        reason: null,
      },
    })
  }

  if (!/^[a-f0-9]{32}$/.test(token)) {
    return NextResponse.json(
      { ok: false, error: "Ukendt ordre." },
      { status: 404 },
    )
  }

  const gate = rateLimit(`status:${clientIp(req)}`, {
    limit: 60,
    windowMs: 60_000,
  })

  if (!gate.ok) {
    return NextResponse.json(
      { ok: false, error: "Prøv igen om lidt." },
      { status: 429 },
    )
  }

  try {
    const { data, error } = await serviceClient()
      .from("orders")
      .select(
        "order_no,status,items,total_price,pickup_minutes,created_at,ready_estimate,cancel_reason,rejection_reason,accept_by",
      )
      .eq("public_token", token)
      .maybeSingle()

    if (error) throw error

    if (!data) {
      return NextResponse.json(
        { ok: false, error: "Ukendt ordre." },
        { status: 404 },
      )
    }

    return NextResponse.json({
      ok: true,
      // I demo+live-writes fortæller vi klienten at ordren er ægte.
      ...(isDemoMode() ? { demo: false } : null),
      order: {
        orderNo: data.order_no,
        status: data.status,
        items: data.items,
        total: Number(data.total_price),
        pickupMinutes: data.pickup_minutes,
        createdAt: data.created_at,
        readyEstimate: data.ready_estimate,
        acceptBy: data.accept_by,
        reason: data.rejection_reason ?? data.cancel_reason ?? null,
      },
    })
  } catch (error) {
    console.error("[prepnest] order status failed", error)

    return NextResponse.json(
      { ok: false, error: "Kunne ikke hente ordren." },
      { status: 500 },
    )
  }
}
