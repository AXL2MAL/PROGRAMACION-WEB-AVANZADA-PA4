import type { Metadata } from "next";
import "@fontsource-variable/dm-sans";
import "./style.css";
import { Provider } from "../context/shop";
import { Header, Overlays } from "../components/shell";
export const metadata: Metadata = {
  title: "Frecuencia · Tienda de tecnología",
  description: "Catálogo de audio, escritorio y accesorios de Frecuencia.",
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        <Provider>
          <Header />
          {children}
          <Overlays />
        </Provider>
      </body>
    </html>
  );
}
