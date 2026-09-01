import type { Metadata, Viewport } from "next";
import "./globals.css";
import { SwRegister } from "@/components/sw-register";

export const metadata: Metadata = {
  title: "BIG LIGHT — Pointage",
  description: "Dashboard de gestion du pointage des salariés",
  applicationName: "BIG LIGHT",
  appleWebApp: {
    capable: true,
    title: "BIG LIGHT",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  themeColor: "#111110",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className="h-full antialiased">
      <body className="min-h-full">
        <SwRegister />
        {children}
      </body>
    </html>
  );
}
