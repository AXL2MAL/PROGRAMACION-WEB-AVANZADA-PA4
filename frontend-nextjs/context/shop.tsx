"use client";
import {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  ReactNode,
} from "react";
import { api, Product, User, Order } from "../services/api";
type Line = { p: Product; qty: number };
function useStore() {
  const [products, setProducts] = useState<Product[]>([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState("");
  const [user, setUser] = useState<User | null>(null),
    [ready, setReady] = useState(false);
  const [cart, setCart] = useState<Line[]>([]),
    [dialog, setDialog] = useState<"cart" | "account" | null>(null);
  const [detail, setDetail] = useState<Product | null>(null);
  const [note, setNote] = useState("");
  const requestId = useRef("");
  async function refresh() {
    try {
      setProducts(await api<Product[]>("products"));
      setError("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void refresh();
    api<User>("auth/me")
      .then(setUser)
      .catch(() => {})
      .finally(() => setReady(true));
  }, []);
  useEffect(() => {
    if (note) {
      const timer = setTimeout(() => setNote(""), 3000);
      return () => clearTimeout(timer);
    }
  }, [note]);
  function add(p: Product) {
    const current = cart.find((l) => l.p._id === p._id)?.qty || 0;
    if (current >= Math.min(p.stock, 99)) {
      setNote("Has alcanzado la cantidad disponible.");
      return;
    }
    requestId.current = "";
    setCart((prev) =>
      prev.some((l) => l.p._id === p._id)
        ? prev.map((l) => (l.p._id === p._id ? { p, qty: l.qty + 1 } : l))
        : [...prev, { p, qty: 1 }],
    );
    setNote(p.name + " se añadió a tu bolsa.");
  }
  function change(id: string, n: number) {
    requestId.current = "";
    setCart((prev) =>
      prev
        .map((l) =>
          l.p._id === id ? { ...l, qty: Math.min(99, l.p.stock, n) } : l,
        )
        .filter((l) => l.qty > 0),
    );
  }
  async function checkout() {
    if (!requestId.current) requestId.current = crypto.randomUUID();
    const order = await api<Order>("orders", "POST", {
      requestId: requestId.current,
      items: cart.map((l) => ({ product: l.p._id, qty: l.qty })),
    });
    setCart([]);
    requestId.current = "";
    setDialog(null);
    setNote("Pedido registrado.");
    await refresh();
    return order;
  }
  async function logout() {
    await api("auth/logout", "POST");
    setUser(null);
    setCart([]);
    requestId.current = "";
    setDialog(null);
  }
  return {
    products,
    loading,
    error,
    refresh,
    user,
    setUser,
    ready,
    cart,
    add,
    change,
    checkout,
    dialog,
    setDialog,
    detail,
    setDetail,
    note,
    setNote,
    logout,
  };
}
const Context = createContext<ReturnType<typeof useStore> | null>(null);
export function Provider({ children }: { children: ReactNode }) {
  const value = useStore();
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useShop() {
  const shop = useContext(Context);
  if (!shop) throw new Error("Shop context");
  return shop;
}
