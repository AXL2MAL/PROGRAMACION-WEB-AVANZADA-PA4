import { Injectable } from "@angular/core";
import { HttpClient, HttpErrorResponse } from "@angular/common/http";
import { firstValueFrom } from "rxjs";
export interface Product {
  _id: string;
  name: string;
  category: string;
  image: string;
  description: string;
  price: number;
  stock: number;
}
export interface Person {
  _id: string;
  name: string;
  email: string;
  createdAt: string;
}
export interface Order {
  _id: string;
  customer: Person;
  createdAt: string;
  status: string;
  total: number;
  items: { name: string; qty: number; price: number }[];
}
export interface Summary {
  users: number;
  products: number;
  orders: number;
  revenue: number;
  weekly: { _id: string; total: number }[];
}
export const money = (c: number) =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(
    c / 100,
  );
export const message = (e: unknown) =>
  e instanceof HttpErrorResponse
    ? e.error?.error || "No se pudo conectar con la API."
    : "No se pudo completar la operación.";
@Injectable({ providedIn: "root" })
export class Api {
  constructor(private http: HttpClient) {}
  call<T>(path: string, method = "GET", body?: unknown) {
    return firstValueFrom(
      this.http.request<T>(method, "/api/admin/" + path, { body }),
    );
  }
}
