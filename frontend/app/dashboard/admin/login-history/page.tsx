'use client';
import { useEffect, useState } from 'react';
import { Shield, AlertTriangle, CheckCircle, XCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { getLoginHistory, getFailedAttempts } from '@/lib/api';

interface LoginEntry {
  id: string;
  user_id: string | null;
  email_attempted: string;
  success: boolean;
  failure_reason: string | null;
  created_at: string;
}

interface PageData {
  items: LoginEntry[];
  total: number;
  page: number;
  pages: number;
}

interface FailedAttempt {
  email: string;
  attempts: number;
  last_attempt: string;
}

const FAILURE_LABELS: Record<string, string> = {
  user_not_found: 'User Not Found',
  wrong_password: 'Wrong Password',
  account_disabled: 'Account Disabled',
};

export default function LoginHistoryPage() {
  const [data, setData] = useState<PageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [failedAttempts, setFailedAttempts] = useState<FailedAttempt[]>([]);
  const [suspiciousLoading, setSuspiciousLoading] = useState(true);

  const [filterEmail, setFilterEmail] = useState('');
  const [filterSuccess, setFilterSuccess] = useState<string>('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');

  const fetchData = async (p = page) => {
    setLoading(true);
    try {
      const params: Record<string, unknown> = { page: p, limit: 20 };
      if (filterEmail) params.email = filterEmail;
      if (filterSuccess !== '') params.success = filterSuccess === 'true';
      if (filterDateFrom) params.date_from = filterDateFrom;
      if (filterDateTo) params.date_to = filterDateTo;
      const res = await getLoginHistory(params);
      setData(res.data);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  const fetchSuspicious = async () => {
    setSuspiciousLoading(true);
    try {
      const res = await getFailedAttempts();
      setFailedAttempts(res.data);
    } catch {
      setFailedAttempts([]);
    } finally {
      setSuspiciousLoading(false);
    }
  };

  useEffect(() => {
    fetchSuspicious();
  }, []);

  useEffect(() => {
    fetchData(page);
  }, [page]);

  const handleFilter = () => {
    setPage(1);
    fetchData(1);
  };

  const handleReset = () => {
    setFilterEmail('');
    setFilterSuccess('');
    setFilterDateFrom('');
    setFilterDateTo('');
    setPage(1);
    setTimeout(() => fetchData(1), 0);
  };

  const hasSuspicious = failedAttempts.some(a => a.attempts > 5);

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: '#FFF0F0' }}>
          <Shield size={20} style={{ color: '#FF6B6B' }} />
        </div>
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#1E2A4A' }}>Login History</h1>
          <p className="text-sm text-gray-500">Monitor authentication attempts and detect suspicious activity</p>
        </div>
      </div>

      {/* Suspicious Activity Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle size={16} style={{ color: hasSuspicious ? '#FF6B6B' : '#F59E0B' }} />
          <h2 className="font-semibold text-sm" style={{ color: '#1E2A4A' }}>
            Suspicious Activity — Last 24 Hours
          </h2>
        </div>

        {suspiciousLoading ? (
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <div className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#FF6B6B', borderTopColor: 'transparent' }} />
            Loading...
          </div>
        ) : failedAttempts.length === 0 ? (
          <div className="flex items-center gap-2 text-sm" style={{ color: '#4CAF50' }}>
            <CheckCircle size={16} />
            No failed login attempts in the last 24 hours.
          </div>
        ) : (
          <>
            {hasSuspicious && (
              <div className="flex items-center gap-2 mb-3 px-3 py-2 rounded-xl text-sm font-medium" style={{ background: '#FFF0F0', color: '#FF6B6B' }}>
                <AlertTriangle size={15} />
                Warning: One or more emails have more than 5 failed attempts — possible brute force attack.
              </div>
            )}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    <th className="text-left py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider pr-6">Email</th>
                    <th className="text-left py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider pr-6">Failed Attempts</th>
                    <th className="text-left py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">Last Attempt</th>
                  </tr>
                </thead>
                <tbody>
                  {failedAttempts.map(a => (
                    <tr key={a.email} className="border-t border-gray-50">
                      <td className="py-2 pr-6 font-medium" style={{ color: '#1E2A4A' }}>{a.email}</td>
                      <td className="py-2 pr-6">
                        <span
                          className="px-2 py-0.5 rounded-lg text-xs font-bold text-white"
                          style={{ background: a.attempts > 5 ? '#FF6B6B' : '#F59E0B' }}
                        >
                          {a.attempts}
                        </span>
                      </td>
                      <td className="py-2 text-gray-500 text-xs">
                        {new Date(a.last_attempt).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <input
            type="text"
            value={filterEmail}
            onChange={e => setFilterEmail(e.target.value)}
            placeholder="Search by email..."
            className="text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-200"
          />

          <select
            value={filterSuccess}
            onChange={e => setFilterSuccess(e.target.value)}
            className="text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-200"
          >
            <option value="">All Statuses</option>
            <option value="true">Success</option>
            <option value="false">Failed</option>
          </select>

          <input
            type="date"
            value={filterDateFrom}
            onChange={e => setFilterDateFrom(e.target.value)}
            className="text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-200"
          />

          <input
            type="date"
            value={filterDateTo}
            onChange={e => setFilterDateTo(e.target.value)}
            className="text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-200"
          />
        </div>
        <div className="flex gap-2 mt-3">
          <button
            onClick={handleFilter}
            className="px-4 py-2 rounded-xl text-sm font-medium text-white"
            style={{ background: '#FF6B6B' }}
          >
            Apply Filters
          </button>
          <button
            onClick={handleReset}
            className="px-4 py-2 rounded-xl text-sm font-medium"
            style={{ background: '#F3F4F6', color: '#6B7280' }}
          >
            Reset
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#FF6B6B', borderTopColor: 'transparent' }} />
          </div>
        ) : !data || data.items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <Shield size={40} className="mb-3 opacity-30" />
            <p className="text-sm">No login history found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: '#F9FAFB' }}>
                  <th className="text-left px-4 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wider">Timestamp</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wider">Email</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wider">Status</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wider">Failure Reason</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map(entry => (
                  <tr key={entry.id} className="border-t border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap text-xs">
                      {new Date(entry.created_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 font-medium" style={{ color: '#1E2A4A' }}>
                      {entry.email_attempted}
                    </td>
                    <td className="px-4 py-3">
                      {entry.success ? (
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-medium w-fit" style={{ background: '#F0FFF4', color: '#4CAF50' }}>
                          <CheckCircle size={12} />
                          Success
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-medium w-fit" style={{ background: '#FFF0F0', color: '#FF6B6B' }}>
                          <XCircle size={12} />
                          Failed
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {entry.failure_reason ? (
                        <span className="px-2 py-0.5 rounded-lg text-xs font-medium" style={{ background: '#FFF7ED', color: '#F59E0B' }}>
                          {FAILURE_LABELS[entry.failure_reason] || entry.failure_reason}
                        </span>
                      ) : (
                        <span className="text-gray-400 text-xs">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {data && data.pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <span className="text-sm text-gray-500">
              Showing {((page - 1) * 20) + 1}–{Math.min(page * 20, data.total)} of {data.total}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1.5 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50 transition-colors"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="text-sm font-medium" style={{ color: '#1E2A4A' }}>
                {page} / {data.pages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(data.pages, p + 1))}
                disabled={page === data.pages}
                className="p-1.5 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50 transition-colors"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
