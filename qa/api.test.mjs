import { test } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { randomBytes, randomUUID } from "node:crypto";
import { once } from "node:events";
import { setTimeout as delay } from "node:timers/promises";
import { createServer } from "node:net";
import { fileURLToPath } from "node:url";
const backend = fileURLToPath(new URL("../backend/", import.meta.url));
const requireBackend = createRequire(
  new URL("../backend/package.json", import.meta.url),
);
const { MongoClient } = requireBackend("mongoose").mongo;
const bcrypt = requireBackend("bcryptjs");
test("Integración de Express con un replica set real", async (t) => {
  const dbName = "frecuencia_qa_" + randomBytes(8).toString("hex");
  const uri =
    "mongodb://127.0.0.1:27017/" +
    dbName +
    "?replicaSet=rs0&directConnection=true";
  const mongo = await new MongoClient(uri).connect();
  const db = mongo.db(dbName);
  const password = randomUUID(),
    adminEmail = "equipo@example.test";
  await db
    .collection("users")
    .insertOne({
      email: adminEmail,
      name: "QA",
      role: "admin",
      hash: await bcrypt.hash(password, 12),
      version: 0,
    });
  const socket = createServer();
  socket.listen(0, "127.0.0.1");
  await once(socket, "listening");
  const port = socket.address().port;
  await new Promise((r) => socket.close(r));
  const server = spawn(process.execPath, ["dist/server.js"], {
    cwd: backend,
    stdio: "ignore",
    env: {
      ...process.env,
      MONGODB_URI: uri,
      PORT: String(port),
      JWT_SECRET: randomBytes(48).toString("hex"),
      ALLOWED_ORIGINS: "https://tienda.example.test",
      NODE_ENV: "production",
    },
  });
  t.after(async () => {
    if (server.exitCode === null && server.signalCode === null) {
      const end = once(server, "exit");
      server.kill();
      await end;
    }
    await db.dropDatabase();
    await mongo.close();
  });
  const request = async (
    path,
    { method = "GET", data, cookie, origin } = {},
  ) => {
    const res = await fetch("http://127.0.0.1:" + port + "/api/" + path, {
      method,
      headers: {
        ...(data && { "Content-Type": "application/json" }),
        ...(cookie && { Cookie: cookie }),
        ...(origin && { Origin: origin }),
      },
      body: data ? JSON.stringify(data) : undefined,
    });
    const raw = await res.text();
    return {
      status: res.status,
      body: raw ? JSON.parse(raw) : null,
      cookie: res.headers.get("set-cookie")?.split(";")[0],
      setCookie: res.headers.get("set-cookie"),
    };
  };
  for (let i = 0; ; i++) {
    try {
      if ((await request("health")).status === 200) break;
    } catch {}
    if (i === 60) throw new Error("La API de pruebas no arrancó");
    await delay(150);
  }
  const register = (email, extra = {}) =>
    request("auth/register", {
      method: "POST",
      data: { name: "Cliente QA", email, password, ...extra },
    });
  let manager, client, other, product, order, checkout;
  await t.test(
    "registro, bcrypt, cookie de producción, CORS y roles",
    async () => {
      assert.equal(
        (await register("fake@example.test", { role: "admin" })).status,
        400,
      );
      const login = await register("uno@example.test");
      assert.equal(login.status, 201);
      client = login.cookie;
      for (const flag of ["HttpOnly", "Secure", "SameSite=Lax"])
        assert.ok(login.setCookie.includes(flag));
      assert.equal(login.body.hash, undefined);
      assert.notEqual(
        (await db.collection("users").findOne({ email: "uno@example.test" }))
          .hash,
        password,
      );
      assert.equal((await register("uno@example.test")).status, 409);
      other = (await register("dos@example.test")).cookie;
      assert.equal(
        (await request("admin/products", { cookie: client })).status,
        401,
      );
      assert.equal(
        (
          await request("admin/auth/login", {
            method: "POST",
            data: { email: "uno@example.test", password },
          })
        ).status,
        403,
      );
      assert.equal(
        (
          await request("auth/logout", {
            method: "POST",
            cookie: client,
            origin: "https://otro.example.test",
          })
        ).status,
        403,
      );
      manager = (
        await request("admin/auth/login", {
          method: "POST",
          data: { email: adminEmail, password },
        })
      ).cookie;
      assert.ok(manager);
    },
  );
  await t.test(
    "alta, edición y baja de clientes sin perder sus referencias",
    async () => {
      const data = {
        name: "Cuenta temporal",
        email: "temporal@example.test",
        password,
      };
      const row = await request("admin/customers", {
        method: "POST",
        cookie: manager,
        data,
      });
      assert.equal(row.status, 201);
      const path = "admin/customers/" + row.body._id;
      const edit = await request(path, {
        method: "PUT",
        cookie: manager,
        data: { name: "Cuenta editada", email: data.email },
      });
      assert.equal(edit.body.name, "Cuenta editada");
      const session = await request("auth/login", {
        method: "POST",
        data: { email: data.email, password },
      });
      assert.equal(session.status, 200);
      assert.equal(
        (await request(path, { method: "DELETE", cookie: manager })).status,
        204,
      );
      assert.equal(
        (await request("auth/me", { cookie: session.cookie })).status,
        401,
      );
      assert.equal(
        (
          await request("auth/login", {
            method: "POST",
            data: { email: data.email, password },
          })
        ).status,
        401,
      );
      assert.ok(
        !(await request("admin/customers", { cookie: manager })).body.some(
          (c) => c._id === row.body._id,
        ),
      );
    },
  );
  await t.test("CRUD y filtros de productos", async () => {
    const data = {
      name: "Hub de prueba",
      category: "Accesorios",
      description: "Cuatro puertos",
      price: 5999,
      stock: 3,
      image: "nexo",
    };
    assert.equal(
      (
        await request("admin/products", {
          method: "POST",
          cookie: manager,
          data: { ...data, price: -5 },
        })
      ).status,
      400,
    );
    const res = await request("admin/products", {
      method: "POST",
      cookie: manager,
      data,
    });
    assert.equal(res.status, 201);
    product = res.body._id;
    assert.equal(
      (
        await request("admin/products/" + product, {
          method: "PUT",
          cookie: manager,
          data: { ...data, price: 6500 },
        })
      ).status,
      200,
    );
    assert.equal(
      (await request("products?category=Accesorios&q=Hub")).body.length,
      1,
    );
    assert.equal((await request("products?q=otro")).body.length, 0);
  });
  await t.test(
    "transacción, reversión por stock y reintento idempotente",
    async () => {
      const fail = await request("orders", {
        method: "POST",
        cookie: client,
        data: {
          requestId: randomUUID(),
          items: [
            { product, qty: 1 },
            { product: "123456789abcdef123456789", qty: 1 },
          ],
        },
      });
      assert.equal(fail.status, 409);
      assert.equal((await request("products")).body[0].stock, 3);
      checkout = { requestId: randomUUID(), items: [{ product, qty: 2 }] };
      const res = await request("orders", {
        method: "POST",
        cookie: client,
        data: checkout,
      });
      assert.equal(res.status, 201);
      order = res.body._id;
      assert.equal(res.body.total, 13000);
      assert.equal(
        (
          await request("orders", {
            method: "POST",
            cookie: client,
            data: checkout,
          })
        ).body._id,
        order,
      );
      assert.equal((await request("products")).body[0].stock, 1);
      assert.equal(
        (await request("orders/" + order, { cookie: other })).status,
        404,
      );
      assert.equal((await request("orders", { cookie: other })).body.length, 0);
    },
  );
  await t.test("cambios de estado y devolución única del stock", async () => {
    const set = (status) =>
      request("admin/orders/" + order + "/status", {
        method: "PATCH",
        cookie: manager,
        data: { status },
      });
    assert.equal((await set("Entregado")).status, 409);
    assert.equal((await set("En preparación")).status, 200);
    assert.equal((await set("Cancelado")).status, 200);
    assert.equal((await set("Cancelado")).status, 200);
    assert.equal((await set("Enviado")).status, 409);
    assert.equal((await request("products")).body[0].stock, 3);
  });
  await t.test("dos compradores compiten por el mismo inventario", async () => {
    const responses = await Promise.all(
      [client, other].map((cookie) =>
        request("orders", {
          method: "POST",
          cookie,
          data: { requestId: randomUUID(), items: [{ product, qty: 3 }] },
        }),
      ),
    );
    assert.deepEqual(responses.map((r) => r.status).sort(), [201, 409]);
    assert.equal((await request("products")).body[0].stock, 0);
  });
  await t.test(
    "archivo del producto, historial y cierre de sesión",
    async () => {
      assert.equal(
        (
          await request("admin/products/" + product, {
            method: "DELETE",
            cookie: manager,
          })
        ).status,
        204,
      );
      assert.equal((await request("products")).body.length, 0);
      assert.equal(
        (await request("orders/" + order, { cookie: client })).body.items[0]
          .price,
        6500,
      );
      const summary = (await request("admin/summary", { cookie: manager }))
        .body;
      assert.equal(summary.orders, 2);
      assert.equal(summary.revenue, 19500);
      assert.equal(summary.products, 0);
      assert.equal(
        (await request("auth/logout", { method: "POST", cookie: client }))
          .status,
        200,
      );
      assert.equal((await request("auth/me", { cookie: client })).status, 401);
    },
  );
});
