# DR Tech

## Iniciar la tienda

Se requiere Node.js 22.13 o posterior. Desde esta carpeta, ejecuta:

```powershell
npm start
```

Abre `http://localhost:3000/html/index.html`. No abras los HTML directamente desde el disco: el catálogo, el registro y los pedidos necesitan el servidor.

También puedes abrir `http://127.0.0.1:5500/DR%20Tech%20(1)/html/index.html` con Live Server. En ese caso, deja `npm start` ejecutándose en otra terminal para que el catálogo, el registro, los pedidos y el acceso a finanzas puedan conectarse a la API local.

## Stock y pedidos

Al iniciar por primera vez, cada producto comienza con 10 unidades. El stock se guarda en SQLite y se descuenta al confirmar un pedido. El servidor valida las cantidades y limita cada producto a 6 unidades por pedido; no acepta pedidos por encima del stock disponible.

Los pedidos quedan registrados, pero esta página no cobra ni procesa pagos. Para reponer stock, detén el servidor y actualiza la cantidad correspondiente en la tabla `inventory` del archivo `private_data/dr-tech.sqlite`.

Si no está disponible la API, la tienda usa un inventario de demostración de 10 unidades por producto, guardado en el navegador. Los pedidos de demostración descuentan ese stock local y no se registran en el servidor.

## Registro y datos

Los registros guardan nombre, correo y contraseña derivada con scrypt; no se guarda la contraseña en texto legible. La base está en `private_data/`, fuera de las rutas públicas que sirve la aplicación, y esa carpeta está excluida de Git. Mantén copias de seguridad privadas y no publiques esa carpeta.

El servidor local escucha solo en `127.0.0.1`. Para publicar la tienda, configura `HOST=0.0.0.0` detrás de un proxy HTTPS, usa almacenamiento persistente para SQLite y agrega controles de despliegue (por ejemplo, límites de solicitudes). El modo de desarrollo local no configura pagos ni inicio de sesión.

## Acceso a finanzas

En `http://localhost:3000/html/finanzas.html`, inicia sesión con el usuario `admin` y la contraseña `admin123`. Para cambiar las credenciales, define `ADMIN_USERNAME` y `ADMIN_PASSWORD` antes de iniciar el servidor. Estas credenciales predeterminadas son solo para desarrollo local: cámbialas antes de exponer la aplicación y usa HTTPS.
