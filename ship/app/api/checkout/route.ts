import { NextResponse } from "next/server"
import { serviceClient } from "@/lib/supabase"
import { canAcceptTakeaway } from "@/lib/opening-hours"
import { rateLimit, clientIp } from "@/lib/rate-limit"
import { notifyNewOrder } from "@/lib/notify"
import { record, describeError } from "@/lib/monitor"
import { mirrorToSheet } from "@/lib/sheet-mirror"
import {
  mergeItems,
  normalisePickup,
  priceOrder,
  MAX_DISTINCT_ITEMS,
  type MenuRow,
} from "@/lib/pricing"
import { isValidDanishMobile, formatDanishPhone } from "@/lib/phone"
import fallbackMenuJson from "@/data/menu-fallback.json"

const fallbackMenu = fallbackMenuJson as MenuRow[]
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

type RpcOrder = {
  ok: boolean
  idempotent: boolean
  order_id: string
  order_no: number
  public_token: string
  status: string
  accept_by: string
  total_price: number
}

function businessError(message: string) {
  if (message.includes("ordering_paused")) {
    return {
      status: 409,
      body: {
        ok: false,
        closed: true,
        error: "Vi tager ikke imod online bestillinger lige nu. Ring til os i stedet.",
      },
    }
  }

  if (message.includes("menu_item_unavailable")) {
    return {
      status: 409,
      body: {
        ok: false,
        error: "En af varerne er netop blevet udsolgt. Opdater menuen og prøv igen.",
      },
    }
  }

  if (message.includes("menu_item_not_found")) {
    return {
      status: 409,
      body: {
        ok: false,
        error: "En vare findes ikke længere på menuen. Opdater siden og prøv igen.",
      },
    }
  }

  if (
    message.includes("invalid_quantity") ||
    message.includes("invalid_menu_item_id") ||
    message.includes("items_required")
  ) {
    return {
      status: 400,
      body: {
        ok: false,
        error: "Bestillingen indeholder ugyldige varer.",
      },
    }
  }

  return null
}

