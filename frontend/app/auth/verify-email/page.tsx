'use client';
import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { verifyEmail } from '@/lib/api';

function VerifyEmailInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'error'>('loading');
  const [error, setError] = useState('');

  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) {
      setError('Verification link is missing or invalid.');
      setStatus('error');
      return;
    }
    verifyEmail(token)
      .then(res => {
        localStorage.setItem('access_token', res.data.access_token);
        localStorage.setItem('refresh_token', res.data.refresh_token);
        router.replace('/dashboard');
      })
      .catch(err => {
        const detail = err?.response?.data?.detail;
        setError(typeof detail === 'string' ? detail : 'Verification failed. The link may have expired.');
        setStatus('error');
      });
  }, []);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 w-full max-w-md p-8 text-center">
      {status === 'loading' ? (
        <>
          <div className="w-10 h-10 border-4 border-gray-200 rounded-full animate-spin mx-auto mb-4" style={{ borderTopColor: '#FF6B6B' }} />
          <p className="text-gray-500 text-sm">Verifying your email…</p>
        </>
      ) : (
        <>
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: '#FFF0F0' }}>
            <span style={{ fontSize: 32 }}>&#10007;</span>
          </div>
          <h2 className="text-xl font-bold mb-2" style={{ color: '#1E2A4A' }}>Verification failed</h2>
          <p className="text-sm text-gray-500 mb-6">{error}</p>
          <button
            onClick={() => router.push('/auth')}
            className="w-full py-3 rounded-full font-semibold text-white transition-all hover:opacity-90"
            style={{ background: '#FF6B6B' }}
          >
            Back to Register
          </button>
        </>
      )}
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
      <h1 className="text-4xl font-bold mb-2" style={{ color: '#1E2A4A' }}>Requirements Super Tool</h1>
      <p className="text-gray-500 mb-8">Your intelligent requirements management platform</p>
      <Suspense fallback={
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 w-full max-w-md p-8 text-center">
          <div className="w-10 h-10 border-4 border-gray-200 rounded-full animate-spin mx-auto mb-4" style={{ borderTopColor: '#FF6B6B' }} />
          <p className="text-gray-500 text-sm">Loading…</p>
        </div>
      }>
        <VerifyEmailInner />
      </Suspense>
    </div>
  );
}
