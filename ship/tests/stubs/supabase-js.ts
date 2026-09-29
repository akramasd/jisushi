type Row = Record<string, any>

const db: Record<string, Row[]> = {
  orders: [],
  menu_items: [],
  settings: [],
  restaurant_settings: [],
  reservations: [],
  outbound_messages: [],
  system_events: [],
}

let seq = 40
let reservationSeq = 100

export function __reset(
  seed: {
    menu_items?: Row[]
    settings?: Row[]
    restaurant_settings?: Row[]
  } = {},
) {
  db.orders = []
  db.menu_items = seed.menu_items ?? []
  db.settings = seed.settings ?? []

  db.restaurant_settings =
    seed.restaurant_settings ??
    seed.settings ??
    []

  db.reservations = []
  db.outbound_messages = []
  db.system_events = []

  seq = 40
  reservationSeq = 100
}

export function __table(name: string) {
  return db[name]
}

class Query implements PromiseLike<any> {
  private rows: Row[]
  private filters: ((r: Row) => boolean)[] = []
  private mode:
    | 'select'
    | 'insert'
    | 'update'
    | 'delete' = 'select'

  private payload: Row | null = null
  private wantSingle = false
  private maybe = false
  private orderBy:
    { col: string; asc: boolean }[] = []
  private lim: number | null = null

  private table: string

  constructor(table: string) {
    this.table = table
    this.rows =
      db[table] ??
      (db[table] = [])
  }

  select(_cols = '*'): this {
    return this
  }

  eq(col: string, v: unknown): this {
    this.filters.push(
      (r) => String(r[col]) === String(v),
    )
    return this
  }

  is(col: string, v: unknown): this {
    this.filters.push((r) =>
      v === null
        ? r[col] == null
        : r[col] === v,
    )
    return this
  }

  neq(col: string, v: unknown): this {
    this.filters.push(
      (r) => String(r[col]) !== String(v),
    )
    return this
  }

  in(col: string, vs: unknown[]): this {
    const set = new Set(vs.map(String))
    this.filters.push((r) =>
      set.has(String(r[col])),
    )
    return this
  }

  gte(col: string, v: string): this {
    this.filters.push(
      (r) => String(r[col]) >= String(v),
    )
    return this
  }

  lt(col: string, v: string): this {
    this.filters.push(
      (r) => String(r[col]) < String(v),
    )
    return this
  }

  or(expr: string): this {
    const parts = expr.split(',').map((p) => {
      const [col, op, ...rest] = p.split('.')
      const val = rest
        .join('.')
        .replace(/^%|%$/g, '')

      return (r: Row) =>
        op === 'eq'
          ? String(r[col]) === val
          : String(r[col] ?? '')
              .toLowerCase()
              .includes(val.toLowerCase())
    })

    this.filters.push((r) =>
      parts.some((f) => f(r)),
    )

    return this
  }

  order(
    col: string,
    o: { ascending?: boolean } = {},
  ): this {
    this.orderBy.push({
      col,
      asc: o.ascending !== false,
    })
    return this
  }

  limit(n: number): this {
    this.lim = n
    return this
  }

  maybeSingle(): this {
    this.maybe = true
    return this
  }

  single(): this {
    this.wantSingle = true
    return this
  }

  insert(payload: Row): this {
    this.mode = 'insert'
    this.payload = payload
    return this
  }

  update(payload: Row): this {
    this.mode = 'update'
    this.payload = payload
    return this
  }

  delete(): this {
    this.mode = 'delete'
    return this
  }

  private matched() {
    return this.rows.filter((r) =>
      this.filters.every((f) => f(r)),
    )
  }

