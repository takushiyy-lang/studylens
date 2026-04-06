import Link from "next/link";

const NAVY = "#0C447C";

export default function PrivacyPage() {
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
            <h1 className="text-2xl font-bold mb-2" style={{ color: NAVY }}>プライバシーポリシー</h1>
            <p className="text-sm text-gray-400">制定日：2026年4月6日</p>
          </div>

          <p className="text-sm text-gray-600 leading-relaxed">
            株式会社ACTASIA（以下「運営者」）は、StudyLens（以下「本サービス」）における利用者の個人情報の取り扱いについて、以下のとおりプライバシーポリシーを定めます。
          </p>

          {/* セクションリスト */}
          {[
            {
              title: "1. 運営者",
              content: (
                <p className="text-sm text-gray-600 leading-relaxed">
                  株式会社ACTASIA<br />
                  お問い合わせ：<a href="mailto:studylens@actasia.biz" className="underline" style={{ color: NAVY }}>studylens@actasia.biz</a>
                </p>
              ),
            },
            {
              title: "2. 収集する情報",
              content: (
                <ul className="text-sm text-gray-600 leading-relaxed list-disc list-inside space-y-1.5">
                  <li>Googleアカウント情報（名前・メールアドレス）— ログイン認証のためのみ使用</li>
                  <li>Google Driveのファイル情報（ファイル名・内容）— 成績分析の目的のみに使用</li>
                  <li>上記以外の個人情報は収集しません</li>
                </ul>
              ),
            },
            {
              title: "3. 利用目的",
              content: (
                <ul className="text-sm text-gray-600 leading-relaxed list-disc list-inside space-y-1.5">
                  <li>Googleアカウントによる本人認証</li>
                  <li>Google Driveのファイルを読み取り、AIによる成績分析・弱点分析を行うこと</li>
                  <li>AIアドバイス・学習プランの提供</li>
                </ul>
              ),
            },
            {
              title: "4. 第三者への提供",
              content: (
                <p className="text-sm text-gray-600 leading-relaxed">
                  運営者は、以下の場合を除き、利用者の情報を第三者に提供しません。
                  <br /><br />
                  <span className="font-medium text-gray-700">例外：Anthropic APIへの送信</span><br />
                  成績分析のため、Google Driveから取得したファイルの内容を Anthropic, Inc. が提供するAI API（Claude）に送信します。送信されるデータはAI分析のためにのみ使用され、Anthropicのプライバシーポリシーに従って取り扱われます。
                </p>
              ),
            },
            {
              title: "5. データの保存について",
              content: (
                <p className="text-sm text-gray-600 leading-relaxed">
                  本サービスは、分析結果を含むすべてのデータを<span className="font-medium text-gray-700">利用者のブラウザ内（セッション）のみに保持</span>します。サーバーへのデータの永続的な保存は行いません。ブラウザを閉じると、すべてのデータは消去されます。
                </p>
              ),
            },
            {
              title: "6. Google Driveへのアクセスについて",
              content: (
                <ul className="text-sm text-gray-600 leading-relaxed list-disc list-inside space-y-1.5">
                  <li>本サービスがGoogle Driveにアクセスする権限は<span className="font-medium text-gray-700">読み取り専用</span>です</li>
                  <li>ファイルの編集・削除・他ユーザーへの共有は行いません</li>
                  <li>利用者が指定したフォルダ内のファイルのみにアクセスします</li>
                  <li>取得したファイルの内容はAI分析に使用した後、サーバーに保存されません</li>
                </ul>
              ),
            },
            {
              title: "7. Cookieについて",
              content: (
                <p className="text-sm text-gray-600 leading-relaxed">
                  本サービスは、ログイン状態を維持するためのセッションCookieを使用します。第三者広告や追跡目的のCookieは使用しません。
                </p>
              ),
            },
            {
              title: "8. プライバシーポリシーの変更",
              content: (
                <p className="text-sm text-gray-600 leading-relaxed">
                  運営者は、必要に応じて本ポリシーを変更することがあります。変更後の内容は本ページに掲載した時点で有効となります。
                </p>
              ),
            },
            {
              title: "9. お問い合わせ",
              content: (
                <p className="text-sm text-gray-600 leading-relaxed">
                  本ポリシーに関するお問い合わせは下記までご連絡ください。<br />
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
            <Link href="/terms" className="text-xs underline" style={{ color: NAVY }}>利用規約</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
