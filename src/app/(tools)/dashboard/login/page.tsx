'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

export default function DashboardLogin() {
  const [pw, setPw] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    const res = await fetch('/api/dashboard/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: pw }),
    });
    setLoading(false);
    if (res.ok) {
      router.push('/dashboard');
      router.refresh();
    } else {
      setError('Incorrect password.');
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center">
          <Image src="/nmq-logo.png" alt="NMQ Digital" width={147} height={58} className="h-10 w-auto" />
        </div>
        <div className="rounded-2xl border border-ink-100 bg-white p-8 shadow-sm">
          <h1 className="mb-1 text-xl font-extrabold text-ink-900">Performance Dashboard</h1>
          <p className="mb-6 text-sm text-ink-500">Enter your password to access the dashboard.</p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="password"
              placeholder="Password"
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              className="w-full rounded-xl border border-ink-200 px-4 py-3 text-sm focus:border-ink-400 focus:outline-none"
              autoFocus
            />
            {error && <p className="text-sm text-red-500">{error}</p>}
            <button
              type="submit"
              disabled={loading || !pw}
              className="w-full rounded-xl bg-ink-900 px-4 py-3 text-sm font-bold text-white transition hover:bg-ink-700 disabled:opacity-40"
            >
              {loading ? 'Checking…' : 'Enter'}
            </button>
          </form>
        </div>
        <p className="mt-6 text-center text-xs text-ink-400">NMQ Digital · Internal use only</p>
      </div>
    </div>
  );
}
