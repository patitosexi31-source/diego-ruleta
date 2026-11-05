const CART_STORAGE_KEY = 'drtech-cart-v1';
const LOCAL_STOCK_STORAGE_KEY = 'drtech-demo-stock-v1';
const FREE_SHIPPING_AMOUNT = 50000;
const CONTACT_EMAIL = 'contacto@drtech.com';
const ORDER_LIMIT = 6;
const API_BASE_URL = window.location.port === '5500' && window.location.hostname === '127.0.0.1'
  ? 'http://127.0.0.1:3000'
  : '';
const apiUrl = path => `${API_BASE_URL}${path}`;

const catalog = [
  {
    id: 'funda-magsafe',
    name: 'Funda texturizada para celular',
    category: 'fundas',
    categoryLabel: 'Fundas',
    price: 15990,
    previousPrice: 19990,
    badge: 'EL MÁS ELEGIDO',
    description: 'Protección con textura y buen agarre para el uso diario.',
    image: 'https://images.unsplash.com/photo-1603313011101-320f26a4f6f6?auto=format&fit=crop&w=800&q=80',
    imageAlt: 'Funda negra texturizada para celular',
  },
  {
    id: 'funda-urbana',
    name: 'Funda urbana antideslizante',
    category: 'fundas',
    categoryLabel: 'Fundas',
    price: 9990,
    badge: 'DISEÑO DIARIO',
    description: 'Un agarre cómodo y estilo sobrio para usar todos los días.',
    image: 'https://images.unsplash.com/photo-1605236453806-6ff36851218e?auto=format&fit=crop&w=800&q=80',
    imageAlt: 'Accesorios y funda para teléfono',
  },
  {
    id: 'cargador-turbo',
    name: 'Cargador Turbo USB-C 20W',
    category: 'carga',
    categoryLabel: 'Cargadores',
    price: 13990,
    badge: 'ESENCIAL',
    description: 'Carga eficiente en un formato compacto para llevar.',
    image: 'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?auto=format&fit=crop&w=800&q=80',
    imageAlt: 'Adaptador de carga blanco para teléfono',
  },
  {
    id: 'cable-usbc',
    name: 'Cable USB-C reforzado',
    category: 'carga',
    categoryLabel: 'Cargadores',
    price: 4990,
    badge: '',
    description: 'Un cable resistente y práctico para tus dispositivos.',
    image: 'https://images.unsplash.com/photo-1595756630452-736bc8ef3693?auto=format&fit=crop&w=800&q=80',
    imageAlt: 'Cable de carga para dispositivos',
  },
  {
    id: 'auriculares-bluetooth',
    name: 'Auriculares Bluetooth',
    category: 'audio',
    categoryLabel: 'Audio',
    price: 24990,
    badge: 'SIN CABLES',
    description: 'Disfruta de tu música con libertad y comodidad.',
    image: 'https://images.unsplash.com/photo-1606220945770-b5b6c2c55bf1?auto=format&fit=crop&w=800&q=80',
    imageAlt: 'Auriculares inalámbricos',
  },
  {
    id: 'auriculares-urban',
    name: 'Auriculares Urban Sound',
    category: 'audio',
    categoryLabel: 'Audio',
    price: 19990,
    badge: 'FAVORITO',
    description: 'Sonido envolvente y diseño cómodo para salir.',
    image: 'https://images.unsplash.com/photo-1606220945770-b5b6c2c55bf1?auto=format&fit=crop&w=800&q=80',
    imageAlt: 'Auriculares de diseño moderno',
  },
  {
    id: 'vidrio-3d',
    name: 'Protector de pantalla 3D',
    category: 'proteccion',
    categoryLabel: 'Protección',
    price: 4990,
    badge: 'IMPRESCINDIBLE',
    description: 'Una capa adicional para cuidar la pantalla de tu equipo.',
    image: 'https://images.unsplash.com/photo-1512499617640-c74ae3a79d37?auto=format&fit=crop&w=800&q=80',
    imageAlt: 'Protector de pantalla para celular',
  },
  {
    id: 'soporte-escritorio',
    name: 'Soporte de escritorio',
    category: 'proteccion',
    categoryLabel: 'Accesorios',
    price: 7990,
    badge: '',
    description: 'Mantén tu teléfono a la vista y tus manos libres.',
    image: 'https://images.unsplash.com/photo-1760443728221-0feabf5a0130?auto=format&fit=crop&w=800&q=80',
    imageAlt: 'Teléfono inteligente en un soporte de escritorio',
  },
];

