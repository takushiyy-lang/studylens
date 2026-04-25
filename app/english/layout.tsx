import type { Metadata } from "next";
import "../globals.css";

export const metadata: Metadata = {
  title: "EnglishLens | AI英語学習",
  description: "あなたのWordファイルやPDFを教材に、AIが英作文問題を生成。Duolingoより深く学べるスマホ対応英語学習アプリ。",
};

export default function EnglishLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja" className="h-full">
      <body className="min-h-full flex flex-col">
        {children}
      </body>
    </html>
  );
}
