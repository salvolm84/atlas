import type { Metadata, Viewport } from "next";
import "./globals.css";
import { RegisterServiceWorker } from "./register-sw";

export const metadata: Metadata = {
  title: "Deep Sky Atlas",
  description:
    "Messier and Caldwell atlas with a smart-telescope field-of-view simulator (Seestar, DWARF, Vespera, Unistellar, Origin), a nightly observing planner and a cloud forecast.",
  manifest: "/manifest.webmanifest",
  applicationName: "Deep Sky Atlas",
  authors: [{ name: "Salvatore La Malfa" }],
  appleWebApp: {
    capable: true,
    title: "Deep Sky",
    // The atlas is dark throughout, so the iOS status bar should be too.
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    shortcut: "/favicon.svg",
    apple: "/icon-192.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#050914",
  // Installed on a phone, the atlas should reach under the notch; the page is
  // dark to the edges anyway.
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
        <RegisterServiceWorker />
      </body>
    </html>
  );
}
