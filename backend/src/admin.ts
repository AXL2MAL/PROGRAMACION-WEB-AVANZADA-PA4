import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { connect } from "./config/db";
import { User } from "./models";
import { email, password } from "./controllers/auth";
async function run() {
  const address = email.parse(process.env.ADMIN_EMAIL),
    secret = password.parse(process.env.ADMIN_PASSWORD);
  await connect();
  const existing = await User.findOne({ email: address });
  if (existing) {
    if (existing.role !== "admin") throw new Error();
    return;
  }
  await User.create({
    email: address,
    name: "Administración",
    role: "admin",
    hash: await bcrypt.hash(secret, 12),
  });
}
run()
  .catch(() => {
    console.error(
      "No se pudo crear la cuenta administrativa. Revisa los datos y el correo.",
    );
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
