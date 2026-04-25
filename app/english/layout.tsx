import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "EnglishLens | AI英語学習",
  description: "あなたのWordファイルやPDFを教材に、AIが英作文問題を生成。Duolingoより深く学べるスマホ対応英語学習アプリ。",
};

// Minimal layout: inherits root <html>/<body> but skips SessionProvider
export default function EnglishLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
