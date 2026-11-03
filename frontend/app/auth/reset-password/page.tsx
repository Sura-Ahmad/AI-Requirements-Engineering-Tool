'use client';
import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { resetPassword } from '@/lib/api';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token) setError('Invalid or missing reset link. Please request a new one.');
  }, [token]);

  const handleSubmit = async () => {
    if (!password || !confirm) { setError('Please fill in all fields'); return; }
    if (password.length < 8) { setError('Password must be at least 8 characters'); return; }
    if (password !== confirm) { setError('Passwords do not match'); return; }

    setLoading(true); setError('');
    try {
      await resetPassword(token, password);
      setSuccess(true);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
        'Invalid or expired reset link. Please request a new one.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
      <h1 className="text-4xl font-bold mb-2" style={{ color: '#1E2A4A' }}>
        Requirements Super Tool
      </h1>
      <p className="text-gray-500 mb-8">Your intelligent requirements management platform</p>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 w-full max-w-md overflow-hidden">
        <div style={{ background: '#1E2A4A' }} className="px-8 py-5">
          <h2 className="text-white font-semibold text-sm">Set New Password</h2>
        </div>

        <div className="p-8">
          {error && (
            <div className="bg-red-50 text-red-500 text-sm px-4 py-3 rounded-xl mb-4">{error}</div>
          )}

          {success ? (
            <div className="text-center">
              <div className="text-5xl mb-4">&#10003;</div>
              <p className="text-gray-700 font-semibold mb-2">Password updated!</p>
              <p className="text-gray-500 text-sm mb-6">
                Your password has been reset successfully. You can now log in with your new password.
              </p>
              <button
                onClick={() => router.push('/auth')}
                className="w-full py-3 rounded-full font-semibold text-white transition-all hover:opacity-90"
                style={{ background: '#FF6B6B' }}
              >
                Go to Login
              </button>
            </div>
          ) : (
            <>
              <p className="text-sm text-gray-500 mb-6">
                Choose a strong password with at least 8 characters.
              </p>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">New Password</label>
                <input
                  className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:outline-none focus:border-blue-400"
                  placeholder="Enter new password"
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                />
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Confirm Password</label>
                <input
                  className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:outline-none focus:border-blue-400"
                  placeholder="Confirm new password"
                  type="password"
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleSubmit(); }}
                />
              </div>

              <button
                onClick={handleSubmit}
                disabled={loading || !token}
                className="w-full py-3 rounded-full font-semibold text-white transition-all hover:opacity-90 disabled:opacity-50"
                style={{ background: '#FF6B6B' }}
              >
                {loading ? 'Please wait...' : 'Reset Password'}
              </button>

              <button
                onClick={() => router.push('/auth')}
                className="w-full mt-3 py-3 rounded-full font-semibold text-gray-500 text-sm transition-all hover:text-gray-700"
              >
                Back to Login
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-400">Loading...</p>
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
  );
}
