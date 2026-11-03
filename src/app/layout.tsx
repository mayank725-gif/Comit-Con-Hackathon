import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ComitCon Prototype | Hackathon MVP",
  description: "Next-generation intelligent prototype built for 24-hour hackathon",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark h-full antialiased">
      <body className="min-h-full flex flex-col bg-zinc-950 text-zinc-100 font-sans">
        {children}
      </body>
    </html>
  );
}
