export interface Product {
  _id: string;
  name: string;
  category: string;
  image: string;
  description: string;
  price: number;
  stock: number;
}
export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}
export interface Order {
  _id: string;
  createdAt: string;
  status: string;
  total: number;
  items: { product: string; name: string; price: number; qty: number }[];
}
export const money = (cents: number) =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(
    cents / 100,
  );
export async function api<T>(
  path: string,
  method = "GET",
  data?: unknown,
): Promise<T> {
  const res = await fetch("/api/" + path, {
    method,
    credentials: "same-origin",
    cache: "no-store",
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
  });
  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error(e.error || "No se pudo conectar con la tienda.");
  }
  return res.json();
}
