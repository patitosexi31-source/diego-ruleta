import { createReadStream } from 'node:fs';
import { mkdir, readFile, stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { randomBytes, randomUUID, scryptSync, timingSafeEqual } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import { dirname, extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const databaseDirectory = resolve(root, 'private_data');
const databasePath = resolve(databaseDirectory, 'dr-tech.sqlite');
const port = Number(process.env.PORT) || 3000;
const host = process.env.HOST || '127.0.0.1';
const orderLimit = 6;
const adminUsername = process.env.ADMIN_USERNAME || 'admin';
const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
const adminSessionLifetime = 8 * 60 * 60 * 1000;
const adminSessions = new Map();
const adminCookieName = 'drtech-admin';
const financeContentPath = resolve(root, 'private', 'finances.html');
const initialProducts = [
  'funda-magsafe',
  'funda-urbana',
  'cargador-turbo',
  'cable-usbc',
  'auriculares-bluetooth',
  'auriculares-urban',
  'vidrio-3d',
  'soporte-escritorio',
];
const publicDirectories = new Set(['html', 'css', 'js', 'img']);
const mimeTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.png': 'image/png',
};

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

await mkdir(databaseDirectory, { recursive: true });
const database = new DatabaseSync(databasePath);
database.exec(`
  PRAGMA foreign_keys = ON;
  PRAGMA journal_mode = WAL;
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_salt TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS inventory (
    product_id TEXT PRIMARY KEY,
    stock INTEGER NOT NULL CHECK (stock >= 0)
  );
  CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY,
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS order_items (
    order_id TEXT NOT NULL REFERENCES orders(id),
    product_id TEXT NOT NULL REFERENCES inventory(product_id),
    quantity INTEGER NOT NULL CHECK (quantity BETWEEN 1 AND 6),
    PRIMARY KEY (order_id, product_id)
  );
`);

const seedProduct = database.prepare(
  'INSERT OR IGNORE INTO inventory (product_id, stock) VALUES (?, 10)',
);
for (const productId of initialProducts) seedProduct.run(productId);

function sendJson(response, status, body) {
  response.writeHead(status, {
    'Cache-Control': 'no-store',
    'Content-Type': 'application/json; charset=utf-8',
    'X-Content-Type-Options': 'nosniff',
  });
  response.end(JSON.stringify(body));
}

function safeEqual(first, second) {
  const firstBuffer = Buffer.from(first);
  const secondBuffer = Buffer.from(second);
  const length = Math.max(firstBuffer.length, secondBuffer.length, 1);
  const paddedFirst = Buffer.alloc(length);
  const paddedSecond = Buffer.alloc(length);
  firstBuffer.copy(paddedFirst);
  secondBuffer.copy(paddedSecond);
  return timingSafeEqual(paddedFirst, paddedSecond) && firstBuffer.length === secondBuffer.length;
}

function getAdminSession(request) {
  const cookie = request.headers.cookie?.split(';')
    .map(value => value.trim())
    .find(value => value.startsWith(`${adminCookieName}=`));
  const sessionId = cookie?.slice(adminCookieName.length + 1);
  const expiresAt = sessionId ? adminSessions.get(sessionId) : undefined;
  if (!expiresAt) return null;
  if (expiresAt <= Date.now()) {
    adminSessions.delete(sessionId);
    return null;
  }
  return sessionId;
}

function setAdminCookie(response, sessionId, maxAge) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  response.setHeader(
    'Set-Cookie',
    `${adminCookieName}=${sessionId}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${maxAge}${secure}`,
  );
}

