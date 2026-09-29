import { NextResponse } from "next/server"
import { serviceClient } from "@/lib/supabase"
import { rateLimit, clientIp } from "@/lib/rate-limit"
import {
  isValidDanishMobile,
  formatDanishPhone,
} from "@/lib/phone"
import {
  isDemoMode,
  isIsolatedDemo,
  newDemoReservationNo,
} from "@/lib/demo"
export const dynamic = "force-dynamic"

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function POST(req: Request) {
  const gate = rateLimit(`reservation:${clientIp(req)}`, {
    limit: 6,
    windowMs: 60_000,
  })

  if (!gate.ok) {
    return NextResponse.json(
      {
        ok: false,
        error: "For mange forsøg. Vent et øjeblik.",
      },
      { status: 429 },
    )
  }

  try {
    const body = await req.json()

    const name = String(body?.name ?? "").trim()
    const phone = String(body?.phone ?? "").trim()
    const email = String(body?.email ?? "")
      .trim()
      .toLowerCase()

    const date = String(body?.date ?? "").trim()
    const time = String(body?.time ?? "").trim()
    const guests = Number(body?.guests)
    const message = String(body?.message ?? "")
      .trim()
      .slice(0, 1000)

    const idempotencyKey = String(
      body?.idempotencyKey ?? "",
    )
      .trim()
      .slice(0, 100)

    if (name.length < 2) {
      return NextResponse.json(
        { ok: false, error: "Skriv venligst dit navn." },
        { status: 400 },
      )
    }

    if (!isValidDanishMobile(phone)) {
      return NextResponse.json(
        {
          ok: false,
          error: "Telefonnummeret ser ikke rigtigt ud.",
        },
        { status: 400 },
      )
    }

    if (!EMAIL.test(email)) {
      return NextResponse.json(
        {
          ok: false,
          error: "Skriv en gyldig e-mailadresse.",
        },
        { status: 400 },
      )
    }

    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
      !/^\d{2}:\d{2}$/.test(time)
    ) {
      return NextResponse.json(
        {
          ok: false,
          error: "Vælg dato og tidspunkt.",
        },
        { status: 400 },
      )
    }

    if (
      !Number.isInteger(guests) ||
      guests < 1 ||
      guests > 30
    ) {
      return NextResponse.json(
        {
          ok: false,
          error: "Antal gæster skal være mellem 1 og 30.",
        },
        { status: 400 },
      )
    }

    if (!idempotencyKey) {
      return NextResponse.json(
        { ok: false, error: "Ugyldig anmodning." },
        { status: 400 },
      )
    }

    // --------------------------------------------------------
    // ISOLERET DEMO — fake reservation lokalt, aldrig Supabase/notify.
    // Med ejerens live-writes flag bruges den ægte production-vej nedenfor.
    // --------------------------------------------------------
    if (isIsolatedDemo()) {
      const reservedAt = new Date(`${date}T${time}:00`).toISOString()
      return NextResponse.json({
        ok: true,
        replay: false,
        demo: true,
        reservationNo: newDemoReservationNo(),
        status: "pending_owner_confirmation",
        reservedAt,
        date,
        time,
        guests,
      })
    }

    const { data, error } = await serviceClient().rpc(
      "create_web_reservation",
      {
        p_customer_name: name,
        p_customer_phone: formatDanishPhone(phone),
        p_customer_email: email,
        p_party_size: guests,
        p_date: date,
        p_time: time,
        p_notes: message || "",
        p_idempotency_key: idempotencyKey,
      },
    )

    if (error) {
      const message = String(error.message ?? "")

      if (message.includes("reservation_must_be_future")) {
        return NextResponse.json(
          {
            ok: false,
            error: "Vælg et tidspunkt i fremtiden.",
          },
          { status: 409 },
        )
      }

      throw error
    }

    const result = data as {
      ok: boolean
      idempotent: boolean
      reservation_no: number
      status: string
      reserved_at: string
    }

    if (
      !result?.ok ||
      !result.reservation_no ||
      !result.status ||
      !result.reserved_at
    ) {
      throw new Error("create_web_reservation returned invalid result")
    }

    return NextResponse.json({
      ok: true,
      replay: result.idempotent,
      // I demo+live-writes fortæller vi klienten at reservationen er ægte.
      ...(isDemoMode() ? { demo: false } : null),
      reservationNo: result.reservation_no,
      status: result.status,
      reservedAt: result.reserved_at,
    })
  } catch (error) {
    console.error("[prepnest] reservation failed", error)

    return NextResponse.json(
      {
        ok: false,
        error:
          "Reservationen kunne ikke gemmes. Ring til Ji Sushi i stedet.",
      },
      { status: 500 },
    )
  }
}
