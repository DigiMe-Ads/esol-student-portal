import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import IntersectObserver from '@/components/common/IntersectObserver';
import { RouteGuard } from '@/components/common/RouteGuard';
import { Toaster } from '@/components/ui/sonner';
import { AuthProvider } from '@/contexts/AuthContext';
import { AuthRoleProvider } from '@/contexts/AuthRoleContext';
import { LoginPage } from '@/pages/LoginPage';
import { VerifyCertificatePage } from '@/pages/VerifyCertificatePage';
import { routes } from './routes';

const App: React.FC = () => {
  return (
    <Router>
      <AuthProvider>
        <AuthRoleProvider>
          <IntersectObserver />
          <RouteGuard>
            <div className="flex flex-col min-h-screen">
              <main className="flex-grow">
                <Routes>
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/verify/:code" element={<VerifyCertificatePage />} />
                  {routes.map((route, index) => (
                    <Route
                      key={index}
                      path={route.path}
                      element={route.element}
                    />
                  ))}
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </main>
            </div>
          </RouteGuard>
          <Toaster position="top-right" richColors />
        </AuthRoleProvider>
      </AuthProvider>
    </Router>
  );
};

export default App;
