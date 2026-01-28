'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

interface TimeSlot {
  open: string;
  close: string;
}

interface DaySchedule {
  closed: boolean;
  slots: TimeSlot[];
}

interface OpeningHours {
  [key: string]: DaySchedule;
}

interface SpecialDay {
  date: string;
  name: string;
  closed: boolean;
  slots: TimeSlot[];
}

interface Config {
  leaderboardUrl: string;
  lastModified: string;
  carouselEnabled: boolean;
  leaderboardDuration: number;
  imageDuration: number;
  openingHours: OpeningHours;
  showClock: boolean;
  showWeather: boolean;
  showOpeningStatus: boolean;
  weatherCity: string;
  weatherLat: number;
  weatherLon: number;
  layout: 'fullscreen' | 'split' | 'ticker';
  transitionEffect: 'fade' | 'slide' | 'zoom' | 'none';
  tickerText: string;
  specialDays: SpecialDay[];
}

interface ImageInfo {
  name: string;
  url: string;
  size?: number;
}

const WEEKDAYS = [
  { key: 'monday', label: 'Montag' },
  { key: 'tuesday', label: 'Dienstag' },
  { key: 'wednesday', label: 'Mittwoch' },
  { key: 'thursday', label: 'Donnerstag' },
  { key: 'friday', label: 'Freitag' },
  { key: 'saturday', label: 'Samstag' },
  { key: 'sunday', label: 'Sonntag' },
];

// Calculate Easter Sunday using Computus algorithm
function getEasterSunday(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

// Add days to a date
function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

// Format date as YYYY-MM-DD
function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Get German holidays for a given year (including movable holidays)
function getGermanHolidays(year: number): { date: string; name: string }[] {
  const easter = getEasterSunday(year);

  return [
    { date: `${year}-01-01`, name: 'Neujahr' },
    { date: formatDate(addDays(easter, -2)), name: 'Karfreitag' },
    { date: formatDate(addDays(easter, 1)), name: 'Ostermontag' },
    { date: `${year}-05-01`, name: 'Tag der Arbeit' },
    { date: formatDate(addDays(easter, 39)), name: 'Christi Himmelfahrt' },
    { date: formatDate(addDays(easter, 50)), name: 'Pfingstmontag' },
    { date: formatDate(addDays(easter, 60)), name: 'Fronleichnam' },
    { date: `${year}-10-03`, name: 'Tag der deutschen Einheit' },
    { date: `${year}-11-01`, name: 'Allerheiligen' },
    { date: `${year}-12-24`, name: 'Heiligabend' },
    { date: `${year}-12-25`, name: '1. Weihnachtstag' },
    { date: `${year}-12-26`, name: '2. Weihnachtstag' },
    { date: `${year}-12-31`, name: 'Silvester' },
  ];
}

const DEFAULT_OPENING_HOURS: OpeningHours = {
  monday: { closed: false, slots: [{ open: '06:00', close: '22:00' }] },
  tuesday: { closed: false, slots: [{ open: '06:00', close: '22:00' }] },
  wednesday: { closed: false, slots: [{ open: '06:00', close: '22:00' }] },
  thursday: { closed: false, slots: [{ open: '06:00', close: '22:00' }] },
  friday: { closed: false, slots: [{ open: '06:00', close: '22:00' }] },
  saturday: { closed: false, slots: [{ open: '08:00', close: '20:00' }] },
  sunday: { closed: false, slots: [{ open: '08:00', close: '20:00' }] },
};

// Migrate old opening hours format to new format
function migrateOpeningHours(data: unknown): OpeningHours {
  if (!data || typeof data !== 'object') {
    return DEFAULT_OPENING_HOURS;
  }

  const result: OpeningHours = {};
  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

  for (const day of days) {
    const dayData = (data as Record<string, unknown>)[day];

    if (!dayData) {
      result[day] = DEFAULT_OPENING_HOURS[day];
    } else if (dayData === null) {
      result[day] = { closed: true, slots: [{ open: '06:00', close: '22:00' }] };
    } else if (typeof dayData === 'object' && 'slots' in (dayData as object)) {
      result[day] = dayData as DaySchedule;
    } else if (typeof dayData === 'object' && 'open' in (dayData as object)) {
      const oldFormat = dayData as { open: string; close: string };
      result[day] = { closed: false, slots: [{ open: oldFormat.open, close: oldFormat.close }] };
    } else {
      result[day] = DEFAULT_OPENING_HOURS[day];
    }
  }

  return result;
}

// Compress image to max 1MB
async function compressImage(file: File, maxSizeKB: number = 1000): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;

        const maxDim = 1920;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = (height / width) * maxDim;
            width = maxDim;
          } else {
            width = (width / height) * maxDim;
            height = maxDim;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas context not available'));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        let quality = 0.9;
        let result = canvas.toDataURL('image/jpeg', quality);

        while (result.length > maxSizeKB * 1024 * 1.37 && quality > 0.1) {
          quality -= 0.1;
          result = canvas.toDataURL('image/jpeg', quality);
        }

        resolve(result);
      };
      img.onerror = () => reject(new Error('Image load failed'));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error('File read failed'));
    reader.readAsDataURL(file);
  });
}

