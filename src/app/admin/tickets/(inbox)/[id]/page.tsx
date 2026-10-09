"use client";

import { use } from "react";
import TicketView from "@/components/admin/ticket/TicketView";

export default function TicketDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  // key: beim Wechsel des Tickets wird der gesamte Zustand neu aufgebaut
  return <TicketView key={id} id={id} />;
}
