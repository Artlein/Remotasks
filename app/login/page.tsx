'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { ShieldCheck, Lock, ArrowLeft, Loader2, KeyRound, Delete, Sparkles, CheckCircle2 } from 'lucide-react';

interface Profile {
  id: string;
  name: string;
  role: string;
  avatar: string;
  glowColor: string;
}

const PROFILES: Profile[] = [
  {
    id: 'arvin',
    name: 'Arvin',
    role: 'EQC Lead Auditor',
    avatar: '/avatars/arvin.png',
    glowColor: 'shadow-blue-500/20 border-blue-500/40 hover:border-blue-400',
  },
  {
    id: 'jude',
    name: 'Jude',
    role: 'EQC Quality Auditor',
    avatar: '/avatars/jude.png',
    glowColor: 'shadow-purple-500/20 border-purple-500/40 hover:border-purple-400',
  },
];

export default function LoginPage() {
  const router = useRouter();
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const [isFirstLogin, setIsFirstLogin] = useState<boolean>(false);
  const [checkingStatus, setCheckingStatus] = useState<boolean>(false);

  // PIN Setup Steps: 'enter' (for returning user) | 'create' | 'confirm' (for first-time user)
  const [step, setStep] = useState<'enter' | 'create' | 'confirm'>('enter');
  const [firstPin, setFirstPin] = useState<string>('');
  const [pin, setPin] = useState<string>('');

  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [shake, setShake] = useState<boolean>(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // When profile is clicked, check if user already has a PIN
  const handleSelectUser = async (profile: Profile) => {
    setSelectedUser(profile);
    setCheckingStatus(true);
    setPin('');
    setFirstPin('');
    setError('');

    try {
      const res = await fetch(`/api/auth/check?username=${profile.id}`);
      const data = await res.json();

      if (data.isFirstLogin || !data.hasPin) {
        setIsFirstLogin(true);
        setStep('create');
      } else {
        setIsFirstLogin(false);
        setStep('enter');
      }
    } catch {
      // Default to create if cannot determine
      setIsFirstLogin(true);
      setStep('create');
    } finally {
      setCheckingStatus(false);
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  };

  // Auto-handle when 6 digits are typed
  useEffect(() => {
    if (!selectedUser || pin.length !== 6 || loading) return;

    if (step === 'create') {
      // First step of PIN creation: store initial PIN and move to confirmation
      setFirstPin(pin);
      setPin('');
      setStep('confirm');
    } else if (step === 'confirm') {
      // Second step: check if confirmed PIN matches first PIN
      if (pin === firstPin) {
        handleFinalSubmit(pin);
      } else {
        setError('PINs do not match. Please choose again.');
        triggerShake();
        setPin('');
        setFirstPin('');
        setStep('create');
      }
    } else if (step === 'enter') {
      // Regular login
      handleFinalSubmit(pin);
    }
  }, [pin, step, firstPin, selectedUser, loading]);

  // Handle global keyboard typing
  useEffect(() => {
    if (!selectedUser || checkingStatus) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (loading) return;

      if (e.key >= '0' && e.key <= '9') {
        if (pin.length < 6) {
          setPin((prev) => prev + e.key);
          setError('');
        }
      } else if (e.key === 'Backspace') {
        setPin((prev) => prev.slice(0, -1));
        setError('');
      } else if (e.key === 'Escape') {
        handleBack();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedUser, pin, loading, checkingStatus, step]);

  const handleFinalSubmit = async (pinToSubmit: string) => {
    if (!selectedUser) return;

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: selectedUser.id,
          pin: pinToSubmit,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        if (typeof window !== 'undefined' && data.userId) {
          (window as any).__RT_USER_ID = data.userId;
        }
        router.push('/');
        router.refresh();
      } else {
        setError(data.error || 'Incorrect PIN. Please try again.');
        triggerShake();
        setPin('');
      }
    } catch {
      setError('Connection error. Please try again.');
      triggerShake();
      setPin('');
    } finally {
      setLoading(false);
    }
  };

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 500);
  };

  const handleKeypadPress = (digit: string) => {
    if (loading || pin.length >= 6) return;
    setPin((prev) => prev + digit);
    setError('');
  };

  const handleBackspace = () => {
    if (loading) return;
    setPin((prev) => prev.slice(0, -1));
    setError('');
  };

  const handleBack = () => {
    if (step === 'confirm') {
      setStep('create');
      setPin('');
      setFirstPin('');
      setError('');
    } else {
      setSelectedUser(null);
      setPin('');
      setFirstPin('');
      setError('');
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 px-4 py-8 relative overflow-hidden select-none">
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/3 w-80 h-80 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Main Container */}
      <div className="w-full max-w-lg sm:max-w-xl z-10 space-y-8">
        {/* Header Branding */}
        <div className="flex flex-col items-center gap-3.5 text-center">
          <div className="relative w-16 h-16 rounded-2xl overflow-hidden shadow-2xl shadow-blue-500/30 border-2 border-blue-400/40">
            <Image
              src="/logo.png"
              alt="RemoAuditTrack Logo"
              fill
              className="object-cover"
              priority
              unoptimized
            />
          </div>
          <div>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight bg-gradient-to-r from-white via-slate-100 to-blue-200 bg-clip-text text-transparent">
              RemoAuditTrack
            </h1>
            <p className="text-sm text-slate-400 mt-1 flex items-center justify-center gap-1.5 font-medium">
              <ShieldCheck className="w-4 h-4 text-blue-400" />
              Secure Multi-User Workstation
            </p>
          </div>
        </div>

        {/* View 1: Profile Selection */}
        {!selectedUser ? (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="text-center">
              <h2 className="text-base font-bold text-slate-300 uppercase tracking-widest">
                Who is tracking time?
              </h2>
              <p className="text-sm text-slate-400 mt-1">
                Select your auditor profile to sign in
              </p>
            </div>

            <div className="grid grid-cols-2 gap-5">
              {PROFILES.map((profile) => (
                <button
                  key={profile.id}
                  onClick={() => handleSelectUser(profile)}
                  className={`group relative flex flex-col items-center p-7 sm:p-8 rounded-3xl bg-slate-900/90 border ${profile.glowColor} transition-all duration-200 hover:scale-[1.03] hover:shadow-2xl active:scale-[0.98] text-center cursor-pointer`}
                >
                  <div className="relative w-28 h-28 sm:w-36 sm:h-36 mb-4 rounded-full p-1.5 bg-gradient-to-tr from-slate-800 to-slate-700 shadow-xl group-hover:shadow-blue-500/30 transition-all">
                    <div className="relative w-full h-full rounded-full overflow-hidden border-2 border-slate-700/80 group-hover:border-white/50 transition">
                      <Image
                        src={profile.avatar}
                        alt={profile.name}
                        fill
                        className="object-cover"
                        priority
                        unoptimized
                      />
                    </div>
                  </div>

                  <h3 className="text-xl sm:text-2xl font-black text-white group-hover:text-blue-400 transition-colors">
                    {profile.name}
                  </h3>
                  <span className="text-xs sm:text-sm font-medium text-slate-400 mt-1 line-clamp-1">
                    {profile.role}
                  </span>

                  <div className="mt-4 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-950/80 border border-slate-800 text-xs text-slate-400 group-hover:text-slate-200 group-hover:border-slate-700 transition">
                    <Lock className="w-3.5 h-3.5 text-slate-500 group-hover:text-blue-400" />
                    <span className="font-semibold">6-Digit PIN</span>
                  </div>
                </button>
              ))}
            </div>

            <div className="pt-2 text-center">
              <span className="text-xs text-slate-500 font-medium">
                First login will let you set your 6-digit PIN password.
              </span>
            </div>
          </div>
        ) : (
          /* View 2: PIN Setup or Login */
          <div
            className={`space-y-7 animate-in fade-in zoom-in-95 duration-200 ${
              shake ? 'animate-shake' : ''
            }`}
          >
            {/* Top Navigation */}
            <div className="flex items-center justify-between px-2">
              <button
                onClick={handleBack}
                disabled={loading}
                className="flex items-center gap-2 text-sm font-semibold text-slate-400 hover:text-white transition-colors py-1.5 px-3 rounded-xl hover:bg-slate-900 border border-transparent hover:border-slate-800"
              >
                <ArrowLeft className="w-4 h-4" />
                {step === 'confirm' ? 'Back' : 'Switch User'}
              </button>

              {isFirstLogin ? (
                <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/15 border border-blue-500/30 text-xs font-bold text-blue-400">
                  <Sparkles className="w-3.5 h-3.5" /> First-Time Setup
                </span>
              ) : (
                <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800 border border-slate-700 text-xs font-medium text-slate-400">
                  <Lock className="w-3.5 h-3.5 text-emerald-400" /> Secure Login
                </span>
              )}
            </div>

            {/* Profile Avatar Card */}
            <div className="flex flex-col items-center">
              <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-full p-1.5 bg-gradient-to-tr from-slate-800 to-slate-700 shadow-2xl border-2 border-slate-700">
                <div className="relative w-full h-full rounded-full overflow-hidden">
                  <Image
                    src={selectedUser.avatar}
                    alt={selectedUser.name}
                    fill
                    className="object-cover"
                    priority
                    unoptimized
                  />
                </div>
                <div className="absolute -bottom-1 -right-1 p-2 rounded-full bg-blue-600 text-white shadow-lg border-2 border-slate-950">
                  <KeyRound className="w-4 h-4" />
                </div>
              </div>

              {/* Dynamic Header based on Step */}
              {checkingStatus ? (
                <div className="flex items-center gap-2 mt-4 text-sm text-slate-400 font-medium">
                  <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
                  <span>Checking account status...</span>
                </div>
              ) : step === 'create' ? (
                <div className="text-center mt-4">
                  <h2 className="text-2xl sm:text-3xl font-black text-white">
                    Set Your 6-Digit PIN
                  </h2>
                  <p className="text-sm text-slate-400 mt-1">
                    Welcome, {selectedUser.name}! Choose a 6-digit passcode
                  </p>
                </div>
              ) : step === 'confirm' ? (
                <div className="text-center mt-4">
                  <h2 className="text-2xl sm:text-3xl font-black text-white flex items-center justify-center gap-2">
                    <CheckCircle2 className="w-6 h-6 text-emerald-400" /> Confirm Your PIN
                  </h2>
                  <p className="text-sm text-slate-400 mt-1">
                    Re-enter your 6-digit PIN to confirm
                  </p>
                </div>
              ) : (
                <div className="text-center mt-4">
                  <h2 className="text-2xl sm:text-3xl font-black text-white">
                    Hello, {selectedUser.name}
                  </h2>
                  <p className="text-sm text-slate-400 mt-1">
                    Enter your 6-digit security PIN
                  </p>
                </div>
              )}
            </div>

            {/* 6 Digit PIN Indicators */}
            <div className="flex justify-center items-center gap-3 sm:gap-4 py-2">
              {[0, 1, 2, 3, 4, 5].map((index) => {
                const isFilled = index < pin.length;
                const isCurrent = index === pin.length;

                return (
                  <div
                    key={index}
                    className={`w-12 h-16 sm:w-14 sm:h-18 rounded-2xl border flex items-center justify-center transition-all duration-200 font-mono text-2xl sm:text-3xl font-black ${
                      isFilled
                        ? 'border-blue-500 bg-blue-600/25 text-white shadow-xl shadow-blue-500/25 scale-105'
                        : isCurrent
                        ? 'border-blue-400 bg-slate-900 ring-2 ring-blue-500/40 shadow-inner'
                        : 'border-slate-800 bg-slate-900/70 text-slate-600'
                    }`}
                  >
                    {isFilled ? '•' : ''}
                  </div>
                );
              })}
            </div>

            {/* Error Message */}
            {error && (
              <div className="text-center">
                <p className="text-sm font-semibold text-rose-400 bg-rose-500/10 border border-rose-500/20 py-2.5 px-4 rounded-xl inline-block">
                  {error}
                </p>
              </div>
            )}

            {/* Loading Indicator */}
            {loading && (
              <div className="flex items-center justify-center gap-2 text-sm text-blue-400 font-semibold">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{step === 'confirm' ? 'Saving your new PIN...' : 'Verifying PIN...'}</span>
              </div>
            )}

            {/* Numeric Keypad */}
            <div className="grid grid-cols-3 gap-3 max-w-sm mx-auto pt-2">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                <button
                  key={digit}
                  type="button"
                  onClick={() => handleKeypadPress(digit)}
                  disabled={loading || pin.length >= 6}
                  className="h-14 sm:h-16 rounded-2xl bg-slate-900 hover:bg-slate-800 active:bg-blue-600 active:text-white border border-slate-800 hover:border-slate-700 text-xl sm:text-2xl font-bold text-slate-100 transition font-mono disabled:opacity-40 shadow-sm"
                >
                  {digit}
                </button>
              ))}

              {/* Clear button */}
              <button
                type="button"
                onClick={() => setPin('')}
                disabled={loading || pin.length === 0}
                className="h-14 sm:h-16 rounded-2xl bg-slate-900 hover:bg-slate-800 active:bg-slate-700 border border-slate-800 text-sm font-bold text-slate-400 hover:text-slate-200 transition disabled:opacity-40"
              >
                Clear
              </button>

              {/* Zero */}
              <button
                type="button"
                onClick={() => handleKeypadPress('0')}
                disabled={loading || pin.length >= 6}
                className="h-14 sm:h-16 rounded-2xl bg-slate-900 hover:bg-slate-800 active:bg-blue-600 active:text-white border border-slate-800 hover:border-slate-700 text-xl sm:text-2xl font-bold text-slate-100 transition font-mono disabled:opacity-40 shadow-sm"
              >
                0
              </button>

              {/* Backspace */}
              <button
                type="button"
                onClick={handleBackspace}
                disabled={loading || pin.length === 0}
                className="h-14 sm:h-16 rounded-2xl bg-slate-900 hover:bg-slate-800 active:bg-slate-700 border border-slate-800 flex items-center justify-center text-slate-400 hover:text-rose-400 transition disabled:opacity-40"
                title="Backspace"
              >
                <Delete className="w-6 h-6" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Hidden input for physical keyboard entry */}
      <input
        ref={inputRef}
        type="password"
        maxLength={6}
        value={pin}
        onChange={(e) => {
          const val = e.target.value.replace(/\D/g, '').slice(0, 6);
          setPin(val);
          setError('');
        }}
        className="opacity-0 absolute pointer-events-none w-0 h-0"
        autoFocus={!!selectedUser}
      />
    </div>
  );
}