const formatPrice = amount =>
  new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0,
  }).format(amount);

let cart = loadCart();
let inventory = new Map();
let inventoryLoaded = false;
let localInventoryMode = false;

function loadCart() {
  try {
    const savedCart = window.localStorage.getItem(CART_STORAGE_KEY);
    if (!savedCart) return [];

    const parsedCart = JSON.parse(savedCart);
    if (!Array.isArray(parsedCart)) throw new TypeError('El carrito guardado no es una lista.');

    const validCart = parsedCart.filter(item => {
      const valid = item
        && catalog.some(product => product.id === item.id)
        && Number.isInteger(item.quantity)
        && item.quantity > 0;

      if (!valid) console.error('DR Tech: se encontró un producto inválido en el carrito guardado.', item);
      if (valid) item.quantity = Math.min(item.quantity, ORDER_LIMIT);
      return valid;
    });

    return validCart;
  } catch (error) {
    console.error('DR Tech: no se pudo cargar el carrito guardado.', error);
    return [];
  }
}

function loadLocalInventory() {
  let savedInventory = {};
  try {
    const savedValue = window.localStorage.getItem(LOCAL_STOCK_STORAGE_KEY);
    const parsedInventory = savedValue ? JSON.parse(savedValue) : null;
    if (parsedInventory && typeof parsedInventory === 'object' && !Array.isArray(parsedInventory)) {
      savedInventory = parsedInventory;
    }
  } catch (error) {
    console.error('DR Tech: no se pudo cargar el stock de demostración.', error);
  }

  return new Map(catalog.map(product => {
    const stock = savedInventory[product.id];
    return [product.id, Number.isInteger(stock) && stock >= 0 ? stock : 10];
  }));
}

function saveLocalInventory() {
  try {
    window.localStorage.setItem(LOCAL_STOCK_STORAGE_KEY, JSON.stringify(Object.fromEntries(inventory)));
  } catch (error) {
    console.error('DR Tech: no se pudo guardar el stock de demostración.', error);
    showToast('No pudimos guardar el stock de demostración en este navegador.');
  }
}

function saveCart() {
  try {
    window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
  } catch (error) {
    console.error('DR Tech: no se pudo guardar el carrito en este navegador.', error);
    showToast('No pudimos guardar el carrito en este navegador. Tus cambios podrían perderse.');
  }

  renderCartCount();
  renderCart();
}

function renderCartCount() {
  const countElement = document.querySelector('#count');
  if (!countElement) return;
  countElement.textContent = String(cart.reduce((total, item) => total + item.quantity, 0));
}

let toastTimeout;

function showToast(message) {
  const toast = document.querySelector('#toast');
  if (!toast) return;

  toast.textContent = message;
  toast.classList.add('show');
  window.clearTimeout(toastTimeout);
  toastTimeout = window.setTimeout(() => toast.classList.remove('show'), 3400);
}

async function apiRequest(path, options = {}) {
  let response;
  try {
    response = await fetch(apiUrl(path), {
      ...options,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });
  } catch (error) {
    if (API_BASE_URL) {
      throw new Error('No se pudo conectar con DR Tech en localhost:3000. Inicia el servidor con npm start.');
    }
    throw error;
  }
  const responseText = await response.text();
  let result;
  try {
    result = responseText ? JSON.parse(responseText) : null;
  } catch {
    throw new Error(`El servidor devolvió una respuesta inválida (HTTP ${response.status}). Reinícialo con npm start e inténtalo de nuevo.`);
  }
  if (response.status === 405) {
    throw new Error('Este servidor no admite las funciones de DR Tech. Ejecuta npm start desde la carpeta del proyecto y abre http://localhost:3000/html/finanzas.html.');
  }
  if (!response.ok) throw new Error(result?.error || `No se pudo completar la solicitud (HTTP ${response.status}).`);
  if (result === null) {
    throw new Error(`El servidor devolvió una respuesta vacía (HTTP ${response.status}). Reinícialo con npm start e inténtalo de nuevo.`);
  }
  return result;
}

