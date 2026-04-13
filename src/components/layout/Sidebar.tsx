'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/providers/AuthProvider';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard, FolderKanban, CheckSquare, MessageSquare, Mail,
  Bell, Calendar, FileText, Users, BookOpen, AlertCircle,
  HelpCircle, Star, Clipboard, Link2, StickyNote, Settings,
  LogOut, ChevronDown, Briefcase, Shield,
} from 'lucide-react';
import { useState } from 'react';

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  roles?: string[];
  children?: NavItem[];
}

const navItems: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Projects', href: '/dashboard/projects', icon: FolderKanban },
  { label: 'Tasks', href: '/dashboard/tasks', icon: CheckSquare },
  {
    label: 'Messages', href: '/dashboard/messages', icon: MessageSquare,
    children: [
      { label: 'General Channel', href: '/dashboard/messages/general', icon: MessageSquare },
      { label: 'Direct Messages', href: '/dashboard/messages/direct', icon: MessageSquare },
    ],
  },
  { label: 'Memos', href: '/dashboard/memos', icon: Mail },
  { label: 'Notifications', href: '/dashboard/notifications', icon: Bell },
  { label: 'Leave', href: '/dashboard/leave', icon: Calendar },
  { label: 'Bookings', href: '/dashboard/bookings', icon: Calendar },
  { label: 'Resources', href: '/dashboard/resources', icon: FileText },
  { label: 'Technical Support', href: '/dashboard/support', icon: HelpCircle },
  { label: 'Complaints', href: '/dashboard/complaints', icon: AlertCircle },
  { label: 'Staff Complaints', href: '/dashboard/staff-complaints', icon: AlertCircle, roles: ['operations_manager', 'team_lead', 'staff', 'intern', 'project_manager'] },
  { label: 'Staff Queries', href: '/dashboard/queries', icon: HelpCircle },
  { label: 'Review Links', href: '/dashboard/review-links', icon: Link2 },
  { label: 'SOPs', href: '/dashboard/sops', icon: BookOpen },
  { label: 'Issue Reports', href: '/dashboard/issues', icon: AlertCircle },
  { label: 'Client Sentiment', href: '/dashboard/sentiment', icon: Star, roles: ['operations_manager', 'team_lead', 'project_manager', 'customer_support_officer'] },
  { label: 'Notes', href: '/dashboard/notes', icon: StickyNote },
  { label: 'Team', href: '/dashboard/team', icon: Users, roles: ['operations_manager', 'team_lead', 'project_manager'] },
  { label: 'Admin', href: '/dashboard/admin', icon: Shield, roles: ['operations_manager'] },
  { label: 'Settings', href: '/dashboard/settings', icon: Settings },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const filteredItems = navItems.filter((item) => {
    if (!item.roles) return true;
    return user?.role && item.roles.includes(user.role);
  });

  const isActive = (href: string) =>
    href === '/dashboard' ? pathname === href : pathname.startsWith(href);

  const toggleCollapse = (label: string) => {
    setCollapsed((prev) => ({ ...prev, [label]: !prev[label] }));
  };

  return (
    <aside className="flex flex-col w-64 min-h-screen bg-sidebar text-sidebar-foreground shrink-0">
      {/* Logo */}
      <div className="flex items-center gap-2 px-5 py-5 border-b border-sidebar-border">
        <Briefcase className="w-5 h-5 text-sidebar-primary-foreground" />
        <span className="font-bold text-lg tracking-tight">wcdigital</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        {filteredItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);

          if (item.children) {
            const open = !collapsed[item.label];
            return (
              <div key={item.href}>
                <button
                  onClick={() => toggleCollapse(item.label)}
                  className={cn(
                    'w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                    active
                      ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                      : 'hover:bg-sidebar-accent/60 text-sidebar-foreground/80'
                  )}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="flex-1 text-left">{item.label}</span>
                  <ChevronDown className={cn('w-3.5 h-3.5 transition-transform', open && 'rotate-180')} />
                </button>
                {open && (
                  <div className="ml-4 mt-0.5 space-y-0.5">
                    {item.children.map((child) => (
                      <Link
                        key={child.href}
                        href={child.href}
                        className={cn(
                          'flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors',
                          pathname === child.href
                            ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
                            : 'hover:bg-sidebar-accent/60 text-sidebar-foreground/70'
                        )}
                      >
                        {child.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                active
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                  : 'hover:bg-sidebar-accent/60 text-sidebar-foreground/80'
              )}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* User */}
      <div className="border-t border-sidebar-border p-3 space-y-1">
        <div className="flex items-center gap-2.5 px-2 py-1.5">
          <div className="w-7 h-7 rounded-full bg-sidebar-primary flex items-center justify-center text-xs font-bold text-sidebar-primary-foreground shrink-0">
            {(user?.first_name?.[0] ?? '') + (user?.last_name?.[0] ?? '')}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium truncate">{user?.first_name} {user?.last_name}</p>
            <p className="text-xs text-sidebar-foreground/60 capitalize truncate">{user?.role?.replace(/_/g, ' ')}</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs text-sidebar-foreground/70 hover:bg-sidebar-accent/60 transition-colors"
        >
          <LogOut className="w-3.5 h-3.5" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
