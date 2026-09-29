import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Deep Sky Atlas",
  description:
    "Messier and Caldwell atlas with a Seestar S30 Pro and S50 Pro field-of-view simulator and a nightly observing planner.",
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
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
