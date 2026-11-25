import "dotenv/config";
import mongoose from "mongoose";

export async function connect() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("Configura MONGODB_URI");
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 7000 });
}
