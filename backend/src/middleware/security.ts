import type {
  Request,
  RequestHandler,
  ErrorRequestHandler,
  Response,
} from "express";
import jwt from "jsonwebtoken";
import { ZodError } from "zod";
import { User, Principal } from "../models";

declare global {
  namespace Express {
    interface Request {
      principal?: Principal;
    }
  }
}
export class Failure extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export function key() {
  const value = process.env.JWT_SECRET;
  if (!value || Buffer.byteLength(value) < 32)
    throw new Error("JWT_SECRET necesita al menos 32 bytes");
  return value;
}
export function sessionConfig(req: Request) {
  const panel = req.originalUrl.split("?")[0].startsWith("/api/admin/");
  return {
    name: panel ? "frecuencia_panel" : "frecuencia_cliente",
    options: {
      path: panel ? "/api/admin" : "/api",
      httpOnly: true,
      sameSite: "lax" as const,
      secure: process.env.NODE_ENV === "production",
    },
  };
}
export function loginCookie(
  req: Request,
  res: Response,
  id: string,
  version: number,
) {
  const { name, options } = sessionConfig(req);
  const token = jwt.sign({ ver: version }, key(), {
    subject: id,
    expiresIn: "8h",
    algorithm: "HS256",
    audience: name,
  });
  res.cookie(name, token, { ...options, maxAge: 8 * 60 * 60 * 1000 });
}
export const auth: RequestHandler = async (req, res, next) => {
  const { name } = sessionConfig(req);
  let payload: jwt.JwtPayload;
  try {
    payload = jwt.verify(req.cookies[name], key(), {
      algorithms: ["HS256"],
      audience: name,
    }) as jwt.JwtPayload;
  } catch {
    throw new Failure(401, "Inicia sesión para continuar.");
  }
  const user = await User.findById(payload.sub).select("+version");
  if (!user || user.disabled || user.version !== payload.ver)
    throw new Failure(401, "La sesión ha terminado.");
  req.principal = {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role || "cliente",
  };
  next();
};
export const admin: RequestHandler = (req, res, next) => {
  if (req.principal?.role !== "admin")
    throw new Failure(403, "Se requiere acceso administrativo.");
  next();
};
export const handleError: ErrorRequestHandler = (err, req, res, next) => {
  if (err instanceof ZodError) {
    res
      .status(400)
      .json({
        error: "Revisa los datos del formulario.",
        fields: err.issues.map((i) => i.path.join(".")),
      });
    return;
  }
  if (err?.code === 11000) {
    res.status(409).json({ error: "El registro ya existe." });
    return;
  }
  const status =
    err instanceof Failure
      ? err.status
      : err.status === 413
        ? 413
        : err.status === 400
          ? 400
          : 500;
  res
    .status(status)
    .json({
      error:
        err instanceof Failure
          ? err.message
          : status === 500
            ? "No se pudo completar la operación."
            : "Solicitud no válida.",
    });
};
