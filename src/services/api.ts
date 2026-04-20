import type {
  User,
  Category,
  Product,
  Order,
  OrderItem,
  ReportData,
  OrderType,
  OrderStatus,
  PaymentMethod,
} from '../types';

interface ImportMeta {
  env: {
    PROD: boolean;
  };
}

// Mock data storage
let mockCategories: Category[] = [
  { _id: '1', name: 'Almoço', active: true },
  { _id: '2', name: 'Lanche', active: true },
  { _id: '3', name: 'Bebida', active: true },
  { _id: '4', name: 'Sobremesa', active: true },
  { _id: '5', name: 'Adicional', active: true },
];


let mockProducts: Product[] = [
  {
    _id: '1',
    name: 'Parmegiana',
    categoryId: '1',
    price: 35.0,
    description: 'Filé de frango à parmegiana com arroz e batata',
    active: true,
    recipe: [
      { ingredientId: '1', quantity: 180 },
      { ingredientId: '2', quantity: 150 },
      { ingredientId: '3', quantity: 40 },
    ],
  },
  {
    _id: '2',
    name: 'Hambúrguer Artesanal',
    categoryId: '2',
    price: 28.0,
    description: 'Hambúrguer 180g com queijo, alface e tomate',
    active: true,
  },
  {
    _id: '3',
    name: 'Refrigerante',
    categoryId: '3',
    price: 6.0,
    description: 'Lata 350ml',
    active: true,
  },
  {
    _id: '4',
    name: 'Pudim',
    categoryId: '4',
    price: 12.0,
    description: 'Pudim de leite condensado',
    active: true,
  },
];

let mockOrders: Order[] = [
  {
    _id: '1',
    number: 101,
    type: 'mesa',
    status: 'aberto',
    customerName: 'Cliente 1',
    tableNumber: '5',
    items: [
      {
        _id: '1',
        productId: '1',
        productName: 'Parmegiana',
        quantity: 2,
        unitPrice: 35.0,
        total: 70.0,
      },
    ],
    subtotal: 70.0,
    discount: 0,
    deliveryFee: 0,
    total: 70.0,
    createdAt: new Date().toISOString(),
    paid: false,
  },
  {
    _id: '2',
    number: 102,
    type: 'delivery',
    status: 'aberto',
    customerName: 'Cliente 2',
    customerPhone: '11999999999',
    customerAddress: 'Rua ABC, 123',
    items: [
      {
        _id: '1',
        productId: '2',
        productName: 'Hambúrguer Artesanal',
        quantity: 1,
        unitPrice: 28.0,
        total: 28.0,
      },
    ],
    subtotal: 28.0,
    discount: 0,
    deliveryFee: 8.0,
    total: 36.0,
    createdAt: new Date().toISOString(),
    paid: false,
  },
];

const API_BASE_URL = import.meta.env.PROD
  ? 'https://restaurante-frontend-back.vercel.app'
  : 'http://localhost:3000';

const AUTH_TOKEN_COOKIE_NAME = 'auth_token';
const AUTH_TOKEN_MAX_AGE_SECONDS = 60 * 60 * 24 * 400;

const setAuthTokenCookie = (token: string) => {
  if (typeof document === 'undefined') return;

  const secureFlag =
    typeof window !== 'undefined' && window.location.protocol === 'https:' ? '; Secure' : '';

  document.cookie = `${AUTH_TOKEN_COOKIE_NAME}=${encodeURIComponent(token)}; Max-Age=${AUTH_TOKEN_MAX_AGE_SECONDS}; Path=/; SameSite=Lax${secureFlag}`;
};

const clearAuthTokenCookie = () => {
  if (typeof document === 'undefined') return;

  const secureFlag =
    typeof window !== 'undefined' && window.location.protocol === 'https:' ? '; Secure' : '';

  document.cookie = `${AUTH_TOKEN_COOKIE_NAME}=; Max-Age=0; Path=/; SameSite=Lax${secureFlag}`;
};

