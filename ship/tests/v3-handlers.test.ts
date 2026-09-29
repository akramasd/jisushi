import {
  test,
  describe,
  beforeEach,
  after,
  mock,
} from "node:test"

import assert
  from "node:assert/strict"

import {
  __reset,
  __table,
} from "./stubs/supabase-js.ts"

process.env.NEXT_PUBLIC_SUPABASE_URL =
  "https://stub.supabase.co"

process.env.SUPABASE_SERVICE_ROLE_KEY =
  "stub-service-key"

process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY =
  "stub-anon-key"

const { POST: checkout } =
  await import(
    "../app/api/checkout/route.ts"
  )

const { GET: statusGet } =
  await import(
    "../app/api/order/[token]/route.ts"
  )

const ITEM =
  "aaaaaaaa-1111-4111-8111-111111111111"

const SOLD =
  "cccccccc-3333-4333-8333-333333333333"

const MENU = [
  {
    id: ITEM,
    name:
      "California (8 stk.)",
    price: "79.00",
    is_available: true,
  },
  {
    id: SOLD,
    name: "Edamame",
    price: "45.00",
    is_available: false,
  },
]

const OPEN =
  new Date(
    "2026-07-17T13:00:00Z",
  )

const CLOSED =
  new Date(
    "2026-07-17T23:30:00Z",
  )

function setClock(
  value: Date,
) {
  mock.timers.reset()

  mock.timers.enable({
    apis: ["Date"],
    now: value.getTime(),
  })
}

let seq = 0

function payload(
  over:
    Record<string, unknown> = {},
) {
  return {
    items: [
      {
        id: ITEM,
        qty: 2,
      },
    ],
    name:
      "V3 Testkunde",
    phone:
      "31 33 44 86",
    email:
      "customer@example.com",
    pickupMinutes: 30,
    idempotencyKey:
      `v3-${++seq}`,
    ...over,
  }
}

async function post(
  body: unknown,
) {
  return checkout(
    new Request(
      "https://jisushi.dk/api/checkout",
      {
        method: "POST",
        headers: {
          "content-type":
            "application/json",
          "x-forwarded-for":
            `10.50.0.${seq + 1}`,
        },
        body:
          JSON.stringify(body),
      },
    ),
  )
}

async function j(
  response: Response,
) {
  return {
    status:
      response.status,
    body:
      await response.json(),
  }
}

beforeEach(() => {
  __reset({
    menu_items: MENU,
    restaurant_settings: [
      {
        id: "main",
        ordering_paused:
          false,
        pause_message: null,
      },
    ],
  })

  setClock(OPEN)
})

after(() =>
  mock.timers.reset(),
)

