'use client';
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { LayoutDashboard, Settings, LogOut, User, History } from 'lucide-react';
import { getMe, logout } from '@/lib/api';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isAdmin, setIsAdmin] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    getMe().then(res => {
      if (res.data.role === 'admin') setIsAdmin(true);
      setChecked(true);
    }).catch(() => {
      if (pathname.startsWith('/dashboard/admin')) {
        setChecked(true);
      } else {
        router.replace('/auth');
      }
    });
  }, []);

  const handleLogout = async () => {
    const refreshToken = localStorage.getItem('refresh_token');
    if (refreshToken) {
      try { await logout(refreshToken); } catch {}
    }
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    window.location.href = '/auth';
  };

  const navItems = [
    { label: 'Create Requirements', icon: LayoutDashboard, href: '/dashboard' },
    { label: 'My Sessions', icon: History, href: '/dashboard/history' },
    { label: 'My Profile', icon: User, href: '/dashboard/profile' },
    ...(isAdmin ? [{ label: 'Admin', icon: Settings, href: '/dashboard/admin' }] : []),
  ];

  if (!checked) return null;

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <div className="w-64 flex flex-col justify-between py-8 px-4" style={{ background: '#1E2A4A' }}>
        <div>
          <div className="text-white font-bold text-xl px-4 mb-8">
            Requirements<br />Tool
          </div>
          <nav className="flex flex-col gap-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = pathname === item.href
                || (item.href !== '/dashboard' && pathname.startsWith(item.href));
              return (
                <button
                  key={item.href}
                  onClick={() => {
                    if (pathname === item.href) {
                      window.location.href = item.href;
                    } else {
                      router.push(item.href);
                    }
                  }}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all"
                  style={{
                    background: active ? '#FF6B6B' : 'transparent',
                    color: active ? 'white' : '#94A3B8',
                  }}
                >
                  <Icon size={18} />
                  {item.label}
                </button>
              );
            })}
          </nav>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all"
          style={{ color: '#94A3B8' }}
        >
          <LogOut size={18} />
          Logout
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        {children}
      </div>
    </div>
  );
}
