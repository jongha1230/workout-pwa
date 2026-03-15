import type { Metadata } from "next";
import {
  IBM_Plex_Mono,
  Noto_Sans_KR,
  Rajdhani,
} from "next/font/google";
import "./globals.css";
import ServiceWorkerRegister from "@/components/pwa/sw-register";
import SyncEngineBootstrap from "@/components/sync/sync-engine-bootstrap";

const notoSansKr = Noto_Sans_KR({
  variable: "--font-noto-sans-kr",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

const rajdhani = Rajdhani({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-ibm-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "Workout PWA",
  description: "오프라인 우선 설계를 반영한 트레이닝 기록 PWA",
  icons: {
    icon: [
      {
        url: "/icons/favicon-32x32.png",
        sizes: "32x32",
        type: "image/png",
      },
      {
        url: "/icons/favicon-48x48.png",
        sizes: "48x48",
        type: "image/png",
      },
    ],
    apple: [{ url: "/icons/icon-192.png", sizes: "192x192" }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <head>
        <link rel="manifest" href="/manifest.webmanifest" />
        <meta name="theme-color" content="#061014" />
      </head>
      <body
        className={`${notoSansKr.variable} ${rajdhani.variable} ${ibmPlexMono.variable} min-h-screen antialiased`}
      >
        <ServiceWorkerRegister />
        <SyncEngineBootstrap />
        {children}
      </body>
    </html>
  );
}