async function handleAdminApi(request, response, pathname) {
  if (request.method === 'POST' && pathname === '/api/admin/login') {
    const body = await readJson(request);
    const username = typeof body.username === 'string' ? body.username : '';
    const password = typeof body.password === 'string' ? body.password : '';
    if (!safeEqual(username, adminUsername) || !safeEqual(password, adminPassword)) {
      sendJson(response, 401, { error: 'Usuario o contraseña incorrectos.' });
      return;
    }

    const sessionId = randomBytes(32).toString('hex');
    adminSessions.set(sessionId, Date.now() + adminSessionLifetime);
    setAdminCookie(response, sessionId, adminSessionLifetime / 1000);
    sendJson(response, 200, { message: 'Sesión iniciada.' });
    return;
  }

  if (request.method === 'POST' && pathname === '/api/admin/logout') {
    const sessionId = getAdminSession(request);
    if (sessionId) adminSessions.delete(sessionId);
    setAdminCookie(response, '', 0);
    sendJson(response, 200, { message: 'Sesión cerrada.' });
    return;
  }

  if (request.method === 'GET' && pathname === '/api/admin/finances') {
    if (!getAdminSession(request)) {
      sendJson(response, 401, { error: 'Inicia sesión para consultar las finanzas.' });
      return;
    }

    const content = await readFile(financeContentPath);
    response.writeHead(200, {
      'Cache-Control': 'no-store',
      'Content-Length': content.length,
      'Content-Type': 'text/html; charset=utf-8',
      'X-Content-Type-Options': 'nosniff',
    });
    response.end(content);
    return;
  }

  sendJson(response, 404, { error: 'Ruta no encontrada.' });
}

async function readJson(request) {
  const contentType = request.headers['content-type'] || '';
  if (!contentType.toLowerCase().startsWith('application/json')) {
    throw new HttpError(415, 'Se esperaba una solicitud JSON.');
  }

  const chunks = [];
  let length = 0;
  for await (const chunk of request) {
    length += chunk.length;
    if (length > 16_384) throw new HttpError(413, 'La solicitud es demasiado grande.');
    chunks.push(chunk);
  }

  try {
    const body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    if (body === null || typeof body !== 'object' || Array.isArray(body)) {
      throw new Error('El cuerpo debe ser un objeto.');
    }
    return body;
  } catch {
    throw new HttpError(400, 'La solicitud contiene JSON inválido.');
  }
}

function getStock() {
  return database.prepare('SELECT product_id AS id, stock FROM inventory ORDER BY product_id').all();
}

