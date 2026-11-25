# Frecuencia

Tienda de tecnología para la PA4 de Programación Web Avanzada. El cliente puede registrarse, buscar productos, preparar una bolsa y consultar sus pedidos. El equipo administra el inventario, los clientes y los estados de los pedidos en un panel independiente.

[Video de la demostración en desarrollo](docs/evidencia/demostracion.mp4) · [Evidencia de MongoDB](docs/evidencia/mongodb.md)

## Ejecutar en desarrollo

Se necesita Node.js 24, npm, Bash y Docker con el daemon activo. Angular 16.2 utiliza su propia versión local de Node 18 para compilar. Next.js y Express se ejecutan con Node 24. Desde la raíz:

```bash
bash scripts/install.sh
node scripts/local.mjs prepare
node scripts/local.mjs start
```

El primer comando instala desde los cuatro lockfiles y compila los tres servicios. El segundo inicia un replica set de MongoDB 8 en Docker, espera a que acepte escrituras, carga seis productos y crea la cuenta del equipo. Puede repetirse después de reiniciar Docker. Los productos existentes conservan los cambios de inventario. El último comando mantiene los tres servicios en primer plano. Ctrl+C detiene los servidores web. MongoDB conserva sus datos en el volumen `frecuencia-data`.

| Componente | Puerto | Entrada |
| --- | --- | --- |
| Tienda React y Next.js | 3000 | `/` para el catálogo y `/pedidos` para el historial |
| Panel Angular 16 | 4200 | `/acceso` para el equipo |
| API Express | 4000 | `GET /api/health` comprueba la conexión a MongoDB |
| MongoDB | 27017 en la interfaz local | Base `frecuencia`, replica set `rs0` |

**Acceso del equipo.** Abre en privado el archivo local `.local/development.env` generado por `prepare` y usa `ADMIN_EMAIL` y `ADMIN_PASSWORD` en el panel. La contraseña se genera para cada instalación. El archivo tiene permisos de propietario y Git lo ignora. Para probar como cliente, abre **Mi cuenta → Crear una cuenta de cliente** en la tienda.

**Edición con recarga.** Después de `prepare`, puedes ejecutar por separado `npm run dev` en cada uno de los tres proyectos en lugar de `start`. En la terminal de la API, desde la raíz ejecuta primero `set -a; source .local/development.env; set +a` para cargar su configuración y luego entra en `backend`. Los dos servidores frontend reenvían las solicitudes `/api` al puerto 4000.

## Arquitectura y decisiones

| Directorio | Responsabilidad |
| --- | --- |
| `frontend-angular/src` | Panel, formularios reactivos, servicio HTTP y guard de sesión administrativa |
| `frontend-nextjs/app`, `components`, `context`, `services` | Rutas, catálogo, bolsa en memoria, sesión, historial y cliente HTTP |
| `backend/server.ts`, `backend/src` | Rutas, controladores, modelos Mongoose, autorización, validación y transacciones |
| `qa` | Pruebas de la API con MongoDB real y recorrido de navegador |
| `scripts` | Instalación reproducible, preparación del replica set y arranque local |

Ambas interfaces envían las peticiones a su propio origen y el servidor frontend las reenvía a Express. MongoDB es la fuente de catálogo, inventario, usuarios, pedidos y métricas. Los importes se guardan en céntimos de euro. Cada línea de pedido conserva el nombre y el precio del momento de compra, además de la referencia al producto.

El servidor calcula el total y descuenta las unidades con una condición de stock dentro de la misma transacción que crea el pedido. Una clave de operación única por cliente permite reintentar la compra. El flujo es **Pendiente → En preparación → Enviado → Entregado**. Desde los dos primeros estados, el equipo también puede cancelar el pedido y devolver las existencias. Archivar un producto o dar de baja a un cliente preserva el historial.

El registro público solo crea clientes. Express valida las peticiones con Zod, protege las contraseñas con bcrypt y aplica límites a los intentos de acceso. Los JWT caducan a las ocho horas y viajan en cookies HttpOnly con SameSite=Lax. Tienda y panel utilizan cookies y audiencias distintas. El cierre de sesión y la baja invalidan los tokens mediante una versión de sesión almacenada en MongoDB. La API verifica el rol y el propietario del pedido aunque la petición llegue directamente al backend.

## Rutas principales

| Recurso relativo a `/api` | Operaciones |
| --- | --- |
| `/auth/register`, `/auth/login`, `/auth/me`, `/auth/logout` | Registro, acceso, sesión actual y cierre |
| `/products` | Catálogo público. Admite `q` y `category` |
| `/orders`, `/orders/:id` | Crear, listar y consultar los pedidos del cliente autenticado |
| `/admin/auth/login`, `/admin/auth/me`, `/admin/auth/logout` | Sesión del equipo |
| `/admin/products`, `/admin/products/:id` | GET, POST, PUT y DELETE para el inventario |
| `/admin/customers`, `/admin/customers/:id` | Listar, registrar, editar y dar de baja clientes |
| `/admin/orders`, `/admin/orders/:id`, `/admin/orders/:id/status` | Listado, detalle y cambio de estado mediante PATCH |
| `/admin/summary` | Ventas, cantidades y serie de los últimos siete días |

