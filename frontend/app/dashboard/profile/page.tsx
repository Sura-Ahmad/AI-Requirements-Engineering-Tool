'use client';
import { useEffect, useState } from 'react';
import { Mail, User, Save } from 'lucide-react';
import { getMyProfile, updateProfile } from '@/lib/api';

interface Profile {
  full_name: string;
  email: string;
}

type Toast = { type: 'success' | 'error'; message: string } | null;

function ToastBanner({ toast, onClose }: { toast: Toast; onClose: () => void }) {
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(onClose, 3500);
    return () => clearTimeout(t);
  }, [toast]);

  if (!toast) return null;
  const isSuccess = toast.type === 'success';
  return (
    <div
      className="fixed top-6 right-6 z-50 px-5 py-3 rounded-2xl shadow-lg text-sm font-medium text-white transition-all"
      style={{ background: isSuccess ? '#4CAF50' : '#FF6B6B' }}
    >
      {toast.message}
    </div>
  );
}

export default function EditProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<Toast>(null);

  useEffect(() => {
    getMyProfile().then(res => {
      setProfile(res.data);
      setFullName(res.data.full_name);
      setEmail(res.data.email);
    });
  }, []);

  const hasChanges = profile
    ? fullName.trim() !== profile.full_name || email.trim().toLowerCase() !== profile.email
    : false;

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await updateProfile({ full_name: fullName.trim(), email: email.trim().toLowerCase() });
      setProfile(prev => prev ? { ...prev, full_name: res.data.full_name, email: res.data.email } : prev);
      setToast({ type: 'success', message: 'Profile updated successfully' });
      window.dispatchEvent(new Event('profile-updated'));
    } catch (err: any) {
      const msg = err?.response?.data?.detail ?? 'Failed to update profile';
      setToast({ type: 'error', message: msg });
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <ToastBanner toast={toast} onClose={() => setToast(null)} />

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8">
        <h2 className="text-base font-semibold mb-6" style={{ color: '#1E2A4A' }}>Edit Profile</h2>

        <div className="space-y-5 max-w-md">
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: '#1E2A4A' }}>
              Full Name
            </label>
            <div className="relative">
              <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-200"
                placeholder="Your full name"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: '#1E2A4A' }}>
              Email Address
            </label>
            <div className="relative">
              <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-200"
                placeholder="your@email.com"
              />
            </div>
          </div>

          <button
            onClick={handleSave}
            disabled={!hasChanges || saving}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ background: '#FF6B6B' }}
          >
            {saving ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Save size={15} />
            )}
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>
    </>
  );
}
