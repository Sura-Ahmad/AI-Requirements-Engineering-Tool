'use client';
import { useEffect, useState } from 'react';
import { Users, List, FileText, UserCheck } from 'lucide-react';
import { getStats } from '@/lib/api';

interface Stats {
  total_users: number;
  total_sessions: number;
  total_requirements: number;
  active_users_count: number;
}

const cards = [
  { key: 'total_users', label: 'Total Users', icon: Users, color: '#1E2A4A' },
  { key: 'total_sessions', label: 'Total Sessions', icon: List, color: '#FF6B6B' },
  { key: 'total_requirements', label: 'Requirements', icon: FileText, color: '#4CAF50' },
  { key: 'active_users_count', label: 'Active Users', icon: UserCheck, color: '#3498DB' },
] as const;

export default function AdminOverview() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getStats().then(res => setStats(res.data)).finally(() => setLoading(false));
  }, []);

  return (
    <>
      <h1 className="text-2xl font-bold mb-1" style={{ color: '#1E2A4A' }}>Overview</h1>
      <p className="text-gray-500 mb-8">System statistics at a glance</p>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-8 h-8 border-4 border-gray-200 rounded-full animate-spin" style={{ borderTopColor: '#FF6B6B' }} />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-5">
          {cards.map(({ key, label, icon: Icon, color }) => (
            <div key={key} className="bg-white rounded-2xl border border-gray-100 p-6 flex items-center gap-5">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: `${color}18` }}>
                <Icon size={22} style={{ color }} />
              </div>
              <div>
                <p className="text-3xl font-bold" style={{ color: '#1E2A4A' }}>
                  {stats?.[key] ?? 0}
                </p>
                <p className="text-sm text-gray-500 mt-0.5">{label}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
