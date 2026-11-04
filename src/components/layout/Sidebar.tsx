import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuthRole } from '@/contexts/AuthRoleContext';
import {
  LayoutDashboard,
  Users2,
  UserPlus,
  GraduationCap,
  BookOpen,
  CalendarDays,
  UserCheck,
  QrCode,
  FileSpreadsheet,
  Award,
  Wallet,
  Star,
  MessageSquare,
  FileCheck2,
  BarChart3,
  Archive,
  Building2,
  Sliders,
  ChevronLeft,
  ChevronRight,
  Shield,
  Laptop,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface SidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  onCloseMobile?: () => void;
}

interface NavItem {
  name: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  key: string;
  badge?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({ collapsed, onToggleCollapse, onCloseMobile }) => {
  const { currentRole, activeRoleConfig, isRolePermitted } = useAuthRole();

  const allNavItems: NavItem[] = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard, key: 'dashboard' },
    { name: 'CRM & Leads', path: '/crm', icon: Users2, key: 'crm', badge: '11 Leads' },
    { name: 'Students (SIS)', path: '/students', icon: GraduationCap, key: 'students' },
    { name: 'Attendance Scanner', path: '/attendance', icon: QrCode, key: 'attendance', badge: 'Live' },
    { name: 'Academic Programmes', path: '/academics', icon: BookOpen, key: 'academics' },
    { name: 'Batches & Timetables', path: '/timetable', icon: CalendarDays, key: 'timetable' },
    { name: 'Lecturers & Staff', path: '/lecturers', icon: UserCheck, key: 'lecturers' },
    { name: 'Learning (LMS)', path: '/lms', icon: Laptop, key: 'lms' },
    { name: 'Examinations', path: '/examinations', icon: FileSpreadsheet, key: 'examinations' },
    { name: 'Finance (LKR)', path: '/finance', icon: Wallet, key: 'finance' },
    { name: 'Evaluations', path: '/evaluations', icon: Star, key: 'evaluations' },
    { name: 'Certificates & Docs', path: '/certificates', icon: FileCheck2, key: 'certificates' },
    { name: 'Communications', path: '/communications', icon: MessageSquare, key: 'communications' },
    { name: 'Reports & Analytics', path: '/reports', icon: BarChart3, key: 'reports' },
    { name: 'Alumni Directory', path: '/alumni', icon: Archive, key: 'alumni' },
    { name: 'Support Tickets', path: '/tickets', icon: Award, key: 'tickets' },
    { name: 'Campus Operations', path: '/campus-admin', icon: Building2, key: 'campus-admin' },
    { name: 'Settings & RBAC', path: '/settings', icon: Sliders, key: 'settings' },
  ];

  // Specific role portal shortcuts
  const portalItems: NavItem[] = [
    { name: 'Student Portal', path: '/portal/student', icon: GraduationCap, key: 'student_portal' },
    { name: 'Parent Portal', path: '/portal/parent', icon: Users2, key: 'parent_portal' },
    { name: 'Lecturer Portal', path: '/portal/lecturer', icon: UserCheck, key: 'lecturer_portal' },
  ];

  const visibleMainItems = allNavItems.filter((item) => isRolePermitted(item.key));
  const visiblePortalItems = portalItems.filter((item) => isRolePermitted(item.key));

  return (
    <aside
      className={`relative h-full flex flex-col bg-card border-r border-border transition-all duration-300 z-30 select-none ${
        collapsed ? 'w-16' : 'w-64'
      }`}
    >
      {/* Brand Header */}
      <div className="h-16 flex items-center justify-between px-3 border-b border-border shrink-0">
        <div className="flex items-center gap-2.5 overflow-hidden">
          <div className="w-9 h-9 rounded-lg bg-primary text-primary-foreground flex items-center justify-center font-serif font-bold text-base shadow-sm shrink-0">
            E
          </div>
          {!collapsed && (
            <div className="flex flex-col min-w-0">
              <span className="font-serif font-bold text-sm tracking-tight text-foreground truncate">
                ESOL PREMIER
              </span>
              <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-mono">
                CAMPUS SRI LANKA
              </span>
            </div>
          )}
        </div>
        {!collapsed && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleCollapse}
            className="h-7 w-7 text-muted-foreground hover:text-foreground hidden md:flex"
            title="Collapse Sidebar"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Role Pill Indicator */}
      {!collapsed && (
        <div className="px-3 py-2 bg-muted/40 border-b border-border/60 flex items-center justify-between">
          <div className="flex items-center gap-1.5 truncate">
            <Shield className="w-3.5 h-3.5 text-primary shrink-0" />
            <span className="text-[11px] font-medium text-foreground truncate">
              {activeRoleConfig.label}
            </span>
          </div>
          <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 border-primary/30 text-primary">
            {activeRoleConfig.badge}
          </Badge>
        </div>
      )}

      {/* Navigation List */}
      <div className="flex-1 overflow-y-auto px-2 py-3 space-y-1">
        {visiblePortalItems.length > 0 && (
          <div className="mb-3">
            {!collapsed && (
              <div className="px-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Dedicated Portals
              </div>
            )}
            {visiblePortalItems.map((item) => (
              <NavLink
                key={item.key}
                to={item.path}
                onClick={onCloseMobile}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-2.5 py-2 rounded-md text-xs font-medium transition-colors ${
                    isActive
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-foreground/80 hover:bg-muted hover:text-foreground'
                  }`
                }
              >
                <item.icon className="w-4 h-4 shrink-0" />
                {!collapsed && <span className="truncate">{item.name}</span>}
              </NavLink>
            ))}
            <div className="my-2 border-b border-border" />
          </div>
        )}

        {!collapsed && (
          <div className="px-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Academic Modules
          </div>
        )}

        <TooltipProvider delayDuration={150}>
          {visibleMainItems.map((item) => {
            const Icon = item.icon;
            const content = (
              <NavLink
                key={item.key}
                to={item.path}
                onClick={onCloseMobile}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-2.5 py-2 rounded-md text-xs font-medium transition-all group ${
                    isActive
                      ? 'bg-primary/10 text-primary font-semibold border-l-2 border-primary'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`
                }
              >
                <Icon className="w-4 h-4 shrink-0 transition-transform group-hover:scale-105" />
                {!collapsed && (
                  <div className="flex-1 flex items-center justify-between truncate">
                    <span className="truncate">{item.name}</span>
                    {item.badge && (
                      <Badge
                        variant="secondary"
                        className="text-[9px] px-1 py-0 h-4 font-normal bg-muted text-muted-foreground"
                      >
                        {item.badge}
                      </Badge>
                    )}
                  </div>
                )}
              </NavLink>
            );

            if (collapsed) {
              return (
                <Tooltip key={item.key}>
                  <TooltipTrigger asChild>{content}</TooltipTrigger>
                  <TooltipContent side="right" className="text-xs">
                    {item.name}
                  </TooltipContent>
                </Tooltip>
              );
            }

            return content;
          })}
        </TooltipProvider>
      </div>

      {/* Collapsed expand button at bottom */}
      {collapsed && (
        <div className="p-2 border-t border-border flex justify-center">
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleCollapse}
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            title="Expand Sidebar"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </aside>
  );
};
