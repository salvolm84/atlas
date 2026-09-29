import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Atlante Deep Sky · Modena",
  description:
    "Atlante Messier e Caldwell, simulatore FOV Seestar S30 Pro e S50 Pro e pianificatore notturno da Modena.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="it">
      <body className="antialiased">{children}</body>
    </html>
  );
}
