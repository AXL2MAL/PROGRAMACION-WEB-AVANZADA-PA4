import { Component, inject } from "@angular/core";
import { Router, RouterModule } from "@angular/router";
import { CommonModule } from "@angular/common";
import { Api, message } from "../services/api";
@Component({
  standalone: true,
  imports: [RouterModule, CommonModule],
  template: `<div class="shell">
    <aside>
      <a routerLink="/resumen" class="brand"><i>≋</i> frecuencia.</a
      ><small>ADMINISTRACIÓN</small>
      <nav>
        <a
          *ngFor="let link of links"
          [routerLink]="link[0]"
          routerLinkActive="selected"
          ><span>{{ link[1] }}</span
          >{{ link[2] }}</a
        >
      </nav>
      <button (click)="logout()">Cerrar sesión ↗</button>
      <p role="alert" *ngIf="error">{{ error }}</p>
    </aside>
    <main class="workspace">
      <div class="topbar">
        Panel administrativo <span>● &nbsp; Equipo Frecuencia</span>
      </div>
      <router-outlet />
    </main>
  </div>`,
})
export class Shell {
  links = [
    ["/resumen", "◫", "Resumen"],
    ["/productos", "▦", "Productos"],
    ["/pedidos", "▤", "Pedidos"],
    ["/clientes", "◎", "Clientes"],
  ];
  router = inject(Router);
  api = inject(Api);
  error = "";
  async logout() {
    try {
      await this.api.call("auth/logout", "POST");
      await this.router.navigateByUrl("/acceso");
    } catch (e) {
      this.error = message(e);
    }
  }
}
