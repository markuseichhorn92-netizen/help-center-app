'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function DashboardLoginPage() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSetup, setIsSetup] = useState(false);
  const [checkingSetup, setCheckingSetup] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const checkSetup = async () => {
      try {
        const response = await fetch('/api/dashboard/setup');
        if (response.ok) {
          const data = await response.json();
          setIsSetup(data.setupNeeded);
        }
      } catch (err) {
        console.error('Error checking setup:', err);
      }
      setCheckingSetup(false);
    };

    checkSetup();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const endpoint = isSetup ? '/api/dashboard/setup' : '/api/dashboard/login';

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      if (response.ok) {
        router.push('/admin/fitinn-dashboard/config');
      } else {
        setError(isSetup ? 'Fehler beim Speichern' : 'Falsches Passwort');
      }
    } catch (err) {
      setError('Verbindungsfehler');
    }

    setLoading(false);
  };

  if (checkingSetup) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand"></div>
      </div>
    );
  }

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-5">
      <div className="bg-white rounded-apple-xl shadow-card p-10 w-full max-w-md">
        <div className="text-center mb-5 text-5xl">🏋️</div>
        <h1 className="text-apple-gray-600 text-center text-2xl font-semibold mb-8">
          FitInn Dashboard
        </h1>
        <p className="text-apple-gray-400 text-center text-sm mb-6">
          Verwalte das TV-Display im Fitnessstudio
        </p>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 rounded-apple p-4 mb-5 text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={isSetup ? 'Neues Passwort festlegen' : 'Dashboard-Passwort eingeben'}
            required
            className="w-full p-4 border border-apple-gray-200 rounded-apple bg-white text-apple-gray-600 text-base mb-5 focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent"
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full p-4 rounded-apple bg-brand text-white text-base font-medium hover:bg-brand-dark transition-colors disabled:opacity-50"
          >
            {loading ? 'Bitte warten...' : (isSetup ? 'Passwort festlegen' : 'Anmelden')}
          </button>
        </form>

        {isSetup && (
          <p className="text-apple-gray-400 text-center mt-5 text-sm">
            Erstes Login: Bitte legen Sie ein Passwort fest.
          </p>
        )}

        <div className="mt-6 pt-6 border-t border-apple-gray-100 text-center">
          <p className="text-apple-gray-400 text-xs">
            Das Dashboard steuert das TV-Display unter<br />
            <a href="https://fitinndashboard.vercel.app" target="_blank" rel="noopener noreferrer" className="text-brand hover:underline">
              fitinndashboard.vercel.app
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
