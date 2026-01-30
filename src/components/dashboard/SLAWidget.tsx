'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface SLAPeriodStats {
  avgFirstResponseTime: number;
  avgResolutionTime: number;
  firstResponseCompliance: number;
  resolutionCompliance: number;
  totalTickets: number;
}

interface SLAViolation {
  ticketId: string;
  ticketNumber: string;
  customerName: string;
  subject: string;
  priority: 'low' | 'medium' | 'high';
  status: string;
  firstResponseBreached: boolean;
  resolutionBreached: boolean;
  firstResponseTimeRemaining: number | null;
  resolutionTimeRemaining: number | null;
}

interface SLAData {
  stats: {
    avgFirstResponseTime: number;
    avgResolutionTime: number;
    firstResponseCompliance: number;
    resolutionCompliance: number;
    totalTickets: number;
    currentlyViolating: SLAViolation[];
  };
  periods: {
    today: SLAPeriodStats;
    thisWeek: SLAPeriodStats;
    thisMonth: SLAPeriodStats;
  };
}

function formatDuration(minutes: number): string {
  if (minutes < 0) {
    return `-${formatDuration(Math.abs(minutes))}`;
  }
  
  if (minutes < 60) {
    return `${minutes} Min`;
  }
  
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  
  if (hours < 24) {
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
  }
  
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  
  return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`;
}

export default function SLAWidget() {
  const [data, setData] = useState<SLAData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<'today' | 'thisWeek' | 'thisMonth'>('thisWeek');

  useEffect(() => {
    const loadData = async () => {
      try {
        const res = await fetch('/api/admin/sla');
        if (!res.ok) throw new Error('Fehler beim Laden');
        const slaData = await res.json();
        setData(slaData);
      } catch (err) {
        setError('Fehler beim Laden der SLA-Daten');
      } finally {
        setLoading(false);
      }
    };

    loadData();
    const interval = setInterval(loadData, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="bg-white rounded-apple-xl shadow-card border border-apple-gray-100 p-5">
        <div className="animate-pulse">
          <div className="h-6 bg-apple-gray-100 rounded w-1/3 mb-4"></div>
          <div className="h-20 bg-apple-gray-100 rounded"></div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-white rounded-apple-xl shadow-card border border-apple-gray-100 p-5">
        <p className="text-red-500">{error || 'Keine Daten verfügbar'}</p>
      </div>
    );
  }

  const periodStats = data.periods[selectedPeriod];
  const violations = data.stats.currentlyViolating || [];

  const priorityColors: Record<string, string> = {
    high: 'bg-red-100 text-red-700',
    medium: 'bg-amber-100 text-amber-700',
    low: 'bg-blue-100 text-blue-700',
  };

  return (
    <div className="bg-white rounded-apple-xl shadow-card border border-apple-gray-100 overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-apple-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="font-semibold text-apple-gray-600">SLA-Übersicht</h2>
          </div>
          <div className="flex gap-1 bg-apple-gray-100 rounded-lg p-0.5">
            {[
              { key: 'today', label: 'Heute' },
              { key: 'thisWeek', label: 'Woche' },
              { key: 'thisMonth', label: 'Monat' },
            ].map((period) => (
              <button
                key={period.key}
                onClick={() => setSelectedPeriod(period.key as typeof selectedPeriod)}
                className={`px-2 py-1 text-xs font-medium rounded-md transition-colors ${
                  selectedPeriod === period.key
                    ? 'bg-white text-apple-gray-600 shadow-sm'
                    : 'text-apple-gray-400 hover:text-apple-gray-600'
                }`}
              >
                {period.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="p-5 grid grid-cols-2 gap-4">
        {/* First Response */}
        <div className="text-center">
          <div className="text-2xl font-bold text-apple-gray-600">
            {periodStats.avgFirstResponseTime > 0 ? formatDuration(periodStats.avgFirstResponseTime) : '—'}
          </div>
          <div className="text-xs text-apple-gray-400 mt-1">Ø Erste Antwort</div>
          <div className={`text-xs mt-2 font-medium ${
            periodStats.firstResponseCompliance >= 90 ? 'text-green-600' :
            periodStats.firstResponseCompliance >= 70 ? 'text-amber-600' : 'text-red-600'
          }`}>
            {periodStats.firstResponseCompliance}% SLA erfüllt
          </div>
        </div>

        {/* Resolution Time */}
        <div className="text-center">
          <div className="text-2xl font-bold text-apple-gray-600">
            {periodStats.avgResolutionTime > 0 ? formatDuration(periodStats.avgResolutionTime) : '—'}
          </div>
          <div className="text-xs text-apple-gray-400 mt-1">Ø Lösungszeit</div>
          <div className={`text-xs mt-2 font-medium ${
            periodStats.resolutionCompliance >= 90 ? 'text-green-600' :
            periodStats.resolutionCompliance >= 70 ? 'text-amber-600' : 'text-red-600'
          }`}>
            {periodStats.resolutionCompliance}% SLA erfüllt
          </div>
        </div>
      </div>

      {/* SLA Violations */}
      {violations.length > 0 && (
        <div className="border-t border-apple-gray-100">
          <div className="px-5 py-3 bg-red-50 flex items-center gap-2">
            <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span className="text-sm font-medium text-red-700">
              {violations.length} Ticket{violations.length > 1 ? 's' : ''} überschreiten SLA
            </span>
          </div>
          <div className="divide-y divide-apple-gray-100 max-h-48 overflow-y-auto">
            {violations.slice(0, 5).map((violation) => (
              <Link
                key={violation.ticketId}
                href={`/admin/tickets/${violation.ticketId}`}
                className="flex items-center gap-3 px-5 py-3 hover:bg-red-50 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-apple-gray-400">{violation.ticketNumber}</span>
                    <span className={`inline-flex items-center px-1.5 py-0.5 text-xs font-medium rounded ${priorityColors[violation.priority]}`}>
                      {violation.priority === 'high' ? 'Hoch' : violation.priority === 'medium' ? 'Mittel' : 'Niedrig'}
                    </span>
                  </div>
                  <p className="text-sm text-apple-gray-600 truncate mt-0.5">{violation.subject}</p>
                </div>
                <div className="flex flex-col items-end">
                  {violation.firstResponseBreached && !violation.firstResponseTimeRemaining && (
                    <span className="text-xs text-red-600 font-medium">Antwort überfällig</span>
                  )}
                  {violation.resolutionBreached && violation.resolutionTimeRemaining !== null && (
                    <span className="text-xs text-red-600 font-medium">
                      {formatDuration(Math.abs(violation.resolutionTimeRemaining))} überfällig
                    </span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* No Violations */}
      {violations.length === 0 && (
        <div className="px-5 py-4 border-t border-apple-gray-100 bg-green-50 text-center">
          <div className="flex items-center justify-center gap-2 text-green-700">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
            </svg>
            <span className="text-sm font-medium">Alle Tickets innerhalb SLA</span>
          </div>
        </div>
      )}
    </div>
  );
}
