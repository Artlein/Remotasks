'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { User, LogIn, Loader2 } from 'lucide-react';

const KNOWN_USERS = ['arvin', 'user2']; // quick-pick buttons

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (name: string) => {
    const trimmed = name.trim().toLowerCase();
    if (!trimmed) {
      setError('Please enter a username.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: trimmed }),
      });

      if (res.ok) {
        router.push('/');
        router.refresh();
      } else {
        const data = await res.json();
        setError(data.error || 'Login failed');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4">
      <div className="w-full max-w-sm space-y-8">
        {/* Logo + Title */}
        <div className="flex flex-col items-center gap-4">
          <div className="relative w-16 h-16 rounded-2xl overflow-hidden shadow-xl shadow-blue-500/25 border-2 border-blue-400/30">
            <Image src="/logo.png" alt="Remotasks QA Logo" fill className="object-cover" priority />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-100 to-blue-200 bg-clip-text text-transparent">
              Remotasks QA Console
            </h1>
            <p className="text-xs text-slate-400 mt-1">Select your account to continue</p>
          </div>
        </div>

        {/* Quick-pick user buttons */}
        <div className="space-y-3">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider text-center">
            Quick Select
          </p>
          {KNOWN_USERS.map((u) => (
            <button
              key={u}
              onClick={() => handleLogin(u)}
              disabled={loading}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-900 border border-slate-800 hover:border-blue-500/40 hover:bg-slate-800 transition-all group disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="w-9 h-9 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center shrink-0">
                <User className="w-4 h-4 text-blue-400" />
              </div>
              <span className="font-semibold text-slate-200 capitalize">{u}</span>
              <LogIn className="w-4 h-4 text-slate-500 group-hover:text-blue-400 ml-auto transition-colors" />
            </button>
          ))}
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-slate-800" />
          <span className="text-xs text-slate-600">or type a name</span>
          <div className="flex-1 h-px bg-slate-800" />
        </div>

        {/* Manual username input */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleLogin(username);
          }}
          className="space-y-3"
        >
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Enter username..."
            autoComplete="username"
            className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 transition"
          />
          {error && <p className="text-xs text-red-400 text-center">{error}</p>}
          <button
            type="submit"
            disabled={loading || !username.trim()}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-sm transition-colors"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}

