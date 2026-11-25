import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { rateLimit } from "express-rate-limit";
import { User } from "../models";
import {
  auth,
  Failure,
  loginCookie,
  sessionConfig,
} from "../middleware/security";

export const email = z
  .email()
  .max(254)
  .transform((v) => v.toLowerCase());
export const password = z
  .string()
  .min(10)
  .refine((v) => Buffer.byteLength(v) <= 72);
const credentials = z.object({ email, password });
const limit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 40,
  message: { error: "Demasiados intentos. Inténtalo más tarde." },
});
export function sessions(panel = false) {
  const r = Router();
  if (!panel)
    r.post("/register", limit, async (req, res) => {
      const data = credentials
        .extend({ name: z.string().trim().min(2).max(80) })
        .strict()
        .parse(req.body);
      const user = await User.create({
        name: data.name,
        email: data.email,
        hash: await bcrypt.hash(data.password, 12),
      });
      loginCookie(req, res, user.id, user.version);
      res
        .status(201)
        .json({
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        });
    });
  r.post("/login", limit, async (req, res) => {
    const data = credentials.parse(req.body);
    const user = await User.findOne({ email: data.email }).select(
      "+hash +version",
    );
    if (
      !user ||
      user.disabled ||
      !(await bcrypt.compare(data.password, user.hash))
    )
      throw new Failure(401, "Correo o contraseña incorrectos.");
    if (panel && user.role !== "admin")
      throw new Failure(403, "Esta cuenta no tiene acceso al panel.");
    loginCookie(req, res, user.id, user.version);
    res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    });
  });
  r.get("/me", auth, (req, res) => res.json(req.principal));
  r.post("/logout", auth, async (req, res) => {
    await User.updateOne({ _id: req.principal!.id }, { $inc: { version: 1 } });
    const { name, options } = sessionConfig(req);
    res.clearCookie(name, options).json({ ok: true });
  });
  return r;
}
