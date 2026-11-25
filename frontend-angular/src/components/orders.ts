import { Component, Input, inject } from "@angular/core";
import { CommonModule } from "@angular/common";
import { Api, Order, money, message } from "../services/api";
@Component({
  selector: "order-table",
  standalone: true,
  imports: [CommonModule],
  template: ` <div class="scroll">
      <table>
        <thead>
          <tr>
            <th>Pedido</th>
            <th>Cliente</th>
            <th>Fecha</th>
            <th>Estado</th>
            <th>Total</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <ng-container *ngFor="let o of rows"
            ><tr>
              <td>#{{ o._id.slice(-6).toUpperCase() }}</td>
              <td>{{ o.customer.name }}</td>
              <td>{{ o.createdAt | date: "dd/MM/yy" }}</td>
              <td>
                <span class="pill">{{ o.status }}</span>
              </td>
              <td>{{ money(o.total) }}</td>
              <td>
                <button (click)="open = open === o._id ? '' : o._id">
                  {{ open === o._id ? "Cerrar" : "Ver detalle" }}
                </button>
              </td>
            </tr>
            <tr *ngIf="open === o._id">
              <td colspan="6">
                <p *ngFor="let i of o.items">
                  {{ i.qty }} × {{ i.name }} · {{ money(i.qty * i.price) }}
                </p>
                <label *ngIf="manage && options[o.status]?.length"
                  >Cambiar estado
                  <select
                    #state
                    [disabled]="busy"
                    (change)="update(o, state.value); state.value = ''"
                  >
                    <option value="">Seleccionar…</option>
                    <option *ngFor="let v of options[o.status]">{{ v }}</option>
                  </select></label
                >
              </td>
            </tr></ng-container
          >
        </tbody>
      </table>
    </div>
    <p class="empty" *ngIf="!rows.length">Todavía no hay pedidos.</p>
    <p role="alert" *ngIf="error">{{ error }}</p>`,
})
export class OrderTable {
  @Input() rows: Order[] = [];
  @Input() manage = false;
  api = inject(Api);
  open = "";
  busy = false;
  error = "";
  money = money;
  options: Record<string, string[]> = {
    Pendiente: ["En preparación", "Cancelado"],
    "En preparación": ["Enviado", "Cancelado"],
    Enviado: ["Entregado"],
  };
  async update(o: Order, status: string) {
    if (!status) return;
    this.busy = true;
    this.error = "";
    try {
      const updated = await this.api.call<Order>(
        "orders/" + o._id + "/status",
        "PATCH",
        { status },
      );
      o.status = updated.status;
    } catch (e) {
      this.error = message(e);
    } finally {
      this.busy = false;
    }
  }
}