async function handleApi(request, response, pathname) {
  if (pathname.startsWith('/api/admin/')) {
    await handleAdminApi(request, response, pathname);
    return;
  }

  if (request.method === 'GET' && pathname === '/api/products') {
    sendJson(response, 200, { products: getStock(), orderLimit });
    return;
  }

  if (request.method === 'POST' && pathname === '/api/register') {
    const body = await readJson(request);
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const password = typeof body.password === 'string' ? body.password : '';

    if (name.length < 2 || name.length > 80) {
      throw new HttpError(400, 'Escribe un nombre de entre 2 y 80 caracteres.');
    }
    if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new HttpError(400, 'Escribe un correo electrónico válido.');
    }
    if (password.length < 10 || password.length > 128) {
      throw new HttpError(400, 'La contraseña debe tener entre 10 y 128 caracteres.');
    }

    const salt = randomBytes(16);
    const passwordHash = scryptSync(password, salt, 64);
    if (database.prepare('SELECT 1 FROM users WHERE email = ?').get(email)) {
      throw new HttpError(409, 'No se pudo completar el registro con esos datos.');
    }
    database.prepare(`
      INSERT INTO users (id, name, email, password_salt, password_hash, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      randomUUID(),
      name,
      email,
      salt.toString('hex'),
      passwordHash.toString('hex'),
      new Date().toISOString(),
    );

    sendJson(response, 201, { message: 'Registro creado correctamente.' });
    return;
  }

  if (request.method === 'POST' && pathname === '/api/orders') {
    const body = await readJson(request);
    if (!Array.isArray(body.items) || body.items.length === 0 || body.items.length > initialProducts.length) {
      throw new HttpError(400, 'El pedido debe incluir productos válidos.');
    }

    const items = new Map();
    for (const item of body.items) {
      if (
        !item
        || typeof item.id !== 'string'
        || !Number.isInteger(item.quantity)
        || item.quantity < 1
        || item.quantity > orderLimit
        || !initialProducts.includes(item.id)
        || items.has(item.id)
      ) {
        throw new HttpError(400, 'Cada producto debe tener una cantidad entre 1 y 6.');
      }
      items.set(item.id, item.quantity);
    }

    const orderId = randomUUID();
    let transactionStarted = false;
    try {
      database.exec('BEGIN IMMEDIATE');
      transactionStarted = true;
      database.prepare('INSERT INTO orders (id, created_at) VALUES (?, ?)').run(
        orderId,
        new Date().toISOString(),
      );
      const decrementStock = database.prepare(
        'UPDATE inventory SET stock = stock - ? WHERE product_id = ? AND stock >= ?',
      );
      const addOrderItem = database.prepare(
        'INSERT INTO order_items (order_id, product_id, quantity) VALUES (?, ?, ?)',
      );

      for (const [productId, quantity] of items) {
        const result = decrementStock.run(quantity, productId, quantity);
        if (result.changes !== 1) throw new HttpError(409, 'No hay stock suficiente para completar el pedido.');
        addOrderItem.run(orderId, productId, quantity);
      }
      database.exec('COMMIT');
      transactionStarted = false;
    } catch (error) {
      if (transactionStarted) database.exec('ROLLBACK');
      throw error;
    }

    sendJson(response, 201, { orderId, products: getStock() });
    return;
  }

  sendJson(response, 404, { error: 'Ruta no encontrada.' });
}

async function serveStatic(pathname, response) {
  if (pathname === '/') {
    response.writeHead(302, { Location: '/html/index.html' });
    response.end();
    return;
  }

  let decodedPath;
  try {
    decodedPath = decodeURIComponent(pathname);
  } catch {
    sendJson(response, 400, { error: 'Ruta inválida.' });
    return;
  }

  const segments = decodedPath.split('/').filter(Boolean);
  if (
    segments.length < 2
    || !publicDirectories.has(segments[0])
    || segments.some(segment => segment === '.' || segment === '..' || segment.startsWith('.'))
  ) {
    sendJson(response, 404, { error: 'Archivo no encontrado.' });
    return;
  }

  const filePath = resolve(root, ...segments);
  if (!filePath.startsWith(`${root}${sep}`) || !mimeTypes[extname(filePath).toLowerCase()]) {
    sendJson(response, 404, { error: 'Archivo no encontrado.' });
    return;
  }

  try {
    const fileInfo = await stat(filePath);
    if (!fileInfo.isFile()) throw new HttpError(404, 'Archivo no encontrado.');
    response.writeHead(200, {
      'Cache-Control': 'no-cache',
      'Content-Length': fileInfo.size,
      'Content-Type': mimeTypes[extname(filePath).toLowerCase()],
      'X-Content-Type-Options': 'nosniff',
    });
    createReadStream(filePath).pipe(response);
  } catch (error) {
    if (error.code === 'ENOENT' || error instanceof HttpError) {
      sendJson(response, 404, { error: 'Archivo no encontrado.' });
      return;
    }
    throw error;
  }
}

const server = createServer(async (request, response) => {
  try {
    const pathname = new URL(request.url, 'http://localhost').pathname;
    if (pathname.startsWith('/api/')) {
      await handleApi(request, response, pathname);
      return;
    }

    if (request.method !== 'GET') {
      sendJson(response, 405, { error: 'Método no permitido.' });
      return;
    }
    await serveStatic(pathname, response);
  } catch (error) {
    if (error instanceof HttpError) {
      sendJson(response, error.status, { error: error.message });
      return;
    }
    console.error('DR Tech: error interno del servidor.', error);
    if (!response.headersSent) sendJson(response, 500, { error: 'Ocurrió un error interno.' });
    else response.destroy(error);
  }
});

server.listen(port, host, () => {
  console.log(`DR Tech disponible en http://localhost:${port}/html/index.html`);
  console.log(`Base de datos privada: ${databasePath}`);
});
