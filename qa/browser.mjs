import assert from "node:assert/strict";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { parseEnv } from "node:util";
import { randomUUID } from "node:crypto";
import { resolve } from "node:path";
import { chromium } from "playwright-core";

// Usa únicamente la instancia de desarrollo preparada por scripts/local.mjs.
const env = parseEnv(
  await readFile(new URL("../.local/development.env", import.meta.url), "utf8"),
);
const store = "http://localhost:3000",
  panel = "http://localhost:4200";
const output = process.env.VIDEO_DIR && resolve(process.env.VIDEO_DIR);
if (output) await mkdir(output, { recursive: true });
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
  args: ["--no-sandbox"],
});
const ctx = await browser.newContext({
  viewport: { width: 1280, height: 800 },
  locale: "es-ES",
  ...(output
    ? { recordVideo: { dir: output, size: { width: 1280, height: 800 } } }
    : {}),
});
const page = await ctx.newPage(),
  start = Date.now(),
  captions = [];
page.setDefaultTimeout(10000);
const tag = randomUUID().slice(0, 6),
  name = "Nexo Studio " + tag,
  email = "demo." + tag + "@example.test",
  password = randomUUID();
const pause = async (text) => {
  console.log(text);
  captions.push({ t: Date.now() - start, text });
  if (output) await page.waitForTimeout(3900);
};
const button = (text) => page.getByRole("button", { name: text, exact: true });
async function panelPage(path) {
  await page.goto(panel + "/" + path);
}
try {
  await page.goto(store);
  await page.locator(".card").first().waitFor();
  await pause("El catálogo de Next.js muestra productos guardados en MongoDB.");
  await panelPage("productos");
  await page.waitForURL("**/acceso");
  await page.getByLabel("Correo electrónico").fill(env.ADMIN_EMAIL);
  await page.getByLabel("Contraseña").fill(env.ADMIN_PASSWORD);
  await button("Entrar al panel →").click();
  await page.getByRole("heading", { name: "Resumen general" }).waitFor();
  await pause(
    "Angular protege el panel y abre el resumen tras el acceso administrativo.",
  );
  await page.getByRole("link", { name: "Productos" }).click();
  await button("+ Nuevo producto").click();
  await page.getByLabel("Nombre", { exact: true }).fill(name);
  await page
    .getByLabel("Categoría", { exact: true })
    .selectOption("Accesorios");
  await page.getByLabel("Precio (€)").fill("69");
  await page.getByLabel("Existencias").fill("5");
  await page.getByLabel("Imagen").selectOption("nexo");
  await page
    .getByLabel("Descripción")
    .fill("Concentrador USB-C de aluminio con cuatro puertos.");
  await pause(
    "El formulario reactivo registra nombre, precio, imagen y existencias.",
  );
  await button("Guardar producto").click();
  await page.getByText("Producto guardado.").waitFor();
  const productRow = page.getByRole("row").filter({ hasText: name });
  await productRow.getByText("Editar").click();
  await page.getByLabel("Precio (€)").fill("65");
  await button("Guardar producto").click();
  await productRow.getByText(/65,00/).waitFor();
  await pause(
    "La edición actualiza el precio a 65 euros en la API compartida.",
  );
  await page.goto(store);
  await page.getByLabel("Buscar productos").fill(name);
  await button("Ver " + name).click();
  await pause(
    "Una búsqueda en la tienda encuentra el producto y su nuevo precio.",
  );
  await button("Añadir a la bolsa").click();
  await button("Iniciar sesión para pedir").click();
  await button("Crear una cuenta de cliente").click();
  await page.getByLabel("Nombre", { exact: true }).fill("Cliente demostración");
  await page.getByLabel("Correo electrónico").fill(email);
  await page.getByLabel("Contraseña").fill(password);
  await button("Crear cuenta").click();
  await button("Confirmar pedido").waitFor();
  await pause("El registro inicia una sesión de cliente y conserva la bolsa.");
  await button("Confirmar pedido").click();
  await page.waitForURL("**/pedidos");
  await page.locator("details").first().click();
  await page.getByText("1 × " + name).waitFor();
  const orderNo = (await page.locator("summary strong").innerText()).split(
    "#",
  )[1];
  assert.ok(orderNo);
  await pause(
    "El pedido queda en el historial con su total, estado y detalle.",
  );
  await panelPage("pedidos");
  const orderRow = page.getByRole("row").filter({ hasText: "#" + orderNo });
  await orderRow.getByText("Ver detalle").click();
  await page.getByLabel("Cambiar estado").selectOption("En preparación");
  await orderRow.getByText("En preparación").waitFor();
  await pause(
    "El equipo revisa el detalle y cambia el estado a En preparación.",
  );
  await page.getByRole("link", { name: "Productos" }).click();
  await productRow.getByRole("cell", { name: "4", exact: true }).waitFor();
  await productRow.getByText("Eliminar").click();
  await button("Confirmar eliminación").click();
  await page.getByText("Producto eliminado.").waitFor();
  await pause(
    "El panel retira el producto del catálogo después de descontar una unidad.",
  );
  await page.goto(store + "/pedidos");
  await page.getByText("En preparación").waitFor();
  await page.locator("details").first().click();
  await pause(
    "El cliente ve el nuevo estado. El historial conserva el producto retirado.",
  );
  await page.getByRole("button", { name: "Cliente" }).click();
  await button("Cerrar sesión").click();
  await button("Iniciar sesión").click();
  await page.getByLabel("Correo electrónico").fill(email);
  await page.getByLabel("Contraseña").fill(password);
  await button("Entrar").click();
  await page.getByText("En preparación").waitFor();
  await pause("Tras cerrar sesión, el cliente vuelve a entrar y recupera el pedido desde la base de datos.");
  await panelPage("clientes");
  await page.getByLabel("Buscar cliente").fill(email);
  const customer = page.getByRole("row").filter({hasText:email});
  await customer.getByText("Editar").click();
  await page.getByLabel("Nombre", {exact:true}).fill("Cliente de la tienda");
  await button("Guardar cliente").click();
  await customer.getByText("Cliente de la tienda").waitFor();
  await pause("En el directorio de clientes, el administrador puede buscar y actualizar la ficha.");
  await panelPage("resumen");
  await page.getByText("Ventas de los últimos 7 días").waitFor();
  await pause(
    "El resumen administrativo agrega ventas y pedidos de la base de desarrollo.",
  );
  if (output) await page.screenshot({ path: resolve(output, "panel.png") });
  await panelPage("api/health");
  assert.match(await page.locator("body").innerText(), /connected/);
  await pause(
    "La ruta de salud del panel llega a Express y confirma la conexión a MongoDB.",
  );
  await page.goto(store);
  await page.locator(".card").first().waitFor();
  if (output) await page.screenshot({ path: resolve(output, "tienda.png") });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Filtros", exact: true }).click();
  assert.ok(await page.getByLabel("Precio máximo").isVisible());
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  );
  await pause(
    "La tienda adapta el catálogo y los filtros a una pantalla móvil.",
  );
  console.log(
    "OK: registro, sesiones, CRUD, pedido, inventario, estado, historial y vista móvil.",
  );
} finally {
  const end = Date.now() - start;
  await ctx.close();
  await browser.close();
  if (output) {
    const time = (t) =>
      new Date(Math.max(0, t)).toISOString().slice(11, 23).replace(".", ",");
    await writeFile(
      resolve(output, "subtitulos.srt"),
      captions
        .map(
          ({ text, t }, i) =>
            i +
            1 +
            "\n" +
            time(t) +
            " --> " +
            time(captions[i + 1]?.t ?? end) +
            "\n" +
            text +
            "\n",
        )
        .join("\n"),
    );
  }
}
