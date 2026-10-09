import type { SVGProps } from "react";

// Einheitliche Linien-Icons (24x24, currentColor). Dekorativ → aria-hidden.
type P = SVGProps<SVGSVGElement>;
function I({ children, ...p }: P & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...p}
    >
      {children}
    </svg>
  );
}

export const InboxIcon = (p: P) => <I {...p}><path d="M3 13l2.4-7.2A2 2 0 017.3 4.4h9.4a2 2 0 011.9 1.4L21 13v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5z" /><path d="M3 13h5l1 2.5h6l1-2.5h5" /></I>;
export const UsersIcon = (p: P) => <I {...p}><circle cx="9" cy="8" r="3.2" /><path d="M3 20c.4-3.3 3-5.2 6-5.2s5.6 1.9 6 5.2" /><path d="M16 5.2a3.2 3.2 0 010 6M18 14.9c1.7.7 2.8 2.3 3 4.1" /></I>;
export const BookIcon = (p: P) => <I {...p}><path d="M5 4.5A1.5 1.5 0 016.5 3H19v15H6.5A1.5 1.5 0 005 19.5v-15z" /><path d="M5 19.5A1.5 1.5 0 006.5 21H19v-3" /></I>;
export const ChartIcon = (p: P) => <I {...p}><path d="M4 20V4M4 20h16" /><path d="M8 16v-5M12 16V8M16 16v-3" /></I>;
export const MoreIcon = (p: P) => <I {...p}><circle cx="5" cy="12" r="1.2" fill="currentColor" /><circle cx="12" cy="12" r="1.2" fill="currentColor" /><circle cx="19" cy="12" r="1.2" fill="currentColor" /></I>;
export const SearchIcon = (p: P) => <I {...p}><circle cx="11" cy="11" r="6.5" /><path d="M16 16l4.5 4.5" /></I>;
export const PlusIcon = (p: P) => <I {...p}><path d="M12 5v14M5 12h14" /></I>;
export const CheckIcon = (p: P) => <I {...p}><path d="M5 12.5l4.5 4.5L19 7.5" /></I>;
export const CheckAllIcon = (p: P) => <I {...p} viewBox="0 0 28 24"><path d="M2 13l4.5 4.5L16 7.5" /><path d="M10 13l4.5 4.5L24 7.5" /></I>;
export const ClockIcon = (p: P) => <I {...p}><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></I>;
export const MailIcon = (p: P) => <I {...p}><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3.5 7l8.5 6 8.5-6" /></I>;
export const WhatsAppIcon = (p: P) => <I {...p}><path d="M4 20l1.2-3.9A8 8 0 1112 20a8 8 0 01-3.9-1L4 20z" /><path d="M9.2 8.8c.3-.5.8-.4 1 0l.7 1.5c.1.3 0 .5-.2.7l-.4.5c.5 1 1.4 1.9 2.5 2.4l.5-.5c.2-.2.4-.2.7-.1l1.5.7c.4.2.5.7.1 1.1-.7.8-1.8 1-3 .5-2.2-.9-3.9-2.6-4.5-4.5-.3-.9-.1-1.7.1-2.3z" fill="currentColor" stroke="none" /></I>;
export const GlobeIcon = (p: P) => <I {...p}><circle cx="12" cy="12" r="8.5" /><path d="M3.5 12h17M12 3.5c2.5 2.4 3.6 5.2 3.6 8.5s-1.1 6.1-3.6 8.5c-2.5-2.4-3.6-5.2-3.6-8.5S9.5 5.9 12 3.5z" /></I>;
export const BackIcon = (p: P) => <I {...p}><path d="M15 5l-7 7 7 7" /></I>;
export const ChevronIcon = (p: P) => <I {...p}><path d="M6 9l6 6 6-6" /></I>;
export const SendIcon = (p: P) => <I {...p}><path d="M21 3L10.5 13.5M21 3l-6.5 18-4-7.5L3 9.5 21 3z" /></I>;
export const ClipIcon = (p: P) => <I {...p}><path d="M20 11.5l-8 8a5 5 0 01-7-7l8.5-8.5a3.3 3.3 0 014.7 4.7l-8.6 8.6a1.7 1.7 0 01-2.4-2.4l7.9-7.9" /></I>;
export const SparkleIcon = (p: P) => <I {...p}><path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3z" /><path d="M18.5 16l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8.8-2z" /></I>;
export const BoltIcon = (p: P) => <I {...p}><path d="M13 3L5 13.5h6L10 21l8-10.5h-6L13 3z" /></I>;
export const SunIcon = (p: P) => <I {...p}><circle cx="12" cy="12" r="4" /><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6L7 7M17 17l1.4 1.4M18.4 5.6L17 7M7 17l-1.4 1.4" /></I>;
export const MoonIcon = (p: P) => <I {...p}><path d="M20 14.5A8 8 0 019.5 4a8 8 0 1010.5 10.5z" /></I>;
export const BellIcon = (p: P) => <I {...p}><path d="M6 16V11a6 6 0 1112 0v5l1.5 2h-15L6 16z" /><path d="M10 20.5a2.2 2.2 0 004 0" /></I>;
export const BellOffIcon = (p: P) => <I {...p}><path d="M6 16V11c0-1 .2-1.9.7-2.7M9 5.3A6 6 0 0118 11v5l1.5 2H8M10 20.5a2.2 2.2 0 004 0M4 4l16 16" /></I>;
export const TrashIcon = (p: P) => <I {...p}><path d="M4 7h16M9 7V4.5h6V7M6.5 7l.8 12a2 2 0 002 1.9h5.4a2 2 0 002-1.9l.8-12M10 11v6M14 11v6" /></I>;
export const BanIcon = (p: P) => <I {...p}><circle cx="12" cy="12" r="8.5" /><path d="M6 6l12 12" /></I>;
export const CommandIcon = (p: P) => <I {...p}><path d="M9 9V6.5A2.5 2.5 0 106.5 9H9zm0 0h6m-6 0v6m6-6V6.5A2.5 2.5 0 1117.5 9H15zm0 0v6m0 0h2.5a2.5 2.5 0 11-2.5 2.5V15zm0 0H9m0 0v2.5A2.5 2.5 0 116.5 15H9z" /></I>;
export const CloseIcon = (p: P) => <I {...p}><path d="M6 6l12 12M18 6L6 18" /></I>;
export const ForwardIcon = (p: P) => <I {...p}><path d="M14 5l6 6-6 6M20 11H8a4 4 0 00-4 4v3" /></I>;
export const PencilIcon = (p: P) => <I {...p}><path d="M4 20l1-4L16.5 4.5a2 2 0 012.8 2.8L7.8 18.8 4 20z" /></I>;
export const LockIcon = (p: P) => <I {...p}><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 118 0v3" /></I>;
export const UserIcon = (p: P) => <I {...p}><circle cx="12" cy="8" r="3.5" /><path d="M5 20c.5-3.6 3.2-5.5 7-5.5s6.5 1.9 7 5.5" /></I>;
export const StarIcon = (p: P) => <I {...p}><path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.9-5.2-2.8-5.3 2.8 1-5.9-4.2-4.1 5.9-.8L12 3.5z" /></I>;
export const RefreshIcon = (p: P) => <I {...p}><path d="M20 11a8 8 0 00-14.3-4.3L4 9M4 4v5h5M4 13a8 8 0 0014.3 4.3L20 15M20 20v-5h-5" /></I>;
export const GridIcon = (p: P) => <I {...p}><rect x="4" y="4" width="7" height="7" rx="1.5" /><rect x="13" y="4" width="7" height="7" rx="1.5" /><rect x="4" y="13" width="7" height="7" rx="1.5" /><rect x="13" y="13" width="7" height="7" rx="1.5" /></I>;
export const FileIcon = (p: P) => <I {...p}><path d="M7 3h7l5 5v11a2 2 0 01-2 2H7a2 2 0 01-2-2V5a2 2 0 012-2z" /><path d="M14 3v5h5M9 13h6M9 17h6" /></I>;
export const TagIcon = (p: P) => <I {...p}><path d="M3 12V4.5A1.5 1.5 0 014.5 3H12l9 9-8.5 8.5L3 12z" /><circle cx="8" cy="8" r="1.3" fill="currentColor" /></I>;
export const TvIcon = (p: P) => <I {...p}><rect x="3" y="5" width="18" height="12" rx="2" /><path d="M8 21h8M12 17v4" /></I>;
export const ExternalIcon = (p: P) => <I {...p}><path d="M14 4h6v6M20 4l-9 9M18 14v4a2 2 0 01-2 2H6a2 2 0 01-2-2V8a2 2 0 012-2h4" /></I>;
export const LogoutIcon = (p: P) => <I {...p}><path d="M9 4H6a2 2 0 00-2 2v12a2 2 0 002 2h3M16 8l4 4-4 4M20 12H9" /></I>;
export const VolumeIcon = (p: P) => <I {...p}><path d="M4 10v4h3l5 4V6L7 10H4z" /><path d="M16 9a4 4 0 010 6M18.5 6.5a8 8 0 010 11" /></I>;
export const VolumeOffIcon = (p: P) => <I {...p}><path d="M4 10v4h3l5 4V6L7 10H4zM16 9l5 6M21 9l-5 6" /></I>;
export const NoteIcon = (p: P) => <I {...p}><path d="M5 4h14v11l-5 5H5V4z" /><path d="M14 20v-5h5M8 9h8M8 13h4" /></I>;
export const ArrowUpIcon = (p: P) => <I {...p}><path d="M12 19V5M6 11l6-6 6 6" /></I>;
export const ArrowDownIcon = (p: P) => <I {...p}><path d="M12 5v14M6 13l6 6 6-6" /></I>;
export const AlertIcon = (p: P) => <I {...p}><path d="M12 4l9 16H3L12 4z" /><path d="M12 10v4M12 17.2v.1" /></I>;
export const ShareIcon = (p: P) => <I {...p}><circle cx="6" cy="12" r="2.5" /><circle cx="17" cy="6" r="2.5" /><circle cx="17" cy="18" r="2.5" /><path d="M8.2 10.8l6.6-3.6M8.2 13.2l6.6 3.6" /></I>;
