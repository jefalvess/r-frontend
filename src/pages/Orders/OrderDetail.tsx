import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import {
  ArrowLeft,
  Trash2,
  Search,
  XCircle,
  Plus,
} from 'lucide-react';
import { toast } from 'sonner';
import { ordersApi, productsApi, categoriesApi } from '../../services/api';
import { PrintTicket } from '../../components/PrintTicket';
import type { Order, Product, Category, OrderItem, PaymentMethod } from '../../types';

export function OrderDetail() {
  const { _id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState<Order | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('todos');
  const [searchTerm, setSearchTerm] = useState('');
  const [notes, setNotes] = useState('');
  
  // Estados para adicionar itens
  const [pendingItems, setPendingItems] = useState<(Omit<OrderItem, '_id'> & { key: string })[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [productNotes, setProductNotes] = useState('');
  const [itemsToPrint, setItemsToPrint] = useState<OrderItem[]>([]);
  const [showProducts, setShowProducts] = useState(false);
  const [printFull, setPrintFull] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [deliveryFee, setDeliveryFee] = useState(0);

  const parseIntegerCurrency = (value: string) => {
    const parsed = Number.parseInt(value, 10);
    if (Number.isNaN(parsed) || parsed < 0) return 0;
    return parsed;
  };

  useEffect(() => {
    loadData();
  }, [_id]);

  useEffect(() => {
    if (order) {
      setNotes(order.notes || '');
      setDeliveryFee(0);
    }
  }, [order]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [orderData, productsData, categoriesData] = await Promise.all([
        ordersApi.getById(_id!),
        productsApi.getAll(),
        categoriesApi.getAll(),
      ]);
      setOrder(orderData);
      setProducts(productsData.filter((p) => p.active));
      setCategories(categoriesData);
    } catch (error) {
      toast.error('Erro ao carregar pedido');
      navigate('/pedidos');
    } finally {
      setLoading(false);
    }
  };

  const selectProduct = (product: Product) => {
    setSelectedProduct(product);
    setProductNotes('');
  };

  const confirmProduct = (product: Product) => {
    setPendingItems([
      ...pendingItems,
      {
        key: Date.now().toString(),
        productId: product._id,
        productName: product.name,
        quantity: 1,
        unitPrice: product.price,
        total: product.price,
        notes: productNotes || undefined,
      },
    ]);
    setSelectedProduct(null);
    setProductNotes('');
  };

  const removePendingItem = (key: string) => {
    setPendingItems(pendingItems.filter((i) => i.key !== key));
  };

  const confirmAddItems = async () => {
    if (!order || pendingItems.length === 0) return;

    try {
      let updatedOrder = order;
      const addedItems: OrderItem[] = [];

      for (const item of pendingItems) {
        const itemToAdd: Omit<OrderItem, '_id'> = {
          productId: item.productId,
          productName: item.productName,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          total: item.total,
          notes: item.notes,
        };
        updatedOrder = await ordersApi.addItem(updatedOrder._id, itemToAdd);
        addedItems.push(updatedOrder.items[updatedOrder.items.length - 1]);
      }

      setOrder(updatedOrder);
      setItemsToPrint(addedItems);
      setPendingItems([]);
      setSelectedProduct(null);

      // Agendar impressão após renderização
      setTimeout(() => {
        window.print();
        setTimeout(() => setItemsToPrint([]), 1000);
      }, 200);
    } catch (error) {
      toast.error('Erro ao adicionar produtos');
    }
  };

  const removeItem = async (itemId: string) => {
    if (!order) return;
    try {
      const updatedOrder = await ordersApi.removeItem(order._id, itemId);
      setOrder(updatedOrder);
    } catch (error) {
      toast.error('Erro ao remover item');
    }
  };

  const handleCheckout = async (paymentMethod: PaymentMethod) => {
    if (!order) return;
    const appliedDeliveryFee = order.type === 'delivery' ? deliveryFee : 0;
    setPaymentLoading(true);
    try {
      const updatedOrder = await ordersApi.checkout(order._id, paymentMethod, 0, appliedDeliveryFee);
      setOrder(updatedOrder);
      setShowPaymentModal(false);
      setPrintFull(true);
      setTimeout(() => {
        window.print();
        setTimeout(() => {
          setPrintFull(false);
          navigate('/pedidos');
        }, 500);
      }, 200);
    } catch (error) {
      toast.error('Erro ao fechar pedido');
    } finally {
      setPaymentLoading(false);
    }
  };

  const cancelOrder = async () => {
    if (!order) return;
    if (!confirm('Deseja realmente cancelar este pedido?')) return;

    try {
      await ordersApi.cancel(order._id);
      navigate('/pedidos');
    } catch (error) {
      toast.error('Erro ao cancelar pedido');
    }
  };

  const updateNotes = async (newNotes: string) => {
    if (!order) return;
    setNotes(newNotes);
    try {
      const updatedOrder = await ordersApi.update(order._id, { notes: newNotes });
      setOrder(updatedOrder);
    } catch (error) {
      toast.error('Erro ao atualizar observações');
      setNotes(order.notes || '');
    }
  };

  const filteredProducts = products.filter((product) => {
    if (selectedCategory !== 'todos' && product.categoryId !== selectedCategory) return false;
    if (searchTerm) {
      return product.name.toLowerCase().includes(searchTerm.toLowerCase());
    }
    return true;
  });

  const pendingSubtotal = pendingItems.reduce((sum, i) => sum + i.total, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4">Carregando pedido...</p>
        </div>
      </div>
    );
  }

  if (!order) return null;

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate('/pedidos')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft size={20} />
          <span>Voltar para pedidos</span>
        </button>
        <h1 className="text-2xl lg:text-3xl font-semibold mb-2">Pedido #{order.publicId ?? order.number}</h1>
        <p className="text-gray-600">Adicionar itens ao pedido existente</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Products Section */}
        <div className="lg:col-span-2">
          {/* Client Info - Read Only */}
          <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
            <h2 className="font-semibold text-lg mb-4">Dados do Cliente</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Pedido</label>
                <p className="text-lg font-medium text-gray-900 capitalize">
                  {order.type === 'retirada' ? 'Retirada' : 'Delivery'}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cliente</label>
                <p className="text-lg font-medium text-gray-900">{order.customerName}</p>
              </div>
              {order.customerPhone && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Telefone</label>
                  <p className="text-lg font-medium text-gray-900">{order.customerPhone}</p>
                </div>
              )}
              {order.customerAddress && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Endereço</label>
                  <p className="text-lg font-medium text-gray-900">{order.customerAddress}</p>
                </div>
              )}
            </div>
          </div>

          {/* Current Items */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="font-semibold text-lg mb-4">Itens Atuais do Pedido</h2>

            {order.items.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>Nenhum item adicionado ao pedido</p>
              </div>
            ) : (
              <div className="space-y-3">
                {order.items.map((item) => (
                  <div key={item._id} className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium">{item.productName}</p>
                      {item.notes && <p className="text-xs text-orange-600 italic mt-0.5">{item.notes}</p>}
                      <p className="text-sm text-gray-500 mt-0.5">R$ {item.unitPrice.toFixed(2)}</p>
                    </div>
                    <span className="font-semibold min-w-[80px] text-right">
                      R$ {item.total.toFixed(2)}
                    </span>
                    <button
                      onClick={() => removeItem(item._id)}
                      className="text-red-600 hover:bg-red-50 p-2 rounded-lg"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Add Products Button / Section */}
          {!showProducts ? (
            <div className="mt-6">
              <button
                onClick={() => setShowProducts(true)}
                className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-gray-300 rounded-xl p-4 text-gray-500 hover:border-blue-400 hover:text-blue-600 transition"
              >
                <Plus size={20} />
                Adicionar mais produtos
              </button>
            </div>
          ) : (
          <div className="bg-white rounded-xl shadow-sm p-6 mt-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-lg">Produtos</h2>
              <button
                onClick={() => setShowProducts(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XCircle size={20} />
              </button>
            </div>

            {/* Search */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Buscar produto..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>

            {/* Categories */}
            <div className="flex gap-2 overflow-x-auto pb-4 mb-6">
              <button
                onClick={() => setSelectedCategory('todos')}
                className={`px-4 py-2 rounded-lg whitespace-nowrap ${
                  selectedCategory === 'todos'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 hover:bg-gray-200'
                }`}
              >
                Todos
              </button>
              {categories.map((cat) => (
                <button
                  key={cat._id}
                  onClick={() => setSelectedCategory(cat._id)}
                  className={`px-4 py-2 rounded-lg whitespace-nowrap ${
                    selectedCategory === cat._id
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 hover:bg-gray-200'
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>

            {/* Products Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredProducts.map((product) => (
                <button
                  key={product._id}
                  onClick={() => selectProduct(product)}
                  className="bg-white border-2 border-gray-200 rounded-xl p-4 hover:border-blue-600 hover:bg-blue-50 transition text-left"
                >
                  <h3 className="font-semibold mb-1">{product.name}</h3>
                  <p className="text-lg font-semibold text-blue-600">R$ {product.price.toFixed(2)}</p>
                </button>
              ))}
            </div>
            {filteredProducts.length === 0 && (
              <div className="text-center py-12 text-gray-500">Nenhum produto encontrado</div>
            )}
          </div>
          )}
        </div>

        {/* Summary Section */}
        <div className="space-y-6">
          {/* Pending Items Summary */}
          {pendingItems.length > 0 && (
            <div className="bg-blue-50 rounded-xl shadow-sm p-6 border-2 border-blue-200">
              <h2 className="font-semibold text-lg mb-4 text-blue-900">Novos Itens</h2>
              <div className="space-y-3 mb-4 max-h-60 overflow-y-auto">
                {pendingItems.map((item) => (
                  <div key={item.key} className="bg-white rounded-lg p-3 flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{item.productName}</p>
                      {item.notes && <p className="text-xs text-orange-600 italic mt-0.5">{item.notes}</p>}
                      <p className="text-xs text-gray-500 mt-0.5">R$ {item.unitPrice.toFixed(2)}</p>
                    </div>
                    <button
                      onClick={() => removePendingItem(item.key)}
                      className="text-red-500 hover:bg-red-50 p-1 rounded flex-shrink-0"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>

              <div className="border-t border-blue-200 pt-4 mb-4">
                <div className="flex justify-between font-semibold mb-4">
                  <span>Total:</span>
                  <span>R$ {pendingSubtotal.toFixed(2)}</span>
                </div>
              </div>

              <button
                onClick={confirmAddItems}
                className="w-full bg-green-600 text-white px-4 py-3 rounded-lg hover:bg-green-700 transition font-medium"
              >
                Confirmar e Adicionar
              </button>
            </div>
          )}

          {/* Order Summary */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="font-semibold text-lg mb-4">Resumo Total</h2>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Subtotal</span>
                <span>R$ {order.subtotal.toFixed(2)}</span>
              </div>
              {order.discount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Desconto</span>
                  <span>- R$ {order.discount.toFixed(2)}</span>
                </div>
              )}
              {order.deliveryFee > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Taxa de Entrega</span>
                  <span>R$ {order.deliveryFee.toFixed(2)}</span>
                </div>
              )}
              <div className="border-t border-gray-200 pt-3 flex justify-between font-semibold text-lg">
                <span>Total</span>
                <span>R$ {order.total.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Observações */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="font-semibold text-lg mb-4">Observações</h2>
            <textarea
              value={notes}
              onChange={(e) => updateNotes(e.target.value)}
              placeholder="Adicione observações sobre o pedido..."
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              rows={3}
            />
          </div>

          {/* Actions */}
          {!order.paid && (
            <div className="space-y-3">
              <button
                onClick={() => setShowPaymentModal(true)}
                className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition flex items-center justify-center gap-2"
              >
                <ArrowLeft size={20} />
                <span>Fechar Pedido</span>
              </button>
              <button
                onClick={cancelOrder}
                className="w-full bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 transition flex items-center justify-center gap-2"
              >
                <XCircle size={20} />
                <span>Cancelar Pedido</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Product Modal */}
      {selectedProduct && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between mb-1">
                <h2 className="text-xl font-semibold">{selectedProduct.name}</h2>
                <button
                  onClick={() => setSelectedProduct(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircle size={24} />
                </button>
              </div>

              <p className="text-lg font-semibold text-blue-600 mt-2">
                R$ {selectedProduct.price.toFixed(2)}
              </p>
            </div>

            <div className="p-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Observações (opcional)
              </label>
              <textarea
                value={productNotes}
                onChange={(e) => setProductNotes(e.target.value)}
                placeholder="Ex: sem cebola, bem passado, molho à parte..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                rows={3}
                autoFocus
              />
            </div>

            <div className="border-t border-gray-200 p-6 flex gap-3">
              <button
                onClick={() => setSelectedProduct(null)}
                className="flex-1 px-4 py-3 rounded-lg border-2 border-gray-200 hover:bg-gray-50 transition font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={() => confirmProduct(selectedProduct)}
                className="flex-1 px-4 py-3 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition font-medium flex items-center justify-center gap-2"
              >
                <Plus size={20} />
                <span>Adicionar</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && order && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6">
            {(() => {
              const isDelivery = order.type === 'delivery';
              const appliedDeliveryFee = isDelivery ? deliveryFee : 0;

              return (
                <>
            <h2 className="text-xl font-semibold mb-2">Forma de Pagamento</h2>
            <div className="text-sm text-gray-600 mb-4 space-y-1">
              <p>
                Subtotal:{' '}
                <span className="font-semibold text-gray-900">R$ {order.subtotal.toFixed(2)}</span>
              </p>
              {isDelivery && (
                <p>
                  Taxa de Entrega:{' '}
                  <span className="font-semibold text-gray-900">R$ {appliedDeliveryFee.toFixed(2)}</span>
                </p>
              )}
              <p>
                Total:{' '}
                <span className="font-semibold text-gray-900">
                  R$ {(order.subtotal + appliedDeliveryFee).toFixed(2)}
                </span>
              </p>
            </div>

            {isDelivery && (
              <div className="mb-4">
                <label htmlFor="modalDeliveryFee" className="block text-sm font-medium text-gray-700 mb-2">
                  Taxa de Entrega (R$)
                </label>
                <input
                  id="modalDeliveryFee"
                  type="number"
                  min="0"
                  step="1"
                  value={deliveryFee}
                  onChange={(e) => setDeliveryFee(parseIntegerCurrency(e.target.value))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
              </div>
            )}

            <div className="space-y-3">
              {[
                { value: 'dinheiro', label: '💵 Dinheiro' },
                { value: 'pix', label: '📲 Pix' },
                { value: 'cartao', label: '💳 Cartão' },
              ].map((method) => (
                <button
                  key={method.value}
                  onClick={() => handleCheckout(method.value as PaymentMethod)}
                  disabled={paymentLoading}
                  className="w-full py-3 px-4 rounded-xl border-2 border-gray-200 hover:border-blue-500 hover:bg-blue-50 transition text-left font-medium text-gray-800 disabled:opacity-50"
                >
                  {method.label}
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowPaymentModal(false)}
              disabled={paymentLoading}
              className="mt-4 w-full py-2 text-sm text-gray-500 hover:text-gray-700"
            >
              Cancelar
            </button>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* Print Ticket for New Items */}
      {order && itemsToPrint.length > 0 && (
        <div>
          <PrintTicket order={order} type="kitchen" itemsToPrint={itemsToPrint} />
        </div>
      )}

      {/* Print Full Order on Close */}
      {order && printFull && (
        <div>
          <PrintTicket order={order} type="kitchen" />
        </div>
      )}
    </div>
  );
}
