// TypeScript types for FitInn Dashboard configuration

export interface TimeSlot {
  open: string;
  close: string;
}

export interface DaySchedule {
  closed: boolean;
  slots: TimeSlot[];
}

export interface OpeningHours {
  [key: string]: DaySchedule;
}

export interface SpecialDay {
  date: string;
  name: string;
  closed: boolean;
  slots: TimeSlot[];
}

export interface FitInnConfig {
  leaderboardUrl: string;
  sessionTimeout: number;
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
  maxImages: number;
  tickerText: string;
  specialDays: SpecialDay[];
}

export interface ImageInfo {
  name: string;
  blobUrl: string;
  uploadedAt: string;
  size: number;
  order?: number;
}

export interface PublicConfig {
  leaderboardUrl: string;
  lastModified: string;
  carouselEnabled: boolean;
  leaderboardDuration: number;
  imageDuration: number;
  images: string[];
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

export const DEFAULT_OPENING_HOURS: OpeningHours = {
  monday: { closed: false, slots: [{ open: '06:00', close: '22:00' }] },
  tuesday: { closed: false, slots: [{ open: '06:00', close: '22:00' }] },
  wednesday: { closed: false, slots: [{ open: '06:00', close: '22:00' }] },
  thursday: { closed: false, slots: [{ open: '06:00', close: '22:00' }] },
  friday: { closed: false, slots: [{ open: '06:00', close: '22:00' }] },
  saturday: { closed: false, slots: [{ open: '08:00', close: '20:00' }] },
  sunday: { closed: false, slots: [{ open: '08:00', close: '20:00' }] },
};

export const DEFAULT_CONFIG: FitInnConfig = {
  leaderboardUrl: 'https://v1.mywellness.com/fitinntrier/leaderboard',
  sessionTimeout: 86400,
  lastModified: '',
  carouselEnabled: false,
  leaderboardDuration: 30,
  imageDuration: 10,
  openingHours: DEFAULT_OPENING_HOURS,
  showClock: true,
  showWeather: true,
  showOpeningStatus: true,
  weatherCity: 'Trier',
  weatherLat: 49.75,
  weatherLon: 6.64,
  layout: 'fullscreen',
  transitionEffect: 'fade',
  maxImages: 10,
  tickerText: '',
  specialDays: [],
};

export const KV_KEYS = {
  CONFIG: 'fitinn:config',
  PASSWORD: 'fitinn:password',
  IMAGES: 'fitinn:images',
  SETUP_COMPLETE: 'fitinn:setup_complete',
} as const;

export const WEEKDAYS = [
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
] as const;

export const WEEKDAY_LABELS: Record<string, string> = {
  monday: 'Montag',
  tuesday: 'Dienstag',
  wednesday: 'Mittwoch',
  thursday: 'Donnerstag',
  friday: 'Freitag',
  saturday: 'Samstag',
  sunday: 'Sonntag',
};
