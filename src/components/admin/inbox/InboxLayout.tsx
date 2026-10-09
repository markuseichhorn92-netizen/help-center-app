"use client";

import { Suspense, type ReactNode } from "react";
import { useParams } from "next/navigation";
import InboxList from "./InboxList";
import { cx } from "../ui/Pills";

/**
 * Zwei-Spalten-Rahmen: links Posteingang, rechts Ticket (Handy: nur eins von beiden).
 * Die Ticket-Ansicht bringt ihre Kundenspalte selbst mit → Desktop = 3 Spalten.
 */
export default function InboxLayout({ children }: { children: ReactNode }) {
  const params = useParams<{ id?: string }>();
  const hasTicket = !!params?.id;
  return (
    <div className="flex h-dvh min-h-0">
      <section
        aria-label="Posteingang"
        className={cx(
          "relative min-h-0 w-full shrink-0 border-adm-line bg-adm-surface lg:w-[360px] lg:border-r xl:w-[390px]",
          hasTicket ? "hidden lg:block" : "block"
        )}
      >
        <Suspense fallback={null}>
          <InboxList />
        </Suspense>
      </section>
      <div className={cx("min-h-0 min-w-0 flex-1", hasTicket ? "block" : "hidden lg:block")}>{children}</div>
    </div>
  );
}
