import React from "react";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "@stream-io/video-react-sdk/dist/css/styles.css";
import "react-datepicker/dist/react-datepicker.css";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Milton Webinare",
  description: "White-Label-Webinare und Video-Sprechstunden für Milton Ticket.",
  icons: {
    icon: "/icons/logo.svg",
  },
};

export default function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de">
      <body className={`${inter.className} bg-dark-2`}>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
