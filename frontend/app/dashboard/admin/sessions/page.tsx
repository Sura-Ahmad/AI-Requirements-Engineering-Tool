'use client';
import { useEffect, useState } from 'react';
import { getSessions } from '@/lib/api';

interface SessionRow {
  id: string;
  user_name: string;
  user_email: string;
  domain_name: string;
  country: string;
  role: string;
  created_at: string | null;
  requirements_count: number;
}

export default function SessionsPage() {
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getSessions().then(res => setSessions(res.data)).finally(() => setLoading(false));
  }, []);

  const fmt = (iso: string | null) =>
    iso ? new Date(iso).toLocaleString() : '—';

  return (
    <>
      <h1 className="text-2xl font-bold mb-1" style={{ color: '#1E2A4A' }}>Sessions</h1>
      <p className="text-gray-500 mb-6">All user sessions across the system</p>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-8 h-8 border-4 border-gray-200 rounded-full animate-spin" style={{ borderTopColor: '#FF6B6B' }} />
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                {['User', 'Domain', 'Country', 'Role', 'Requirements', 'Created', ''].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sessions.map(s => (
                <tr key={s.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-800">{s.user_name}</p>
                    <p className="text-gray-400 text-xs">{s.user_email}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{s.domain_name}</td>
                  <td className="px-4 py-3 text-gray-500 uppercase text-xs">{s.country}</td>
                  <td className="px-4 py-3 text-gray-500 capitalize">{s.role.replace('_', ' ')}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium"
                      style={{ background: '#1E2A4A18', color: '#1E2A4A' }}>
                      {s.requirements_count}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{fmt(s.created_at)}</td>
                  <td className="px-4 py-3">
                    <span className="font-mono text-xs text-gray-300">{s.id.slice(0, 8)}…</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {sessions.length === 0 && (
            <p className="text-center text-gray-400 py-12">No sessions found</p>
          )}
        </div>
      )}
    </>
  );
}
