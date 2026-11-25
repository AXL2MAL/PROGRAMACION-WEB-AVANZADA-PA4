"use client";
import Image from "next/image";
import { useState } from "react";
import {
  ArrowUpRight,
  ArrowRight,
  Search,
  SlidersHorizontal,
  Headphones,
  Keyboard,
  Cable,
  LayoutGrid,
  Plus,
  ChevronDown,
  AudioLines,
  PackageSearch,
} from "lucide-react";
import { useShop } from "../context/shop";
import { money, Product } from "../services/api";
const cats = [
  { name: "Todos", icon: LayoutGrid },
  { name: "Audio", icon: Headphones },
  { name: "Escritorio", icon: Keyboard },
  { name: "Accesorios", icon: Cable },
];
function Feature({ p }: { p: Product }) {
  const s = useShop();
  return (
    <section className="hero">
      <div className="hero-art" aria-hidden="true">
        <i />
        <i />
        <i />
        <i />
        <i />
        <i />
      </div>
      <div className="hero-copy">
        <div className="hero-kicker">
          <span /> Selección Frecuencia
        </div>
        <h1>
          {p.name}
          <em>.</em>
        </h1>
        <p>{p.description.split(",")[0]}.</p>
        <button onClick={() => s.setDetail(p)}>
          Descubrir producto <ArrowUpRight size={17} />
        </button>
      </div>
      <Image
        className="hero-img"
        src={"/products/" + p.image + ".webp"}
        alt={p.name}
        width={540}
        height={540}
        priority
      />
      <div className="hero-tag">
        <AudioLines size={15} />
        {p.category}
      </div>
    </section>
  );
}
function Card({ p }: { p: Product }) {
  const s = useShop();
  return (
    <article className="card">
      <button
        className={"shot " + p.image}
        aria-label={"Ver " + p.name}
        onClick={() => s.setDetail(p)}
      >
        <Image
          src={"/products/" + p.image + ".webp"}
          alt={p.name}
          width={360}
          height={360}
          sizes="(max-width: 620px) 48vw, 26vw"
        />
        <span className="peek">
          <ArrowUpRight size={14} />
        </span>
      </button>
      <div className="card-info">
        <small>{p.category}</small>
        <button className="name" onClick={() => s.setDetail(p)}>
          {p.name}
        </button>
        <div className="card-foot">
          <strong>{money(p.price)}</strong>
          <button
            className="add"
            disabled={!p.stock}
            aria-label={"Añadir " + p.name + " a la bolsa"}
            onClick={() => s.add(p)}
          >
            <Plus size={17} />
          </button>
        </div>
        {!p.stock && <small>Agotado</small>}
      </div>
    </article>
  );
}
export function Catalog() {
  const s = useShop(),
    [q, setQ] = useState(""),
    [cat, setCat] = useState("Todos"),
    [max, setMax] = useState(""),
    [stock, setStock] = useState(false),
    [sort, setSort] = useState("featured"),
    [filter, setFilter] = useState(false);
  const items = s.products.filter(
    (p) =>
      (cat === "Todos" || cat === p.category) &&
      p.name.toLocaleLowerCase().includes(q.trim().toLocaleLowerCase()) &&
      (!max || p.price <= Number(max) * 100) &&
      (!stock || p.stock > 0),
  );
  if (sort !== "featured")
    items.sort((a, b) =>
      sort === "asc" ? a.price - b.price : b.price - a.price,
    );
  const feature = s.products.find((p) => p.image === "aura") || s.products[0];
  function reset() {
    setCat("Todos");
    setQ("");
    setMax("");
    setStock(false);
  }
  return (
    <main className="wrap main">
      {feature && <Feature p={feature} />}
      <section className="catalog">
        <div className="catalog-title">
          <div>
            <div className="eyebrow">
              <span /> TIENDA ONLINE
            </div>
            <h2>Catálogo de productos</h2>
          </div>
          <div className="search">
            <Search size={17} />
            <input
              aria-label="Buscar productos"
              placeholder="Buscar productos…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
        </div>
        <div className="catalog-grid">
          <button className="filter-mobile" onClick={() => setFilter(!filter)}>
            <SlidersHorizontal size={16} /> Filtros
          </button>
          <aside className={filter ? "show" : ""}>
            <h3>
              <SlidersHorizontal size={15} /> Filtros
            </h3>
            <h4>Categoría</h4>
            {cats.map(({ name, icon: Icon }) => (
              <button
                className={"cat " + (cat === name ? "sel" : "")}
                onClick={() => setCat(name)}
                key={name}
              >
                <Icon size={16} />
                {name}
                <span>
                  {
                    s.products.filter(
                      (p) => name === "Todos" || name === p.category,
                    ).length
                  }
                </span>
              </button>
            ))}
            <hr />
            <h4>Precio máximo</h4>
            <label className="price">
              <span>€</span>
              <input
                type="number"
                aria-label="Precio máximo"
                min={0}
                placeholder="Sin límite"
                value={max}
                onChange={(e) => setMax(e.target.value)}
              />
            </label>
            <hr />
            <label className="check">
              <input
                type="checkbox"
                checked={stock}
                onChange={(e) => setStock(e.target.checked)}
              />{" "}
              Solo disponibles
            </label>
          </aside>
          <div className="listing">
            <div className="listbar">
              <span>
                <b>{items.length}</b> productos
              </span>
              <label>
                Ordenar por{" "}
                <select
                  aria-label="Ordenar por"
                  value={sort}
                  onChange={(e) => setSort(e.target.value)}
                >
                  <option value="featured">Destacados</option>
                  <option value="asc">Menor precio</option>
                  <option value="desc">Mayor precio</option>
                </select>
              </label>
            </div>
            {s.loading ? (
              <p>Cargando catálogo…</p>
            ) : s.error ? (
              <div role="alert">
                {s.error} <button onClick={s.refresh}>Reintentar</button>
              </div>
            ) : items.length ? (
              <div className="cards">
                {items.map((p) => (
                  <Card key={p._id} p={p} />
                ))}
              </div>
            ) : (
              <div className="empty">
                <PackageSearch />
                <h3>Sin resultados</h3>
                <button className="textbtn" onClick={reset}>
                  Quitar filtros
                </button>
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