export async function POST(req: Request) {
  const gate = rateLimit(`checkout:${clientIp(req)}`, {
    limit: 8,
    windowMs: 60_000,
  })

  if (!gate.ok) {
    return NextResponse.json(
      {
        ok: false,
        error: "For mange bestillinger på kort tid. Vent et øjeblik, eller ring til os.",
      },
      {
        status: 429,
        headers: { "Retry-After": String(gate.retryAfterSec) },
      },
    )
  }

  let body: any

  try {
    body = await req.json()
  } catch {
    return NextResponse.json(
      { ok: false, error: "Ugyldig anmodning." },
      { status: 400 },
    )
  }

  const rawItems = Array.isArray(body?.items) ? body.items : []
  const name = String(body?.name ?? "").trim()
  const phone = String(body?.phone ?? "").trim()
  const email = String(body?.email ?? "").trim().toLowerCase()
  const idemKey = String(body?.idempotencyKey ?? "").trim().slice(0, 100)
  const pickupMinutes = normalisePickup(body?.pickupMinutes)

  const merged = mergeItems(rawItems)

  if (merged.size === 0) {
    return NextResponse.json(
      { ok: false, error: "Din kurv er tom." },
      { status: 400 },
    )
  }

  if (merged.size > MAX_DISTINCT_ITEMS) {
    return NextResponse.json(
      {
        ok: false,
        error: "Meget stor bestilling — ring til os, så tager vi den sammen.",
      },
      { status: 400 },
    )
  }

  if ([...merged.values()].some((qty) => qty > 50)) {
    return NextResponse.json(
      {
        ok: false,
        error: "Meget stor mængde af én vare — ring til os, så tager vi den sammen.",
      },
      { status: 400 },
    )
  }

  if (name.length < 2) {
    return NextResponse.json(
      { ok: false, error: "Skriv venligst dit navn." },
      { status: 400 },
    )
  }

  if (!isValidDanishMobile(phone)) {
    return NextResponse.json(
      { ok: false, error: "Telefonnummeret ser ikke rigtigt ud." },
      { status: 400 },
    )
  }

  if (email && !EMAIL.test(email)) {
    return NextResponse.json(
      { ok: false, error: "E-mailadressen ser ikke rigtig ud." },
      { status: 400 },
    )
  }

  if (!idemKey) {
    return NextResponse.json(
      { ok: false, error: "Ugyldig anmodning." },
      { status: 400 },
    )
  }

  const rpcItems = [...merged.entries()].map(([id, quantity]) => ({
    menu_item_id: id,
    quantity,
  }))

  try {
    const db = serviceClient()

    // Replay an already-created order before opening-hours checks.
    const { data: existing } = await db
      .from("orders")
      .select(
        "id,order_no,total_price,public_token,status,accept_by",
      )
      .eq("idempotency_key", idemKey)
      .maybeSingle()

    if (existing) {
      return NextResponse.json({
        ok: true,
        replay: true,
        orderNo: existing.order_no,
        total: Number(existing.total_price),
        token: existing.public_token,
        status: existing.status,
        acceptBy: existing.accept_by,
      })
    }

    // Surface the owner's pause message. The database RPC performs
    // the authoritative pause check again during creation.
    const { data: settings } = await db
      .from("restaurant_settings")
      .select("ordering_paused,pause_message")
      .eq("id", "main")
      .maybeSingle()

    if (settings?.ordering_paused) {
      return NextResponse.json(
        {
          ok: false,
          closed: true,
          error:
            settings.pause_message ||
            "Vi tager ikke imod online bestillinger lige nu. Ring til os i stedet.",
        },
        { status: 409 },
      )
    }

    const hours = canAcceptTakeaway()

    if (!hours.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: hours.reason,
          closed: true,
        },
        { status: 409 },
      )
    }

    const { data, error } = await db.rpc("create_web_order", {
      p_customer_name: name,
      p_customer_phone: formatDanishPhone(phone),
      p_customer_email: email || null,
      p_items: rpcItems,
      p_idempotency_key: idemKey,
      p_channel: "takeaway",
    })

    if (error) {
      const known = businessError(String(error.message ?? ""))
      if (known) {
        return NextResponse.json(known.body, { status: known.status })
      }
      throw error
    }

    const order = data as RpcOrder

    if (!order?.ok || !order.order_id) {
      throw new Error("create_web_order returned no order")
    }

    // Customer's selected pickup time is treated as a preference until Owner
    // confirms the real ETA.
    if (!order.idempotent) {
      await db
        .from("orders")
        .update({ pickup_minutes: pickupMinutes })
        .eq("id", order.order_id)
        .eq("status", "pending_owner_confirmation")
        .is("pickup_minutes", null)

      const { data: created } = await db
        .from("orders")
        .select(
          "order_no,customer_name,customer_phone,items,total_price,pickup_minutes",
        )
        .eq("id", order.order_id)
        .maybeSingle()

      if (created) {
        const snapshot = Array.isArray(created.items)
          ? (created.items as Array<Record<string, unknown>>)
          : []

        // Audit/backup copy. This is NOT in the critical order transaction.
        await mirrorToSheet({
          id: String(created.order_no),
          orderNo: created.order_no,
          customerName: created.customer_name,
          customerPhone: created.customer_phone,
          items: snapshot.map((item) => ({
            name: String(item.name ?? "Vare"),
            qty: Number(item.quantity ?? item.qty ?? 1),
          })),
          total: Number(created.total_price),
          pickupMinutes: created.pickup_minutes,
          status: "Afventer ejer",
          source: "Hjemmeside · Supabase V3",
        })
      }
    }

    return NextResponse.json({
      ok: true,
      replay: order.idempotent,
      orderNo: order.order_no,
      total: Number(order.total_price),
      token: order.public_token,
      status: order.status,
      acceptBy: order.accept_by,
    })
  } catch (error) {
    await record(
      "error",
      "checkout",
      `Supabase V3 unavailable: ${describeError(error)}`,
    )

    // --------------------------------------------------------
    // EMERGENCY PATH
    // Supabase is unavailable. Price against the bundled trusted
    // snapshot and write directly to Google Sheets.
    // --------------------------------------------------------

    const priced = priceOrder(rawItems, fallbackMenu)

    if (!priced.ok) {
      const messages = {
        empty: "Din kurv er tom.",
        too_many: "Bestillingen er for stor.",
        sold_out: `Desværre udsolgt: ${priced.detail ?? ""}.`,
        missing: "En vare findes ikke i vores backupmenu.",
        bad_price: "Der er fejl i backupprisen på en vare.",
      } as const

      return NextResponse.json(
        { ok: false, error: messages[priced.reason] },
        { status: 500 },
      )
    }

    const fallbackNo = `N${Date.now().toString().slice(-6)}`

    const mirrored = await mirrorToSheet({
      id: idemKey,
      orderNo: fallbackNo,
      customerName: name,
      customerPhone: formatDanishPhone(phone),
      items: priced.lines.map((line) => ({
        name: line.name,
        qty: line.qty,
      })),
      total: priced.total,
      pickupMinutes,
      status: "Nødordre · ring for bekræftelse",
      source: "NØDSPOR · Supabase utilgængelig",
    })

    if (mirrored) {
      await notifyNewOrder({
        orderNo: fallbackNo as unknown as number,
        customerName: name,
        customerPhone: formatDanishPhone(phone),
        total: priced.total,
        pickupMinutes,
        items: priced.lines.map((line) => ({
          name: line.name,
          qty: line.qty,
        })),
        statusUrl: "",
      })

      return NextResponse.json({
        ok: true,
        degraded: true,
        orderNo: fallbackNo,
        total: priced.total,
        token: null,
        status: "degraded",
      })
    }

    return NextResponse.json(
      {
        ok: false,
        error:
          "Bestillingen kunne ikke gemmes. Ring til Ji Sushi, så tager vi den over telefonen.",
      },
      { status: 500 },
    )
  }
}
