import { Router } from "express";
import mongoose from "mongoose";
import { z } from "zod";
import { Order, Product, User, states } from "../models";
import { Failure } from "../middleware/security";
import { id } from "./products";

const checkout = z
  .object({
    requestId: z.uuid(),
    items: z
      .array(z.object({ product: id, qty: z.int().min(1).max(99) }).strict())
      .min(1)
      .max(50),
  })
  .strict();
export function orders(manage = false) {
  const r = Router();
  r.get("/", async (req, res) => {
    const query = Order.find(
      manage ? {} : { customer: req.principal!.id },
    ).sort({ createdAt: -1 });
    if (manage) query.populate("customer", "name email");
    res.json(await query.lean());
  });
  r.get("/:id", async (req, res) => {
    const row = await Order.findOne({
      _id: id.parse(req.params.id),
      ...(!manage && { customer: req.principal!.id }),
    });
    if (!row) throw new Failure(404, "Pedido inexistente.");
    res.json(row);
  });
  if (!manage)
    r.post("/", async (req, res) => {
      const { items, requestId } = checkout.parse(req.body);
      if (new Set(items.map((i) => i.product)).size !== items.length)
        throw new Failure(400, "Productos duplicados.");
      const customer = req.principal!.id;
      const result = await mongoose.connection.transaction(async (session) => {
        const prior = await Order.findOne({ customer, requestId }).session(
          session,
        );
        if (prior) return prior;
        const lines = [];
        for (const item of items) {
          const p = await Product.findOneAndUpdate(
            { _id: item.product, archived: false, stock: { $gte: item.qty } },
            { $inc: { stock: -item.qty } },
            { session },
          );
          if (!p)
            throw new Failure(
              409,
              "Un producto ya no está disponible en esa cantidad.",
            );
          lines.push({
            product: p._id,
            name: p.name,
            price: p.price,
            qty: item.qty,
          });
        }
        const [order] = await Order.create(
          [
            {
              customer,
              requestId,
              items: lines,
              total: lines.reduce((sum, i) => sum + i.price * i.qty, 0),
            },
          ],
          { session },
        );
        return order;
      });
      res.status(201).json(result);
    });
  if (manage)
    r.patch("/:id/status", async (req, res) => {
      const { status } = z.object({ status: z.enum(states) }).parse(req.body);
      const result = await mongoose.connection.transaction(async (session) => {
        const row = await Order.findById(id.parse(req.params.id)).session(
          session,
        );
        if (!row) throw new Failure(404, "Pedido inexistente.");
        if (row.status === status) return row;
        const next: Record<string, string[]> = {
          Pendiente: ["En preparación", "Cancelado"],
          "En preparación": ["Enviado", "Cancelado"],
          Enviado: ["Entregado"],
        };
        if (!next[row.status]?.includes(status))
          throw new Failure(409, "Cambio de estado no permitido.");
        if (status === "Cancelado")
          for (const line of row.items)
            await Product.updateOne(
              { _id: line.product },
              { $inc: { stock: line.qty } },
              { session },
            );
        row.status = status;
        return row.save({ session });
      });
      res.json(result);
    });
  return r;
}
export const metrics = async () => {
  const [users, products, orders, revenue, weekly] = await Promise.all([
    User.countDocuments({ disabled: { $ne: true } }),
    Product.countDocuments({ archived: false }),
    Order.countDocuments(),
    Order.aggregate([
      { $match: { status: { $ne: "Cancelado" } } },
      { $group: { _id: null, total: { $sum: "$total" } } },
    ]),
    Order.aggregate([
      {
        $match: {
          createdAt: { $gte: new Date(Date.now() - 7 * 86400000) },
          status: { $ne: "Cancelado" },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          total: { $sum: "$total" },
        },
      },
    ]),
  ]);
  return { users, products, orders, revenue: revenue[0]?.total ?? 0, weekly };
};
