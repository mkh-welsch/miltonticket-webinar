import React from "react";
import StreamVideoProvider from "@/providers/stream-client-provider";
import type { Metadata } from "next";
import { getWebinarSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Milton Webinare",
  description: "White-Label-Webinare und Video-Sprechstunden für Milton Ticket.",
  icons: {
    icon: "/icons/logo.svg",
  },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await getWebinarSession();
  if (!session) redirect("/login");
  return (
    <main>
      <StreamVideoProvider user={session}>{children}</StreamVideoProvider>
    </main>
  );
}
