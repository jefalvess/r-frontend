import type { Order, OrderItem } from '../types';

interface PrintTicketProps {
  order: Order;
  type: 'kitchen' | 'customer';
  itemsToPrint?: OrderItem[];
}

export function PrintTicket({ order, type, itemsToPrint }: PrintTicketProps) {
  const itemsToDisplay = itemsToPrint || order.items;
  return (
    <div className="hidden print:block max-w-md mx-auto p-8 font-mono">
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold mb-2">RESTAURANTE</h1>
        <p className="text-sm">{type === 'kitchen' ? 'PEDIDO COZINHA' : 'COMPROVANTE CLIENTE'}</p>
        {itemsToPrint && <p className="text-sm font-bold mt-2">NOVO ITEM ADICIONADO</p>}
      </div>

      <div className="border-t-2 border-b-2 border-black py-4 mb-4">
        <div className="flex justify-between mb-2">
          <span className="font-bold">Pedido:</span>
          <span>#{order.number}</span>
        </div>
        <div className="flex justify-between mb-2">
          <span className="font-bold">Cliente:</span>
          <span>{order.customerName}</span>
        </div>
        {order.tableNumber && (
          <div className="flex justify-between mb-2">
            <span className="font-bold">Mesa:</span>
            <span>{order.tableNumber}</span>
          </div>
        )}
        {order.customerAddress && type === 'customer' && (
          <div className="flex justify-between mb-2">
            <span className="font-bold">Endereço:</span>
            <span className="text-right">{order.customerAddress}</span>
          </div>
        )}
        <div className="flex justify-between">
          <span className="font-bold">Horário:</span>
          <span>{new Date(order.createdAt).toLocaleString('pt-BR')}</span>
        </div>
      </div>

      <div className="mb-4">
        <h2 className="font-bold mb-3">ITENS:</h2>
        {itemsToDisplay.map((item) => (
          <div key={item._id} className="mb-3">
            <div className="flex justify-between">
              <span>
                {item.quantity}x {item.productName}
              </span>
              {type === 'customer' && <span>R$ {item.total.toFixed(2)}</span>}
            </div>
            {item.notes && <p className="text-sm ml-4 mt-1">Obs: {item.notes}</p>}
          </div>
        ))}
      </div>

      {type === 'customer' && (
        <div className="border-t-2 border-black pt-4">
          <div className="flex justify-between mb-2">
            <span>Subtotal:</span>
            <span>R$ {order.subtotal.toFixed(2)}</span>
          </div>
          {order.discount > 0 && (
            <div className="flex justify-between mb-2">
              <span>Desconto:</span>
              <span>- R$ {order.discount.toFixed(2)}</span>
            </div>
          )}
          {order.deliveryFee > 0 && (
            <div className="flex justify-between mb-2">
              <span>Taxa Entrega:</span>
              <span>R$ {order.deliveryFee.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-lg border-t border-black pt-2">
            <span>TOTAL:</span>
            <span>R$ {order.total.toFixed(2)}</span>
          </div>
          {order.paymentMethod && (
            <div className="flex justify-between mt-2">
              <span>Pagamento:</span>
              <span className="uppercase">{order.paymentMethod}</span>
            </div>
          )}
        </div>
      )}

      {order.notes && (
        <div className="border-t border-black mt-4 pt-4">
          <p className="font-bold">Observações:</p>
          <p className="text-sm">{order.notes}</p>
        </div>
      )}

      <div className="text-center mt-6 pt-6 border-t border-black">
        <p className="text-sm">Obrigado pela preferência!</p>
      </div>
    </div>
  );
}
