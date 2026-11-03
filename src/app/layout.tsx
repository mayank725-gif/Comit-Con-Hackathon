import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Uber Marketplace Brain | Michelangelo ML & Multi-Agent Copilot",
  description: "Real-time predictive marketplace simulation and multi-agent driver assistant",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark h-full antialiased">
      <head>
        <link
          rel="stylesheet"
          href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
          integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
          crossOrigin=""
        />
      </head>
      <body className="min-h-full flex flex-col bg-black text-zinc-100 font-sans">
        {children}
      </body>
    </html>
  );
}
