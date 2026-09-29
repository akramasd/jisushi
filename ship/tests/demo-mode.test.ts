import { test, describe, beforeEach, after, mock } from "node:test";
import assert from "node:assert/strict";

import { __reset, __table } from "./stubs/supabase-js.ts";

process.env.NEXT_PUBLIC_SUPABASE_URL = "https://stub.supabase.co";
process.env.SUPABASE_SERVICE_ROLE_KEY = "stub-service-key";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "stub-anon-key";

const { POST: checkout } = await import("../app/api/checkout/route.ts");
const { GET: statusGet } = await import("../app/api/order/[token]/route.ts");
const { POST: reserve } = await import("../app/api/reservations/route.ts");
const { GET: kitchenOrdersGet } = await import(
  "../app/api/kitchen/orders/route.ts"
);
const { GET: healthGet } = await import("../app/api/health/route.ts");
const demoLib = await import("../lib/demo.ts");

const ITEM = "aaaaaaaa-1111-4111-8111-111111111111";

const OPEN = new Date("2026-07-17T13:00:00Z");

function setClock(value: Date) {
  mock.timers.reset();
  mock.timers.enable({ apis: ["Date"], now: value.getTime() });
}

let seq = 1000;

function checkoutPayload(over: Record<string, unknown> = {}) {
  return {
    items: [{ id: ITEM, qty: 2 }],
    name: "Demo Gæst",
    phone: "31 33 44 86",
    email: "demo@example.com",
    pickupMinutes: 30,
    idempotencyKey: `demo-${++seq}`,
    ...over,
  };
}

async function postCheckout(body: unknown) {
  const res = await checkout(
    new Request("https://demo.local/api/checkout", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-forwarded-for": `10.90.0.${(seq % 250) + 1}`,
      },
      body: JSON.stringify(body),
    }),
  );
  return { status: res.status, body: await res.json() };
}

async function postReserve(body: unknown) {
  const res = await reserve(
    new Request("https://demo.local/api/reservations", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-forwarded-for": `10.91.0.${(seq % 250) + 1}`,
      },
      body: JSON.stringify(body),
    }),
  );
  return { status: res.status, body: await res.json() };
}

function getStatus(token: string) {
  return statusGet(
    new Request(`https://demo.local/api/order/${token}`, {
      headers: { "x-forwarded-for": "10.92.0.1" },
    }),
    { params: Promise.resolve({ token }) },
  ).then(async (res) => ({ status: res.status, body: await res.json() }));
}

function enableDemo() {
  process.env.PREPNEST_DEMO_MODE = "1";
  process.env.NEXT_PUBLIC_PREPNEST_DEMO_MODE = "1";
}

function disableDemo() {
  delete process.env.PREPNEST_DEMO_MODE;
  delete process.env.NEXT_PUBLIC_PREPNEST_DEMO_MODE;
}

beforeEach(() => {
  __reset({
    menu_items: [
      {
        id: ITEM,
        name: "California (8 stk.)",
        price: "79.00",
        is_available: true,
      },
    ],
    restaurant_settings: [
      { id: "main", ordering_paused: false, pause_message: null },
    ],
  });
  setClock(OPEN);
});

after(() => mock.timers.reset());

describe("demo-mode helpers", () => {
  test("demo tokens never collide with production semantics", () => {
    const t = demoLib.newDemoToken();
    assert.match(t, /^demo-[a-f0-9]{32}$/);
    assert.equal(demoLib.isDemoToken(t), true);
    assert.equal(/^[a-f0-9]{32}$/.test(t), false);
    assert.equal(demoLib.isDemoToken("41"), false);
    assert.equal(
      demoLib.isDemoToken("abcdef0123456789abcdef0123456789"),
      false,
    );
  });

  test("demo site URL never hardcodes live domain", () => {
    enableDemo();
    try {
      delete process.env.NEXT_PUBLIC_SITE_URL;
      delete process.env.VERCEL_URL;
      const fallback = demoLib.demoSafeSiteUrl("https://www.jisushi.dk");
      assert.ok(!fallback.includes("jisushi.dk"));
      process.env.VERCEL_URL = "demo-preview-123.vercel.app";
      const vercel = demoLib.demoSafeSiteUrl("https://www.jisushi.dk");
      assert.equal(vercel, "https://demo-preview-123.vercel.app");
      assert.ok(!vercel.includes("jisushi.dk"));
    } finally {
      delete process.env.VERCEL_URL;
      disableDemo();
    }
  });
});

