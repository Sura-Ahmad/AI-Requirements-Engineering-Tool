'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { History, FileText, ChevronRight } from 'lucide-react';
import { getMySessions } from '@/lib/api';

interface SessionRow {
  session_id: string;
  domain_name: string;
  country: string;
  role: string;
  created_at: string | null;
  requirements_count: number;
}

const ROLE_LABELS: Record<string, string> = {
  product_owner: 'Product Owner',
  business_analyst: 'Business Analyst',
  developer: 'Developer',
  stakeholder: 'Stakeholder',
};

export default function HistoryPage() {
  const router = useRouter();
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    getMySessions()
      .then(res => setSessions(res.data))
      .catch(() => setError('Failed to load sessions. Please refresh the page.'))
      .finally(() => setLoading(false));
  }, []);

  const fmt = (iso: string | null) =>
    iso ? new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : '—';

  const fmtTime = (iso: string | null) =>
    iso ? new Date(iso).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }) : '';

  return (
    <div className="p-8">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: '#FFF0F0' }}>
          <History size={20} style={{ color: '#FF6B6B' }} />
        </div>
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#1E2A4A' }}>My Sessions</h1>
          <p className="text-sm text-gray-500">All your previously generated requirements</p>
        </div>
      </div>

      <div className="mt-6">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="w-8 h-8 border-4 border-gray-200 rounded-full animate-spin" style={{ borderTopColor: '#FF6B6B' }} />
          </div>
        ) : sessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-gray-400">
            <FileText size={40} className="mb-3 opacity-30" />
            <p className="text-sm">No sessions yet — start by creating new Requirements</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {sessions.map(s => (
              <div
                key={s.session_id}
                onClick={() => router.push(`/dashboard/requirements?session_id=${s.session_id}`)}
                className="bg-white rounded-2xl border border-gray-100 px-6 py-4 flex items-center gap-4 cursor-pointer hover:shadow-sm hover:border-gray-200 transition-all"
              >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: '#FFF0F0' }}>
                  <FileText size={18} style={{ color: '#FF6B6B' }} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-gray-800">{s.domain_name}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full uppercase font-medium" style={{ background: '#1E2A4A12', color: '#1E2A4A' }}>
                      {s.country}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: '#F3F4F6', color: '#6B7280' }}>
                      {ROLE_LABELS[s.role] || s.role}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">{fmt(s.created_at)} · {fmtTime(s.created_at)}</p>
                </div>

                <div className="flex items-center gap-4 flex-shrink-0">
                  <div className="text-center">
                    <p className="text-lg font-bold" style={{ color: '#FF6B6B' }}>{s.requirements_count}</p>
                    <p className="text-xs text-gray-400">requirements</p>
                  </div>
                  <ChevronRight size={18} className="text-gray-300" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
