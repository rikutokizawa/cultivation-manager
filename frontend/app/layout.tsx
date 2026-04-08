import type { Metadata } from "next";
import Link from "next/link";

import "./globals.css";

export const metadata: Metadata = {
  title: "Cultivation Manager",
  description: "Laboratory cultivation monitoring and data collection dashboard",
};

const navItems = [
  { href: "/", label: "Dashboard" },
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
      <body className="font-sans text-ink antialiased">
        <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 pb-10 pt-5 sm:px-6 lg:px-8">
          <header className="mb-4">
            <div className="flex flex-wrap justify-end gap-2">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-full border border-ink/10 bg-white/70 px-4 py-2 text-sm font-medium text-ink transition hover:border-leaf/30 hover:bg-white"
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </header>
          <main className="flex-1">{children}</main>
        </div>
      </body>
    </html>
  );
}
