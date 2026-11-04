import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthRole, USER_ROLES } from '@/contexts/AuthRoleContext';
import { useAuth } from '@/contexts/AuthContext';
import type { UserRole } from '@/types/campus';
import {
  Search,
  Bell,
  Moon,
  Sun,
  Shield,
  Building,
  Menu,
  CheckCircle2,
  Calendar,
  LogOut,
  User,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { toast } from 'sonner';

interface TopHeaderProps {
  onOpenSearch: () => void;
  onOpenMobileMenu: () => void;
}

export const TopHeader: React.FC<TopHeaderProps> = ({ onOpenSearch, onOpenMobileMenu }) => {
  const { currentRole, setCurrentRole, canSwitchRole, activeRoleConfig, selectedCampusId, setSelectedCampusId } = useAuthRole();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const initials = (user?.display_name || 'EP')
    .split(/s+/)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const handleSignOut = async () => {
    await signOut();
    toast.info('Signed out of the portal.');
    navigate('/login', { replace: true });
  };
  const [isDark, setIsDark] = useState<boolean>(() => {
    return document.documentElement.classList.contains('dark');
  });

  const toggleTheme = () => {
    const next = !isDark;
    setIsDark(next);
    if (next) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const handleRoleChange = (role: UserRole) => {
    setCurrentRole(role);
    toast.success(`Switched role to: ${USER_ROLES.find((r) => r.id === role)?.label}`);
  };

  return (
    <header className="h-16 bg-card border-b border-border px-4 flex items-center justify-between gap-3 shrink-0 z-20">
      {/* Left: Mobile hamburger & Global Search Button */}
      <div className="flex items-center gap-2 flex-1 max-w-md">
        <Button
          variant="ghost"
          size="icon"
          onClick={onOpenMobileMenu}
          className="md:hidden h-9 w-9 text-foreground shrink-0"
        >
          <Menu className="h-5 w-5" />
        </Button>

        <button
          type="button"
          onClick={onOpenSearch}
          className="flex items-center gap-2.5 w-full bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-lg border border-border/80 text-xs transition-colors text-left"
        >
          <Search className="w-4 h-4 shrink-0 text-muted-foreground" />
          <span className="truncate">Search students (EPC-...), inquiries, modules...</span>
          <kbd className="hidden sm:inline-flex ml-auto text-[10px] bg-background px-1.5 py-0.5 rounded border border-border font-mono text-muted-foreground">
            ⌘K
          </kbd>
        </button>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2">
        {/* Campus Filter */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="hidden sm:flex text-xs h-8 gap-1.5 border-border">
              <Building className="w-3.5 h-3.5 text-muted-foreground" />
              <span>
                {selectedCampusId === 'all'
                  ? 'All Campuses'
                  : selectedCampusId === 'colombo'
                  ? 'Colombo City'
                  : selectedCampusId === 'kandy'
                  ? 'Kandy Hill'
                  : 'Galle Coastal'}
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="text-xs">
            <DropdownMenuLabel>Select Operational Campus</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setSelectedCampusId('all')}>
              All Campuses (Consolidated)
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setSelectedCampusId('colombo')}>
              Colombo City Campus (Headquarters)
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setSelectedCampusId('kandy')}>
              Kandy Hill Campus
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setSelectedCampusId('galle')}>
              Galle Coastal Centre
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* User Role Switcher Pill (Super Admin only; other accounts are fixed to their role) */}
        {!canSwitchRole ? (
          <Badge variant="outline" className="text-xs h-8 gap-1.5 border-primary/30 bg-primary/5 text-primary font-semibold">
            <Shield className="w-3.5 h-3.5" />
            <span className="max-w-[110px] truncate">{activeRoleConfig.label}</span>
          </Badge>
        ) : (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="text-xs h-8 gap-1.5 border-primary/30 bg-primary/5 text-primary hover:bg-primary/10"
            >
              <Shield className="w-3.5 h-3.5" />
              <span className="font-semibold max-w-[110px] truncate">{activeRoleConfig.label}</span>
              <Badge variant="secondary" className="text-[9px] px-1 py-0 h-4 hidden lg:inline-flex">
                Role Switch
              </Badge>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64 text-xs">
            <DropdownMenuLabel className="font-bold flex items-center justify-between">
              <span>Role-Based Access Control</span>
              <span className="text-[10px] text-muted-foreground font-normal">11 Roles</span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {USER_ROLES.map((role) => (
              <DropdownMenuItem
                key={role.id}
                onClick={() => handleRoleChange(role.id)}
                className="flex items-center justify-between py-2 cursor-pointer"
              >
                <div className="flex flex-col">
                  <span className="font-medium text-foreground">{role.label}</span>
                  <span className="text-[10px] text-muted-foreground line-clamp-1">{role.description}</span>
                </div>
                {currentRole === role.id && <CheckCircle2 className="w-4 h-4 text-primary shrink-0 ml-2" />}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        )}

        {/* Notifications Popover */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 relative text-muted-foreground hover:text-foreground">
              <Bell className="w-4 h-4" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-destructive" />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-80 p-0 text-xs">
            <div className="p-3 border-b border-border flex items-center justify-between">
              <span className="font-bold text-foreground">Campus Alerts & Updates</span>
              <Badge variant="outline" className="text-[10px]">3 New</Badge>
            </div>
            <div className="divide-y divide-border max-h-64 overflow-y-auto">
              <div className="p-3 hover:bg-muted/40 cursor-pointer">
                <div className="font-semibold text-foreground">Verified Registration Payment</div>
                <div className="text-[11px] text-muted-foreground mt-0.5">
                  LKR 75,000 received for Student EPC-2026-00001 (DPEC Term 1).
                </div>
                <div className="text-[9px] text-muted-foreground mt-1">10 minutes ago</div>
              </div>
              <div className="p-3 hover:bg-muted/40 cursor-pointer">
                <div className="font-semibold text-foreground">Late Attendance Flag</div>
                <div className="text-[11px] text-muted-foreground mt-0.5">
                  Student EPC-2026-00003 scanned late (+18 mins) in Hall 302.
                </div>
                <div className="text-[9px] text-muted-foreground mt-1">45 minutes ago</div>
              </div>
              <div className="p-3 hover:bg-muted/40 cursor-pointer">
                <div className="font-semibold text-foreground">Examination Sign-off Ready</div>
                <div className="text-[11px] text-muted-foreground mt-0.5">
                  Dr. Senanayake submitted marks for DPEC Term 1 module.
                </div>
                <div className="text-[9px] text-muted-foreground mt-1">2 hours ago</div>
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {/* Theme Toggle */}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleTheme}
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
          title="Toggle Light / Dark Mode"
        >
          {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
        </Button>

        {/* User Avatar Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex items-center gap-2 pl-1 rounded-full outline-none focus:ring-2 focus:ring-primary"
            >
              <div className="w-8 h-8 rounded-full bg-slate-800 text-amber-400 flex items-center justify-center font-bold text-xs border border-amber-400/40">
                {initials}
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 text-xs">
            <DropdownMenuLabel>
              <div className="font-bold text-foreground">{user?.display_name}</div>
              <div className="text-[10px] text-muted-foreground truncate">@{user?.username}</div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => toast.info('Academic Calendar: Year 2026 Term 1')}>
              <Calendar className="w-3.5 h-3.5 mr-2" />
              <span>Academic Year 2026</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => toast.success('Profile preferences loaded')}>
              <User className="w-3.5 h-3.5 mr-2" />
              <span>Campus Profile</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut}>
              <LogOut className="w-3.5 h-3.5 mr-2 text-destructive" />
              <span className="text-destructive">Sign Out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
};