## Verificación

Con MongoDB preparado, ejecuta `node --test qa/api.test.mjs` desde la raíz. El proceso levanta otra instancia de la API y crea una base temporal con un nombre aleatorio. Al terminar elimina únicamente esa base. Las pruebas cubren cookies de producción, roles, baja de clientes, validación, archivos, historial, competencia por el inventario, reversión e idempotencia.

Con los tres servidores de desarrollo en ejecución y Chromium instalado, ejecuta `node qa/browser.mjs`. La variable opcional `CHROMIUM_PATH` permite especificar el navegador. El recorrido interactúa con ambas interfaces, crea un cliente y un pedido de demostración, comprueba la disminución de stock y archiva el producto de prueba. Estos registros quedan en la base de desarrollo. La grabación adjunta recoge este recorrido en la máquina de desarrollo.

## Despliegue HTTPS en Render

El [Blueprint de Render](render.yaml) configura un servicio web en el plan gratuito. La URL que asigna Render abre la tienda en `/` y el panel Angular en `/admin/`. Ambos consumen la API Express bajo `/api`. El servicio incluye los dos frontends y Express, y usa una base MongoDB externa.

1. Crea una base MongoDB Atlas con transacciones, por ejemplo en un clúster gratuito. Crea un usuario con acceso de lectura y escritura a la base de la aplicación y autoriza las direcciones de salida del servicio Render en **Network Access** de Atlas.
2. En Render, elige **New → Blueprint**, conecta el repositorio de GitHub y selecciona la rama que contiene `render.yaml`.
3. Ingresa `MONGODB_URI` con el nombre de la base en la URI, `ADMIN_EMAIL` y `ADMIN_PASSWORD` en el formulario privado de Render. Usa una contraseña de al menos 10 caracteres y hasta 72 bytes. Render genera la clave JWT.
4. Cuando el servicio figure como activo, abre la URL que muestra Render. La API debe responder `{"status":"ok","database":"connected"}` en `/api/health`. Comprueba que el catálogo muestra seis productos iniciales y que el equipo puede acceder a `/admin/`.

El primer arranque prepara el catálogo y la cuenta del equipo. Los reinicios conservan los cambios almacenados en MongoDB. El plan gratuito puede tardar en responder tras un período de inactividad.

## Despliegue HTTPS con servicios separados

Si tu proveedor usa servicios independientes, crea tres servicios web y una base MongoDB con soporte de transacciones, como un replica set de Atlas. Autoriza la salida del backend en Atlas y configura estos comandos desde el directorio de cada servicio:

| Servicio | Compilación | Arranque | Configuración |
| --- | --- | --- | --- |
| `backend` | `npm ci --include=dev && npm run build` | `npm start` | `NODE_ENV=production`, `MONGODB_URI`, `JWT_SECRET` aleatorio de al menos 32 bytes, `ALLOWED_ORIGINS` con los dos orígenes HTTPS exactos separados por coma, `PORT` del proveedor |
| `frontend-angular` | `npm ci --include=dev && npm run build` | `npm start` | `API_ORIGIN` con el origen del backend y `PORT` del proveedor |
| `frontend-nextjs` | `npm ci --include=dev && npm run build` | `npm start` | `API_ORIGIN` disponible **durante la compilación** y el arranque, `NODE_ENV=production` y `PORT` |

Usa el gestor de secretos del alojamiento para la URI y las claves. Define `ADMIN_EMAIL` y `ADMIN_PASSWORD` para ejecutar una vez `npm run admin` en el backend compilado. Puedes ejecutar `npm run seed` para añadir el catálogo inicial. La API usa cookies Secure en producción, por lo que ambas interfaces necesitan HTTPS. Para validar la publicación, comprueba `/api/health` en los tres servicios, inicia sesión con ambas cuentas, crea un pedido y cambia su estado desde Angular.

## Referencias de la consigna

La composición del panel y del catálogo toma como referencias [Oreva](https://themeforest.net/item/oreva-angular-11-admin-dashboard-template/29912114) y [The Front Kit](https://thefrontkit.com/apps/ecommerce-kit). Los componentes y las seis imágenes de producto son originales de esta implementación. La consigna también enlaza la [guía de Express de DreamFactory](https://blog.dreamfactory.com/build-rest-apis-node-js-express) y la [introducción de ScaleGrid a las transacciones de MongoDB](https://scalegrid.io/blog/mongodb-acid/).
