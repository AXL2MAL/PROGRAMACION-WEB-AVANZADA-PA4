"use client";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, FormEvent } from "react";
import {
  AudioLines,
  ArrowUpRight,
  ArrowRight,
  UserRound,
  ShoppingBag,
  X,
  Plus,
  Minus,
  Package,
  Trash2,
} from "lucide-react";
import { useShop } from "../context/shop";
import { api, money, User } from "../services/api";
export function Header() {
  const s = useShop(),
    path = usePathname();
  return (
    <header>
      <div className="wrap head">
        <Link href="/" className="brand">
          <span className="mark">
            <AudioLines size={24} />
          </span>
          frecuencia<span className="dot">.</span>
        </Link>
        <nav>
          <Link className={path === "/" ? "active" : ""} href="/">
            Catálogo
          </Link>
          <Link className={path === "/pedidos" ? "active" : ""} href="/pedidos">
            Mis pedidos
          </Link>
        </nav>
        <div className="head-actions">
          <button
            className="account"
            aria-label={s.user?.name.split(" ")[0] || "Mi cuenta"}
            onClick={() => s.setDialog("account")}
          >
            <UserRound size={17} />
            <span>{s.user?.name.split(" ")[0] || "Mi cuenta"}</span>
          </button>
          <button
            className="bag"
            aria-label="Abrir bolsa"
            onClick={() => s.setDialog("cart")}
          >
            <ShoppingBag size={17} />
            <span>Bolsa</span>
            <b>{s.cart.reduce((a, l) => a + l.qty, 0)}</b>
          </button>
        </div>
      </div>
    </header>
  );
}
function Account() {
  const s = useShop(),
    [register, setRegister] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const data = Object.fromEntries(new FormData(e.currentTarget));
      const u = await api<User>(
        "auth/" + (register ? "register" : "login"),
        "POST",
        data,
      );
      s.setUser(u);
      s.setDialog(s.cart.length ? "cart" : null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  if (s.user)
    return (
      <>
        <h2>Mi cuenta</h2>
        <p>
          {s.user.name}
          <br />
          {s.user.email}
        </p>
        <button
          className="solid"
          onClick={() => s.logout().catch((e) => setError(e.message))}
        >
          Cerrar sesión
        </button>
        {error && <p role="alert">{error}</p>}
      </>
    );
  return (
    <>
      <h2>{register ? "Crear cuenta" : "Iniciar sesión"}</h2>
      <form onSubmit={submit} key={String(register)}>
        {register && (
          <label>
            Nombre
            <input
              required
              minLength={2}
              maxLength={80}
              name="name"
              autoComplete="name"
            />
          </label>
        )}
        <label>
          Correo electrónico
          <input required type="email" name="email" autoComplete="email" />
        </label>
        <label>
          Contraseña
          <input
            required
            minLength={10}
            maxLength={72}
            name="password"
            type="password"
            autoComplete={register ? "new-password" : "current-password"}
          />
        </label>
        {error && <p role="alert">{error}</p>}
        <button className="solid" disabled={busy}>
          {register ? "Crear cuenta" : "Entrar"}
          <ArrowRight size={16} />
        </button>
      </form>
      <button
        className="textbtn"
        onClick={() => {
          setRegister(!register);
          setError("");
        }}
      >
        {register ? "Ya tengo cuenta" : "Crear una cuenta de cliente"}
      </button>
    </>
  );
}
function Cart() {
  const s = useShop(),
    router = useRouter(),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function buy() {
    if (!s.user) {
      s.setDialog("account");
      return;
    }
    setBusy(true);
    try {
      await s.checkout();
      router.push("/pedidos");
    } catch (e) {
      setError((e as Error).message);
      await s.refresh();
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <h2>Tu bolsa</h2>
      {!s.cart.length ? (
        <p>Tu bolsa está vacía.</p>
      ) : (
        <>
          {s.cart.map(({ p, qty }) => (
            <div className="cartline" key={p._id}>
              <Image
                src={"/products/" + p.image + ".webp"}
                alt=""
                width={70}
                height={70}
              />
              <div>
                <strong>{p.name}</strong>
                <small>{money(p.price)}</small>
                <div className="stepper">
                  <button
                    aria-label={"Reducir " + p.name}
                    onClick={() => s.change(p._id, qty - 1)}
                  >
                    <Minus size={13} />
                  </button>
                  {qty}
                  <button
                    aria-label={"Aumentar " + p.name}
                    onClick={() => s.change(p._id, qty + 1)}
                  >
                    <Plus size={13} />
                  </button>
                </div>
              </div>
              <button
                className="icon"
                aria-label={"Quitar " + p.name}
                onClick={() => s.change(p._id, 0)}
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))}
          <div className="sum">
            <b>Total</b>
            <b>{money(s.cart.reduce((a, l) => a + l.p.price * l.qty, 0))}</b>
          </div>
          {error && <p role="alert">{error}</p>}
          <button className="solid" disabled={busy} onClick={buy}>
            {s.user ? "Confirmar pedido" : "Iniciar sesión para pedir"}
            <ArrowRight size={16} />
          </button>
        </>
      )}
    </>
  );
}
export function Overlays() {
  const s = useShop(),
    ref = useRef<HTMLDialogElement>(null),
    visible = !!(s.dialog || s.detail);
  useEffect(() => {
    if (visible && !ref.current?.open) ref.current?.showModal();
    else if (!visible) ref.current?.close();
  }, [visible]);
  function close() {
    s.setDetail(null);
    s.setDialog(null);
  }
  return (
    <>
      {s.note && (
        <div role="status" className="toast">
          {s.note}
        </div>
      )}
      <dialog
        ref={ref}
        onCancel={close}
        onClick={(e) => {
          if (e.target === ref.current) close();
        }}
      >
        <div className="modal">
          <button className="close icon" aria-label="Cerrar" onClick={close}>
            <X size={20} />
          </button>
          {s.dialog === "account" ? (
            <Account />
          ) : s.dialog === "cart" ? (
            <Cart />
          ) : (
            s.detail && (
              <>
                <div className={"detailshot " + s.detail.image}>
                  <Image
                    src={"/products/" + s.detail.image + ".webp"}
                    alt={s.detail.name}
                    width={232}
                    height={232}
                  />
                </div>
                <small>{s.detail.category}</small>
                <h2>{s.detail.name}</h2>
                <p>{s.detail.description}</p>
                <div className="sum">
                  <strong>{money(s.detail.price)}</strong>
                  <small>{s.detail.stock} disponibles</small>
                </div>
                <button
                  className="solid"
                  disabled={!s.detail.stock}
                  onClick={() => {
                    s.add(s.detail!);
                    s.setDetail(null);
                    s.setDialog("cart");
                  }}
                >
                  Añadir a la bolsa <ShoppingBag size={16} />
                </button>
              </>
            )
          )}
        </div>
      </dialog>
    </>
  );
}
