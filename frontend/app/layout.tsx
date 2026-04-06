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
          <header className="panel hero-grid mb-6 overflow-hidden rounded-[28px] shadow-soft">
            <div className="flex flex-col gap-6 px-6 py-6 sm:px-8 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-3xl">
                <p className="mb-3 text-sm font-medium uppercase tracking-[0.28em] text-leaf/80">
                  Laboratory Cultivation System
                </p>
                <h1 className="font-serif text-3xl leading-tight sm:text-4xl">
                  栽培監視とデータ収集を、研究室のローカル環境で先に完成させる
                </h1>
                <p className="mt-3 max-w-2xl text-sm leading-7 text-ink/70 sm:text-base">
                  ダミーデータで全体導線を先に固め、後から Raspberry Pi と実センサに置き換えやすい構成にしています。
                </p>
              </div>
              <nav className="flex flex-wrap gap-2">
                {navItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="rounded-full border border-ink/10 bg-white/70 px-4 py-2 text-sm font-medium text-ink transition hover:border-leaf/30 hover:bg-white"
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