export default function DashboardConfigPage() {
  const router = useRouter();
  const [config, setConfig] = useState<Config | null>(null);
  const [images, setImages] = useState<ImageInfo[]>([]);
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [activeTab, setActiveTab] = useState<'general' | 'display' | 'opening' | 'special' | 'images'>('general');

  // Form states
  const [newUrl, setNewUrl] = useState('');
  const [carouselEnabled, setCarouselEnabled] = useState(false);
  const [leaderboardDuration, setLeaderboardDuration] = useState(30);
  const [imageDuration, setImageDuration] = useState(10);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [uploading, setUploading] = useState(false);

  // New feature states
  const [openingHours, setOpeningHours] = useState<OpeningHours>(DEFAULT_OPENING_HOURS);
  const [showClock, setShowClock] = useState(true);
  const [showWeather, setShowWeather] = useState(true);
  const [showOpeningStatus, setShowOpeningStatus] = useState(true);
  const [weatherCity, setWeatherCity] = useState('Trier');
  const [weatherLat, setWeatherLat] = useState(49.75);
  const [weatherLon, setWeatherLon] = useState(6.64);
  const [layout, setLayout] = useState<'fullscreen' | 'split' | 'ticker'>('fullscreen');
  const [transitionEffect, setTransitionEffect] = useState<'fade' | 'slide' | 'zoom' | 'none'>('fade');
  const [tickerText, setTickerText] = useState('');
  const [specialDays, setSpecialDays] = useState<SpecialDay[]>([]);

  const showAlert = useCallback((message: string, type: 'success' | 'error') => {
    setAlert({ type, message });
    setTimeout(() => setAlert(null), 5000);
  }, []);

  const loadConfig = useCallback(async () => {
    try {
      const response = await fetch('/api/dashboard/config');
      if (response.ok) {
        const data: Config = await response.json();
        setConfig(data);
        setNewUrl(data.leaderboardUrl);
        setCarouselEnabled(data.carouselEnabled);
        setLeaderboardDuration(data.leaderboardDuration);
        setImageDuration(data.imageDuration);
        setOpeningHours(migrateOpeningHours(data.openingHours));
        setShowClock(data.showClock ?? true);
        setShowWeather(data.showWeather ?? true);
        setShowOpeningStatus(data.showOpeningStatus ?? true);
        setWeatherCity(data.weatherCity || 'Trier');
        setWeatherLat(data.weatherLat || 49.75);
        setWeatherLon(data.weatherLon || 6.64);
        setLayout(data.layout || 'fullscreen');
        setTransitionEffect(data.transitionEffect || 'fade');
        setTickerText(data.tickerText || '');
        setSpecialDays(data.specialDays || []);
      }
    } catch (err) {
      showAlert('Fehler beim Laden der Konfiguration', 'error');
    }
  }, [showAlert]);

  const loadImages = useCallback(async () => {
    try {
      const response = await fetch('/api/dashboard/images');
      if (response.ok) {
        const data = await response.json();
        setImages(data.images || []);
      }
    } catch (err) {
      console.error('Error loading images:', err);
    }
  }, []);

  useEffect(() => {
    loadConfig();
    loadImages();
  }, [loadConfig, loadImages]);

  const handleLogout = async () => {
    await fetch('/api/dashboard/logout', { method: 'POST' });
    router.push('/admin/fitinn-dashboard');
  };

  const saveUrl = async () => {
    if (!newUrl) {
      showAlert('Bitte geben Sie eine URL ein', 'error');
      return;
    }

    try {
      const response = await fetch('/api/dashboard/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leaderboardUrl: newUrl }),
      });

      if (response.ok) {
        showAlert('URL wurde gespeichert!', 'success');
        loadConfig();
      } else {
        showAlert('Fehler beim Speichern', 'error');
      }
    } catch (err) {
      showAlert('Verbindungsfehler', 'error');
    }
  };

  const saveDisplaySettings = async () => {
    try {
      const response = await fetch('/api/dashboard/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          showClock,
          showWeather,
          showOpeningStatus,
          weatherCity,
          weatherLat,
          weatherLon,
          layout,
          transitionEffect,
          tickerText,
        }),
      });

      if (response.ok) {
        showAlert('Display-Einstellungen gespeichert!', 'success');
        loadConfig();
      } else {
        showAlert('Fehler beim Speichern', 'error');
      }
    } catch (err) {
      showAlert('Verbindungsfehler', 'error');
    }
  };

  const saveOpeningHours = async () => {
    try {
      const response = await fetch('/api/dashboard/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ openingHours }),
      });

      if (response.ok) {
        showAlert('Öffnungszeiten gespeichert!', 'success');
        loadConfig();
      } else {
        showAlert('Fehler beim Speichern', 'error');
      }
    } catch (err) {
      showAlert('Verbindungsfehler', 'error');
    }
  };

  const saveSpecialDays = async () => {
    try {
      const response = await fetch('/api/dashboard/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ specialDays }),
      });

      if (response.ok) {
        showAlert('Feiertage gespeichert!', 'success');
        loadConfig();
      } else {
        showAlert('Fehler beim Speichern', 'error');
      }
    } catch (err) {
      showAlert('Verbindungsfehler', 'error');
    }
  };

  const addSpecialDay = () => {
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0];
    setSpecialDays(prev => [
      ...prev,
      { date: dateStr, name: '', closed: true, slots: [{ open: '08:00', close: '18:00' }] },
    ]);
  };

  const removeSpecialDay = (index: number) => {
    setSpecialDays(prev => prev.filter((_, i) => i !== index));
  };

  const updateSpecialDay = (index: number, field: keyof SpecialDay, value: unknown) => {
    setSpecialDays(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const updateSpecialDaySlot = (dayIndex: number, slotIndex: number, field: 'open' | 'close', value: string) => {
    setSpecialDays(prev => {
      const updated = [...prev];
      const slots = [...updated[dayIndex].slots];
      slots[slotIndex] = { ...slots[slotIndex], [field]: value };
      updated[dayIndex] = { ...updated[dayIndex], slots };
      return updated;
    });
  };

  const addSpecialDaySlot = (dayIndex: number) => {
    setSpecialDays(prev => {
      const updated = [...prev];
      updated[dayIndex] = {
        ...updated[dayIndex],
        slots: [...updated[dayIndex].slots, { open: '14:00', close: '18:00' }],
      };
      return updated;
    });
  };

  const removeSpecialDaySlot = (dayIndex: number, slotIndex: number) => {
    setSpecialDays(prev => {
      const updated = [...prev];
      if (updated[dayIndex].slots.length <= 1) return prev;
      updated[dayIndex] = {
        ...updated[dayIndex],
        slots: updated[dayIndex].slots.filter((_, i) => i !== slotIndex),
      };
      return updated;
    });
  };

  const saveCarouselSettings = async () => {
    try {
      const response = await fetch('/api/dashboard/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          carouselEnabled,
          leaderboardDuration,
          imageDuration,
        }),
      });

      if (response.ok) {
        showAlert('Karussell-Einstellungen gespeichert!', 'success');
        loadConfig();
      } else {
        showAlert('Fehler beim Speichern', 'error');
      }
    } catch (err) {
      showAlert('Verbindungsfehler', 'error');
    }
  };

  const uploadImage = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      showAlert('Bild zu gross (max 10MB)', 'error');
      return;
    }

    if (!file.type.match(/^image\/(jpeg|png)$/)) {
      showAlert('Nur JPG und PNG erlaubt', 'error');
      return;
    }

    setUploading(true);
    showAlert('Bild wird komprimiert und hochgeladen...', 'success');

    try {
      const compressedBase64 = await compressImage(file);

      const response = await fetch('/api/dashboard/upload-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: file.name.replace(/\.\w+$/, '.jpg'),
          data: compressedBase64,
        }),
      });

      if (response.ok) {
        showAlert('Bild hochgeladen!', 'success');
        loadImages();
      } else {
        const data = await response.json();
        showAlert(data.error || 'Upload fehlgeschlagen', 'error');
      }
    } catch (err) {
      console.error('Upload error:', err);
      showAlert('Upload-Fehler', 'error');
    }

    setUploading(false);
    event.target.value = '';
  };

  const deleteImage = async (filename: string) => {
    if (!confirm(`Bild "${filename}" wirklich loeschen?`)) return;

    try {
      const response = await fetch('/api/dashboard/delete-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename }),
      });

      if (response.ok) {
        showAlert('Bild geloescht!', 'success');
        loadImages();
      } else {
        const data = await response.json();
        showAlert(data.error || 'Loeschen fehlgeschlagen', 'error');
      }
    } catch (err) {
      showAlert('Fehler beim Loeschen', 'error');
    }
  };

  const changePassword = async () => {
    if (!currentPassword || !newPassword) {
      showAlert('Bitte alle Felder ausfuellen', 'error');
      return;
    }
    if (newPassword !== confirmPassword) {
      showAlert('Passwoerter stimmen nicht ueberein', 'error');
      return;
    }
    if (newPassword.length < 4) {
      showAlert('Passwort muss mindestens 4 Zeichen haben', 'error');
      return;
    }

    try {
      const response = await fetch('/api/dashboard/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      if (response.ok) {
        showAlert('Passwort wurde geaendert!', 'success');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        const data = await response.json();
        showAlert(data.error || 'Fehler beim Aendern', 'error');
      }
    } catch (err) {
      showAlert('Verbindungsfehler', 'error');
    }
  };

  const updateSlot = (day: string, slotIndex: number, field: 'open' | 'close', value: string) => {
    setOpeningHours(prev => {
      const daySchedule = prev[day] || { closed: false, slots: [{ open: '06:00', close: '22:00' }] };
      const newSlots = [...daySchedule.slots];
      newSlots[slotIndex] = { ...newSlots[slotIndex], [field]: value };
      return { ...prev, [day]: { ...daySchedule, slots: newSlots } };
    });
  };

  const addSlot = (day: string) => {
    setOpeningHours(prev => {
      const daySchedule = prev[day] || { closed: false, slots: [] };
      return {
        ...prev,
        [day]: {
          ...daySchedule,
          slots: [...daySchedule.slots, { open: '14:00', close: '22:00' }],
        },
      };
    });
  };

  const removeSlot = (day: string, slotIndex: number) => {
    setOpeningHours(prev => {
      const daySchedule = prev[day];
      if (!daySchedule || daySchedule.slots.length <= 1) return prev;
      const newSlots = daySchedule.slots.filter((_, i) => i !== slotIndex);
      return { ...prev, [day]: { ...daySchedule, slots: newSlots } };
    });
  };

  const toggleDayClosed = (day: string) => {
    setOpeningHours(prev => {
      const daySchedule = prev[day] || { closed: true, slots: [{ open: '06:00', close: '22:00' }] };
      return { ...prev, [day]: { ...daySchedule, closed: !daySchedule.closed } };
    });
  };

  const tabs = [
    { id: 'general', label: 'Allgemein', icon: '⚙️' },
    { id: 'display', label: 'Display', icon: '🖥️' },
    { id: 'opening', label: 'Öffnungszeiten', icon: '🕐' },
    { id: 'special', label: 'Feiertage', icon: '🎄' },
    { id: 'images', label: 'Bilder', icon: '🖼️' },
  ];

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-apple-gray-600 flex items-center gap-3">
            <span className="text-3xl">🏋️</span>
            FitInn Dashboard
          </h1>
          <p className="text-apple-gray-400 mt-1">Verwalte das TV-Display im Fitnessstudio</p>
        </div>
        <div className="flex gap-3">
          <a
            href="https://fitinndashboard.vercel.app"
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 rounded-apple border border-apple-gray-200 text-apple-gray-500 hover:bg-apple-gray-50 transition-colors"
          >
            Vorschau
          </a>
          <button
            onClick={handleLogout}
            className="px-4 py-2 rounded-apple border border-apple-gray-200 text-apple-gray-500 hover:bg-apple-gray-50 transition-colors"
          >
            Abmelden
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
            className={`px-4 py-2 rounded-apple transition-colors whitespace-nowrap ${
              activeTab === tab.id
                ? 'bg-brand text-white'
                : 'bg-apple-gray-50 text-apple-gray-500 hover:bg-apple-gray-100'
            }`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Alert */}
      {alert && (
        <div
          className={`p-4 rounded-apple mb-5 ${
            alert.type === 'success'
              ? 'bg-green-50 border border-green-200 text-green-700'
              : 'bg-red-50 border border-red-200 text-red-700'
          }`}
        >
          {alert.message}
        </div>
      )}

      {/* General Tab */}
      {activeTab === 'general' && (
        <div className="space-y-6">
          {/* Status Card */}
          <div className="bg-white rounded-apple-xl shadow-card p-6">
            <h2 className="text-lg font-semibold mb-5 pb-3 border-b border-apple-gray-100 text-apple-gray-600">
              Server Status
            </h2>
            <div className="grid grid-cols-3 gap-5">
              <div className="bg-apple-gray-50 p-4 rounded-apple">
                <div className="text-xs text-apple-gray-400 mb-1">Status</div>
                <div className="text-base font-medium text-green-600">Online</div>
              </div>
              <div className="bg-apple-gray-50 p-4 rounded-apple">
                <div className="text-xs text-apple-gray-400 mb-1">Layout</div>
                <div className="text-base font-medium text-apple-gray-600 capitalize">{config?.layout || 'Fullscreen'}</div>
              </div>
              <div className="bg-apple-gray-50 p-4 rounded-apple">
                <div className="text-xs text-apple-gray-400 mb-1">Letzte Änderung</div>
                <div className="text-base font-medium text-apple-gray-600">
                  {config?.lastModified ? new Date(config.lastModified).toLocaleString('de-DE') : '-'}
                </div>
              </div>
            </div>
          </div>

          {/* URL Settings */}
          <div className="bg-white rounded-apple-xl shadow-card p-6">
            <h2 className="text-lg font-semibold mb-5 pb-3 border-b border-apple-gray-100 text-apple-gray-600">
              Leaderboard URL
            </h2>
            <div className="mb-5">
              <label className="block mb-2 text-sm text-apple-gray-400">Aktuelle URL:</label>
              <div className="bg-apple-gray-50 p-3 rounded-apple font-mono text-sm break-all text-apple-gray-600">
                {config?.leaderboardUrl || '-'}
              </div>
            </div>
            <div className="mb-5">
              <label className="block mb-2 text-sm text-apple-gray-400">Neue URL:</label>
              <input
                type="url"
                value={newUrl}
                onChange={(e) => setNewUrl(e.target.value)}
                placeholder="https://..."
                className="w-full p-3 border border-apple-gray-200 rounded-apple bg-white text-apple-gray-600 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
              />
            </div>
            <button onClick={saveUrl} className="bg-brand text-white px-6 py-3 rounded-apple hover:bg-brand-dark transition-colors">
              URL Speichern
            </button>
          </div>

          {/* Password Change */}
          <div className="bg-white rounded-apple-xl shadow-card p-6">
            <h2 className="text-lg font-semibold mb-5 pb-3 border-b border-apple-gray-100 text-apple-gray-600">
              Passwort ändern
            </h2>
            <div className="grid grid-cols-3 gap-4 mb-5">
              <div>
                <label className="block mb-2 text-sm text-apple-gray-400">Aktuelles Passwort:</label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full p-3 border border-apple-gray-200 rounded-apple bg-white text-apple-gray-600 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
                />
              </div>
              <div>
                <label className="block mb-2 text-sm text-apple-gray-400">Neues Passwort:</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full p-3 border border-apple-gray-200 rounded-apple bg-white text-apple-gray-600 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
                />
              </div>
              <div>
                <label className="block mb-2 text-sm text-apple-gray-400">Bestätigen:</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full p-3 border border-apple-gray-200 rounded-apple bg-white text-apple-gray-600 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
                />
              </div>
            </div>
            <button onClick={changePassword} className="bg-brand text-white px-6 py-3 rounded-apple hover:bg-brand-dark transition-colors">
              Passwort ändern
            </button>
          </div>
        </div>
      )}

      {/* Display Tab */}
      {activeTab === 'display' && (
        <div className="space-y-6">
          {/* Layout Options */}
          <div className="bg-white rounded-apple-xl shadow-card p-6">
            <h2 className="text-lg font-semibold mb-5 pb-3 border-b border-apple-gray-100 text-apple-gray-600">
              Layout
            </h2>
            <div className="grid grid-cols-3 gap-4 mb-5">
              {[
                { value: 'fullscreen', label: 'Fullscreen', desc: 'Leaderboard mit Overlay-Infos' },
                { value: 'split', label: 'Split-Screen', desc: '70% Leaderboard, 30% Info-Panel' },
                { value: 'ticker', label: 'Mit Ticker', desc: 'Fullscreen + News-Ticker unten' },
              ].map(opt => (
                <label
                  key={opt.value}
                  className={`p-4 rounded-apple-lg border-2 cursor-pointer transition-all ${
                    layout === opt.value
                      ? 'border-brand bg-brand/5'
                      : 'border-apple-gray-200 hover:border-apple-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="layout"
                    value={opt.value}
                    checked={layout === opt.value}
                    onChange={(e) => setLayout(e.target.value as typeof layout)}
                    className="sr-only"
                  />
                  <div className="font-semibold mb-1 text-apple-gray-600">{opt.label}</div>
                  <div className="text-sm text-apple-gray-400">{opt.desc}</div>
                </label>
              ))}
            </div>

            {layout === 'ticker' && (
              <div className="mb-5">
                <label className="block mb-2 text-sm text-apple-gray-400">Ticker-Text:</label>
                <input
                  type="text"
                  value={tickerText}
                  onChange={(e) => setTickerText(e.target.value)}
                  placeholder="Willkommen im FitInn! Heute: Spinning um 18 Uhr..."
                  className="w-full p-3 border border-apple-gray-200 rounded-apple bg-white text-apple-gray-600 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
                />
              </div>
            )}
          </div>

          {/* Info Widgets */}
          <div className="bg-white rounded-apple-xl shadow-card p-6">
            <h2 className="text-lg font-semibold mb-5 pb-3 border-b border-apple-gray-100 text-apple-gray-600">
              Info-Widgets
            </h2>
            <div className="space-y-4">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showClock}
                  onChange={(e) => setShowClock(e.target.checked)}
                  className="w-5 h-5 rounded accent-brand"
                />
                <span className="text-apple-gray-600">Uhrzeit & Datum anzeigen</span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showWeather}
                  onChange={(e) => setShowWeather(e.target.checked)}
                  className="w-5 h-5 rounded accent-brand"
                />
                <span className="text-apple-gray-600">Wetter anzeigen</span>
              </label>

              {showWeather && (
                <div className="ml-8 grid grid-cols-3 gap-4">
                  <div>
                    <label className="block mb-1 text-sm text-apple-gray-400">Stadt:</label>
                    <input
                      type="text"
                      value={weatherCity}
                      onChange={(e) => setWeatherCity(e.target.value)}
                      className="w-full p-2 border border-apple-gray-200 rounded-apple bg-white text-apple-gray-600 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
                    />
                  </div>
                  <div>
                    <label className="block mb-1 text-sm text-apple-gray-400">Latitude:</label>
                    <input
                      type="number"
                      step="0.01"
                      value={weatherLat}
                      onChange={(e) => setWeatherLat(parseFloat(e.target.value))}
                      className="w-full p-2 border border-apple-gray-200 rounded-apple bg-white text-apple-gray-600 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
                    />
                  </div>
                  <div>
                    <label className="block mb-1 text-sm text-apple-gray-400">Longitude:</label>
                    <input
                      type="number"
                      step="0.01"
                      value={weatherLon}
                      onChange={(e) => setWeatherLon(parseFloat(e.target.value))}
                      className="w-full p-2 border border-apple-gray-200 rounded-apple bg-white text-apple-gray-600 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
                    />
                  </div>
                </div>
              )}

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showOpeningStatus}
                  onChange={(e) => setShowOpeningStatus(e.target.checked)}
                  className="w-5 h-5 rounded accent-brand"
                />
                <span className="text-apple-gray-600">Öffnungsstatus anzeigen</span>
              </label>
            </div>
          </div>

          {/* Transition Effects */}
          <div className="bg-white rounded-apple-xl shadow-card p-6">
            <h2 className="text-lg font-semibold mb-5 pb-3 border-b border-apple-gray-100 text-apple-gray-600">
              Übergangseffekt
            </h2>
            <div className="grid grid-cols-4 gap-3">
              {[
                { value: 'fade', label: 'Fade' },
                { value: 'slide', label: 'Slide' },
                { value: 'zoom', label: 'Zoom' },
                { value: 'none', label: 'Kein' },
              ].map(opt => (
                <label
                  key={opt.value}
                  className={`p-3 rounded-apple border-2 cursor-pointer text-center transition-all ${
                    transitionEffect === opt.value
                      ? 'border-brand bg-brand/5 text-brand'
                      : 'border-apple-gray-200 text-apple-gray-500 hover:border-apple-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="transition"
                    value={opt.value}
                    checked={transitionEffect === opt.value}
                    onChange={(e) => setTransitionEffect(e.target.value as typeof transitionEffect)}
                    className="sr-only"
                  />
                  {opt.label}
                </label>
              ))}
            </div>
          </div>

          <button onClick={saveDisplaySettings} className="bg-brand text-white px-6 py-3 rounded-apple hover:bg-brand-dark transition-colors">
            Display-Einstellungen speichern
          </button>
        </div>
      )}

      {/* Opening Hours Tab */}
      {activeTab === 'opening' && (
        <div className="bg-white rounded-apple-xl shadow-card p-6">
          <h2 className="text-lg font-semibold mb-5 pb-3 border-b border-apple-gray-100 text-apple-gray-600">
            Öffnungszeiten
          </h2>
          <p className="text-sm text-apple-gray-400 mb-5">
            Du kannst mehrere Zeitfenster pro Tag hinzufügen (z.B. für Mittagspause).
          </p>
          <div className="space-y-4">
            {WEEKDAYS.map(({ key, label }) => {
              const schedule = openingHours[key] || { closed: true, slots: [] };
              return (
                <div key={key} className="p-4 bg-apple-gray-50 rounded-apple-lg">
                  <div className="flex items-center justify-between mb-3">
                    <div className="font-medium text-lg text-apple-gray-600">{label}</div>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={!schedule.closed}
                        onChange={() => toggleDayClosed(key)}
                        className="w-5 h-5 rounded accent-brand"
                      />
                      <span className="text-sm text-apple-gray-500">Geöffnet</span>
                    </label>
                  </div>

                  {!schedule.closed && (
                    <div className="space-y-2">
                      {schedule.slots.map((slot, slotIndex) => (
                        <div key={slotIndex} className="flex items-center gap-3 bg-white p-2 rounded-apple">
                          <span className="text-sm text-apple-gray-400 w-20">
                            {slotIndex === 0 ? 'Vormittag' : slotIndex === 1 ? 'Nachmittag' : `Zeit ${slotIndex + 1}`}
                          </span>
                          <input
                            type="time"
                            value={slot.open}
                            onChange={(e) => updateSlot(key, slotIndex, 'open', e.target.value)}
                            className="p-2 border border-apple-gray-200 rounded-apple bg-white text-apple-gray-600 text-sm"
                          />
                          <span className="text-apple-gray-400">bis</span>
                          <input
                            type="time"
                            value={slot.close}
                            onChange={(e) => updateSlot(key, slotIndex, 'close', e.target.value)}
                            className="p-2 border border-apple-gray-200 rounded-apple bg-white text-apple-gray-600 text-sm"
                          />
                          {schedule.slots.length > 1 && (
                            <button
                              onClick={() => removeSlot(key, slotIndex)}
                              className="w-8 h-8 rounded-full bg-red-100 text-red-600 hover:bg-red-200 transition-colors flex items-center justify-center"
                              title="Zeitfenster entfernen"
                            >
                              ×
                            </button>
                          )}
                        </div>
                      ))}

                      {schedule.slots.length < 3 && (
                        <button
                          onClick={() => addSlot(key)}
                          className="text-sm text-brand hover:text-brand-dark transition-colors flex items-center gap-1"
                        >
                          + Pause / Weiteres Zeitfenster
                        </button>
                      )}
                    </div>
                  )}

                  {schedule.closed && (
                    <div className="text-red-500 text-sm py-2">Geschlossen</div>
                  )}
                </div>
              );
            })}
          </div>
          <button onClick={saveOpeningHours} className="bg-brand text-white px-6 py-3 rounded-apple hover:bg-brand-dark transition-colors mt-5">
            Öffnungszeiten speichern
          </button>
        </div>
      )}

      {/* Special Days Tab */}
      {activeTab === 'special' && (
        <div className="bg-white rounded-apple-xl shadow-card p-6">
          <h2 className="text-lg font-semibold mb-5 pb-3 border-b border-apple-gray-100 text-apple-gray-600">
            Feiertage & Sonderöffnungszeiten
          </h2>
          <p className="text-sm text-apple-gray-400 mb-5">
            Hier kannst du Feiertage und besondere Tage mit abweichenden Öffnungszeiten eintragen.
            Diese haben Vorrang vor den regulären Öffnungszeiten.
          </p>

          <div className="space-y-4 mb-5">
            {specialDays.map((day, dayIndex) => (
              <div key={dayIndex} className="p-4 bg-apple-gray-50 rounded-apple-lg border border-apple-gray-100">
                <div className="flex items-start gap-4 mb-4">
                  <div className="flex-1">
                    <label className="block mb-1 text-sm text-apple-gray-400">Datum:</label>
                    <input
                      type="date"
                      value={day.date}
                      onChange={(e) => updateSpecialDay(dayIndex, 'date', e.target.value)}
                      className="w-full p-2 border border-apple-gray-200 rounded-apple bg-white text-apple-gray-600 text-sm"
                    />
                  </div>

                  <div className="flex-1">
                    <label className="block mb-1 text-sm text-apple-gray-400">Bezeichnung:</label>
                    <input
                      type="text"
                      value={day.name}
                      onChange={(e) => updateSpecialDay(dayIndex, 'name', e.target.value)}
                      placeholder="z.B. Weihnachten"
                      className="w-full p-2 border border-apple-gray-200 rounded-apple bg-white text-apple-gray-600 text-sm"
                    />
                  </div>

                  <div className="flex-shrink-0 pt-6">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={!day.closed}
                        onChange={(e) => updateSpecialDay(dayIndex, 'closed', !e.target.checked)}
                        className="w-5 h-5 rounded accent-brand"
                      />
                      <span className="text-sm text-apple-gray-500">Geöffnet</span>
                    </label>
                  </div>

                  <div className="flex-shrink-0 pt-6">
                    <button
                      onClick={() => removeSpecialDay(dayIndex)}
                      className="w-8 h-8 rounded-full bg-red-100 text-red-600 hover:bg-red-200 transition-colors flex items-center justify-center"
                      title="Feiertag entfernen"
                    >
                      ×
                    </button>
                  </div>
                </div>

                {!day.closed && (
                  <div className="space-y-2 ml-4">
                    {day.slots.map((slot, slotIndex) => (
                      <div key={slotIndex} className="flex items-center gap-3 bg-white p-2 rounded-apple">
                        <span className="text-sm text-apple-gray-400 w-20">Zeit {slotIndex + 1}:</span>
                        <input
                          type="time"
                          value={slot.open}
                          onChange={(e) => updateSpecialDaySlot(dayIndex, slotIndex, 'open', e.target.value)}
                          className="p-2 border border-apple-gray-200 rounded-apple bg-white text-apple-gray-600 text-sm"
                        />
                        <span className="text-apple-gray-400">bis</span>
                        <input
                          type="time"
                          value={slot.close}
                          onChange={(e) => updateSpecialDaySlot(dayIndex, slotIndex, 'close', e.target.value)}
                          className="p-2 border border-apple-gray-200 rounded-apple bg-white text-apple-gray-600 text-sm"
                        />
                        {day.slots.length > 1 && (
                          <button
                            onClick={() => removeSpecialDaySlot(dayIndex, slotIndex)}
                            className="w-8 h-8 rounded-full bg-red-100 text-red-600 hover:bg-red-200 transition-colors flex items-center justify-center"
                            title="Zeitfenster entfernen"
                          >
                            ×
                          </button>
                        )}
                      </div>
                    ))}

                    {day.slots.length < 3 && (
                      <button
                        onClick={() => addSpecialDaySlot(dayIndex)}
                        className="text-sm text-brand hover:text-brand-dark transition-colors flex items-center gap-1"
                      >
                        + Weiteres Zeitfenster
                      </button>
                    )}
                  </div>
                )}

                {day.closed && (
                  <div className="text-red-500 text-sm ml-4">Geschlossen</div>
                )}
              </div>
            ))}

            {specialDays.length === 0 && (
              <div className="text-center py-8 text-apple-gray-400">
                Keine Feiertage eingetragen. Klicke unten auf "Feiertag hinzufügen".
              </div>
            )}
          </div>

          <div className="flex gap-4">
            <button
              onClick={addSpecialDay}
              className="px-6 py-3 rounded-apple border border-apple-gray-200 text-apple-gray-500 hover:bg-apple-gray-50 transition-colors flex items-center gap-2"
            >
              + Feiertag hinzufügen
            </button>
            <button onClick={saveSpecialDays} className="bg-brand text-white px-6 py-3 rounded-apple hover:bg-brand-dark transition-colors">
              Feiertage speichern
            </button>
          </div>

          {/* Common Holidays Quick-Add */}
          <div className="mt-6 pt-6 border-t border-apple-gray-100">
            <h3 className="text-sm font-semibold mb-3 text-apple-gray-400">Schnellauswahl ({new Date().getFullYear()}):</h3>
            <div className="flex flex-wrap gap-2">
              {getGermanHolidays(new Date().getFullYear()).map(holiday => {
                const exists = specialDays.some(d => d.date === holiday.date);
                return (
                  <button
                    key={holiday.date}
                    onClick={() => {
                      if (!exists) {
                        setSpecialDays(prev => [
                          ...prev,
                          { date: holiday.date, name: holiday.name, closed: true, slots: [{ open: '08:00', close: '18:00' }] },
                        ]);
                      }
                    }}
                    disabled={exists}
                    className={`px-3 py-1 rounded-apple text-sm transition-colors ${
                      exists
                        ? 'bg-green-100 text-green-600 cursor-not-allowed'
                        : 'bg-apple-gray-100 text-apple-gray-500 hover:bg-apple-gray-200'
                    }`}
                  >
                    {exists ? '✓ ' : ''}{holiday.name}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Images Tab */}
      {activeTab === 'images' && (
        <div className="bg-white rounded-apple-xl shadow-card p-6">
          <h2 className="text-lg font-semibold mb-5 pb-3 border-b border-apple-gray-100 text-apple-gray-600">
            Bild-Karussell
          </h2>

          <div className="mb-5">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={carouselEnabled}
                onChange={(e) => setCarouselEnabled(e.target.checked)}
                className="w-5 h-5 rounded accent-brand"
              />
              <span className="text-apple-gray-600">Karussell aktivieren</span>
            </label>
          </div>

          <div className="flex gap-5 mb-5">
            <div className="flex-1">
              <label className="block mb-2 text-sm text-apple-gray-400">
                Leaderboard-Dauer (Sekunden):
              </label>
              <input
                type="number"
                value={leaderboardDuration}
                onChange={(e) => setLeaderboardDuration(parseInt(e.target.value) || 30)}
                min={5}
                max={300}
                className="w-full p-3 border border-apple-gray-200 rounded-apple bg-white text-apple-gray-600 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
              />
            </div>
            <div className="flex-1">
              <label className="block mb-2 text-sm text-apple-gray-400">
                Bild-Dauer (Sekunden):
              </label>
              <input
                type="number"
                value={imageDuration}
                onChange={(e) => setImageDuration(parseInt(e.target.value) || 10)}
                min={3}
                max={60}
                className="w-full p-3 border border-apple-gray-200 rounded-apple bg-white text-apple-gray-600 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
              />
            </div>
          </div>

          <button onClick={saveCarouselSettings} className="bg-brand text-white px-6 py-3 rounded-apple hover:bg-brand-dark transition-colors mb-6">
            Karussell-Einstellungen speichern
          </button>

          {/* Image Grid */}
          <div className="border-t border-apple-gray-100 pt-5">
            <label className="block mb-3 text-sm text-apple-gray-400">Bilder (max. 10):</label>
            <div className="grid grid-cols-4 gap-4">
              {images.map((img) => (
                <div
                  key={img.name}
                  className="aspect-video rounded-apple-lg overflow-hidden relative bg-apple-gray-100 border border-apple-gray-200 group"
                >
                  <img
                    src={img.url}
                    alt={img.name}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <button
                      onClick={() => deleteImage(img.name)}
                      className="w-10 h-10 rounded-full bg-red-500 text-white text-xl flex items-center justify-center hover:bg-red-600"
                    >
                      ×
                    </button>
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 bg-black/70 px-2 py-1 text-xs text-white truncate">
                    {img.name}
                  </div>
                </div>
              ))}

              {images.length < 10 && (
                <label className="aspect-video rounded-apple-lg border-2 border-dashed border-apple-gray-300 flex flex-col items-center justify-center cursor-pointer hover:border-brand transition-colors">
                  <span className="text-4xl text-apple-gray-300">+</span>
                  <span className="text-xs text-apple-gray-400 mt-1">Bild hinzufügen</span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png"
                    onChange={uploadImage}
                    disabled={uploading}
                    className="hidden"
                  />
                </label>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
