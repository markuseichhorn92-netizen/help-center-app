import InboxLayout from "@/components/admin/inbox/InboxLayout";

export default function Layout({ children }: { children: React.ReactNode }) {
  return <InboxLayout>{children}</InboxLayout>;
}
