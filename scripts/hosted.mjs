import { execFileSync, spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const origin = new URL(process.env.RENDER_EXTERNAL_URL || process.env.PUBLIC_ORIGIN);
if (origin.protocol !== "https:" && origin.hostname !== "localhost") {
  throw new Error("El origen público debe utilizar HTTPS.");
}
for (const name of ["MONGODB_URI", "JWT_SECRET", "ADMIN_EMAIL", "ADMIN_PASSWORD"]) {
  if (!process.env[name]) throw new Error("Falta configurar " + name);
}
if (Buffer.byteLength(process.env.JWT_SECRET) < 32) {
  throw new Error("JWT_SECRET necesita al menos 32 bytes.");
}

const cwd = (folder) => fileURLToPath(new URL("../" + folder + "/", import.meta.url));
const { MONGODB_URI, JWT_SECRET, ADMIN_EMAIL, ADMIN_PASSWORD, ...frontend } = process.env;
const shared = { ...frontend, NODE_ENV: "production", NEXT_TELEMETRY_DISABLED: "1" };
const apiPort = process.env.FRECUENCIA_API_PORT || "4000";
const panelPort = process.env.FRECUENCIA_PANEL_PORT || "4200";
const backend = {
  ...shared,
  BIND_HOST: "127.0.0.1",
  PORT: apiPort,
  MONGODB_URI,
  JWT_SECRET,
  ALLOWED_ORIGINS: origin.origin,
};

// Ambas operaciones son idempotentes y se completan antes de aceptar tráfico.
execFileSync(process.execPath, ["dist/src/admin.js"], {
  cwd: cwd("backend"),
  env: { ...backend, ADMIN_EMAIL, ADMIN_PASSWORD },
  stdio: "inherit",
});
execFileSync(process.execPath, ["dist/src/seed.js"], {
  cwd: cwd("backend"),
  env: backend,
  stdio: "inherit",
});

const services = [
  ["backend", ["dist/server.js"], backend],
  ["frontend-angular", ["serve.cjs"], {
    ...shared,
    PORT: panelPort,
    BIND_HOST: "127.0.0.1",
    API_ORIGIN: "http://127.0.0.1:" + apiPort,
  }],
  ["frontend-nextjs", ["node_modules/next/dist/bin/next", "start", "--hostname", "0.0.0.0"], shared],
];
const children = services.map(([folder, args, env]) =>
  spawn(process.execPath, args, { cwd: cwd(folder), env, stdio: "inherit" }),
);
let stopping = false;
function stop(code) {
  if (stopping) return;
  stopping = true;
  process.exitCode = code;
  for (const child of children) child.kill("SIGTERM");
}
for (const child of children) {
  child.on("error", (error) => {
    console.error(error.message);
    stop(1);
  });
  child.on("exit", (code) => stop(code || 1));
}
process.on("SIGINT", () => stop(0));
process.on("SIGTERM", () => stop(0));
