import { NextResponse } from "next/server"
import { serviceClient } from "@/lib/supabase"
import { rateLimit, clientIp } from "@/lib/rate-limit"

export const dynamic = "force-dynamic"

export async function GET(
  req: Request,
  ctx: { params: Promise<{ token: string }> },
) {
  const { token } = await ctx.params

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
