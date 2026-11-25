import { Router } from "express";
import { z } from "zod";
import { Product, categories, images } from "../models";
import { Failure } from "../middleware/security";

export const id = z.string().regex(/^[a-f0-9]{24}$/i);
export const productInput = z
  .object({
    name: z.string().trim().min(2).max(90),
    category: z.enum(categories),
    description: z.string().trim().min(5).max(800),
    price: z.number().int().min(1).max(10000000),
    stock: z.number().int().min(0).max(100000),
    image: z.enum(images),
  })
  .strict();
export function products(manage = false) {
  const r = Router();
  r.get("/", async (req, res) => {
    const { q, category } = z
      .object({
        q: z.string().max(100).optional(),
        category: z.enum(categories).optional(),
      })
      .parse(req.query);
    const rows = await Product.find({
      archived: false,
      ...(category && { category }),
      ...(q && {
        name: {
          $regex: q.replace(/[^\p{L}\p{N} ]/gu, (c) => "\\" + c),
          $options: "i",
        },
      }),
    })
      .select("-seedKey -__v")
      .sort({ _id: 1 })
      .lean();
    res.json(rows);
  });
  if (manage) {
    r.post("/", async (req, res) =>
      res.status(201).json(await Product.create(productInput.parse(req.body))),
    );
    r.put("/:id", async (req, res) => {
      const data = productInput.parse(req.body);
      const row = await Product.findOneAndUpdate(
        { _id: id.parse(req.params.id), archived: false },
        data,
        { new: true, runValidators: true },
      );
      if (!row) throw new Failure(404, "Producto inexistente.");
      res.json(row);
    });
    r.delete("/:id", async (req, res) => {
      const row = await Product.findOneAndUpdate(
        { _id: id.parse(req.params.id), archived: false },
        { archived: true },
      );
      if (!row) throw new Failure(404, "Producto inexistente.");
      res.sendStatus(204);
    });
  }
  return r;
}