const getAuthTokenFromCookie = (): string | null => {
  if (typeof document === 'undefined') return null;

  const cookie = document.cookie
    .split('; ')
    .find((entry) => entry.startsWith(`${AUTH_TOKEN_COOKIE_NAME}=`));

  if (!cookie) return null;

  return decodeURIComponent(cookie.split('=').slice(1).join('='));
};

const buildApiHeaders = (includeAuth: boolean = true): HeadersInit => {
  const token = getAuthTokenFromCookie();

  return {
    'Content-Type': 'application/json',
    ...(includeAuth && token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

let currentUser: User | null = null;

// Simulated API delay
const delay = (ms: number = 300) => new Promise((resolve) => setTimeout(resolve, ms));

// Auth API
export const authApi = {
  login: async (userName: string, password: string): Promise<User> => {
    const response = await fetch(`${API_BASE_URL}/login`, {
      method: 'POST',
      headers: buildApiHeaders(),
      body: JSON.stringify({ userName, password }),
    });

    if (!response.ok) {
      throw new Error('Credenciais inválidas');
    }

    const data = (await response.json()) as {
      token?: string;
      user?: Partial<User>;
      _id?: string | number;
      userName?: string;
      name?: string;
      role?: string;
    };

    const payloadUser = data.user ?? data;

    currentUser = {
      _id: String(payloadUser._id ?? '1'),
      userName: payloadUser.userName ?? userName,
      name: payloadUser.name ?? 'Usuário',
      role: payloadUser.role ?? 'staff',
    };

    if (data.token) {
      setAuthTokenCookie(data.token);
    }

    return currentUser;
  },

  logout: async (): Promise<void> => {
    await delay();
    currentUser = null;
    clearAuthTokenCookie();
  },

  getCurrentUser: async (): Promise<User | null> => {
    await delay();
    return currentUser;
  },
};

// Categories API
export const categoriesApi = {
  getAll: async (): Promise<Category[]> => {
    const response = await fetch(`${API_BASE_URL}/categories`, {
      method: 'GET',
      headers: buildApiHeaders(),
    });

    if (!response.ok) {
      throw new Error('Erro ao buscar categorias');
    }

    return response.json() as Promise<Category[]>;
  },

  getById: async (_id: string): Promise<Category> => {
    await delay();
    const category = mockCategories.find((c) => c._id === _id);
    if (!category) throw new Error('Categoria não encontrada');
    return category;
  },

  create: async (data: Omit<Category, '_id'>): Promise<Category> => {
    const response = await fetch(`${API_BASE_URL}/categories`, {
      method: 'POST',
      headers: buildApiHeaders(),
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error('Erro ao criar categoria');
    }

    return response.json() as Promise<Category>;
  },

  update: async (_id: string, data: Partial<Category>): Promise<Category> => {
    const response = await fetch(`${API_BASE_URL}/categories/${_id}`, {
      method: 'PUT',
      headers: buildApiHeaders(),
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error('Erro ao atualizar categoria');
    }

    return response.json() as Promise<Category>;
  },

  delete: async (_id: string): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/categories/${_id}`, {
      method: 'DELETE',
      headers: buildApiHeaders(),
    });

    if (!response.ok) {
      throw new Error('Erro ao excluir categoria');
    }
  },
};

// Products API
export const productsApi = {
  getAll: async (): Promise<Product[]> => {
    type ProductApiItem = Omit<Product, 'categoryId'> & {
      categoryId: string | { _id: string };
    };

    const normalizeProduct = (product: ProductApiItem): Product => ({
      ...product,
      categoryId:
        typeof product.categoryId === 'string' ? product.categoryId : product.categoryId._id,
    });

    const response = await fetch(`${API_BASE_URL}/products`, {
      method: 'GET',
      headers: buildApiHeaders(),
    });

    if (!response.ok) {
      throw new Error('Erro ao buscar produtos');
    }

    const data = (await response.json()) as ProductApiItem[];
    return data.map(normalizeProduct);
  },

  getById: async (_id: string): Promise<Product> => {
    await delay();
    const product = mockProducts.find((p) => p._id === _id);
    if (!product) throw new Error('Produto não encontrado');
    return product;
  },

  create: async (data: Omit<Product, '_id'>): Promise<Product> => {
    const response = await fetch(`${API_BASE_URL}/products`, {
      method: 'POST',
      headers: buildApiHeaders(),
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error('Erro ao criar produto');
    }

    return response.json() as Promise<Product>;
  },

  update: async (_id: string, data: Partial<Product>): Promise<Product> => {
    const response = await fetch(`${API_BASE_URL}/products/${_id}`, {
      method: 'PUT',
      headers: buildApiHeaders(),
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error('Erro ao atualizar produto');
    }

    return response.json() as Promise<Product>;
  },

  delete: async (_id: string): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/products/${_id}`, {
      method: 'DELETE',
      headers: buildApiHeaders(),
    });

    if (!response.ok) {
      throw new Error('Erro ao excluir produto');
    }
  },
};

// Orders API
export const ordersApi = {
  getAll: async (filters?: {
    type?: OrderType;
    status?: OrderStatus;
  }): Promise<Order[]> => {
    const normalizeOrderItem = (item: any): OrderItem => {
      const quantity = Number(item.quantity ?? 0);
      const unitPrice = Number(item.unitPrice ?? 0);
      const total = Number(item.total ?? quantity * unitPrice);

      return {
        _id: String(item._id ?? item.id ?? Date.now().toString()),
        productId: String(item.productId ?? item.product?._id ?? ''),
        productName: item.productName ?? item.product?.name ?? 'Produto',
        quantity,
        unitPrice,
        total,
        notes: item.notes,
        extras: Array.isArray(item.extras) ? item.extras : undefined,
      };
    };

    const normalizeOrder = (order: any): Order => {
      const items = Array.isArray(order.items) ? order.items.map(normalizeOrderItem) : [];
      const subtotal = Number(
        order.subtotal ?? items.reduce((sum: number, item: OrderItem) => sum + item.total, 0)
      );
      const discount = Number(order.discount ?? 0);
      const deliveryFee = Number(order.deliveryFee ?? 0);
      const total = Number(order.total ?? subtotal - discount + deliveryFee);

      return {
        _id: String(order._id ?? order.id ?? ''),
        publicId: String(order.publicId ?? order.pid ?? order.number ?? ''),
        number: Number(order.number ?? 0),
        type: (order.type ?? 'delivery') as OrderType,
        status: (order.status ?? 'aberto') as OrderStatus,
        customerName: order.customerName ?? 'Cliente',
        customerPhone: order.customerPhone,
        customerAddress: order.customerAddress,
        tableNumber: order.tableNumber,
        items,
        subtotal,
        discount,
        deliveryFee,
        total,
        notes: order.notes,
        createdAt: order.createdAt ?? new Date().toISOString(),
        paymentMethod: order.paymentMethod as PaymentMethod | undefined,
        paid: Boolean(order.paid ?? order.status === 'pago'),
      };
    };

    const queryParams = new URLSearchParams();
    if (filters?.status) {
      queryParams.set('status', filters.status);
    }
    if (filters?.type) {
      queryParams.set('type', filters.type);
    }

    const endpoint = queryParams.toString()
      ? `${API_BASE_URL}/orders/open?${queryParams.toString()}`
      : `${API_BASE_URL}/orders/open`;

    const response = await fetch(endpoint, {
      method: 'GET',
      headers: buildApiHeaders(),
    });

    if (!response.ok) {
      throw new Error('Erro ao buscar pedidos');
    }

    let filtered = ((await response.json()) as any[]).map(normalizeOrder);

    return filtered;
  },

  getById: async (_id: string): Promise<Order> => {
    const normalizeOrderItem = (item: any): OrderItem => {
      const quantity = Number(item.quantity ?? 0);
      const unitPrice = Number(item.unitPrice ?? 0);
      const total = Number(item.total ?? quantity * unitPrice);

      return {
        _id: String(item._id ?? item.id ?? Date.now().toString()),
        productId: String(item.productId ?? item.product?._id ?? ''),
        productName: item.productName ?? item.product?.name ?? 'Produto',
        quantity,
        unitPrice,
        total,
        notes: item.notes,
        extras: Array.isArray(item.extras) ? item.extras : undefined,
      };
    };

    const normalizeOrder = (order: any): Order => {
      const items = Array.isArray(order.items) ? order.items.map(normalizeOrderItem) : [];
      const subtotal = Number(
        order.subtotal ?? items.reduce((sum: number, item: OrderItem) => sum + item.total, 0)
      );
      const discount = Number(order.discount ?? 0);
      const deliveryFee = Number(order.deliveryFee ?? 0);
      const total = Number(order.total ?? subtotal - discount + deliveryFee);

      return {
        _id: String(order._id ?? order.id ?? ''),
        publicId: String(order.publicId ?? order.pid ?? order.number ?? ''),
        number: Number(order.number ?? 0),
        type: (order.type ?? 'delivery') as OrderType,
        status: (order.status ?? 'aberto') as OrderStatus,
        customerName: order.customerName ?? 'Cliente',
        customerPhone: order.customerPhone,
        customerAddress: order.customerAddress,
        tableNumber: order.tableNumber,
        items,
        subtotal,
        discount,
        deliveryFee,
        total,
        notes: order.notes,
        createdAt: order.createdAt ?? new Date().toISOString(),
        paymentMethod: order.paymentMethod as PaymentMethod | undefined,
        paid: Boolean(order.paid ?? order.status === 'pago'),
      };
    };

    const response = await fetch(`${API_BASE_URL}/orders/${_id}`, {
      method: 'GET',
      headers: buildApiHeaders(),
    });

    if (!response.ok) {
      throw new Error('Pedido não encontrado');
    }

    return normalizeOrder(await response.json());
  },

  create: async (data: Omit<Order, '_id' | 'number' | 'createdAt'>): Promise<Order> => {
    const payload = {
      customerName: data.customerName,
      customerPhone: data.customerPhone,
      customerAddress: data.customerAddress,
      tableNumber: data.tableNumber,
      type: data.type,
      notes: data.notes,
    };

    const response = await fetch(`${API_BASE_URL}/orders`, {
      method: 'POST',
      headers: buildApiHeaders(),
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error('Erro ao criar pedido');
    }

    const createdOrder = (await response.json()) as { _id?: string; id?: string };
    const orderId = String(createdOrder._id ?? createdOrder.id ?? '');

    if (!orderId) {
      throw new Error('Pedido criado sem id');
    }

    for (const item of data.items) {
      await fetch(`${API_BASE_URL}/orders/${orderId}/items`, {
        method: 'POST',
        headers: buildApiHeaders(),
        body: JSON.stringify({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          notes: item.notes,
          extras: Array.isArray(item.extras) ? item.extras.join(', ') : undefined,
        }),
      });
    }

    return ordersApi.getById(orderId);
  },

  update: async (_id: string, data: Partial<Order>): Promise<Order> => {
    if (data.status) {
      return ordersApi.updateStatus(_id, data.status);
    }

    const currentOrder = await ordersApi.getById(_id);
    return { ...currentOrder, ...data };
  },

  addItem: async (orderId: string, item: Omit<OrderItem, '_id'>): Promise<Order> => {
    const response = await fetch(`${API_BASE_URL}/orders/${orderId}/items`, {
      method: 'POST',
      headers: buildApiHeaders(),
      body: JSON.stringify({
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        notes: item.notes,
        extras: Array.isArray(item.extras) ? item.extras.join(', ') : undefined,
      }),
    });

    if (!response.ok) {
      throw new Error('Erro ao adicionar item');
    }

    return ordersApi.getById(orderId);
  },

  removeItem: async (orderId: string, itemId: string): Promise<Order> => {
    const response = await fetch(`${API_BASE_URL}/orders/${orderId}/items/${itemId}`, {
      method: 'DELETE',
      headers: buildApiHeaders(),
    });

    if (!response.ok) {
      throw new Error('Erro ao remover item');
    }

    return ordersApi.getById(orderId);
  },

  updateStatus: async (_id: string, status: OrderStatus): Promise<Order> => {
    const response = await fetch(`${API_BASE_URL}/orders/${_id}/status`, {
      method: 'PUT',
      headers: buildApiHeaders(),
      body: JSON.stringify({ status }),
    });

    if (!response.ok) {
      throw new Error('Erro ao atualizar status do pedido');
    }

    return ordersApi.getById(_id);
  },

  checkout: async (
    _id: string,
    paymentMethod: PaymentMethod,
    discount: number = 0
  ): Promise<Order> => {
    const currentOrder = await ordersApi.getById(_id);

    const response = await fetch(`${API_BASE_URL}/orders/${_id}/close`, {
      method: 'POST',
      headers: buildApiHeaders(),
      body: JSON.stringify({
        discount,
        deliveryFee: currentOrder.deliveryFee,
        paymentMethod,
      }),
    });

    if (!response.ok) {
      throw new Error('Erro ao fechar pedido');
    }

    return ordersApi.getById(_id);
  },

  cancel: async (_id: string): Promise<Order> => {
    return ordersApi.updateStatus(_id, 'cancelado');
  },
};

// Reports API
export const reportsApi = {
  getReport: async (startDate: string, endDate: string): Promise<ReportData> => {
    const query = new URLSearchParams({
      start: new Date(`${startDate}T00:00:00.000Z`).toISOString(),
      end: new Date(`${endDate}T23:59:59.999Z`).toISOString(),
    }).toString();

    const [salesResponse, topProductsResponse, paymentsResponse, lowStockResponse, byTypeResponse] =
      await Promise.all([
        fetch(`${API_BASE_URL}/reports/sales?${query}`, {
          method: 'GET',
          headers: buildApiHeaders(),
        }),
        fetch(`${API_BASE_URL}/reports/top-products?${query}`, {
          method: 'GET',
          headers: buildApiHeaders(),
        }),
        fetch(`${API_BASE_URL}/reports/payments?${query}`, {
          method: 'GET',
          headers: buildApiHeaders(),
        }),
        fetch(`${API_BASE_URL}/reports/low-stock`, {
          method: 'GET',
          headers: buildApiHeaders(),
        }),
        fetch(`${API_BASE_URL}/reports/orders-by-type?${query}`, {
          method: 'GET',
          headers: buildApiHeaders(),
        }),
      ]);

    if (!salesResponse.ok) throw new Error('Erro ao buscar relatório de vendas');
    if (!topProductsResponse.ok) throw new Error('Erro ao buscar top produtos');
    if (!paymentsResponse.ok) throw new Error('Erro ao buscar relatório de pagamentos');
    if (!lowStockResponse.ok) throw new Error('Erro ao buscar relatório de estoque baixo');
    if (!byTypeResponse.ok) throw new Error('Erro ao buscar relatório por tipo');

    const salesData = (await salesResponse.json()) as {
      totalOrders: number;
      revenue: number;
      ticketAverage: number;
      cancelled: number;
    };

    const topProductsData = (await topProductsResponse.json()) as Array<{
      productName: string;
      quantity: number;
      total: number;
    }>;

    const paymentsData = (await paymentsResponse.json()) as {
      summary: {
        dinheiro: number;
        pix: number;
        cartao: number;
        misto: number;
      };
    };

    const lowStockData = (await lowStockResponse.json()) as Array<{
      name: string;
      currentStock?: number;
      minStock?: number;
      stock?: number;
      min?: number;
    }>;

    const byTypeData = (await byTypeResponse.json()) as Record<string, number>;

    const paymentMethods = Object.entries(paymentsData.summary)
      .map(([method, total]) => ({
        method,
        total: Number(total ?? 0),
      }))
      .filter((item) => item.total > 0);

    return {
      totalSales: Number(salesData.revenue ?? 0),
      totalOrders: Number(salesData.totalOrders ?? 0),
      averageTicket: Number(salesData.ticketAverage ?? 0),
      topProducts: topProductsData.map((item) => ({
        name: item.productName,
        quantity: Number(item.quantity ?? 0),
        revenue: Number(item.total ?? 0),
      })),
      paymentMethods,
      cancellations: Number(salesData.cancelled ?? 0),
      lowStock: lowStockData.map((item) => ({
        name: item.name,
        stock: Number(item.currentStock ?? item.stock ?? 0),
        min: Number(item.minStock ?? item.min ?? 0),
      })),
      ordersByType: byTypeData,
    };
  },
};
