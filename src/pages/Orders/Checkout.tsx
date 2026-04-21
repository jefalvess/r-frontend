import { useEffect, useState, FormEvent } from 'react';
import { useParams, useNavigate } from 'react-router';
import { ArrowLeft, CreditCard, Banknote, Smartphone, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { ordersApi } from '../../services/api';
import type { Order, PaymentMethod } from '../../types';

const paymentMethods = [
  { value: 'dinheiro' as PaymentMethod, label: 'Dinheiro', icon: Banknote },
  { value: 'pix' as PaymentMethod, label: 'PIX', icon: Smartphone },
  { value: 'cartao' as PaymentMethod, label: 'Cartão', icon: CreditCard },
];

export function Checkout() {
  const { _id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('dinheiro');
  const [discount, setDiscount] = useState(0);
  const [deliveryFee, setDeliveryFee] = useState(0);
  const [processing, setProcessing] = useState(false);

  const parseIntegerCurrency = (value: string) => {
    const parsed = Number.parseInt(value, 10);
    if (Number.isNaN(parsed) || parsed < 0) return 0;
    return parsed;
  };

  useEffect(() => {
    loadOrder();
  }, [_id]);

  const loadOrder = async () => {
    setLoading(true);
    try {
      const data = await ordersApi.getById(_id!);
      setOrder(data);
      setDeliveryFee(0);
    } catch (error) {
      toast.error('Erro ao carregar pedido');
      navigate('/pedidos');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!order) return;

    const appliedDeliveryFee = order.type === 'delivery' ? deliveryFee : 0;

    setProcessing(true);
    try {
      await ordersApi.checkout(order._id, paymentMethod, discount, appliedDeliveryFee);
      navigate(`/pedidos/${order._id}/confirmacao`);
    } catch (error) {
      toast.error('Erro ao finalizar pagamento');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!order) return null;

  const isDelivery = order.type === 'delivery';
  const subtotal = order.subtotal;
  const appliedDeliveryFee = isDelivery ? deliveryFee : 0;
  const finalTotal = subtotal - discount + appliedDeliveryFee;

  return (
    <div className="p-4 lg:p-8 max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate(`/pedidos/${order._id}`)}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft size={20} />
          <span>Voltar para pedido</span>
        </button>
        <h1 className="text-2xl lg:text-3xl font-semibold mb-2">Fechar Conta</h1>
        <p className="text-gray-600">Pedido #{order.publicId ?? order.number} - {order.customerName}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Order Summary */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="font-semibold text-lg mb-4">Resumo do Pedido</h2>
          <div className="space-y-3 mb-4">
            {order.items.map((item) => (
              <div key={item._id} className="flex justify-between text-sm">
                <span className="text-gray-600">
                  {item.quantity}x {item.productName}
                </span>
                <span>R$ {item.total.toFixed(2)}</span>
              </div>
            ))}
          </div>
          <div className="border-t border-gray-200 pt-4 space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">Subtotal</span>
              <span>R$ {subtotal.toFixed(2)}</span>
            </div>
            {isDelivery && (
              <div className="flex justify-between">
                <span className="text-gray-600">Taxa de Entrega</span>
                <span>R$ {appliedDeliveryFee.toFixed(2)}</span>
              </div>
            )}
          </div>
        </div>

        {isDelivery && (
          <div className="bg-white rounded-xl shadow-sm p-6">
            <label htmlFor="deliveryFee" className="block text-sm font-medium text-gray-700 mb-2">
              Taxa de Entrega (R$)
            </label>
            <input
              id="deliveryFee"
              type="number"
              min="0"
              step="1"
              value={deliveryFee}
              onChange={(e) => setDeliveryFee(parseIntegerCurrency(e.target.value))}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              placeholder="0"
            />
          </div>
        )}

        {/* Discount */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <label htmlFor="discount" className="block text-sm font-medium text-gray-700 mb-2">
            Desconto (R$)
          </label>
          <input
            id="discount"
            type="number"
            min="0"
            max={subtotal}
            step="1"
            value={discount}
            onChange={(e) => {
              const nextDiscount = parseIntegerCurrency(e.target.value);
              setDiscount(Math.min(nextDiscount, Math.floor(subtotal)));
            }}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            placeholder="0"
          />
        </div>

        {/* Payment Method */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="font-semibold text-lg mb-4">Forma de Pagamento</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {paymentMethods.map((method) => {
              const Icon = method.icon;
              return (
                <button
                  key={method.value}
                  type="button"
                  onClick={() => setPaymentMethod(method.value)}
                  className={`p-6 rounded-xl border-2 transition flex flex-col items-center gap-3 ${
                    paymentMethod === method.value
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <Icon size={32} className={paymentMethod === method.value ? 'text-blue-600' : 'text-gray-600'} />
                  <span className={`font-medium ${paymentMethod === method.value ? 'text-blue-600' : ''}`}>
                    {method.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Total */}
        <div className="bg-blue-600 text-white rounded-xl shadow-lg p-6">
          <div className="flex justify-between items-center">
            <span className="text-lg">Total a Pagar</span>
            <span className="text-3xl font-semibold">R$ {finalTotal.toFixed(2)}</span>
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={processing}
          className="w-full bg-green-600 text-white py-4 rounded-xl hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition font-medium text-lg flex items-center justify-center gap-2"
        >
          <CheckCircle size={24} />
          <span>{processing ? 'Finalizando...' : 'Finalizar Pagamento'}</span>
        </button>
      </form>
    </div>
  );
}
