import type { ComponentType, SVGProps } from "react";
import {
  BookIcon, ChartIcon, FileIcon, GridIcon, InboxIcon, TagIcon, TrashIcon, TvIcon, UsersIcon, BanIcon, SparkleIcon,
} from "./ui/icons";

export interface NavItem {
  key: string;
  label: string;
  href: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  /** Pfade, bei denen der Eintrag als aktiv gilt */
  match: (path: string) => boolean;
}

export const PRIMARY_NAV: NavItem[] = [
  { key: "inbox", label: "Posteingang", href: "/admin/tickets", icon: InboxIcon, match: (p) => p.startsWith("/admin/tickets") },
  { key: "contacts", label: "Kontakte", href: "/admin/contacts", icon: UsersIcon, match: (p) => p.startsWith("/admin/contacts") },
  {
    key: "knowledge",
    label: "Wissen",
    href: "/admin/articles",
    icon: BookIcon,
    match: (p) =>
      p.startsWith("/admin/articles") || p.startsWith("/admin/edit") || p.startsWith("/admin/new") ||
      p.startsWith("/admin/knowledge") || p.startsWith("/admin/categories"),
  },
  { key: "analytics", label: "Auswertung", href: "/admin/analytics", icon: ChartIcon, match: (p) => p.startsWith("/admin/analytics") },
];

// Alles, was bisher im AdminHeader erreichbar war – plus Papierkorb/Spam der Tickets
export const MORE_NAV: Array<{ label: string; href: string; icon: NavItem["icon"]; hint?: string }> = [
  { label: "Dashboard", href: "/admin", icon: GridIcon },
  { label: "Artikel", href: "/admin/articles", icon: BookIcon },
  { label: "Kategorien", href: "/admin/categories", icon: TagIcon },
  { label: "Knowledge (KI-Wissen)", href: "/admin/knowledge", icon: SparkleIcon },
  { label: "Dokumente", href: "/admin/documents", icon: FileIcon },
  { label: "Spam-Liste", href: "/admin/spam", icon: BanIcon },
  { label: "Spam-Ordner (Tickets)", href: "/admin/tickets/spam-folder", icon: BanIcon },
  { label: "Papierkorb (Tickets)", href: "/admin/tickets/trash", icon: TrashIcon },
  { label: "FitInn TV-Dashboard", href: "/admin/fitinn-dashboard", icon: TvIcon },
];
