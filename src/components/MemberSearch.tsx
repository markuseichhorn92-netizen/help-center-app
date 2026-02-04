"use client";

import { useState, useEffect, useCallback } from "react";

interface MemberSearchResult {
  id: number;
  customerNumber: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  status: string;
  city: string | null;
  accessRefusal: boolean;
}

interface MemberDetails {
  customer: {
    id: number;
    customerNumber: string;
    firstName: string;
    lastName: string;
    fullName: string;
    email: string | null;
    phone: string | null;
    phoneMobile: string | null;
    phoneBusiness: string | null;
    status: string;
    gender: string | null;
    dateOfBirth: string | null;
    address: {
      street: string | null;
      houseNumber: string | null;
      zipCode: string | null;
      city: string | null;
      country: string | null;
      formatted: string | null;
    };
    bankAccount: {
      accountHolder: string | null;
      bankName: string | null;
      iban: string | null;
    } | null;
    accessRefusal: boolean;
    createdDateTime: string | null;
    idlePeriods: Array<{
      startDate: string;
      endDate: string;
      reason: string;
      rateName?: string;
      unlimited: boolean;
    }>;
  };
  contracts: Array<{
    id: number;
    rateName: string;
    startDate: string;
    endDate: string | null;
    cancellationDate: string | null;
    status: string;
    monthlyFee: number | null;
    currency: string;
    isActive: boolean;
    isCancelled: boolean;
  }>;
}

interface MemberSearchProps {
  // Optional: pre-fill search with email or phone from ticket
  initialEmail?: string;
  initialPhone?: string;
  // Compact mode for sidebar display
  compact?: boolean;
  // Callback when member is selected
  onMemberSelect?: (member: MemberDetails) => void;
}

const statusLabels: Record<string, { label: string; color: string }> = {
  MEMBER: { label: "Aktiv", color: "bg-green-100 text-green-700" },
  FORMER_MEMBER: { label: "Ehemaliges Mitglied", color: "bg-gray-100 text-gray-600" },
  PROSPECT: { label: "Interessent", color: "bg-blue-100 text-blue-700" },
  LEAD: { label: "Lead", color: "bg-amber-100 text-amber-700" },
};

