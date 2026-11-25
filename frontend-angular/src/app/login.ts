import { Component, inject } from "@angular/core";
import { CommonModule } from "@angular/common";
import { ReactiveFormsModule, FormBuilder, Validators } from "@angular/forms";
import { Router } from "@angular/router";
import { Api, message } from "../services/api";
@Component({
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule],
  template: ` <main class="login">
    <div class="login-art">
      <span class="brand"><i>≋</i> frecuencia.</span>
      <div>
        <small>OPERACIONES</small>
        <h1>Panel de<br />administración.</h1>
      </div>
    </div>
    <form [formGroup]="form" (ngSubmit)="submit()">
      <small>ACCESO DEL EQUIPO</small>
      <h2>Iniciar sesión</h2>
      <label
        >Correo electrónico<input
          formControlName="email"
          type="email"
          autocomplete="username" /></label
      ><label
        >Contraseña<input
          formControlName="password"
          type="password"
          autocomplete="current-password"
      /></label>
      <p role="alert" *ngIf="error">{{ error }}</p>
      <button class="primary" [disabled]="form.invalid || busy">
        Entrar al panel →
      </button>
    </form>
  </main>`,
})
export class Login {
  private api = inject(Api);
  private router = inject(Router);
  form = inject(FormBuilder).nonNullable.group({
    email: ["", [Validators.required, Validators.email]],
    password: ["", [Validators.required, Validators.minLength(10)]],
  });
  error = "";
  busy = false;
  async submit() {
    if (this.form.invalid || this.busy) return;
    this.busy = true;
    try {
      await this.api.call("auth/login", "POST", this.form.getRawValue());
      await this.router.navigateByUrl("/resumen");
    } catch (e) {
      this.error = message(e);
    } finally {
      this.busy = false;
    }
  }
}
