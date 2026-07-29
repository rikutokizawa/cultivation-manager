import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "Cultivation Manager",
  description: "Laboratory cultivation monitoring and data collection dashboard",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className="font-sans text-white antialiased">
        <div className="mx-auto flex min-h-screen w-full max-w-[1800px] flex-col px-4 py-5 sm:px-6 lg:px-8">
          <main className="flex-1">{children}</main>
        </div>
      </body>
    </html>
  );
}
