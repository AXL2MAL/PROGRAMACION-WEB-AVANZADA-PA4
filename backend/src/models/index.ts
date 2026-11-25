import { Schema, model, Types } from "mongoose";

export const categories = ["Audio", "Escritorio", "Accesorios"] as const;
export const images = [
  "aura",
  "pulso",
  "tecla",
  "orbita",
  "aire",
  "nexo",
] as const;
export const states = [
  "Pendiente",
  "En preparación",
  "Enviado",
  "Entregado",
  "Cancelado",
] as const;
export const User = model(
  "User",
  new Schema(
    {
      name: { type: String, required: true },
      email: { type: String, unique: true, required: true },
      hash: { type: String, required: true, select: false },
      role: { type: String, enum: ["cliente", "admin"], default: "cliente" },
      disabled: { type: Boolean, default: false },
      version: { type: Number, default: 0, select: false },
    },
    { timestamps: true },
  ),
);
export const Product = model(
  "Product",
  new Schema(
    {
      name: { type: String, required: true },
      category: { type: String, enum: categories, required: true },
      description: { type: String, required: true },
      image: { type: String, enum: images, required: true },
      price: { type: Number, min: 1, required: true },
      stock: { type: Number, min: 0, required: true },
      archived: { type: Boolean, default: false },
      seedKey: { type: String, unique: true, sparse: true },
    },
    { timestamps: true },
  ),
);
export const Order = model(
  "Order",
  new Schema(
    {
      customer: { type: Schema.Types.ObjectId, ref: "User", required: true },
      items: {
        type: [
          new Schema(
            {
              product: {
                type: Schema.Types.ObjectId,
                ref: "Product",
                required: true,
              },
              name: { type: String, required: true },
              price: { type: Number, required: true },
              qty: { type: Number, required: true },
            },
            { _id: false },
          ),
        ],
        required: true,
      },
      total: { type: Number, required: true },
      status: { type: String, enum: states, default: "Pendiente" },
      requestId: { type: String, required: true },
    },
    { timestamps: true },
  ).index({ customer: 1, requestId: 1 }, { unique: true }),
);
export type Principal = {
  id: Types.ObjectId;
  name: string;
  email: string;
  role: string;
};
