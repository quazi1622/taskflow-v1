import type { Metadata, Viewport } from "next";
import { Barlow, Barlow_Condensed } from "next/font/google";
import "./globals.css";

// Path based on your TypeScript error: src/components/pwa/PushProvider.tsx
import { PushProvider } from "@/components/pwa/PushProvider";

const barlow = Barlow({
  variable: "--font-barlow",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const barlowCondensed = Barlow_Condensed({
  variable: "--font-barlow-condensed",
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "TaskFlow",
  description: "Team task assignment & push notification PWA",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "TaskFlow",
  },
};

export const viewport: Viewport = {
  themeColor: "#FF6B00",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  
  /**
   * FIX: The PushProvider requires a 'userId' prop to link the 
   * subscription to the correct Supabase row (e.g., "AAN" or "NZZ").
   * Replace the string below with your actual session-fetching logic.
   */
  const currentUserId = "AAN"; 

  return (
    <html
      lang="en"
      className={`${barlow.variable} ${barlowCondensed.variable} h-full`}
    >
      <body className="h-full antialiased">
        <PushProvider userId={currentUserId}>
          {children}
        </PushProvider>
      </body>
    </html>
  );
}