describe("demo checkout", () => {
  test("returns realistic fake order without DB writes", async () => {
    enableDemo();
    try {
      const fetchCalls: string[] = [];
      const origFetch = globalThis.fetch;
      globalThis.fetch = (async (url: unknown) => {
        fetchCalls.push(String(url));
        throw new Error("external fetch must not happen in demo");
      }) as typeof fetch;
      try {
        const result = await postCheckout(checkoutPayload());
        assert.equal(result.status, 200);
        assert.equal(result.body.ok, true);
        assert.equal(result.body.demo, true);
        assert.equal(result.body.status, "pending_owner_confirmation");
        assert.equal(result.body.total, 158);
        assert.match(result.body.token, /^demo-[a-f0-9]{32}$/);
        assert.ok(result.body.acceptBy);
        assert.equal(result.body.pickupMinutes, 30);
        // acceptBy ca. +10 min fra mocked klokke
        const diff =
          new Date(result.body.acceptBy).getTime() - OPEN.getTime();
        assert.ok(diff >= 9 * 60_000 && diff <= 11 * 60_000);
        // Ingen live writes: stub-DB tom og ingen eksterne fetches
        assert.equal(__table("orders").length, 0);
        assert.equal(fetchCalls.length, 0);
      } finally {
        globalThis.fetch = origFetch;
      }
    } finally {
      disableDemo();
    }
  });

  test("works without service-role and sheets secrets", async () => {
    enableDemo();
    const savedKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const savedSheet = process.env.SHEET_WEBHOOK_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    delete process.env.SHEET_WEBHOOK_URL;
    try {
      const result = await postCheckout(checkoutPayload());
      assert.equal(result.status, 200);
      assert.equal(result.body.ok, true);
      assert.match(result.body.token, /^demo-/);
    } finally {
      if (savedKey) process.env.SUPABASE_SERVICE_ROLE_KEY = savedKey;
      if (savedSheet) process.env.SHEET_WEBHOOK_URL = savedSheet;
      disableDemo();
    }
  });

  test("rejects sold-out without external calls", async () => {
    enableDemo();
    try {
      const result = await postCheckout(
        checkoutPayload({
          items: [{ id: "cccccccc-3333-4333-8333-333333333333", qty: 1 }],
        }),
      );
      assert.equal(result.body.ok, false);
      assert.equal(__table("orders").length, 0);
    } finally {
      disableDemo();
    }
  });
});

describe("demo booking", () => {
  test("returns fake reservation without Supabase writes", async () => {
    enableDemo();
    try {
      const result = await postReserve({
        name: "Demo Gæst",
        phone: "31 33 44 86",
        email: "demo@example.com",
        date: "2026-08-01",
        time: "18:00",
        guests: 2,
        message: "Vindue",
        idempotencyKey: `demo-res-${++seq}`,
      });
      assert.equal(result.status, 200);
      assert.equal(result.body.ok, true);
      assert.equal(result.body.demo, true);
      assert.ok(result.body.reservationNo);
      assert.equal(result.body.status, "pending_owner_confirmation");
      assert.ok(result.body.reservedAt);
      assert.equal(__table("reservations").length, 0);
      assert.equal(__table("orders").length, 0);
    } finally {
      disableDemo();
    }
  });
});

describe("demo tracking", () => {
  test("tracks demo token without live DB", async () => {
    enableDemo();
    try {
      const made = await postCheckout(checkoutPayload());
      assert.equal(made.body.ok, true);
      const tracked = await getStatus(made.body.token);
      assert.equal(tracked.status, 200);
      assert.equal(tracked.body.ok, true);
      assert.equal(tracked.body.demo, true);
      assert.equal(
        tracked.body.order.status,
        "pending_owner_confirmation",
      );
      assert.ok(tracked.body.order.acceptBy);
      assert.ok(tracked.body.order.orderNo);
    } finally {
      disableDemo();
    }
  });

  test("invalid and production-format tokens 404 in demo", async () => {
    enableDemo();
    try {
      assert.equal((await getStatus("41")).status, 404);
      assert.equal(
        (await getStatus("abcdef0123456789abcdef0123456789")).status,
        404,
      );
    } finally {
      disableDemo();
    }
  });
});

describe("demo read-only guards", () => {
  test("kitchen write/read routes return demo_mode_read_only", async () => {
    enableDemo();
    try {
      const res = await kitchenOrdersGet(
        new Request("https://demo.local/api/kitchen/orders?view=active"),
      );
      assert.equal(res.status, 403);
      const body = await res.json();
      assert.equal(body.code, "demo_mode_read_only");
      assert.equal(body.demo, true);
    } finally {
      disableDemo();
    }
  });

  test("health works without secrets in demo", async () => {
    enableDemo();
    const saved = process.env.SUPABASE_SERVICE_ROLE_KEY;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    try {
      const res = await healthGet();
      assert.equal(res.status, 200);
      const body = await res.json();
      assert.equal(body.demo, true);
      assert.equal(body.db, "demo-disabled");
    } finally {
      if (saved) process.env.SUPABASE_SERVICE_ROLE_KEY = saved;
      disableDemo();
    }
  });
});

describe("production path intact when demo off", () => {
  test("checkout uses Supabase V3 and 32-hex token", async () => {
    disableDemo();
    process.env.SUPABASE_SERVICE_ROLE_KEY = "stub-service-key";
    const result = await postCheckout(checkoutPayload());
    assert.equal(result.status, 200);
    assert.equal(result.body.ok, true);
    assert.equal(result.body.demo ?? false, false);
    assert.match(result.body.token, /^[a-f0-9]{32}$/);
    assert.equal(result.body.status, "pending_owner_confirmation");
    assert.equal(__table("orders").length, 1);
    const tracked = await getStatus(result.body.token);
    assert.equal(tracked.status, 200);
    assert.equal(tracked.body.order.orderNo, result.body.orderNo);
  });
});
