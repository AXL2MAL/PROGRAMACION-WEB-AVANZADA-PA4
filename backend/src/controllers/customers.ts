import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { User } from "../models";
import { Failure } from "../middleware/security";
import { email, password } from "./auth";
import { id } from "./products";
const details = z
  .object({ name: z.string().trim().min(2).max(80), email })
  .strict();
const customers = Router();
customers.get("/", async (req, res) =>
  res.json(
    await User.find({ role: "cliente", disabled: { $ne: true } })
      .select("name email createdAt")
      .sort({ createdAt: -1 }),
  ),
);
customers.post("/", async (req, res) => {
  const data = details.extend({ password }).parse(req.body);
  const user = await User.create({
    name: data.name,
    email: data.email,
    role: "cliente",
    hash: await bcrypt.hash(data.password, 12),
  });
  res
    .status(201)
    .json({
      _id: user._id,
      name: user.name,
      email: user.email,
      createdAt: user.createdAt,
    });
});
customers.put("/:id", async (req, res) => {
  const data = details.parse(req.body);
  const row = await User.findOneAndUpdate(
    { _id: id.parse(req.params.id), role: "cliente", disabled: { $ne: true } },
    { $set: data, $inc: { version: 1 } },
    { new: true },
  ).select("name email createdAt");
  if (!row) throw new Failure(404, "Cliente inexistente.");
  res.json(row);
});
customers.delete("/:id", async (req, res) => {
  const row = await User.findOneAndUpdate(
    { _id: id.parse(req.params.id), role: "cliente", disabled: { $ne: true } },
    { $set: { disabled: true }, $inc: { version: 1 } },
  );
  if (!row) throw new Failure(404, "Cliente inexistente.");
  res.sendStatus(204);
});
export default customers;
