import type { Metadata } from "next";
import "./globals.css";
import SessionProvider from "./SessionProvider";

export const metadata: Metadata = {
  title: "StudyLens",
  description: "AIによる学習サポートアプリ",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" className="h-full">
      <body className="min-h-full flex flex-col">
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
