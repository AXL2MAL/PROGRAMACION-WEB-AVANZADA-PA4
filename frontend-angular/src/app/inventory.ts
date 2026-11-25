import { Component, inject, OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormBuilder, ReactiveFormsModule, Validators } from "@angular/forms";
import { Api, Product, money, message } from "../services/api";
@Component({
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `<section class="content">
    <small>INVENTARIO</small>
    <div class="heading">
      <h1>Productos</h1>
      <button class="primary" (click)="edit()">+ Nuevo producto</button>
    </div>
    <p *ngIf="error" role="alert">{{ error }}</p>
    <p *ngIf="note" role="status">{{ note }}</p>
    <form
      class="panel editor"
      *ngIf="editing"
      [formGroup]="form"
      (ngSubmit)="save()"
    >
      <h2>{{ id ? "Editar producto" : "Nuevo producto" }}</h2>
      <label>Nombre<input formControlName="name" maxlength="90" /></label
      ><label
        >Categoría<select aria-label="Categoría" formControlName="category">
          <option *ngFor="let c of cats">{{ c }}</option>
        </select></label
      ><label
        >Precio (€)<input
          type="number"
          min="0.01"
          step="0.01"
          formControlName="price" /></label
      ><label
        >Existencias<input
          type="number"
          step="1"
          min="0"
          formControlName="stock" /></label
      ><label
        >Imagen<select formControlName="image">
          <option *ngFor="let i of images" [value]="i[0]">{{ i[1] }}</option>
        </select></label
      ><label
        >Descripción<textarea
          formControlName="description"
          maxlength="800"
        ></textarea>
      </label>
      <div class="actions">
        <button class="primary" [disabled]="busy || form.invalid">
          Guardar producto</button
        ><button type="button" (click)="editing = false">Descartar</button>
      </div>
    </form>
    <div class="panel">
      <div class="tools">
        <input
          aria-label="Buscar producto"
          placeholder="Buscar producto…"
          #q
          (input)="search = q.value"
        /><select
          aria-label="Filtrar categoría"
          #f
          (change)="category = f.value"
        >
          <option value="">Todas las categorías</option>
          <option *ngFor="let c of cats">{{ c }}</option>
        </select>
      </div>
      <div class="scroll">
        <table>
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Categoría</th>
              <th>Precio</th>
              <th>Stock</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let p of filtered">
              <td>
                <b>{{ p.name }}</b>
              </td>
              <td>{{ p.category }}</td>
              <td>{{ money(p.price) }}</td>
              <td>{{ p.stock }}</td>
              <td>
                <button (click)="edit(p)">Editar</button>
                <button class="danger" (click)="confirm = p">Eliminar</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p *ngIf="!filtered.length" class="empty">
        Sin productos para esta búsqueda.
      </p>
    </div>
    <section class="confirm panel" *ngIf="confirm as p">
      <h2>¿Eliminar {{ p.name }} del catálogo?</h2>
      <button class="primary" (click)="remove(p)" [disabled]="busy">
        Confirmar eliminación
      </button>
      <button (click)="confirm = null">Conservar</button>
    </section>
  </section>`,
})
export class Inventory implements OnInit {
  api = inject(Api);
  money = money;
  cats = ["Audio", "Escritorio", "Accesorios"];
  images = [
    ["aura", "Auriculares"],
    ["tecla", "Teclado"],
    ["pulso", "Altavoz"],
    ["orbita", "Ratón"],
    ["aire", "Auriculares de botón"],
    ["nexo", "Concentrador USB"],
  ];
  rows: Product[] = [];
  search = "";
  category = "";
  id = "";
  editing = false;
  busy = false;
  error = "";
  note = "";
  confirm: Product | null = null;
  form = inject(FormBuilder).nonNullable.group({
    name: [
      "",
      [Validators.required, Validators.minLength(2), Validators.maxLength(90)],
    ],
    description: ["", [Validators.required, Validators.minLength(5)]],
    category: ["Audio"],
    price: [
      1,
      [Validators.required, Validators.min(0.01), Validators.max(100000)],
    ],
    stock: [
      0,
      [
        Validators.required,
        Validators.min(0),
        Validators.max(100000),
        Validators.pattern(/^\d+$/),
      ],
    ],
    image: ["aura"],
  });
  get filtered() {
    return this.rows.filter(
      (p) =>
        p.name.toLowerCase().includes(this.search.toLowerCase()) &&
        (!this.category || p.category === this.category),
    );
  }
  ngOnInit() {
    void this.load();
  }
  async load() {
    try {
      this.rows = await this.api.call<Product[]>("products");
    } catch (e) {
      this.error = message(e);
    }
  }
  edit(p?: Product) {
    this.id = p?._id || "";
    this.form.reset(
      p
        ? { ...p, price: p.price / 100 }
        : {
            name: "",
            description: "",
            category: "Audio",
            price: 1,
            stock: 0,
            image: "aura",
          },
    );
    this.editing = true;
    this.error = "";
    this.note = "";
    this.confirm = null;
  }
  async save() {
    if (this.form.invalid || this.busy) return;
    this.busy = true;
    this.error = "";
    const v = this.form.getRawValue();
    try {
      await this.api.call(
        "products" + (this.id ? "/" + this.id : ""),
        this.id ? "PUT" : "POST",
        { ...v, price: Math.round(v.price * 100) },
      );
      this.editing = false;
      this.note = "Producto guardado.";
      await this.load();
    } catch (e) {
      this.error = message(e);
    } finally {
      this.busy = false;
    }
  }
  async remove(p: Product) {
    this.busy = true;
    this.error = "";
    try {
      await this.api.call("products/" + p._id, "DELETE");
      this.confirm = null;
      this.editing = false;
      this.note = "Producto eliminado.";
      await this.load();
    } catch (e) {
      this.error = message(e);
    } finally {
      this.busy = false;
    }
  }
}
