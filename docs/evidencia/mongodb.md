# Evidencia de persistencia en desarrollo

Después del recorrido grabado, `mongosh` informó `ping: 1`, replica set `rs0` y `isWritablePrimary: true`. La base `frecuencia` contenía seis productos activos, tres usuarios y dos pedidos. El producto creado durante la demostración quedó archivado y el pedido conservó su línea de compra.

| Colección | Estructura comprobada |
| --- | --- |
| `users` | Cuenta de equipo y cuenta de cliente. Correo único y hash de contraseña |
| `products` | Categoría, imagen, precio en céntimos, existencias y marca de archivo |
| `orders` | Referencias ObjectId al cliente y al producto. Líneas con cantidad y precio histórico, total, estado y clave de operación |

La consulta del último pedido devolvió una línea, total `6500`, estado **En preparación**, referencia al cliente de tipo `objectId` y referencia al producto de tipo `objectId`. El índice compuesto único sobre `customer` y `requestId` estaba presente.

Para obtener las mismas medidas sobre el estado actual, desde la máquina donde corre MongoDB:

```bash
docker exec frecuencia-mongo mongosh --quiet frecuencia --eval '
  printjson({
    ping: db.runCommand({ping: 1}).ok,
    replicaSet: db.hello().setName,
    primary: db.hello().isWritablePrimary,
    collections: db.getCollectionNames(),
    activeProducts: db.products.countDocuments({archived: false}),
    users: db.users.countDocuments(),
    orders: db.orders.countDocuments()
  });
  printjson(db.orders.aggregate([
    {$sort: {createdAt: -1}}, {$limit: 1},
    {$project: {_id: 0, total: 1, status: 1, items: {$size: "$items"},
      customerReference: {$type: "$customer"},
      productReference: {$type: {$arrayElemAt: ["$items.product", 0]}}}}
  ]).toArray());
  printjson(db.orders.getIndexes().map(i => ({fields: i.key, unique: i.unique})));'
```

El video muestra cómo la API recibe el pedido desde Next.js, Angular cambia su estado y el cliente recupera el historial actualizado. [Ver demostración](demostracion.mp4)
