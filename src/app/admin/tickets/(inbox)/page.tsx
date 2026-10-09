import { InboxIcon } from "@/components/admin/ui/icons";

// Desktop: rechte Fläche, solange keine Anfrage gewählt ist (Handy zeigt hier nur die Liste)
export default function TicketsIndexPage() {
  return (
    <div className="flex h-full items-center justify-center bg-adm-bg p-8 text-center">
      <div className="max-w-xs">
        <span className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-adm-surface-2 text-adm-teal dark:text-adm-apricot">
          <InboxIcon width={32} height={32} />
        </span>
        <h2 className="text-xl font-extrabold">Anfrage wählen</h2>
        <p className="mt-2 text-sm text-adm-mut">
          Links eine Anfrage öffnen. Mit <kbd className="adm-mono rounded bg-adm-surface-2 px-1.5 py-0.5 text-xs">Strg/⌘ K</kbd> springst du per Tastatur zu Tickets und Befehlen.
        </p>
      </div>
    </div>
  );
}
