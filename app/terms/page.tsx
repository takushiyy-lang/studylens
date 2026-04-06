import Link from "next/link";

const NAVY = "#0C447C";

export default function TermsPage() {
  return (
    <div style={{ background: "#f5f5f3", minHeight: "100dvh" }}>
      <div className="mx-auto px-4 py-10" style={{ maxWidth: 720 }}>

        {/* ヘッダー */}
        <div className="flex items-center gap-3 mb-8">
          <Link href="/" className="flex items-center gap-2 text-sm font-medium hover:opacity-80 transition-opacity" style={{ color: NAVY }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill={NAVY}><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" /></svg>
            StudyLensに戻る
          </Link>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-8 flex flex-col gap-8">

          {/* タイトル */}
          <div className="border-b border-gray-100 pb-6">
            <h1 className="text-2xl font-bold mb-2" style={{ color: NAVY }}>利用規約</h1>
            <p className="text-sm text-gray-400">制定日：2026年4月6日</p>
          </div>

          <p className="text-sm text-gray-600 leading-relaxed">
            本利用規約（以下「本規約」）は、株式会社ACTASIA（以下「運営者」）が提供するStudyLens（以下「本サービス」）の利用条件を定めるものです。本サービスをご利用になる前に、本規約をよくお読みください。
          </p>

          {[
            {
              title: "第1条（適用）",
              content: (
                <p className="text-sm text-gray-600 leading-relaxed">
                  本規約は、利用者と運営者との間の本サービスの利用に関する一切の関係に適用されます。本サービスにログインした時点で、利用者は本規約に同意したものとみなします。
                </p>
              ),
            },
            {
              title: "第2条（利用条件）",
              content: (
                <ul className="text-sm text-gray-600 leading-relaxed list-disc list-inside space-y-1.5">
                  <li>本サービスはGoogleアカウントを持つ保護者・学習者を対象としています</li>
                  <li>本サービスは中学受験の学習支援を目的としたものです</li>
                  <li>利用者は自身のGoogleアカウントを使用してログインするものとします</li>
                </ul>
              ),
            },
            {
              title: "第3条（禁止事項）",
              content: (
                <>
                  <p className="text-sm text-gray-600 leading-relaxed mb-2">利用者は以下の行為を行ってはなりません。</p>
                  <ul className="text-sm text-gray-600 leading-relaxed list-disc list-inside space-y-1.5">
                    <li>本サービスへの不正アクセスまたはそれを試みる行為</li>
                    <li>他の利用者の利用を妨害する行為</li>
                    <li>本サービスの商用利用（無断での転売・再配布等）</li>
                    <li>運営者または第三者の知的財産権を侵害する行為</li>
                    <li>法令または公序良俗に違反する行為</li>
                    <li>本サービスの運営を妨げるおそれのある行為</li>
                  </ul>
                </>
              ),
            },
            {
              title: "第4条（免責事項）",
              content: (
                <ul className="text-sm text-gray-600 leading-relaxed list-disc list-inside space-y-1.5">
                  <li>本サービスが提供する分析結果・学習プランは、AIによる参考情報です。特定の学校への合格を保証するものではありません</li>
                  <li>本サービスを利用したことにより生じた損害について、運営者は責任を負いません</li>
                  <li>Google Driveのデータ取得・AI分析の結果の正確性・完全性を保証しません</li>
                  <li>本サービスは予告なくメンテナンスや停止を行う場合があります</li>
                </ul>
              ),
            },
            {
              title: "第5条（サービスの変更・終了）",
              content: (
                <p className="text-sm text-gray-600 leading-relaxed">
                  運営者は、利用者への事前通知なく、本サービスの内容を変更、または本サービスの提供を終了することができます。これにより利用者に生じた損害について、運営者は責任を負いません。
                </p>
              ),
            },
            {
              title: "第6条（Google APIの利用）",
              content: (
                <p className="text-sm text-gray-600 leading-relaxed">
                  本サービスはGoogle APIを利用します。本サービスの利用は、<a href="https://policies.google.com/terms" target="_blank" rel="noopener noreferrer" className="underline" style={{ color: NAVY }}>Googleの利用規約</a>にも従うものとします。また、Google Driveへのアクセスは読み取り専用であり、ファイルの変更・削除は行いません。
                </p>
              ),
            },
            {
              title: "第7条（個人情報の取り扱い）",
              content: (
                <p className="text-sm text-gray-600 leading-relaxed">
                  個人情報の取り扱いについては、別途定める<Link href="/privacy" className="underline" style={{ color: NAVY }}>プライバシーポリシー</Link>に従います。
                </p>
              ),
            },
            {
              title: "第8条（規約の変更）",
              content: (
                <p className="text-sm text-gray-600 leading-relaxed">
                  運営者は、必要と判断した場合には、利用者への事前通知なく本規約を変更することができます。変更後の規約は本ページに掲載した時点で効力を生じるものとします。
                </p>
              ),
            },
            {
              title: "第9条（お問い合わせ）",
              content: (
                <p className="text-sm text-gray-600 leading-relaxed">
                  本規約に関するお問い合わせは下記までご連絡ください。<br />
                  <a href="mailto:studylens@actasia.biz" className="underline mt-1 inline-block" style={{ color: NAVY }}>studylens@actasia.biz</a>
                </p>
              ),
            },
          ].map(({ title, content }) => (
            <section key={title} className="flex flex-col gap-3">
              <h2 className="text-base font-bold text-gray-800">{title}</h2>
              {content}
            </section>
          ))}

          {/* フッター */}
          <div className="border-t border-gray-100 pt-5 flex items-center justify-between">
            <p className="text-xs text-gray-400">StudyLens — 運営者：株式会社ACTASIA</p>
            <Link href="/privacy" className="text-xs underline" style={{ color: NAVY }}>プライバシーポリシー</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