  private run() {
    if (this.mode === 'insert') {
      const p = this.payload!

      if (
        p.idempotency_key &&
        this.rows.some(
          (r) =>
            r.idempotency_key ===
            p.idempotency_key,
        )
      ) {
        return {
          data: null,
          error: {
            code: '23505',
            message:
              'duplicate key value violates unique constraint',
          },
        }
      }

      const row: Row = {
        id: `id-${Math.random()
          .toString(36)
          .slice(2, 10)}`,
        order_no: ++seq,
        created_at:
          new Date().toISOString(),
        status: 'pending',
        ...p,
        total_price:
          p.total_price != null
            ? String(p.total_price)
            : p.total_price,
        phone_digits: String(
          p.customer_phone ?? '',
        ).replace(/[^0-9]/g, ''),
      }

      this.rows.push(row)

      return {
        data: this.wantSingle
          ? row
          : [row],
        error: null,
      }
    }

    if (this.mode === 'update') {
      const hits = this.matched()

      for (const row of hits)
        Object.assign(
          row,
          this.payload,
        )

      return {
        data: hits,
        error: null,
      }
    }

    if (this.mode === 'delete') {
      const hits = this.matched()

      db[this.table] =
        this.rows.filter(
          (r) =>
            !hits.includes(r),
        )

      return {
        data: hits,
        error: null,
      }
    }

    let out = this.matched()

    for (
      const o of
      [...this.orderBy].reverse()
    ) {
      out = [...out].sort((a, b) => {
        const x = a[o.col]
        const y = b[o.col]

        return (
          (x > y
            ? 1
            : x < y
              ? -1
              : 0) *
          (o.asc ? 1 : -1)
        )
      })
    }

    if (this.lim != null)
      out = out.slice(0, this.lim)

    if (this.maybe)
      return {
        data: out[0] ?? null,
        error: null,
      }

    if (this.wantSingle) {
      return out.length === 1
        ? {
            data: out[0],
            error: null,
          }
        : {
            data: null,
            error: {
              code: 'PGRST116',
              message: 'no rows',
            },
          }
    }

    return {
      data: out,
      error: null,
    }
  }

  then<
    TResult1 = any,
    TResult2 = never,
  >(
    onfulfilled?:
      | ((
          value: any,
        ) =>
          | TResult1
          | PromiseLike<TResult1>)
      | null,
    onrejected?:
      | ((
          reason: any,
        ) =>
          | TResult2
          | PromiseLike<TResult2>)
      | null,
  ): PromiseLike<
    TResult1 | TResult2
  > {
    return Promise
      .resolve(this.run())
      .then(
        onfulfilled,
        onrejected,
      )
  }
}

function hexToken() {
  return Array.from(
    { length: 32 },
    () =>
      Math.floor(
        Math.random() * 16,
      ).toString(16),
  ).join('')
}