async function loadInventory() {
  try {
    const result = await apiRequest('/api/products');
    inventory = new Map(result.products.map(product => [product.id, product.stock]));
    inventoryLoaded = true;

    let adjustedCart = false;
    cart = cart.reduce((validItems, item) => {
      const stock = inventory.get(item.id) ?? 0;
      const quantity = Math.min(item.quantity, stock, ORDER_LIMIT);
      if (quantity !== item.quantity) adjustedCart = true;
      if (quantity > 0) validItems.push({ ...item, quantity });
      return validItems;
    }, []);

    if (adjustedCart) {
      saveCart();
      renderCatalog();
      showToast('Ajustamos las cantidades del carrito al stock disponible.');
    } else {
      renderCatalog();
      renderCart();
    }
  } catch (error) {
    console.error('DR Tech: no se pudo consultar el stock del servidor.', error);
    localInventoryMode = true;
    inventory = loadLocalInventory();
    inventoryLoaded = true;

    let adjustedCart = false;
    cart = cart.reduce((validItems, item) => {
      const stock = inventory.get(item.id) ?? 0;
      const quantity = Math.min(item.quantity, stock, ORDER_LIMIT);
      if (quantity !== item.quantity) adjustedCart = true;
      if (quantity > 0) validItems.push({ ...item, quantity });
      return validItems;
    }, []);

    if (adjustedCart) saveCart();
    renderCatalog();
    renderCart();
    showToast('Servidor no disponible: usamos stock de demostración guardado en este navegador.');
  }
}

function addToCart(productId) {
  const product = catalog.find(item => item.id === productId);
  if (!product) {
    console.error(`DR Tech: no existe el producto "${productId}".`);
    showToast('No pudimos agregar ese producto. Actualiza la página e inténtalo de nuevo.');
    return;
  }

  if (!inventoryLoaded) {
    showToast('Espera a que se cargue el stock para agregar productos.');
    return;
  }

  const item = cart.find(entry => entry.id === productId);
  const quantity = item ? item.quantity : 0;
  const stock = inventory.get(productId) ?? 0;
  if (stock <= quantity) {
    showToast(stock === 0 ? 'Este producto está agotado.' : 'No hay más unidades disponibles.');
    return;
  }
  if (quantity >= ORDER_LIMIT) {
    showToast(`El máximo por producto en cada pedido es ${ORDER_LIMIT} unidades.`);
    return;
  }

  if (item) item.quantity += 1;
  else cart.push({ id: productId, quantity: 1 });

  saveCart();
  showToast(`${product.name} se agregó al carrito.`);
}

