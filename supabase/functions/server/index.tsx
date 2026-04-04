import { Hono } from "npm:hono";
import { logger } from "npm:hono/logger";
import * as kv from "./kv_store.tsx";

const app = new Hono();

// Enable logger
app.use('*', logger(console.log));

// ─── Manual CORS middleware ────────────────────────────────────────────────
// npm:hono/cors can be unreliable in the Supabase Deno runtime.
// We handle CORS manually to guarantee preflight (OPTIONS) responses and
// correct Access-Control-* headers on every response.
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, content-type, apikey, x-client-info',
  'Access-Control-Max-Age': '600',
};

app.use('*', async (c, next) => {
  // Respond immediately to CORS preflight
  if (c.req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  // Queue CORS headers so they are added to the actual response
  Object.entries(CORS_HEADERS).forEach(([k, v]) => c.header(k, v));

  await next();
});
// ──────────────────────────────────────────────────────────────────────────

// Health check endpoint
app.get("/make-server-e7ee43e7/health", (c) => {
  return c.json({ status: "ok" });
});

// --- Products ---
app.get("/make-server-e7ee43e7/products", async (c) => {
  try {
    const products = await kv.getByPrefix("product:");
    return c.json(products);
  } catch (error) {
    console.log("Error fetching products:", error);
    return c.json({ error: "Failed to fetch products" }, 500);
  }
});

app.post("/make-server-e7ee43e7/products", async (c) => {
  try {
    const product = await c.req.json();
    const id = product.id || crypto.randomUUID();
    const key = `product:${id}`;
    const data = { ...product, id };
    await kv.set(key, data);
    return c.json(data);
  } catch (error) {
    console.log("Error creating product:", error);
    return c.json({ error: "Failed to create product" }, 500);
  }
});

app.delete("/make-server-e7ee43e7/products/:id", async (c) => {
  try {
    const id = c.req.param("id");
    await kv.del(`product:${id}`);
    return c.json({ success: true });
  } catch (error) {
    console.log("Error deleting product:", error);
    return c.json({ error: "Failed to delete product" }, 500);
  }
});

// --- Clients ---
app.get("/make-server-e7ee43e7/clients", async (c) => {
  try {
    const clients = await kv.getByPrefix("client:");
    return c.json(clients);
  } catch (error) {
    console.log("Error fetching clients:", error);
    return c.json({ error: "Failed to fetch clients" }, 500);
  }
});

app.post("/make-server-e7ee43e7/clients", async (c) => {
  try {
    const client = await c.req.json();
    const id = client.id || crypto.randomUUID();
    const key = `client:${id}`;
    const data = { ...client, id };
    await kv.set(key, data);
    return c.json(data);
  } catch (error) {
    console.log("Error creating client:", error);
    return c.json({ error: "Failed to create client" }, 500);
  }
});

app.delete("/make-server-e7ee43e7/clients/:id", async (c) => {
  try {
    const id = c.req.param("id");
    await kv.del(`client:${id}`);
    return c.json({ success: true });
  } catch (error) {
    console.log("Error deleting client:", error);
    return c.json({ error: "Failed to delete client" }, 500);
  }
});

// --- Transactions ---
app.get("/make-server-e7ee43e7/transactions", async (c) => {
  try {
    const transactions = await kv.getByPrefix("transaction:");
    return c.json(transactions);
  } catch (error) {
    console.log("Error fetching transactions:", error);
    return c.json({ error: "Failed to fetch transactions" }, 500);
  }
});

app.post("/make-server-e7ee43e7/transactions", async (c) => {
  try {
    const tx = await c.req.json();
    const id = tx.id || crypto.randomUUID();
    const key = `transaction:${id}`;
    const data = { ...tx, id };
    await kv.set(key, data);
    return c.json(data);
  } catch (error) {
    console.log("Error creating transaction:", error);
    return c.json({ error: "Failed to create transaction" }, 500);
  }
});

app.delete("/make-server-e7ee43e7/transactions/:id", async (c) => {
  try {
    const id = c.req.param("id");
    await kv.del(`transaction:${id}`);
    return c.json({ success: true });
  } catch (error) {
    console.log("Error deleting transaction:", error);
    return c.json({ error: "Failed to delete transaction" }, 500);
  }
});

// --- Repairs ---
app.get("/make-server-e7ee43e7/repairs", async (c) => {
  try {
    const repairs = await kv.getByPrefix("repair:");
    return c.json(repairs);
  } catch (error) {
    console.log("Error fetching repairs:", error);
    return c.json({ error: "Failed to fetch repairs" }, 500);
  }
});

app.post("/make-server-e7ee43e7/repairs", async (c) => {
  try {
    const repair = await c.req.json();
    const id = repair.id || crypto.randomUUID();
    const key = `repair:${id}`;
    const data = { ...repair, id };
    await kv.set(key, data);
    return c.json(data);
  } catch (error) {
    console.log("Error creating repair:", error);
    return c.json({ error: "Failed to create repair" }, 500);
  }
});

app.delete("/make-server-e7ee43e7/repairs/:id", async (c) => {
  try {
    const id = c.req.param("id");
    await kv.del(`repair:${id}`);
    return c.json({ success: true });
  } catch (error) {
    console.log("Error deleting repair:", error);
    return c.json({ error: "Failed to delete repair" }, 500);
  }
});

// --- Debts ---
app.get("/make-server-e7ee43e7/debts", async (c) => {
  try {
    const debts = await kv.getByPrefix("debt:");
    return c.json(debts);
  } catch (error) {
    console.log("Error fetching debts:", error);
    return c.json({ error: "Failed to fetch debts" }, 500);
  }
});

app.post("/make-server-e7ee43e7/debts", async (c) => {
  try {
    const debt = await c.req.json();
    const id = debt.id || crypto.randomUUID();
    const key = `debt:${id}`;
    const data = { ...debt, id };
    await kv.set(key, data);
    return c.json(data);
  } catch (error) {
    console.log("Error creating debt:", error);
    return c.json({ error: "Failed to create debt" }, 500);
  }
});

app.delete("/make-server-e7ee43e7/debts/:id", async (c) => {
  try {
    const id = c.req.param("id");
    await kv.del(`debt:${id}`);
    return c.json({ success: true });
  } catch (error) {
    console.log("Error deleting debt:", error);
    return c.json({ error: "Failed to delete debt" }, 500);
  }
});

Deno.serve(app.fetch);
