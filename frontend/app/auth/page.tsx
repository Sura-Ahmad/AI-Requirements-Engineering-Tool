'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { login, register, forgotPassword, resendVerification } from '@/lib/api';

type View = 'login' | 'register' | 'forgot' | 'verify-pending';

export default function AuthPage() {
  const router = useRouter();
  const [view, setView] = useState<View>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [showResend, setShowResend] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);

  const reset = (next: View) => {
    setError('');
    setSuccess('');
    setEmail('');
    setPassword('');
    setFullName('');
    setShowResend(false);
    setView(next);
  };

  const handleResend = async () => {
    setResendLoading(true);
    try {
      await resendVerification(email);
      setShowResend(false);
      setError('');
      setSuccess('A new verification link has been sent to your email.');
    } catch {
      setError('Failed to resend. Please try again.');
    } finally { setResendLoading(false); }
  };

  const handleLogin = async () => {
    if (!email || !password) { setError('Please fill in all fields'); return; }
    setLoading(true); setError(''); setShowResend(false);
    try {
      const res = await login(email, password);
      localStorage.setItem('access_token', res.data.access_token);
      localStorage.setItem('refresh_token', res.data.refresh_token);
      router.push('/dashboard');
    } catch (err: any) {
      if (err?.code === 'ERR_NETWORK' || err?.code === 'ECONNREFUSED') {
        setError('Cannot connect to server. Make sure the backend is running.');
      } else if (err?.response?.status === 429) {
        setError('Too many attempts. Please wait a minute and try again.');
      } else if (err?.response?.status === 422) {
        setError('Invalid email or password');
      } else if (err?.response?.status === 403 && err?.response?.data?.detail === 'Email not verified') {
        setError('Your email is not verified yet.');
        setShowResend(true);
      } else if (typeof err?.response?.data?.detail === 'string') {
        setError(err.response.data.detail);
      } else {
        setError('Invalid email or password');
      }
    } finally { setLoading(false); }
  };

  const handleRegister = async () => {
    if (!fullName || !email || !password) { setError('Please fill in all fields'); return; }
    if (password.length < 8) { setError('Password must be at least 8 characters'); return; }
    setLoading(true); setError('');
    try {
      await register(fullName, email, password);
      setView('verify-pending');
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      if (Array.isArray(detail)) {
        setError('Invalid email format');
      } else if (err?.response?.status === 429) {
        setError('Too many attempts. Please wait a minute and try again.');
      } else if (typeof detail === 'string') {
        setError(detail);
      } else if (err?.code === 'ERR_NETWORK' || err?.code === 'ECONNREFUSED') {
        setError('Cannot connect to server. Make sure the backend is running.');
      } else {
        setError('Email already registered');
      }
    } finally { setLoading(false); }
  };

  const handleForgotPassword = async () => {
    if (!email) { setError('Please enter your email address'); return; }
    setLoading(true); setError(''); setSuccess('');
    try {
      await forgotPassword(email);
      setSuccess('If this email is registered, you will receive a password reset link shortly.');
      setEmail('');
    } catch (err: any) {
      if (err?.response?.status === 429) {
        setError('Too many attempts. Please wait a minute and try again.');
      } else {
        setError('Something went wrong. Please try again.');
      }
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
      <h1 className="text-4xl font-bold mb-2" style={{ color: '#1E2A4A' }}>
        Requirements Super Tool
      </h1>
      <p className="text-gray-500 mb-8">Your intelligent requirements management platform</p>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 w-full max-w-md overflow-hidden">

        {/* Verify-pending screen */}
        {view === 'verify-pending' && (
          <div className="p-8 text-center">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: '#FFF0F0' }}>
              <span style={{ fontSize: 32 }}>&#9993;</span>
            </div>
            <h2 className="text-xl font-bold mb-2" style={{ color: '#1E2A4A' }}>Check your inbox</h2>
            <p className="text-sm text-gray-500 mb-1">A verification link has been sent to</p>
            <p className="text-sm font-semibold text-gray-700 mb-4">{email}</p>
            <p className="text-xs text-gray-400 mb-6">Click the link in the email to activate your account. It expires in 24 hours.</p>
            <button
              onClick={() => reset('login')}
              className="w-full py-3 rounded-full font-semibold text-white transition-all hover:opacity-90"
              style={{ background: '#1E2A4A' }}
            >
              Back to Login
            </button>
          </div>
        )}

        {/* Tabs — hidden on forgot-password and verify-pending views */}
        {view !== 'forgot' && view !== 'verify-pending' && (
          <div className="flex">
            <button
              onClick={() => reset('login')}
              className="flex-1 py-4 font-semibold text-sm transition-all"
              style={{
                background: view === 'login' ? '#1E2A4A' : '#F3F4F6',
                color: view === 'login' ? 'white' : '#374151',
                borderRadius: view === 'login' ? '16px 16px 0 0' : '0',
              }}
            >Login</button>
            <button
              onClick={() => reset('register')}
              className="flex-1 py-4 font-semibold text-sm transition-all"
              style={{
                background: view === 'register' ? '#1E2A4A' : '#F3F4F6',
                color: view === 'register' ? 'white' : '#374151',
                borderRadius: view === 'register' ? '16px 16px 0 0' : '0',
              }}
            >Register</button>
          </div>
        )}

        {/* Forgot password header */}
        {view !== 'verify-pending' && view === 'forgot' && (
          <div style={{ background: '#1E2A4A' }} className="px-8 py-5 flex items-center gap-3">
            <button
              onClick={() => reset('login')}
              className="text-white opacity-70 hover:opacity-100 transition-opacity text-lg leading-none"
            >&#8592;</button>
            <span className="text-white font-semibold text-sm">Forgot Password</span>
          </div>
        )}

        {view !== 'verify-pending' && <div className="p-8">
          {error && (
            <div className="bg-red-50 text-red-500 text-sm px-4 py-3 rounded-xl mb-2">{error}</div>
          )}
          {showResend && (
            <button
              onClick={handleResend}
              disabled={resendLoading}
              className="w-full text-sm mb-4 py-2 rounded-xl font-medium transition-all disabled:opacity-50"
              style={{ background: '#FFF0F0', color: '#FF6B6B' }}
            >
              {resendLoading ? 'Sending…' : 'Resend verification email'}
            </button>
          )}
          {success && (
            <div className="bg-green-50 text-green-600 text-sm px-4 py-3 rounded-xl mb-4">{success}</div>
          )}

          {/* ── REGISTER ── */}
          {view === 'register' && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
              <input
                className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:outline-none focus:border-blue-400"
                placeholder="Ahmad Al-Rashidi"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
              />
            </div>
          )}

          {/* ── EMAIL (all views) ── */}
          {!success && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
              <input
                className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:outline-none focus:border-blue-400"
                placeholder="Enter your email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
            </div>
          )}

          {/* ── PASSWORD (login / register only) ── */}
          {(view === 'login' || view === 'register') && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
              <input
                className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:outline-none focus:border-blue-400"
                placeholder="Enter your password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') view === 'login' ? handleLogin() : handleRegister(); }}
              />
            </div>
          )}

          {/* ── COUNTRY (register only) ── */}
          {view === 'register' && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">Country</label>
              <div className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 text-gray-700">
                🇯🇴 Jordan
              </div>
            </div>
          )}

          {/* ── FORGOT PASSWORD link (login view only) ── */}
          {view === 'login' && (
            <div className="flex justify-end mb-4 -mt-2">
              <button
                onClick={() => reset('forgot')}
                className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
              >
                Forgot Password?
              </button>
            </div>
          )}

          {/* ── FORGOT: hint text ── */}
          {view === 'forgot' && !success && (
            <p className="text-sm text-gray-500 mb-4">
              Enter the email address associated with your account and we will send you a link to reset your password.
            </p>
          )}

          {/* ── PRIMARY ACTION BUTTON ── */}
          {!success && (
            <button
              onClick={
                view === 'login' ? handleLogin :
                view === 'register' ? handleRegister :
                handleForgotPassword
              }
              disabled={loading}
              className="w-full py-3 rounded-full font-semibold text-white transition-all hover:opacity-90"
              style={{ background: '#FF6B6B' }}
            >
              {loading ? 'Please wait...' :
               view === 'login' ? 'Login' :
               view === 'register' ? 'Create Account' :
               'Send Reset Link'}
            </button>
          )}

          {/* ── BACK TO LOGIN (after success) ── */}
          {view === 'forgot' && success && (
            <button
              onClick={() => reset('login')}
              className="w-full py-3 rounded-full font-semibold text-white transition-all hover:opacity-90"
              style={{ background: '#1E2A4A' }}
            >
              Back to Login
            </button>
          )}
        </div>}
      </div>
    </div>
  );
}