function renderCatalog() {
  const grid = document.querySelector('#products');
  if (!grid) return;

  const search = document.querySelector('#search');
  const sort = document.querySelector('#sort');
  const result = document.querySelector('#catalog-result');
  const emptyState = document.querySelector('#empty-catalog');
  const activeFilter = document.querySelector('.filter.active');
  const category = activeFilter?.dataset.category || 'todos';
  const query = search?.value.trim().toLocaleLowerCase('es-AR') || '';

  let products = catalog.filter(product => {
    const matchesCategory = category === 'todos' || product.category === category;
    const matchesQuery = `${product.name} ${product.categoryLabel} ${product.description}`
      .toLocaleLowerCase('es-AR')
      .includes(query);
    return matchesCategory && matchesQuery;
  });

  if (sort?.value === 'low') products = products.slice().sort((first, second) => first.price - second.price);
  if (sort?.value === 'high') products = products.slice().sort((first, second) => second.price - first.price);

  grid.replaceChildren();
  products.forEach(product => {
    const card = document.createElement('article');
    card.className = 'card';
    card.dataset.productId = product.id;
    card.dataset.category = product.category;

    const photo = document.createElement('div');
    photo.className = 'photo';

    const image = document.createElement('img');
    image.src = product.image;
    image.alt = product.imageAlt;
    image.loading = 'lazy';
    image.onerror = () => {
      image.removeAttribute('src');
      image.alt = `${product.imageAlt}. Imagen no disponible.`;
      photo.classList.add('photo-unavailable');
    };
    photo.append(image);

    if (product.badge) {
      const badge = document.createElement('span');
      badge.className = 'badge';
      badge.textContent = product.badge;
      photo.append(badge);
    }

    const info = document.createElement('div');
    info.className = 'info';

    const categoryLabel = document.createElement('div');
    categoryLabel.className = 'category';
    categoryLabel.textContent = product.categoryLabel;

    const title = document.createElement('h3');
    title.textContent = product.name;

    const description = document.createElement('p');
    description.className = 'product-description';
    description.textContent = product.description;

    const price = document.createElement('div');
    price.className = 'price';
    price.textContent = formatPrice(product.price);
    if (product.previousPrice) {
      const previousPrice = document.createElement('del');
      previousPrice.textContent = formatPrice(product.previousPrice);
      price.append(previousPrice);
    }

    const stockLabel = document.createElement('p');
    stockLabel.className = 'stock-label';
    const stock = inventory.get(product.id) ?? 0;
    stockLabel.textContent = inventoryLoaded
      ? stock > 0 ? `Stock: ${stock} · Máx. ${ORDER_LIMIT} por pedido` : 'Agotado'
      : 'Consultando stock…';

    const button = document.createElement('button');
    button.className = 'buy';
    button.type = 'button';
    button.dataset.addToCart = product.id;
    button.disabled = !inventoryLoaded || stock === 0;
    button.textContent = stock === 0 && inventoryLoaded ? 'Agotado' : 'Agregar al carrito';

    info.append(categoryLabel, title, description, price, stockLabel, button);
    card.append(photo, info);
    grid.append(card);
  });

  if (result) result.textContent = `${products.length} ${products.length === 1 ? 'producto encontrado' : 'productos encontrados'}`;
  if (emptyState) emptyState.hidden = products.length !== 0;
  grid.hidden = products.length === 0;
}

function updateCartItem(productId, change) {
  const item = cart.find(entry => entry.id === productId);
  if (!item) return;

  if (change > 0) {
    const stock = inventory.get(productId) ?? 0;
    if (!inventoryLoaded || item.quantity >= ORDER_LIMIT || item.quantity >= stock) {
      showToast(item.quantity >= ORDER_LIMIT
        ? `El máximo por producto en cada pedido es ${ORDER_LIMIT} unidades.`
        : 'No hay más unidades disponibles.');
      return;
    }
  }

  item.quantity += change;
  if (item.quantity <= 0) cart = cart.filter(entry => entry.id !== productId);
  saveCart();
}

