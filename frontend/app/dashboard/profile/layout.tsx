'use client';
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { User, Lock } from 'lucide-react';
import { getMyProfile } from '@/lib/api';

interface Profile {
  id: string;
  full_name: string;
  email: string;
  role: string;
}

const TABS = [
  { label: 'Edit Profile', icon: User, href: '/dashboard/profile' },
  { label: 'Change Password', icon: Lock, href: '/dashboard/profile/change-password' },
];

const ROLE_COLORS: Record<string, string> = {
  admin: '#FF6B6B',
  user: '#4CAF50',
};

function getInitials(name: string) {
  return name.split(' ').map(p => p[0]).join('').toUpperCase().slice(0, 2);
}

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    getMyProfile().then(res => setProfile(res.data)).catch(() => router.replace('/auth'));
  }, []);

  useEffect(() => {
    getMyProfile().then(res => setProfile(res.data)).catch(() => {});
  }, [pathname]);

  useEffect(() => {
    const handler = () => getMyProfile().then(res => setProfile(res.data)).catch(() => {});
    window.addEventListener('profile-updated', handler);
    return () => window.removeEventListener('profile-updated', handler);
  }, []);

  return (
    <div className="min-h-screen p-6 md:p-8" style={{ background: '#F8FAFC' }}>
      <div className="max-w-4xl mx-auto">

        {/* Header card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6 flex items-center gap-5">
          {/* Avatar */}
          <div className="relative flex-shrink-0">
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center text-white text-2xl font-bold"
              style={{ background: 'linear-gradient(135deg, #1E2A4A 0%, #FF6B6B 100%)' }}
            >
              {profile ? getInitials(profile.full_name) : '…'}
            </div>
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold truncate" style={{ color: '#1E2A4A' }}>
              {profile?.full_name ?? '…'}
            </h1>
            <p className="text-sm text-gray-500 truncate">{profile?.email ?? '…'}</p>
            {profile && (
              <span
                className="inline-block mt-1 px-2 py-0.5 rounded-lg text-xs font-semibold text-white capitalize"
                style={{ background: ROLE_COLORS[profile.role] ?? '#6B7280' }}
              >
                {profile.role}
              </span>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-white rounded-2xl shadow-sm border border-gray-100 p-1.5 mb-6">
          {TABS.map(tab => {
            const Icon = tab.icon;
            const active = pathname === tab.href;
            return (
              <button
                key={tab.href}
                onClick={() => router.push(tab.href)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium flex-1 justify-center transition-all"
                style={{
                  background: active ? '#FF6B6B' : 'transparent',
                  color: active ? 'white' : '#6B7280',
                }}
              >
                <Icon size={15} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Page content */}
        {children}
      </div>
    </div>
  );
}
