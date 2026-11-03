'use client';
import { useEffect, useState } from 'react';
import { getUsers, toggleUser } from '@/lib/api';

type Toast = { type: 'success' | 'error'; message: string } | null;

interface UserRow {
  id: string;
  full_name: string;
  email: string;
  role: string;
  is_active: boolean;
  created_at: string | null;
  last_login: string | null;
  sessions_count: number;
}

export default function UsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);
  const [toast, setToast] = useState<Toast>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = () => {
    setLoading(true);
    getUsers().then(res => setUsers(res.data)).finally(() => setLoading(false));
  };

  const handleToggle = async (id: string) => {
    setToggling(id);
    try {
      const res = await toggleUser(id);
      setUsers(prev => prev.map(u => u.id === id ? { ...u, is_active: res.data.is_active } : u));
    } catch (err: any) {
      const msg = err?.response?.data?.detail ?? 'Failed to update user';
      setToast({ type: 'error', message: msg });
      setTimeout(() => setToast(null), 4000);
    } finally {
      setToggling(null);
    }
  };

  const fmt = (iso: string | null) =>
    iso ? new Date(iso).toLocaleDateString() : '—';

  return (
    <>
      {toast && (
        <div className={`fixed top-6 right-6 z-50 px-5 py-3 rounded-xl shadow-lg text-white text-sm font-medium ${toast.type === 'error' ? 'bg-red-500' : 'bg-green-500'}`}>
          {toast.message}
        </div>
      )}
      <h1 className="text-2xl font-bold mb-1" style={{ color: '#1E2A4A' }}>Users</h1>
      <p className="text-gray-500 mb-6">Manage registered users</p>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-8 h-8 border-4 border-gray-200 rounded-full animate-spin" style={{ borderTopColor: '#FF6B6B' }} />
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                {['Name', 'Email', 'Role', 'Sessions', 'Joined', 'Last Login', 'Status', ''].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-800">{u.full_name}</td>
                  <td className="px-4 py-3 text-gray-500">{u.email}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium"
                      style={{
                        background: u.role === 'admin' ? '#1E2A4A18' : '#F3F4F6',
                        color: u.role === 'admin' ? '#1E2A4A' : '#6B7280',
                      }}>
                      {u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{u.sessions_count}</td>
                  <td className="px-4 py-3 text-gray-500">{fmt(u.created_at)}</td>
                  <td className="px-4 py-3 text-gray-500">{fmt(u.last_login)}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium"
                      style={{
                        background: u.is_active ? '#4CAF5018' : '#FF6B6B18',
                        color: u.is_active ? '#4CAF50' : '#FF6B6B',
                      }}>
                      {u.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleToggle(u.id)}
                      disabled={toggling === u.id}
                      className="px-3 py-1 rounded-full text-xs font-medium transition-all hover:opacity-80"
                      style={{
                        background: u.is_active ? '#FF6B6B18' : '#4CAF5018',
                        color: u.is_active ? '#FF6B6B' : '#4CAF50',
                      }}
                    >
                      {toggling === u.id ? '...' : u.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {users.length === 0 && (
            <p className="text-center text-gray-400 py-12">No users found</p>
          )}
        </div>
      )}
    </>
  );
}
