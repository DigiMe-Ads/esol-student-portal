import React from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { ShieldOff } from 'lucide-react';
import { useAuthRole } from '@/contexts/AuthRoleContext';
import { homePathFor } from '@/routes';
import { Button } from '@/components/ui/button';

// Blocks pages the active role may not open. The dashboard ("/") quietly forwards a role to its
// own home page; any other page shows an explanation instead of the content.
export const RequireNav: React.FC<{ navKey: string; children: React.ReactNode }> = ({ navKey, children }) => {
  const { isRolePermitted, activeRoleConfig } = useAuthRole();
  const navigate = useNavigate();

  if (isRolePermitted(navKey)) return <>{children}</>;

  const home = homePathFor(isRolePermitted);
  if (navKey === 'dashboard' && home !== '/') return <Navigate to={home} replace />;

  return (
    <div className="flex flex-col items-center justify-center text-center py-24 gap-3">
      <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
        <ShieldOff className="w-6 h-6 text-muted-foreground" />
      </div>
      <h1 className="text-lg font-serif font-bold text-foreground">No access to this page</h1>
      <p className="text-xs text-muted-foreground max-w-sm">
        The {activeRoleConfig.label} role can't open this module. Ask a Super Admin if you need access.
      </p>
      <Button size="sm" onClick={() => navigate(home)}>Go to my home page</Button>
    </div>
  );
};
