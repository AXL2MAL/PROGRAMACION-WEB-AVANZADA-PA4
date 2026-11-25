import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import mongoose from "mongoose";
import { connect } from "./src/config/db";
import { User, Product, Order } from "./src/models";
import {
  auth,
  admin,
  key,
  handleError,
  Failure,
} from "./src/middleware/security";
import customers from "./src/controllers/customers";
import { sessions } from "./src/controllers/auth";
import { products } from "./src/controllers/products";
import { orders, metrics } from "./src/controllers/orders";

async function main() {
  key();
  await connect();
  await Promise.all([User.init(), Product.init(), Order.init()]);
  const origins = (process.env.ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
  const app = express();
  app.use(
    helmet(),
    cors({ origin: origins, credentials: true }),
    express.json({ limit: "32kb" }),
    cookieParser(),
  );
  app.use((req, res, next) => {
    res.set("Cache-Control", "no-store");
    if (
      !["GET", "HEAD", "OPTIONS"].includes(req.method) &&
      req.headers.origin &&
      !origins.includes(req.headers.origin)
    )
      throw new Failure(403, "Origen no autorizado.");
    next();
  });
  app.get("/api/health", async (req, res) => {
    await mongoose.connection.db!.admin().ping();
    res.json({ status: "ok", database: "connected" });
  });
  app.use("/api/auth", sessions());
  app.use("/api/admin/auth", sessions(true));
  app.use("/api/products", products());
  app.use("/api/orders", auth, orders());
  app.use("/api/admin", auth, admin);
  app.use("/api/admin/products", products(true));
  app.use("/api/admin/orders", orders(true));
  app.get("/api/admin/summary", async (req, res) => res.json(await metrics()));
  app.use("/api/admin/customers", customers);
  app.use((req, res) =>
    res.status(404).json({ error: "Recurso inexistente." }),
  );
  app.use(handleError);
  const port = Number(process.env.PORT || 4000);
  app.listen(port, "0.0.0.0", () => console.log("API en puerto " + port));
}
main().catch((err) => {
  console.error("No se pudo iniciar la API:", err.name);
  process.exitCode = 1;
});