describe(
  "Supabase V3 checkout",
  () => {
    test(
      "creates an owner-confirmation order",
      async () => {
        const result =
          await j(
            await post(
              payload(),
            ),
          )

        assert.equal(
          result.status,
          200,
        )

        assert.equal(
          result.body.ok,
          true,
        )

        assert.equal(
          result.body.status,
          "pending_owner_confirmation",
        )

        assert.equal(
          result.body.total,
          158,
        )

        assert.equal(
          result.body
            .token.length,
          32,
        )

        assert.ok(
          result.body.acceptBy,
        )

        const row =
          __table(
            "orders",
          )[0]

        assert.equal(
          row.status,
          "pending_owner_confirmation",
        )

        assert.equal(
          row.pickup_minutes,
          30,
        )

        assert.equal(
          row.phone_digits,
          "31334486",
        )
      },
    )

    test(
      "ignores client price and name",
      async () => {
        const result =
          await j(
            await post(
              payload({
                items: [
                  {
                    id: ITEM,
                    qty: 1,
                    price: 1,
                    name:
                      "Gratis",
                  },
                ],
              }),
            ),
          )

        assert.equal(
          result.body.total,
          79,
        )

        assert.equal(
          __table(
            "orders",
          )[0].items[0]
            .name,
          "California (8 stk.)",
        )
      },
    )

    test(
      "blocks sold-out menu item",
      async () => {
        const result =
          await j(
            await post(
              payload({
                items: [
                  {
                    id: SOLD,
                    qty: 1,
                  },
                ],
              }),
            ),
          )

        assert.equal(
          result.status,
          409,
        )

        assert.equal(
          __table(
            "orders",
          ).length,
          0,
        )
      },
    )

    test(
      "idempotent retry returns same order",
      async () => {
        const p =
          payload()

        const first =
          await j(
            await post(p),
          )

        const second =
          await j(
            await post(p),
          )

        assert.equal(
          second.status,
          200,
        )

        assert.equal(
          second.body.replay,
          true,
        )

        assert.equal(
          second.body.orderNo,
          first.body.orderNo,
        )

        assert.equal(
          second.body.token,
          first.body.token,
        )

        assert.equal(
          __table(
            "orders",
          ).length,
          1,
        )
      },
    )

    test(
      "retry works after restaurant closes",
      async () => {
        const p =
          payload()

        const first =
          await j(
            await post(p),
          )

        assert.equal(
          first.status,
          200,
        )

        setClock(CLOSED)

        const second =
          await j(
            await post(p),
          )

        assert.equal(
          second.status,
          200,
        )

        assert.equal(
          second.body.replay,
          true,
        )

        assert.equal(
          second.body.orderNo,
          first.body.orderNo,
        )
      },
    )

    test(
      "new order after closing is blocked",
      async () => {
        setClock(CLOSED)

        const result =
          await j(
            await post(
              payload(),
            ),
          )

        assert.equal(
          result.status,
          409,
        )

        assert.equal(
          result.body.closed,
          true,
        )

        assert.equal(
          __table(
            "orders",
          ).length,
          0,
        )
      },
    )

    test(
      "owner pause blocks ordering",
      async () => {
        __reset({
          menu_items: MENU,
          restaurant_settings: [
            {
              id: "main",
              ordering_paused:
                true,
              pause_message:
                "Vi er fyldt op.",
            },
          ],
        })

        setClock(OPEN)

        const result =
          await j(
            await post(
              payload(),
            ),
          )

        assert.equal(
          result.status,
          409,
        )

        assert.match(
          result.body.error,
          /fyldt op/i,
        )
      },
    )
  },
)

describe(
  "V3 order tracking",
  () => {
    function get(
      token: string,
    ) {
      return statusGet(
        new Request(
          `https://jisushi.dk/api/order/${token}`,
          {
            headers: {
              "x-forwarded-for":
                "10.60.0.1",
            },
          },
        ),
        {
          params:
            Promise.resolve({
              token,
            }),
        },
      )
    }

    test(
      "tracks by random public token",
      async () => {
        const made =
          await j(
            await post(
              payload(),
            ),
          )

        const tracked =
          await j(
            await get(
              made.body.token,
            ),
          )

        assert.equal(
          tracked.status,
          200,
        )

        assert.equal(
          tracked.body.order
            .orderNo,
          made.body.orderNo,
        )

        assert.equal(
          tracked.body.order
            .status,
          "pending_owner_confirmation",
        )

        assert.ok(
          tracked.body.order
            .acceptBy,
        )
      },
    )

    test(
      "does not leak identity",
      async () => {
        const made =
          await j(
            await post(
              payload(),
            ),
          )

        const tracked =
          await j(
            await get(
              made.body.token,
            ),
          )

        const text =
          JSON.stringify(
            tracked.body,
          ).toLowerCase()

        assert.equal(
          text.includes(
            "v3 testkunde",
          ),
          false,
        )

        assert.equal(
          text.includes(
            "31334486",
          ),
          false,
        )

        assert.equal(
          text.includes(
            "customer@example.com",
          ),
          false,
        )
      },
    )

    test(
      "sequential IDs are invalid tokens",
      async () => {
        assert.equal(
          (
            await get("41")
          ).status,
          404,
        )
      },
    )
  },
)
