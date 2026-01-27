import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Kundenportal | FIT INN Hilfe-Center",
  description: "Verfolgen Sie Ihre Support-Tickets und kommunizieren Sie mit unserem Team.",
};

export default function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-apple-gray-50">
      {children}
    </div>
  );
}
