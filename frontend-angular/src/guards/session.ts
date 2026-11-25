import { inject } from "@angular/core";
import { CanActivateFn, Router } from "@angular/router";
import { Api } from "../services/api";
export const session: CanActivateFn = async () => {
  const api = inject(Api),
    router = inject(Router);
  try {
    const u = await api.call<{ role: string }>("auth/me");
    return u.role === "admin" || router.parseUrl("/acceso");
  } catch {
    return router.parseUrl("/acceso");
  }
};
