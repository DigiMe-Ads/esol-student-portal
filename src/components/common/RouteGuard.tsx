import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

interface RouteGuardProps {
  children: React.ReactNode;
}

// Everything except the login screen needs a signed-in portal account.
const PUBLIC_ROUTES = ['/login'];

export function RouteGuard({ children }: RouteGuardProps) {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isPublic = PUBLIC_ROUTES.includes(location.pathname);

  useEffect(() => {
    if (loading) return;
    if (!user && !isPublic) {
      navigate('/login', { state: { from: location.pathname }, replace: true });
    }
  }, [user, loading, isPublic, location.pathname, navigate]);

  if (loading || (!user && !isPublic)) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return <>{children}</>;
}
