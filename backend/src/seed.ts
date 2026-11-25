import mongoose from "mongoose";
import { connect } from "./config/db";
import { Product } from "./models";
const rows = [
  [
    "aura",
    "Aura One",
    "Audio",
    "Auriculares de diadema con cancelación activa de ruido, almohadillas suaves y 40 horas de autonomía.",
    18900,
    18,
  ],
  [
    "tecla",
    "Forma 65",
    "Escritorio",
    "Teclado mecánico compacto con interruptores táctiles y conexión USB-C.",
    12900,
    14,
  ],
  [
    "pulso",
    "Pulso Mini",
    "Audio",
    "Altavoz portátil con tejido acústico, conexión Bluetooth y sonido estéreo.",
    7900,
    22,
  ],
  [
    "orbita",
    "Órbita S",
    "Escritorio",
    "Ratón inalámbrico de perfil bajo con sensor de precisión y rueda silenciosa.",
    4900,
    16,
  ],
  [
    "aire",
    "Aire Buds",
    "Audio",
    "Auriculares inalámbricos con estuche de carga compacto y controles táctiles.",
    9900,
    11,
  ],
  [
    "nexo",
    "Nexo Hub",
    "Accesorios",
    "Concentrador USB-C de aluminio para conectar tus periféricos al escritorio.",
    5900,
    25,
  ],
] as const;
async function run() {
  await connect();
  for (const [image, name, category, description, price, stock] of rows)
    await Product.updateOne(
      { seedKey: image },
      {
        $setOnInsert: {
          seedKey: image,
          name,
          category,
          description,
          price,
          stock,
          image,
          archived: false,
        },
      },
      { upsert: true },
    );
}
run()
  .catch(() => {
    console.error("Error al cargar catálogo");
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
