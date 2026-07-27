import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { PwaRegister } from "@/components/PwaRegister";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Stock & Sales Tracker",
  description: "Inventory, receiving, and PO tracking",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Stock Tracker",
  },
};

// Declares this app as light-themed only, so browsers don't auto-invert
// colors on it (see the color-scheme comment in globals.css).
export const viewport: Viewport = {
  colorScheme: "light",
  themeColor: "#4f46e5",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      {/* suppressHydrationWarning here too: browser extensions like Bitdefender's
          inject bis_skin_checked/bis_register attributes onto <body> and its
          children before React hydrates, which otherwise trips a false-positive
          hydration-mismatch warning that dims the whole page in dev mode. */}
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        <PwaRegister />
        {children}
      </body>
    </html>
  );
}
