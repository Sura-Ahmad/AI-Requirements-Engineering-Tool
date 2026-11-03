'use client';
import { useState, useEffect } from 'react';
import { Eye, EyeOff, Lock, ShieldCheck } from 'lucide-react';
import { changePassword } from '@/lib/api';

type Toast = { type: 'success' | 'error'; message: string } | null;

function ToastBanner({ toast, onClose }: { toast: Toast; onClose: () => void }) {
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(onClose, 3500);
    return () => clearTimeout(t);
  }, [toast]);
  if (!toast) return null;
  return (
    <div
      className="fixed top-6 right-6 z-50 px-5 py-3 rounded-2xl shadow-lg text-sm font-medium text-white"
      style={{ background: toast.type === 'success' ? '#4CAF50' : '#FF6B6B' }}
    >
      {toast.message}
    </div>
  );
}

function getStrength(pwd: string): { label: string; color: string; width: string } {
  if (pwd.length < 8) return { label: 'Weak', color: '#FF6B6B', width: '33%' };
  const hasLetter = /[a-zA-Z]/.test(pwd);
  const hasDigit = /\d/.test(pwd);
  const hasSpecial = /[^a-zA-Z0-9]/.test(pwd);
  const hasMixed = /[a-z]/.test(pwd) && /[A-Z]/.test(pwd);
  if (hasLetter && hasDigit && hasSpecial && hasMixed) return { label: 'Strong', color: '#4CAF50', width: '100%' };
  if (hasLetter && hasDigit) return { label: 'Medium', color: '#F59E0B', width: '66%' };
  return { label: 'Weak', color: '#FF6B6B', width: '33%' };
}

function PasswordInput({
  label, value, onChange, error, placeholder,
}: {
  label: string; value: string; onChange: (v: string) => void; error?: string; placeholder?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div>
      <label className="block text-sm font-medium mb-1.5" style={{ color: '#1E2A4A' }}>{label}</label>
      <div className="relative">
        <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className={`w-full pl-9 pr-10 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-200 ${error ? 'border-red-400' : 'border-gray-200'}`}
        />
        <button
          type="button"
          onClick={() => setShow(s => !s)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
        >
          {show ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
      {error && <p className="text-xs mt-1" style={{ color: '#FF6B6B' }}>{error}</p>}
    </div>
  );
}

export default function ChangePasswordPage() {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [currentError, setCurrentError] = useState('');
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<Toast>(null);

  const strength = getStrength(next);
  const checks = [
    { label: 'At least 8 characters', ok: next.length >= 8 },
    { label: 'At least 1 letter', ok: /[a-zA-Z]/.test(next) },
    { label: 'At least 1 number', ok: /\d/.test(next) },
    { label: 'Special character (optional)', ok: /[^a-zA-Z0-9]/.test(next) },
  ];
  const confirmMismatch = confirm.length > 0 && confirm !== next;
  const canSubmit = current.length > 0 && next.length >= 8 && /[a-zA-Z]/.test(next) && /\d/.test(next) && confirm === next && !saving;

  const handleSubmit = async () => {
    setCurrentError('');
    setSaving(true);
    try {
      await changePassword(current, next);
      setToast({ type: 'success', message: 'Password updated successfully' });
      setCurrent('');
      setNext('');
      setConfirm('');
    } catch (err: any) {
      const detail = err?.response?.data?.detail ?? 'Failed to update password';
      if (detail.toLowerCase().includes('current password')) {
        setCurrentError(detail);
      } else {
        setToast({ type: 'error', message: detail });
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <ToastBanner toast={toast} onClose={() => setToast(null)} />

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8">
        <div className="flex items-center gap-2 mb-6">
          <ShieldCheck size={18} style={{ color: '#FF6B6B' }} />
          <h2 className="text-base font-semibold" style={{ color: '#1E2A4A' }}>Change Password</h2>
        </div>

        <div className="space-y-5 max-w-md">
          <PasswordInput
            label="Current Password"
            value={current}
            onChange={v => { setCurrent(v); setCurrentError(''); }}
            error={currentError}
            placeholder="Enter current password"
          />

          <div>
            <PasswordInput
              label="New Password"
              value={next}
              onChange={setNext}
              placeholder="Enter new password"
            />

            {/* Strength meter */}
            {next.length > 0 && (
              <div className="mt-2">
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{ width: strength.width, background: strength.color }}
                  />
                </div>
                <p className="text-xs mt-1 font-medium" style={{ color: strength.color }}>
                  {strength.label}
                </p>
              </div>
            )}

            {/* Checklist */}
            {next.length > 0 && (
              <ul className="mt-2 space-y-1">
                {checks.map(c => (
                  <li key={c.label} className="flex items-center gap-2 text-xs" style={{ color: c.ok ? '#4CAF50' : '#9CA3AF' }}>
                    <span className="font-bold">{c.ok ? '✓' : '○'}</span>
                    {c.label}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <PasswordInput
              label="Confirm New Password"
              value={confirm}
              onChange={setConfirm}
              error={confirmMismatch ? 'Passwords do not match' : ''}
              placeholder="Repeat new password"
            />
          </div>

          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ background: '#FF6B6B' }}
          >
            {saving ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <ShieldCheck size={15} />
            )}
            {saving ? 'Updating…' : 'Update Password'}
          </button>
        </div>
      </div>
    </>
  );
}