export default function MemberSearch({
  initialEmail,
  initialPhone,
  compact = false,
  onMemberSelect,
}: MemberSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<MemberSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedMember, setSelectedMember] = useState<MemberDetails | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [autoSearched, setAutoSearched] = useState(false);

  // Auto-search with initial email or phone
  useEffect(() => {
    if (autoSearched) return;
    
    const autoQuery = initialEmail || initialPhone;
    if (autoQuery && autoQuery.length >= 3) {
      setQuery(autoQuery);
      searchMembers(autoQuery);
      setAutoSearched(true);
    }
  }, [initialEmail, initialPhone, autoSearched]);

  const searchMembers = useCallback(async (searchQuery: string) => {
    if (searchQuery.length < 2) {
      setResults([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(
        `/api/admin/magicline/customers?q=${encodeURIComponent(searchQuery)}&size=10`,
        { credentials: "same-origin" }
      );

      if (!res.ok) {
        throw new Error("Suche fehlgeschlagen");
      }

      const data = await res.json();
      setResults(data.customers || []);
    } catch (err) {
      setError((err as Error).message);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (query.length >= 2) {
        searchMembers(query);
      } else {
        setResults([]);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query, searchMembers]);

  const loadMemberDetails = async (id: number) => {
    setLoadingDetails(true);
    setError(null);

    try {
      const res = await fetch(`/api/admin/magicline/customers/${id}`, {
        credentials: "same-origin",
      });

      if (!res.ok) {
        throw new Error("Mitglied nicht gefunden");
      }

      const data = await res.json();
      setSelectedMember(data);
      onMemberSelect?.(data);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoadingDetails(false);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString("de-DE");
  };

  const formatCurrency = (amount: number | null, currency: string) => {
    if (amount === null) return "-";
    return new Intl.NumberFormat("de-DE", {
      style: "currency",
      currency,
    }).format(amount);
  };

  // Compact view for sidebar - now with full details
  if (compact && selectedMember) {
    const member = selectedMember.customer;
    const allContracts = selectedMember.contracts;

    return (
      <div className="bg-white rounded-lg border border-apple-gray-200 p-4 max-h-[70vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div>
            <p className="font-semibold text-apple-gray-600">{member.fullName}</p>
            <p className="text-xs text-apple-gray-400 font-mono">{member.customerNumber}</p>
          </div>
          <span
            className={`text-xs px-2 py-1 rounded-full ${
              statusLabels[member.status]?.color || "bg-gray-100 text-gray-600"
            }`}
          >
            {statusLabels[member.status]?.label || member.status}
          </span>
        </div>

        {/* Zugangssperre */}
        {member.accessRefusal && (
          <div className="mb-3 p-2 bg-red-50 rounded-lg">
            <p className="text-xs text-red-600 font-medium flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              Zugangssperre aktiv
            </p>
          </div>
        )}

        {/* Kontaktdaten */}
        <div className="mb-3">
          <p className="text-xs text-apple-gray-400 uppercase tracking-wide mb-2">Kontakt</p>
          <div className="space-y-1.5 text-sm">
            {member.email && (
              <div className="flex items-center gap-2 text-apple-gray-500">
                <span className="text-xs text-apple-gray-400 w-12">E-Mail:</span>
                <a href={`mailto:${member.email}`} className="text-brand hover:underline truncate">{member.email}</a>
              </div>
            )}
            {member.phone && (
              <div className="flex items-center gap-2 text-apple-gray-500">
                <span className="text-xs text-apple-gray-400 w-12">Tel:</span>
                <a href={`tel:${member.phone}`} className="text-brand hover:underline">{member.phone}</a>
              </div>
            )}
            {member.phoneMobile && member.phoneMobile !== member.phone && (
              <div className="flex items-center gap-2 text-apple-gray-500">
                <span className="text-xs text-apple-gray-400 w-12">Mobil:</span>
                <a href={`tel:${member.phoneMobile}`} className="text-brand hover:underline">{member.phoneMobile}</a>
              </div>
            )}
            {member.phoneBusiness && (
              <div className="flex items-center gap-2 text-apple-gray-500">
                <span className="text-xs text-apple-gray-400 w-12">Gesch.:</span>
                <a href={`tel:${member.phoneBusiness}`} className="text-brand hover:underline">{member.phoneBusiness}</a>
              </div>
            )}
          </div>
        </div>

        {/* Persönliche Daten */}
        <div className="mb-3 pt-3 border-t border-apple-gray-100">
          <p className="text-xs text-apple-gray-400 uppercase tracking-wide mb-2">Persönliche Daten</p>
          <div className="space-y-1.5 text-sm text-apple-gray-600">
            {member.dateOfBirth && (
              <div className="flex">
                <span className="text-xs text-apple-gray-400 w-20">Geb.datum:</span>
                <span>{formatDate(member.dateOfBirth)}</span>
              </div>
            )}
            {member.gender && (
              <div className="flex">
                <span className="text-xs text-apple-gray-400 w-20">Geschlecht:</span>
                <span>{member.gender === 'MALE' ? 'Männlich' : member.gender === 'FEMALE' ? 'Weiblich' : 'Divers'}</span>
              </div>
            )}
            {member.createdDateTime && (
              <div className="flex">
                <span className="text-xs text-apple-gray-400 w-20">Mitglied seit:</span>
                <span>{formatDate(member.createdDateTime)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Adresse */}
        {member.address.street && (
          <div className="mb-3 pt-3 border-t border-apple-gray-100">
            <p className="text-xs text-apple-gray-400 uppercase tracking-wide mb-2">Adresse</p>
            <div className="text-sm text-apple-gray-600">
              <p>{member.address.street} {member.address.houseNumber}</p>
              <p>{member.address.zipCode} {member.address.city}</p>
              {member.address.country && member.address.country !== 'DE' && (
                <p>{member.address.country}</p>
              )}
            </div>
          </div>
        )}

        {/* Bankverbindung */}
        {member.bankAccount && (
          <div className="mb-3 pt-3 border-t border-apple-gray-100">
            <p className="text-xs text-apple-gray-400 uppercase tracking-wide mb-2">Bankverbindung</p>
            <div className="text-sm text-apple-gray-600 space-y-1">
              {member.bankAccount.accountHolder && (
                <p><span className="text-xs text-apple-gray-400">Inhaber:</span> {member.bankAccount.accountHolder}</p>
              )}
              {member.bankAccount.iban && (
                <p className="font-mono text-xs">{member.bankAccount.iban}</p>
              )}
              {member.bankAccount.bankName && (
                <p className="text-xs text-apple-gray-500">{member.bankAccount.bankName}</p>
              )}
            </div>
          </div>
        )}

        {/* Alle Verträge */}
        {allContracts.length > 0 && (
          <div className="mb-3 pt-3 border-t border-apple-gray-100">
            <p className="text-xs text-apple-gray-400 uppercase tracking-wide mb-2">Verträge ({allContracts.length})</p>
            <div className="space-y-2">
              {allContracts.map((contract) => (
                <div
                  key={contract.id}
                  className={`p-2 rounded-lg text-xs ${
                    contract.isActive
                      ? contract.isCancelled
                        ? "bg-amber-50 border border-amber-200"
                        : "bg-green-50 border border-green-200"
                      : "bg-gray-50 border border-gray-200"
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <p className="font-medium text-apple-gray-600">{contract.rateName}</p>
                    {contract.monthlyFee && (
                      <p className="font-semibold">{formatCurrency(contract.monthlyFee, contract.currency)}/M</p>
                    )}
                  </div>
                  <p className="text-apple-gray-500 mt-0.5">
                    {formatDate(contract.startDate)}
                    {contract.endDate && ` - ${formatDate(contract.endDate)}`}
                  </p>
                  {contract.isCancelled && (
                    <p className="text-red-500 mt-0.5">
                      Gekündigt zum {formatDate(contract.cancellationDate)}
                    </p>
                  )}
                  {!contract.isActive && !contract.isCancelled && (
                    <p className="text-gray-500 mt-0.5">Beendet</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Ruhezeiten */}
        {member.idlePeriods && member.idlePeriods.length > 0 && (
          <div className="mb-3 pt-3 border-t border-apple-gray-100">
            <p className="text-xs text-apple-gray-400 uppercase tracking-wide mb-2">Ruhezeiten</p>
            <div className="space-y-1.5">
              {member.idlePeriods.map((period, idx) => (
                <div key={idx} className="p-2 bg-blue-50 rounded-lg text-xs">
                  <p className="text-blue-700">
                    {formatDate(period.startDate)} - {period.unlimited ? "unbefristet" : formatDate(period.endDate)}
                  </p>
                  <p className="text-blue-500">
                    {period.reason}
                    {period.rateName && ` • ${period.rateName}`}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        <button
          onClick={() => {
            setSelectedMember(null);
            setQuery("");
            setResults([]);
            setAutoSearched(false);
          }}
          className="mt-3 w-full text-xs text-apple-gray-400 hover:text-apple-gray-600 py-2 border border-apple-gray-200 rounded-lg hover:bg-apple-gray-50"
        >
          🔍 Andere Suche
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search Input */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          {loading ? (
            <svg className="w-5 h-5 text-apple-gray-400 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          ) : (
            <svg className="w-5 h-5 text-apple-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          )}
        </div>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Name, E-Mail, Mitgliedsnr. oder Telefon..."
          className="w-full pl-10 pr-4 py-2 border border-apple-gray-200 rounded-lg focus:ring-2 focus:ring-brand/20 focus:border-brand outline-none text-sm"
        />
      </div>

      {/* Error */}
      {error && (
        <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg">
          {error}
        </div>
      )}

      {/* Results */}
      {results.length > 0 && !selectedMember && (
        <div className="border border-apple-gray-200 rounded-lg overflow-hidden divide-y divide-apple-gray-100">
          {results.map((member) => (
            <button
              key={member.id}
              onClick={() => loadMemberDetails(member.id)}
              className="w-full p-3 hover:bg-apple-gray-50 text-left transition-colors"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-apple-gray-600">{member.fullName}</p>
                  <p className="text-xs text-apple-gray-400">
                    {member.customerNumber} • {member.email || member.phone || "Keine Kontaktdaten"}
                  </p>
                </div>
                <span
                  className={`text-xs px-2 py-1 rounded-full ${
                    statusLabels[member.status]?.color || "bg-gray-100 text-gray-600"
                  }`}
                >
                  {statusLabels[member.status]?.label || member.status}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Loading details */}
      {loadingDetails && (
        <div className="p-4 text-center text-apple-gray-400">
          <svg className="w-6 h-6 animate-spin mx-auto" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="mt-2 text-sm">Lade Mitgliedsdaten...</p>
        </div>
      )}

      {/* Selected member details (full view) */}
      {selectedMember && !compact && (
        <div className="border border-apple-gray-200 rounded-lg overflow-hidden">
          {/* Header */}
          <div className="bg-apple-gray-50 p-4 border-b border-apple-gray-200">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold text-apple-gray-600">
                  {selectedMember.customer.fullName}
                </h3>
                <p className="text-sm text-apple-gray-400 font-mono">
                  {selectedMember.customer.customerNumber}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`text-sm px-3 py-1 rounded-full ${
                    statusLabels[selectedMember.customer.status]?.color || "bg-gray-100 text-gray-600"
                  }`}
                >
                  {statusLabels[selectedMember.customer.status]?.label || selectedMember.customer.status}
                </span>
                <button
                  onClick={() => {
                    setSelectedMember(null);
                    setQuery("");
                    setResults([]);
                    setAutoSearched(false);
                  }}
                  className="p-1 text-apple-gray-400 hover:text-apple-gray-600"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          {/* Contact Info */}
          <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-apple-gray-400 uppercase tracking-wide mb-2">Kontakt</p>
              <div className="space-y-2">
                {selectedMember.customer.email && (
                  <p className="text-sm flex items-center gap-2">
                    <svg className="w-4 h-4 text-apple-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    <a href={`mailto:${selectedMember.customer.email}`} className="text-brand hover:underline">
                      {selectedMember.customer.email}
                    </a>
                  </p>
                )}
                {selectedMember.customer.phone && (
                  <p className="text-sm flex items-center gap-2">
                    <svg className="w-4 h-4 text-apple-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    <a href={`tel:${selectedMember.customer.phone}`} className="text-brand hover:underline">
                      {selectedMember.customer.phone}
                    </a>
                  </p>
                )}
                {selectedMember.customer.address.formatted && (
                  <p className="text-sm flex items-start gap-2">
                    <svg className="w-4 h-4 text-apple-gray-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    {selectedMember.customer.address.formatted}
                  </p>
                )}
                {selectedMember.customer.dateOfBirth && (
                  <p className="text-sm flex items-center gap-2">
                    <svg className="w-4 h-4 text-apple-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Geb.: {formatDate(selectedMember.customer.dateOfBirth)}
                  </p>
                )}
              </div>
            </div>

            {/* Bank Info */}
            {selectedMember.customer.bankAccount && (
              <div>
                <p className="text-xs text-apple-gray-400 uppercase tracking-wide mb-2">Bankverbindung</p>
                <div className="text-sm text-apple-gray-600">
                  <p>{selectedMember.customer.bankAccount.accountHolder}</p>
                  <p className="text-apple-gray-400">{selectedMember.customer.bankAccount.bankName}</p>
                  <p className="font-mono text-xs">{selectedMember.customer.bankAccount.iban}</p>
                </div>
              </div>
            )}
          </div>

          {/* Contracts */}
          {selectedMember.contracts.length > 0 && (
            <div className="border-t border-apple-gray-200 p-4">
              <p className="text-xs text-apple-gray-400 uppercase tracking-wide mb-3">Verträge</p>
              <div className="space-y-3">
                {selectedMember.contracts.map((contract) => (
                  <div
                    key={contract.id}
                    className={`p-3 rounded-lg ${
                      contract.isActive
                        ? contract.isCancelled
                          ? "bg-amber-50 border border-amber-200"
                          : "bg-green-50 border border-green-200"
                        : "bg-gray-50 border border-gray-200"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-apple-gray-600">{contract.rateName}</p>
                      {contract.monthlyFee && (
                        <p className="text-sm font-semibold">
                          {formatCurrency(contract.monthlyFee, contract.currency)}/Monat
                        </p>
                      )}
                    </div>
                    <p className="text-sm text-apple-gray-500 mt-1">
                      {formatDate(contract.startDate)}
                      {contract.endDate && ` - ${formatDate(contract.endDate)}`}
                      {contract.isCancelled && (
                        <span className="text-red-500 ml-2">
                          (gekündigt zum {formatDate(contract.cancellationDate)})
                        </span>
                      )}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Idle Periods */}
          {selectedMember.customer.idlePeriods && selectedMember.customer.idlePeriods.length > 0 && (
            <div className="border-t border-apple-gray-200 p-4">
              <p className="text-xs text-apple-gray-400 uppercase tracking-wide mb-3">Ruhezeiten</p>
              <div className="space-y-2">
                {selectedMember.customer.idlePeriods.map((period, idx) => (
                  <div key={idx} className="p-2 bg-blue-50 rounded-lg text-sm">
                    <p className="text-blue-700">
                      {formatDate(period.startDate)} - {period.unlimited ? "unbefristet" : formatDate(period.endDate)}
                    </p>
                    <p className="text-blue-500 text-xs">
                      Grund: {period.reason}
                      {period.rateName && ` • ${period.rateName}`}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Access Refusal Warning */}
          {selectedMember.customer.accessRefusal && (
            <div className="border-t border-red-200 bg-red-50 p-4">
              <p className="text-red-600 font-medium flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                Zugangssperre aktiv
              </p>
              <p className="text-red-500 text-sm mt-1">
                Dieses Mitglied hat eine aktive Zugangssperre und kann das Studio nicht betreten.
              </p>
            </div>
          )}
        </div>
      )}

      {/* No results */}
      {query.length >= 2 && !loading && results.length === 0 && !selectedMember && (
        <div className="p-4 text-center text-apple-gray-400">
          <p className="text-sm">Keine Mitglieder gefunden für &quot;{query}&quot;</p>
        </div>
      )}

      {/* Empty state */}
      {query.length < 2 && !selectedMember && (
        <div className="p-4 text-center text-apple-gray-400">
          <svg className="w-8 h-8 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          <p className="text-sm">Mitglieder in Magicline suchen</p>
          <p className="text-xs mt-1">Name, E-Mail, Mitgliedsnr. oder Telefon eingeben</p>
        </div>
      )}
    </div>
  );
}
