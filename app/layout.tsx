import type { Metadata } from "next";
import "./globals.css";
import SessionProvider from "./SessionProvider";
import { GoogleAnalytics } from "@next/third-parties/google";

export const metadata: Metadata = {
  title: {
    default: "StudyLens | AI中学受験サポート",
    template: "%s | StudyLens",
  },
  description: "模試・テスト結果をGoogle Driveに入れるだけ。AIが弱点を自動分析し、今日から何をすべきか具体的なアドバイスをお届けします。中学受験専用AI学習サポートアプリ。",
  verification: {
    google: "tMQSoq4wQR-gRnP3nGwG1sLs3syFG67QNq4QZ9d4J48",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const gaId = process.env.NEXT_PUBLIC_GA_ID;
  return (
    <html lang="ja" className="h-full">
      <body className="min-h-full flex flex-col">
        <SessionProvider>{children}</SessionProvider>
        {gaId && <GoogleAnalytics gaId={gaId} />}
      </body>
    </html>
  );
}
