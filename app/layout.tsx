import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { StoreBoot } from "@/components/shell/StoreBoot";
import { TabBar } from "@/components/shell/TabBar";
import { THEME_BOOT_SCRIPT } from "@/lib/theme";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Science Digest", template: "%s | Science Digest" },
  description:
    "Clinical research in five-minute reads, each with a simulator and a protocol you can track. Scored by how strong the evidence is.",
  applicationName: "Science Digest",
  appleWebApp: { capable: true, title: "Science Digest", statusBarStyle: "black-translucent" },
  icons: { icon: "/icons/icon-192.png", apple: "/icons/apple-touch-icon.png" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // data-theme is set before first paint by the script below, from the saved
    // choice or the device setting. suppressHydrationWarning covers that one attribute.
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />
      </head>
      <body>
        <StoreBoot />
        <div className="mx-auto min-h-dvh w-full max-w-[32rem] px-4 pb-28 pt-[max(1rem,env(safe-area-inset-top))]">
          {children}
        </div>
        <Suspense fallback={null}>
          <TabBar />
        </Suspense>
      </body>
    </html>
  );
}