function renderCart() {
  const container = document.querySelector('#cart-items');
  if (!container) return;

  const emptyState = document.querySelector('#empty-cart');
  const checkoutButton = document.querySelector('#checkout-button');
  const headingCount = document.querySelector('#cart-heading-count');
  const subtotal = cart.reduce((total, item) => {
    const product = catalog.find(entry => entry.id === item.id);
    return total + (product ? product.price * item.quantity : 0);
  }, 0);
  const itemCount = cart.reduce((total, item) => total + item.quantity, 0);

  container.replaceChildren();
  cart.forEach(item => {
    const product = catalog.find(entry => entry.id === item.id);
    if (!product) return;

    const row = document.createElement('article');
    row.className = 'cart-item';

    const image = document.createElement('img');
    image.src = product.image;
    image.alt = product.imageAlt;
    image.loading = 'lazy';
    image.onerror = () => {
      image.removeAttribute('src');
      image.alt = `${product.imageAlt}. Imagen no disponible.`;
      image.classList.add('cart-image-unavailable');
    };

    const detail = document.createElement('div');
    detail.className = 'cart-item-detail';
    const category = document.createElement('span');
    category.className = 'category';
    category.textContent = product.categoryLabel;
    const name = document.createElement('h3');
    name.textContent = product.name;
    const unitPrice = document.createElement('p');
    unitPrice.textContent = `${formatPrice(product.price)} c/u`;
    const stockLabel = document.createElement('p');
    stockLabel.className = 'stock-label';
    stockLabel.textContent = inventoryLoaded
      ? `Stock: ${inventory.get(product.id) ?? 0} · Máx. ${ORDER_LIMIT} por pedido`
      : 'Consultando stock…';
    detail.append(category, name, unitPrice, stockLabel);

    const controls = document.createElement('div');
    controls.className = 'quantity-control';
    controls.setAttribute('aria-label', `Cantidad de ${product.name}`);
    const decrease = document.createElement('button');
    decrease.type = 'button';
    decrease.dataset.cartChange = product.id;
    decrease.dataset.change = '-1';
    decrease.setAttribute('aria-label', `Quitar una unidad de ${product.name}`);
    decrease.textContent = '−';
    const quantity = document.createElement('span');
    quantity.textContent = String(item.quantity);
    const increase = document.createElement('button');
    increase.type = 'button';
    increase.dataset.cartChange = product.id;
    increase.dataset.change = '1';
    increase.setAttribute('aria-label', `Agregar una unidad de ${product.name}`);
    increase.textContent = '+';
    increase.disabled = !inventoryLoaded
      || item.quantity >= ORDER_LIMIT
      || item.quantity >= (inventory.get(product.id) ?? 0);
    controls.append(decrease, quantity, increase);

    const end = document.createElement('div');
    end.className = 'cart-item-end';
    const lineTotal = document.createElement('strong');
    lineTotal.textContent = formatPrice(product.price * item.quantity);
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'remove-item';
    remove.dataset.removeItem = product.id;
    remove.textContent = 'Quitar';
    end.append(lineTotal, remove);

    row.append(image, detail, controls, end);
    container.append(row);
  });

  if (emptyState) emptyState.hidden = cart.length !== 0;
  if (headingCount) headingCount.textContent = itemCount ? ` (${itemCount})` : '';

  const shipping = subtotal === 0 ? 0 : subtotal >= FREE_SHIPPING_AMOUNT ? 0 : null;
  const shippingLabel = document.querySelector('#cart-shipping');
  const subtotalLabel = document.querySelector('#cart-subtotal');
  const totalLabel = document.querySelector('#cart-total');
  const shippingHint = document.querySelector('#shipping-hint');
  const shippingProgress = document.querySelector('#shipping-progress');
  const shippingProgressLabel = document.querySelector('#shipping-progress-label');
  const shippingProgressAmount = document.querySelector('#shipping-progress-amount');
  if (subtotalLabel) subtotalLabel.textContent = formatPrice(subtotal);
  if (shippingLabel) shippingLabel.textContent = subtotal === 0 ? 'A calcular' : shipping === 0 ? 'Sin cargo' : 'A coordinar';
  if (totalLabel) totalLabel.textContent = formatPrice(subtotal);
  if (shippingProgress) shippingProgress.value = Math.min(subtotal, FREE_SHIPPING_AMOUNT);
  if (shippingProgressLabel) {
    shippingProgressLabel.textContent = subtotal >= FREE_SHIPPING_AMOUNT
      ? '¡Ya tienes envío gratis!'
      : subtotal === 0
        ? 'Agrega productos para avanzar hacia el envío gratis.'
        : `Te faltan ${formatPrice(FREE_SHIPPING_AMOUNT - subtotal)} para obtener envío gratis.`;
  }
  if (shippingProgressAmount) {
    shippingProgressAmount.textContent = `${Math.min(Math.round((subtotal / FREE_SHIPPING_AMOUNT) * 100), 100)}%`;
  }
  if (shippingHint) {
    shippingHint.textContent = subtotal === 0
      ? 'El costo de envío se coordina por correo.'
      : shipping === 0
        ? 'El envío es gratis en esta compra.'
        : 'El costo final de envío se coordina por correo.';
  }

  if (checkoutButton) {
    const unavailable = cart.length === 0 || !inventoryLoaded;
    checkoutButton.setAttribute('aria-disabled', String(unavailable));
    checkoutButton.disabled = unavailable;
  }

  const checkoutNote = document.querySelector('.checkout-note');
  if (checkoutNote) {
    checkoutNote.textContent = localInventoryMode
      ? 'Pedido de demostración: se guarda solo en este navegador y descuenta el stock local. No se procesa ningún pago.'
      : 'El pedido se registra y descuenta del stock disponible. No se procesa ningún pago en esta página.';
  }
}

