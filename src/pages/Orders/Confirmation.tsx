import { CheckCircle } from 'lucide-react';
import { Link, useParams } from 'react-router';

export function Confirmation() {
  const { _id } = useParams();

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-12 max-w-md w-full text-center">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="text-green-600" size={48} />
        </div>
        <h1 className="text-2xl font-semibold mb-4">Pagamento Confirmado!</h1>
        <p className="text-gray-600 mb-8">O pedido foi finalizado com sucesso.</p>
        <div className="space-y-3">
          <Link
            to={`/pedidos/${_id}`}
            className="block w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition"
          >
            Ver Pedido
          </Link>
          <Link
            to="/pedidos"
            className="block w-full bg-gray-200 text-gray-700 py-3 rounded-lg hover:bg-gray-300 transition"
          >
            Voltar para Pedidos
          </Link>
        </div>
      </div>
    </div>
  );
}
