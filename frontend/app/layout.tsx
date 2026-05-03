import type { Metadata } from "next";
import Link from "next/link";

import "./globals.css";

export const metadata: Metadata = {
  title: "Cultivation Manager",
  description: "Laboratory cultivation monitoring and data collection dashboard",
};

const navItems = [
  { href: "/", label: "Dashboard" },
  { href: "/monitor", label: "Monitor" },
  { href: "/manual-input", label: "Manual Input" },
  { href: "/export", label: "Export" },
];

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className="font-sans text-white antialiased">
        <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 pb-10 pt-5 sm:px-6 lg:px-8">
          <header className="mb-5 border-b border-white/10 pb-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="h-2.5 w-2.5 rounded-full bg-white" />
                <p className="text-sm font-semibold tracking-[0.04em] text-white">
                  栽培モニタリング
                </p>
              </div>
              <nav className="flex flex-wrap justify-end gap-2">
                {navItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white/88 transition hover:border-white/25 hover:bg-white/10"
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>
            </div>
          </header>
          <main className="flex-1">{children}</main>
        </div>
      </body>
    </html>
  );
}