function setupCatalog() {
  if (!document.querySelector('#products')) return;

  const search = document.querySelector('#search');
  const sort = document.querySelector('#sort');
  search?.addEventListener('input', renderCatalog);
  sort?.addEventListener('change', renderCatalog);

  document.querySelectorAll('.filter').forEach(button => {
    button.addEventListener('click', () => {
      document.querySelector('.filter.active')?.classList.remove('active');
      document.querySelectorAll('.filter').forEach(filter => filter.setAttribute('aria-pressed', 'false'));
      button.classList.add('active');
      button.setAttribute('aria-pressed', 'true');
      renderCatalog();
    });
  });

  document.querySelector('#clear-search')?.addEventListener('click', () => {
    if (search) search.value = '';
    const allFilter = document.querySelector('.filter[data-category="todos"]');
    if (allFilter) allFilter.click();
    else renderCatalog();
  });

  const requestedCategory = new URLSearchParams(window.location.search).get('categoria');
  if (requestedCategory) {
    const filter = document.querySelector(`.filter[data-category="${CSS.escape(requestedCategory)}"]`);
    filter?.click();
  }

  renderCatalog();
}

function setupForms() {
  document.querySelector('#subscribe')?.addEventListener('submit', event => {
    event.preventDefault();
    showToast('Esta vista previa no guarda suscripciones. Escríbenos desde Contacto para recibir novedades.');
    event.currentTarget.reset();
  });

  document.querySelector('#contact-form')?.addEventListener('submit', event => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const name = String(formData.get('nombre') || '').trim();
    const email = String(formData.get('email') || '').trim();
    const subject = String(formData.get('asunto') || '').trim();
    const message = String(formData.get('mensaje') || '').trim();
    const body = [`Nombre: ${name}`, `Email: ${email}`, `Tema: ${subject}`, '', message].join('\n');
    window.location.href = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(`Consulta DR Tech: ${subject}`)}&body=${encodeURIComponent(body)}`;
    showToast('Se abrió tu aplicación de correo para que puedas enviar la consulta.');
  });

  document.querySelector('#register-form')?.addEventListener('submit', async event => {
    event.preventDefault();
    const form = event.currentTarget;
    const submitButton = form.querySelector('button[type="submit"]');
    const message = document.querySelector('#register-message');
    const formData = new FormData(form);
    submitButton.disabled = true;
    message.textContent = 'Guardando tu registro…';

    try {
      const result = await apiRequest('/api/register', {
        method: 'POST',
        body: JSON.stringify({
          name: formData.get('name'),
          email: formData.get('email'),
          password: formData.get('password'),
        }),
      });
      form.reset();
      message.textContent = result.message;
    } catch (error) {
      console.error('DR Tech: no se pudo guardar el registro.', error);
      message.textContent = error.message || 'No pudimos guardar tu registro. Inténtalo nuevamente.';
    } finally {
      submitButton.disabled = false;
    }
  });
}

function setupAdminFinances() {
  const form = document.querySelector('#admin-login-form');
  const finances = document.querySelector('#admin-finances');
  const loginPanel = document.querySelector('#admin-login-panel');
  const logoutButton = document.querySelector('#admin-logout');
  const message = document.querySelector('#admin-login-message');
  if (!form || !finances || !loginPanel || !logoutButton || !message) return;

  async function loadFinances() {
    const response = await fetch(apiUrl('/api/admin/finances'), { credentials: 'include' });
    if (!response.ok) return false;
    finances.innerHTML = await response.text();
    finances.hidden = false;
    loginPanel.hidden = true;
    logoutButton.hidden = false;
    return true;
  }

  loadFinances().catch(error => console.error('DR Tech: no se pudo consultar la sesión de administración.', error));

  form.addEventListener('submit', async event => {
    event.preventDefault();
    const submitButton = form.querySelector('button[type="submit"]');
    const formData = new FormData(form);
    submitButton.disabled = true;
    message.textContent = 'Verificando acceso…';

    try {
      await apiRequest('/api/admin/login', {
        method: 'POST',
        body: JSON.stringify({
          username: formData.get('username'),
          password: formData.get('password'),
        }),
      });
      form.reset();
      await loadFinances();
      message.textContent = '';
    } catch (error) {
      message.textContent = error.message || 'No se pudo iniciar sesión.';
    } finally {
      submitButton.disabled = false;
    }
  });

  logoutButton.addEventListener('click', async () => {
    await fetch(apiUrl('/api/admin/logout'), { method: 'POST', credentials: 'include' });
    finances.replaceChildren();
    finances.hidden = true;
    loginPanel.hidden = false;
    logoutButton.hidden = true;
    message.textContent = 'Sesión cerrada.';
  });
}

document.addEventListener('click', event => {
  const addButton = event.target.closest('[data-add-to-cart]');
  if (addButton) {
    addToCart(addButton.dataset.addToCart);
    return;
  }

  const changeButton = event.target.closest('[data-cart-change]');
  if (changeButton) {
    updateCartItem(changeButton.dataset.cartChange, Number(changeButton.dataset.change));
    return;
  }

  const removeButton = event.target.closest('[data-remove-item]');
  if (removeButton) {
    cart = cart.filter(item => item.id !== removeButton.dataset.removeItem);
    saveCart();
    showToast('Quitamos el producto de tu carrito.');
  }
});

document.querySelector('#checkout-button')?.addEventListener('click', async event => {
  event.preventDefault();
  const checkoutButton = event.currentTarget;
  if (cart.length === 0) {
    showToast('Tu carrito está vacío. Explora el catálogo para agregar productos.');
    return;
  }
  if (!inventoryLoaded) {
    showToast('No se pudo verificar el stock. Inténtalo cuando el servidor esté disponible.');
    return;
  }

  checkoutButton.disabled = true;
  checkoutButton.textContent = 'Registrando pedido…';
  try {
    if (localInventoryMode) {
      const unavailableItem = cart.find(item => item.quantity > (inventory.get(item.id) ?? 0));
      if (unavailableItem) throw new Error('El stock cambió. Actualizamos tu carrito; revisa las cantidades.');

      cart.forEach(item => inventory.set(item.id, inventory.get(item.id) - item.quantity));
      saveLocalInventory();
      cart = [];
      saveCart();
      renderCatalog();
      showToast('Pedido de demostración registrado en este navegador. No se realizó ningún cobro.');
    } else {
      const result = await apiRequest('/api/orders', {
        method: 'POST',
        body: JSON.stringify({ items: cart }),
      });
      inventory = new Map(result.products.map(product => [product.id, product.stock]));
      cart = [];
      saveCart();
      renderCatalog();
      showToast(`Pedido ${result.orderId.slice(0, 8)} registrado. No se realizó ningún cobro.`);
    }
  } catch (error) {
    console.error('DR Tech: no se pudo registrar el pedido.', error);
    showToast(error.message || 'No se pudo registrar el pedido. Actualiza el stock e inténtalo de nuevo.');
    loadInventory();
  } finally {
    checkoutButton.textContent = 'Confirmar pedido';
    checkoutButton.disabled = cart.length === 0;
    renderCart();
  }
});

window.addEventListener('storage', event => {
  if (event.key === LOCAL_STOCK_STORAGE_KEY && localInventoryMode) {
    inventory = loadLocalInventory();
    renderCatalog();
    renderCart();
    return;
  }
  if (event.key !== CART_STORAGE_KEY) return;
  cart = loadCart();
  renderCartCount();
  renderCart();
});

renderCartCount();
renderCart();
setupCatalog();
setupForms();
setupAdminFinances();
loadInventory();
