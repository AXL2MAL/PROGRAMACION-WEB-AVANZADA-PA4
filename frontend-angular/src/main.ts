import { Component } from "@angular/core";
import { bootstrapApplication } from "@angular/platform-browser";
import { provideHttpClient } from "@angular/common/http";
import { provideRouter, RouterOutlet } from "@angular/router";
import { Shell } from "./app/shell";
import { Login } from "./app/login";
import { Inventory } from "./app/inventory";
import { Overview } from "./app/overview";
import { Customers } from "./app/customers";
import { session } from "./guards/session";
@Component({
  selector: "app-root",
  standalone: true,
  imports: [RouterOutlet],
  template: "<router-outlet/>",
})
class App {}
bootstrapApplication(App, {
  providers: [
    provideHttpClient(),
    provideRouter([
      { path: "acceso", component: Login },
      {
        path: "",
        component: Shell,
        canActivate: [session],
        children: [
          { path: "", pathMatch: "full", redirectTo: "resumen" },
          { path: "resumen", component: Overview },
          { path: "productos", component: Inventory },
          { path: "pedidos", component: Overview },
          { path: "clientes", component: Customers },
        ],
      },
      { path: "**", redirectTo: "resumen" },
    ]),
  ],
}).catch(console.error);
