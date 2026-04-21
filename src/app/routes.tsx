import { useEffect, useState } from 'react';
import { createBrowserRouter, Navigate, Outlet, useNavigate, useLocation } from 'react-router';
import { ProtectedRoute } from '../components/ProtectedRoute';
import { Layout } from '../components/Layout';
import { useAuth } from '../contexts/AuthContext';
import { Login } from '../pages/Login';
import { OrdersList } from '../pages/Orders/OrdersList';
import { NewOrder } from '../pages/Orders/NewOrder';
import { OrderDetail } from '../pages/Orders/OrderDetail';
import { Checkout } from '../pages/Orders/Checkout';
import { Confirmation } from '../pages/Orders/Confirmation';
import { Products } from '../pages/Products';
import { Categories } from '../pages/Categories';
import { Reports } from '../pages/Reports';

// Root layout that handles GitHub Pages 404 redirects
function RootLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [hasHandledRedirect, setHasHandledRedirect] = useState(false);

  useEffect(() => {
    // Only check redirect on root path (/login is not root)
    if (location.pathname === '/login') return;
    
    if (!hasHandledRedirect) {
      const redirectPath = sessionStorage.getItem('redirectPath');
      if (redirectPath && redirectPath !== '/') {
        sessionStorage.removeItem('redirectPath');
        // Redirect immediately to the original path
        navigate(redirectPath, { replace: true });
      }
      setHasHandledRedirect(true);
    }
  }, [navigate, location.pathname, hasHandledRedirect]);

  return <Outlet />;
}

function AdminOnlyRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();

  if (user?.role !== 'admin') {
    return <Navigate to="/pedidos" replace />;
  }

  return <>{children}</>;
}

export const router = createBrowserRouter(
  [
    {
      element: <RootLayout />,
      children: [
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
              element: (
                <AdminOnlyRoute>
                  <Reports />
                </AdminOnlyRoute>
              ),
            },
          ],
        },
      ],
    },
  ],
  {
    basename: import.meta.env.BASE_URL,
  },
);
