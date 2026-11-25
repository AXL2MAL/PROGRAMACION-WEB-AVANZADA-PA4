"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Package } from "lucide-react";
import { useShop } from "../../context/shop";
import { api, money, Order } from "../../services/api";
export default function History() {
  const s = useShop(),
    [rows, setRows] = useState<Order[] | null>(null),
    [error, setError] = useState(""),
    [retry, setRetry] = useState(0);
  useEffect(() => {
    let live = true;
    setRows(null);
    setError("");
    if (s.user)
      api<Order[]>("orders")
        .then((v) => {
          if (live) setRows(v);
        })
        .catch((e) => {
          if (live) setError(e.message);
        });
    return () => {
      live = false;
    };
  }, [s.user, retry]);
  return (
    <main className="wrap history">
      <div className="eyebrow">
        <span /> MI CUENTA
      </div>
      <h1>Mis pedidos</h1>
      {!s.ready ? (
        <p>Cargando sesión…</p>
      ) : !s.user ? (
        <div className="empty">
          <Package />
          <p>Entra en tu cuenta para consultar tus pedidos.</p>
          <button className="solid" onClick={() => s.setDialog("account")}>
            Iniciar sesión
          </button>
        </div>
      ) : error ? (
        <p role="alert">
          {error}{" "}
          <button onClick={() => setRetry(retry + 1)}>Reintentar</button>
        </p>
      ) : !rows ? (
        <p>Cargando pedidos…</p>
      ) : !rows.length ? (
        <div className="empty">
          <Package />
          <p>Aún no tienes pedidos.</p>
          <Link href="/">Explorar catálogo</Link>
        </div>
      ) : (
        rows.map((o) => (
          <details className="order" key={o._id}>
            <summary>
              <strong>Pedido #{o._id.slice(-6).toUpperCase()}</strong>
              <span>{new Date(o.createdAt).toLocaleDateString("es-ES")}</span>
              <span>{o.status}</span>
              <b>{money(o.total)}</b>
            </summary>
            {o.items.map((i) => (
              <p key={i.product}>
                {i.qty} × {i.name} <b>{money(i.qty * i.price)}</b>
              </p>
            ))}
          </details>
        ))
      )}
    </main>
  );
}
