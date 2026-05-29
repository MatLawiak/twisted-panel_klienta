import type { Metadata } from "next";
import { IBM_Plex_Sans, Alata } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

const ibmPlexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-body",
});

const alata = Alata({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-heading",
});

export const metadata: Metadata = {
  title: "Panel klienta — Twisted Pixel",
  description: "Podgląd wyników kampanii reklamowych",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pl" className={`${ibmPlexSans.variable} ${alata.variable}`}>
      <body>
        {children}
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
