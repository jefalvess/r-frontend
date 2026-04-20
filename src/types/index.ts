export type OrderType = 'mesa' | 'balcao' | 'retirada' | 'delivery';
export type OrderStatus = 'aberto' | 'pago' | 'cancelado';
export type PaymentMethod = 'dinheiro' | 'pix' | 'cartao' | 'misto';

export interface User {
  _id: string;
  userName: string;
  name: string;
  role: string;
}

export interface Category {
  _id: string;
  name: string;
  active: boolean;
}

export interface Ingredient {
  _id: string;
  name: string;
  unit: string;
  cost: number;
}

export interface RecipeItem {
  ingredientId: string;
  quantity: number;
}

export interface Product {
  _id: string;
  name: string;
  categoryId: string;
  price: number;
  description: string;
  active: boolean;
  recipe?: RecipeItem[];
}

export interface OrderItem {
  _id: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  total: number;
  notes?: string;
  extras?: string[];
}

export interface Order {
  _id: string;
  publicId?: string;
  number: number;
  type: OrderType;
  status: OrderStatus;
  customerName: string;
  customerPhone?: string;
  customerAddress?: string;
  tableNumber?: string;
  items: OrderItem[];
  subtotal: number;
  discount: number;
  deliveryFee: number;
  total: number;
  notes?: string;
  createdAt: string;
  paymentMethod?: PaymentMethod;
  paid: boolean;
}



export interface DashboardStats {
  openOrders: number;
  todaySales: number;
  activeDeliveries: number;
  topProducts: { name: string; quantity: number }[];
  lowStockAlerts: { name: string; stock: number }[];
}

export interface ReportData {
  totalSales: number;
  totalOrders: number;
  averageTicket: number;
  topProducts: { name: string; quantity: number; revenue: number }[];
  paymentMethods: { method: string; total: number }[];
  cancellations: number;
  lowStock: { name: string; stock: number; min: number }[];
}
