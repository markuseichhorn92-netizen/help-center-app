import type { SVGProps } from 'react';

const base: SVGProps<SVGSVGElement> = {
  viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8,
  strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true, width: '1em', height: '1em',
};
const P = (d: string) => function Icon(props: SVGProps<SVGSVGElement>) {
  return <svg {...base} {...props}><path d={d} /></svg>;
};

export const SearchIcon = (p: SVGProps<SVGSVGElement>) => <svg {...base} {...p}><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></svg>;
export const DocIcon = (p: SVGProps<SVGSVGElement>) => <svg {...base} {...p}><path d="M7 3h7l5 5v13H7z" /><path d="M14 3v5h5M10 13h6M10 17h6" /></svg>;
export const CardIcon = (p: SVGProps<SVGSVGElement>) => <svg {...base} {...p}><rect x="3" y="6" width="18" height="13" rx="2" /><path d="M3 10h18M7 15h3" /></svg>;
export const DumbbellIcon = P('M3 9v6M6 7v10M18 7v10M21 9v6M6 12h12');
export const HomeIcon = (p: SVGProps<SVGSVGElement>) => <svg {...base} {...p}><path d="M4 11l8-7 8 7v9H4z" /><path d="M10 20v-6h4v6" /></svg>;
export const UserIcon = (p: SVGProps<SVGSVGElement>) => <svg {...base} {...p}><circle cx="12" cy="8" r="4" /><path d="M4 21c1-4 4-6 8-6s7 2 8 6" /></svg>;
export const DotsIcon = (p: SVGProps<SVGSVGElement>) => <svg {...base} {...p}><circle cx="6" cy="12" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="18" cy="12" r="1" /></svg>;
export const PhoneIcon = P('M6 3h4l2 5-2.5 1.5a11 11 0 005 5L16 12l5 2v4a2 2 0 01-2 2A16 16 0 014 5a2 2 0 012-2z');
export const SparkIcon = P('M12 3l2 6 6 2-6 2-2 6-2-6-6-2 6-2z');
export const WhatsAppIcon = (p: SVGProps<SVGSVGElement>) => <svg {...base} {...p}><path d="M4 20l1.3-4.2A8 8 0 1 1 8.4 19z" /><path d="M9 9c0 3 3 6 6 6l1-1.5-2-1-1 .8c-.8-.4-1.6-1.2-2-2l.8-1-1-2z" /></svg>;
export const ChevronIcon = P('M9 5l7 7-7 7');
export const BackIcon = P('M15 5l-7 7 7 7');
export const CheckIcon = P('M5 12l5 5 9-10');
export const ThumbUpIcon = P('M7 11v9H4v-9zM7 11l4-8c2 0 3 1 3 3l-.5 3H19a2 2 0 012 2l-1 6a2 2 0 01-2 2H7');
export const ThumbDownIcon = P('M7 13V4H4v9zM7 13l4 8c2 0 3-1 3-3l-.5-3H19a2 2 0 002-2l-1-6a2 2 0 00-2-2H7');
export const MailIcon = (p: SVGProps<SVGSVGElement>) => <svg {...base} {...p}><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 7l9 6 9-6" /></svg>;
export const SunIcon = (p: SVGProps<SVGSVGElement>) => <svg {...base} {...p}><circle cx="12" cy="12" r="4" /><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4L7 17M17 7l1.4-1.4" /></svg>;
export const MoonIcon = P('M20 14.5A8 8 0 019.5 4a8 8 0 1010.5 10.5z');
export const ClockIcon = (p: SVGProps<SVGSVGElement>) => <svg {...base} {...p}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>;
export const PauseIcon = (p: SVGProps<SVGSVGElement>) => <svg {...base} {...p}><rect x="6" y="5" width="4" height="14" rx="1" /><rect x="14" y="5" width="4" height="14" rx="1" /></svg>;
export const KeyIcon = (p: SVGProps<SVGSVGElement>) => <svg {...base} {...p}><circle cx="8" cy="15" r="4" /><path d="M11 12l9-9M16 7l3 3" /></svg>;
export const ExternalIcon = P('M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 01-1 1H5a1 1 0 01-1-1V7a1 1 0 011-1h5');

export function CategoryIcon({ icon, ...p }: { icon: string } & SVGProps<SVGSVGElement>) {
  switch (icon) {
    case 'card': return <CardIcon {...p} />;
    case 'dumbbell': return <DumbbellIcon {...p} />;
    case 'building': return <HomeIcon {...p} />;
    case 'user': return <UserIcon {...p} />;
    default: return <DotsIcon {...p} />;
  }
}
