import { createBrowserRouter } from 'react-router';
import { ProtectedRoute } from '../components/ProtectedRoute';
import { Layout } from '../components/Layout';
import { Login } from '../pages/Login';
import { OrdersList } from '../pages/Orders/OrdersList';
import { NewOrder } from '../pages/Orders/NewOrder';
import { OrderDetail } from '../pages/Orders/OrderDetail';
import { Checkout } from '../pages/Orders/Checkout';
import { Confirmation } from '../pages/Orders/Confirmation';
import { Products } from '../pages/Products';
import { Categories } from '../pages/Categories';
import { Reports } from '../pages/Reports';

export const router = createBrowserRouter(
  [
    {
      path: '/login',
      element: <Login />,
    },
    {
      path: '/',
      element: (
        <ProtectedRoute>
          <Layout />
        </ProtectedRoute>
      ),
      children: [
        {
          index: true,
          element: <OrdersList />,
        },
        {
          path: 'pedidos',
          element: <OrdersList />,
        },
        {
          path: 'pedidos/novo',
          element: <NewOrder />,
        },
        {
          path: 'pedidos/:_id',
          element: <OrderDetail />,
        },
        {
          path: 'pedidos/:_id/checkout',
          element: <Checkout />,
        },
        {
          path: 'pedidos/:_id/confirmacao',
          element: <Confirmation />,
        },
        {
          path: 'produtos',
          element: <Products />,
        },
        {
          path: 'categorias',
          element: <Categories />,
        },
        {
          path: 'relatorios',
          element: <Reports />,
        },
      ],
    },
  ],
  {
    basename: import.meta.env.BASE_URL,
  },
);
