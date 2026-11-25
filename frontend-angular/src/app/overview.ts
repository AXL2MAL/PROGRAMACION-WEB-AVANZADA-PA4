import { Component, inject, OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import { ActivatedRoute, RouterModule } from "@angular/router";
import { Api, Order, Summary, money, message } from "../services/api";
import { OrderTable } from "../components/orders";
@Component({
  standalone: true,
  imports: [CommonModule, RouterModule, OrderTable],
  template: ` <section class="content">
    <small>OPERACIONES</small>
    <h1>{{ title }}</h1>
    <p *ngIf="loading">Cargando datos…</p>
    <p role="alert" *ngIf="error">
      {{ error }} <button (click)="load()">Reintentar</button>
    </p>
    <ng-container *ngIf="!loading && !error">
      <ng-container *ngIf="summary as s"
        ><div class="stats">
          <div *ngFor="let tile of tiles">
            <small>{{ tile[0] }}</small
            ><strong>{{ tile[1] }}</strong>
          </div>
        </div>
        <section class="panel">
          <h2>Ventas de los últimos 7 días</h2>
          <div class="chart">
            <div *ngFor="let d of days">
              <small>{{ money(d.value) }}</small
              ><i [style.height.px]="3 + (88 * d.value) / peak"></i
              ><span>{{ d.date | date: "dd/MM" : "UTC" }}</span>
            </div>
          </div>
        </section></ng-container
      >
      <section class="panel">
        <h2>
          {{ view === "resumen" ? "Pedidos recientes" : "Listado de pedidos" }}
        </h2>
        <order-table [rows]="rows" [manage]="view === 'pedidos'" /></section
    ></ng-container>
  </section>`,
})
export class Overview implements OnInit {
  api = inject(Api);
  view = inject(ActivatedRoute).snapshot.routeConfig?.path;
  title = this.view === "pedidos" ? "Pedidos" : "Resumen general";
  summary: Summary | null = null;
  rows: Order[] = [];
  tiles: (string | number)[][] = [];
  days: { date: Date; value: number }[] = [];
  peak = 1;
  money = money;
  error = "";
  loading = true;
  ngOnInit() {
    void this.load();
  }
  async load() {
    this.error = "";
    this.loading = true;
    try {
      this.rows = await this.api.call<Order[]>("orders");
      if (this.view === "resumen") {
        this.rows = this.rows.slice(0, 6);
        const s = await this.api.call<Summary>("summary");
        this.summary = s;
        this.tiles = [
          ["VENTAS", money(s.revenue)],
          ["PEDIDOS", s.orders],
          ["PRODUCTOS", s.products],
          ["USUARIOS", s.users],
        ];
        this.days = Array.from({ length: 7 }, (_, i) => {
          const date = new Date(Date.now() - (6 - i) * 86400000);
          return {
            date,
            value:
              s.weekly.find((d) => d._id === date.toISOString().slice(0, 10))
                ?.total || 0,
          };
        });
        this.peak = Math.max(1, ...this.days.map((d) => d.value));
      }
    } catch (e) {
      this.error = message(e);
    } finally {
      this.loading = false;
    }
  }
}
