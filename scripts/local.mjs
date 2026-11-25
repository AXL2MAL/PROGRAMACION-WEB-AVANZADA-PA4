// Configuración exclusiva para el entorno local de desarrollo.
import { mkdir, writeFile, readFile } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { execFileSync, spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";
import { parseEnv } from "node:util";
const root = fileURLToPath(new URL("../", import.meta.url));
const dir = resolve(root, ".local");
await mkdir(dir, { recursive: true, mode: 0o700 });
const config = resolve(dir, "development.env");
try {
  await writeFile(
    config,
    [
      "MONGODB_URI=mongodb://127.0.0.1:27017/frecuencia?replicaSet=rs0&directConnection=true",
      "ALLOWED_ORIGINS=http://localhost:3000,http://localhost:4200,http://127.0.0.1:3000,http://127.0.0.1:4200",
      "JWT_SECRET=" + randomBytes(48).toString("hex"),
      "ADMIN_EMAIL=equipo@frecuencia.test",
      "ADMIN_PASSWORD=" + randomBytes(18).toString("base64url"),
    ].join("\n") + "\n",
    { mode: 0o600, flag: "wx" },
  );
} catch (e) {
  if (e.code !== "EEXIST") throw e;
}
const env = {
  ...process.env,
  ...parseEnv(await readFile(config, "utf8")),
  NODE_ENV: "development",
  NEXT_TELEMETRY_DISABLED: "1",
};
function run(bin, args, cwd = root) {
  return execFileSync(bin, args, { cwd, env, stdio: "inherit" });
}
const command = process.argv[2];
if (command === "prepare") {
  const names = execFileSync("docker", ["ps", "-a", "--format", "{{.Names}}"], {
    encoding: "utf8",
  }).split("\n");
  if (names.includes("frecuencia-mongo"))
    run("docker", ["start", "frecuencia-mongo"]);
  else
    run("docker", [
      "run",
      "-d",
      "--name",
      "frecuencia-mongo",
      "-p",
      "127.0.0.1:27017:27017",
      "-v",
      "frecuencia-data:/data/db",
      "mongo:8.0",
      "--replSet",
      "rs0",
      "--bind_ip_all",
    ]);
  const mongo = (js) =>
    execFileSync(
      "docker",
      ["exec", "frecuencia-mongo", "mongosh", "--quiet", "--eval", js],
      { stdio: "pipe" },
    );
  for (let i = 0; ; i++) {
    try {
      mongo("db.adminCommand({ping:1})");
      break;
    } catch (e) {
      if (i === 25) throw e;
      await delay(1000);
    }
  }
  mongo(
    'try{rs.status()}catch(e){if(e.code!==94)throw e;rs.initiate({_id:"rs0",members:[{_id:0,host:"localhost:27017"}]})}',
  );
  for (let i = 0; ; i++) {
    try {
      mongo("if(!db.hello().isWritablePrimary)quit(1)");
      break;
    } catch (e) {
      if (i === 25) throw e;
      await delay(1000);
    }
  }
  run("npm", ["run", "seed"], resolve(root, "backend"));
  run("npm", ["run", "admin"], resolve(root, "backend"));
} else if (command === "start") {
  const commands = [
    ["backend", "node", ["dist/server.js"], 4000],
    ["frontend-angular", "node", ["serve.cjs"], 4200],
    [
      "frontend-nextjs",
      "node",
      ["node_modules/next/dist/bin/next", "start"],
      3000,
    ],
  ];
  const children = commands.map(([folder, bin, args, port]) =>
    spawn(bin, args, {
      cwd: resolve(root, folder),
      env: {
        ...env,
        PORT: String(port),
        ...(folder === "frontend-nextjs" ? { NODE_ENV: "production" } : {}),
      },
      stdio: "inherit",
    }),
  );
  let stopping = false;
  function stop(code) {
    if (stopping) return;
    stopping = true;
    process.exitCode = code;
    for (const child of children) child.kill("SIGTERM");
  }
  children.forEach((child) => {
    child.on("error", () => stop(1));
    child.on("exit", (code) => stop(code ?? 1));
  });
  process.on("SIGTERM", () => stop(0));
  process.on("SIGINT", () => stop(0));
} else throw new Error("Usa prepare o start.");
