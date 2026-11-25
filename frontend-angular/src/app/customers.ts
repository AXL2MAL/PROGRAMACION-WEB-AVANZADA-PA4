import { Component, inject, OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormBuilder, ReactiveFormsModule, Validators } from "@angular/forms";
import { Api, message, Person } from "../services/api";
@Component({
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: ` <section class="content">
    <small>OPERACIONES</small>
    <div class="heading">
      <h1>Clientes</h1>
      <button class="primary" (click)="edit()">+ Nuevo cliente</button>
    </div>
    <p role="alert" *ngIf="error">{{ error }}</p>
    <p role="status" *ngIf="note">{{ note }}</p>
    <form
      class="panel editor"
      *ngIf="editing"
      [formGroup]="form"
      (ngSubmit)="save()"
    >
      <h2>{{ id ? "Editar cliente" : "Nuevo cliente" }}</h2>
      <label>Nombre<input formControlName="name" maxlength="80" /></label
      ><label
        >Correo electrónico<input formControlName="email" type="email"
      /></label>
      <label *ngIf="!id"
        >Contraseña inicial<input
          formControlName="password"
          type="password"
          autocomplete="new-password"
      /></label>
      <div class="actions">
        <button class="primary" [disabled]="busy || form.invalid">
          Guardar cliente</button
        ><button type="button" (click)="editing = false">Descartar</button>
      </div>
    </form>
    <div class="panel">
      <div class="tools">
        <input
          #q
          placeholder="Buscar por nombre o correo…"
          aria-label="Buscar cliente"
          (input)="search = q.value"
        />
      </div>
      <div class="scroll">
        <table>
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Correo electrónico</th>
              <th>Fecha de alta</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let c of filtered">
              <td>{{ c.name }}</td>
              <td>{{ c.email }}</td>
              <td>{{ c.createdAt | date: "dd/MM/yyyy" }}</td>
              <td>
                <button (click)="edit(c)">Editar</button>
                <button class="danger" (click)="confirm = c">
                  Dar de baja
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p class="empty" *ngIf="!filtered.length">
        Sin clientes para esta búsqueda.
      </p>
    </div>
    <div class="confirm panel" *ngIf="confirm as c">
      <h2>¿Dar de baja a {{ c.name }}?</h2>
      <p>La cuenta perderá el acceso. Sus pedidos se conservarán.</p>
      <button class="primary" [disabled]="busy" (click)="remove(c)">
        Confirmar baja
      </button>
      <button (click)="confirm = null">Conservar</button>
    </div>
  </section>`,
})
export class Customers implements OnInit {
  api = inject(Api);
  rows: Person[] = [];
  editing = false;
  error = "";
  note = "";
  id = "";
  busy = false;
  confirm: Person | null = null;
  search = "";
  form = inject(FormBuilder).nonNullable.group({
    name: ["", [Validators.required, Validators.minLength(2)]],
    email: ["", [Validators.required, Validators.email]],
    password: [""],
  });
  get filtered() {
    const q = this.search.trim().toLowerCase();
    return this.rows.filter((c) =>
      (c.name + " " + c.email).toLowerCase().includes(q),
    );
  }
  ngOnInit() {
    void this.load();
  }
  async load() {
    try {
      this.rows = await this.api.call<Person[]>("customers");
    } catch (e) {
      this.error = message(e);
    }
  }
  edit(c?: Person) {
    this.editing = true;
    this.id = c?._id || "";
    this.confirm = null;
    this.note = "";
    this.error = "";
    this.form.controls.password.setValidators(
      this.id
        ? []
        : [
            Validators.required,
            Validators.minLength(10),
            Validators.maxLength(72),
          ],
    );
    this.form.reset({
      name: c?.name || "",
      email: c?.email || "",
      password: "",
    });
  }
  async save() {
    if (this.busy || this.form.invalid) return;
    const { name, email, password } = this.form.getRawValue();
    this.busy = true;
    this.error = "";
    try {
      await this.api.call(
        "customers" + (this.id ? "/" + this.id : ""),
        this.id ? "PUT" : "POST",
        this.id ? { name, email } : { name, email, password },
      );
      this.editing = false;
      this.note = "Cliente guardado.";
      await this.load();
    } catch (e) {
      this.error = message(e);
    } finally {
      this.busy = false;
    }
  }
  async remove(c: Person) {
    this.busy = true;
    this.error = "";
    try {
      await this.api.call("customers/" + c._id, "DELETE");
      this.confirm = null;
      this.editing = false;
      this.note = "Cuenta dada de baja.";
      await this.load();
    } catch (e) {
      this.error = message(e);
    } finally {
      this.busy = false;
    }
  }
}