async function rpc(
  name: string,
  args: Record<string, any> = {},
) {
  if (
    name ===
    'create_web_order'
  ) {
    const key = String(
      args.p_idempotency_key ?? '',
    )

    const existing =
      db.orders.find(
        (row) =>
          row.idempotency_key ===
          key,
      )

    if (existing) {
      return {
        data: {
          ok: true,
          idempotent: true,
          order_id:
            existing.id,
          order_no:
            existing.order_no,
          public_token:
            existing.public_token,
          status:
            existing.status,
          accept_by:
            existing.accept_by,
          total_price:
            Number(
              existing.total_price,
            ),
        },
        error: null,
      }
    }

    const settings =
      db.restaurant_settings.find(
        (row) =>
          row.id === 'main',
      )

    if (
      settings?.ordering_paused
    ) {
      return {
        data: null,
        error: {
          code: 'P0001',
          message:
            'ordering_paused',
        },
      }
    }

    const incoming =
      Array.isArray(
        args.p_items,
      )
        ? args.p_items
        : []

    if (!incoming.length) {
      return {
        data: null,
        error: {
          code: 'P0001',
          message:
            'items_required',
        },
      }
    }

    const merged =
      new Map<
        string,
        number
      >()

    for (
      const item of incoming
    ) {
      const id = String(
        item.menu_item_id ??
          item.item_id ??
          item.id ??
          '',
      )

      const qty =
        Number(
          item.quantity ??
            item.qty,
        )

      if (
        !id ||
        !Number.isInteger(qty) ||
        qty < 1 ||
        qty > 50
      ) {
        return {
          data: null,
          error: {
            code: 'P0001',
            message:
              'invalid_quantity',
          },
        }
      }

      const next =
        (merged.get(id) ?? 0) +
        qty

      if (next > 50) {
        return {
          data: null,
          error: {
            code: 'P0001',
            message:
              'invalid_quantity',
          },
        }
      }

      merged.set(id, next)
    }

    const snapshot: Row[] = []
    let total = 0

    for (
      const [id, qty]
      of merged
    ) {
      const menu =
        db.menu_items.find(
          (row) =>
            String(row.id) === id,
        )

      if (!menu) {
        return {
          data: null,
          error: {
            code: 'P0001',
            message:
              'menu_item_not_found',
          },
        }
      }

      if (
        menu.is_available ===
        false
      ) {
        return {
          data: null,
          error: {
            code: 'P0001',
            message:
              'menu_item_unavailable',
          },
        }
      }

      const price =
        Number(menu.price)

      if (
        !Number.isFinite(price)
      ) {
        return {
          data: null,
          error: {
            code: 'P0001',
            message:
              'invalid_menu_price',
          },
        }
      }

      total +=
        price * qty

      snapshot.push({
        id: menu.id,
        menu_item_id:
          menu.id,
        name: menu.name,
        price,
        qty,
        quantity: qty,
        line_total:
          price * qty,
      })
    }

    const now =
      new Date()

    const row: Row = {
      id: `id-${Math.random()
        .toString(36)
        .slice(2, 10)}`,
      order_no: ++seq,
      customer_name:
        String(
          args.p_customer_name ??
            '',
        ),
      customer_phone:
        String(
          args.p_customer_phone ??
            '',
        ),
      customer_email:
        args.p_customer_email ??
        null,
      phone_digits:
        String(
          args.p_customer_phone ??
            '',
        ).replace(
          /[^0-9]/g,
          '',
        ),
      items: snapshot,
      total_price:
        String(total),
      pickup_minutes: null,
      status:
        'pending_owner_confirmation',
      channel:
        args.p_channel ??
        'takeaway',
      idempotency_key:
        key,
      public_token:
        hexToken(),
      created_at:
        now.toISOString(),
      updated_at:
        now.toISOString(),
      accept_by:
        new Date(
          now.getTime() +
            10 * 60_000,
        ).toISOString(),
      ready_estimate: null,
      cancel_reason: null,
      rejection_reason: null,
    }

    db.orders.push(row)

    return {
      data: {
        ok: true,
        idempotent: false,
        order_id: row.id,
        order_no:
          row.order_no,
        public_token:
          row.public_token,
        status: row.status,
        accept_by:
          row.accept_by,
        total_price: total,
      },
      error: null,
    }
  }

  if (name === "create_web_reservation") {
    const key = String(args.p_idempotency_key ?? "");

    const existing = db.reservations.find(
      (row) => row.idempotency_key === key,
    );

    if (existing) {
      return {
        data: {
          ok: true,
          idempotent: true,
          reservation_no: existing.reservation_no,
          status: existing.status,
          reserved_at: existing.reserved_at,
        },
        error: null,
      };
    }

    const row: Row = {
      id: `res-${Math.random().toString(36).slice(2, 10)}`,
      reservation_no: ++reservationSeq,
      customer_name: String(args.p_customer_name ?? ""),
      customer_phone: String(args.p_customer_phone ?? ""),
      customer_email: args.p_customer_email ?? null,
      party_size: Number(args.p_party_size ?? 0),
      reserved_at: `${String(args.p_date ?? "")}T${String(args.p_time ?? "")}:00.000Z`,
      status: "pending_owner_confirmation",
      idempotency_key: key,
      created_at: new Date().toISOString(),
    };

    db.reservations.push(row);

    return {
      data: {
        ok: true,
        idempotent: false,
        reservation_no: row.reservation_no,
        status: row.status,
        reserved_at: row.reserved_at,
      },
      error: null,
    };
  }

  return {
    data: null,
    error: {
      code: 'PGRST202',
      message:
        `Unknown test RPC: ${name}`,
    },
  }
}

export function createClient() {
  return {
    from: (table: string) =>
      new Query(table),
    rpc,
  }
}
