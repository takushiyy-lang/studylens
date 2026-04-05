export const maxDuration = 120;

import { getServerSession } from "next-auth";
import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { authOptions } from "../auth/[...nextauth]/route";
import { extractJson } from "../analyze/route";

const claude = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

/** デフォルト学習計画（パース失敗時フォールバック） */
function defaultPlan() {
  return {
    schoolJudgments: [],
    routine: {
      summary: "毎日45分の学習ルーティン。算数・国語を中心に、理科・社会は週次でまとめて学習する。",
      items: [
        { time: "15分", subject: "算数", importance: "最高", menu: "弱点単元の演習", detail: "比・割合・速さを中心に。天王山期は図形に移行" },
        { time: "15分", subject: "国語", importance: "高", menu: "漢字・語彙・読解", detail: "漢字10字＋読解1題。記述は週3回" },
        { time: "10分", subject: "理科", importance: "中", menu: "弱点単元の確認", detail: "てこ・電気・化学計算を交互に" },
        { time: "5分",  subject: "社会", importance: "継続", menu: "一問一答・時事", detail: "歴史年表・地理白地図の確認" },
      ],
      phases: [
        { period: "3〜5月（守り期）",   reading: "説明文読解の基礎固め",     vocabulary: "慣用句・ことわざ100選" },
        { period: "6〜7月（始動期）",   reading: "物語文・詩の読解強化",     vocabulary: "漢字の読み書き徹底" },
        { period: "8月（天王山）",       reading: "志望校形式の読解演習",     vocabulary: "記述表現の集中練習" },
        { period: "9〜10月（過去問期）", reading: "過去問の読解分析",         vocabulary: "頻出語彙の最終確認" },
        { period: "11〜12月（仕上げ）", reading: "弱点単元の総復習",         vocabulary: "語彙・慣用句の総まとめ" },
        { period: "1月（直前）",         reading: "本番形式の演習のみ",       vocabulary: "暗記カードで最終チェック" },
      ],
    },
    backcast: {
      topPriorities: "算数の比・割合・速さと国語の記述表現が最優先。社会の近現代史も早急に整理が必要。",
      phases: [
        {
          phase: "守り期（3〜5月）",
          months: [
            { month: "3月", kokugo: "説明文読解基礎・慣用句100選スタート", sansu: "比・割合の基本問題を毎日10問", rika: "化学計算の公式整理", shakai: "地理の白地図書き込みスタート", routine: "毎日45分基本ルーティン" },
            { month: "4月", kokugo: "物語文読解・漢字50字確認", sansu: "速さの文章題・単位換算", rika: "てこ・滑車の基本パターン10種", shakai: "産業地図の完成", routine: "算数を20分に増加" },
            { month: "5月", kokugo: "詩・短歌の表現技法整理", sansu: "平面図形・補助線パターン暗記", rika: "電気回路の基礎", shakai: "歴史年表（古代〜江戸）作成", routine: "模試対策を週1回追加" },
          ],
        },
        {
          phase: "始動期（6〜7月）",
          months: [
            { month: "6月", kokugo: "記述表現50字練習スタート", sansu: "立体図形・展開図演習", rika: "気体の性質・発生まとめ", shakai: "歴史年表（明治〜昭和）作成", routine: "理科を15分に増加" },
            { month: "7月", kokugo: "要約100字練習・模試復習", sansu: "場合の数・規則性", rika: "植物・動物のつくり整理", shakai: "公民（三権分立）図解作成", routine: "夏期講習併用" },
          ],
        },
        {
          phase: "天王山（8月）",
          months: [
            { month: "8月", kokugo: "志望校形式の読解・記述集中演習", sansu: "全弱点単元の総演習（比・割合・図形）", rika: "化学・物理の複合問題演習", shakai: "近現代史の流れを完成", routine: "1日2時間以上。弱点に集中" },
          ],
        },
        {
          phase: "過去問期（9〜10月）",
          months: [
            { month: "9月",  kokugo: "志望校過去問の読解傾向分析", sansu: "過去問算数の頻出パターン把握", rika: "過去問理科の頻出分野確認", shakai: "過去問社会の傾向分析", routine: "週1回過去問演習" },
            { month: "10月", kokugo: "記述の採点基準を意識した練習", sansu: "過去問で時間配分を確認", rika: "弱点分野の過去問演習", shakai: "歴史・公民の最終整理", routine: "週2回過去問演習に増加" },
          ],
        },
        {
          phase: "仕上げ（11〜12月）",
          months: [
            { month: "11月", kokugo: "弱点単元の総復習・頻出語彙確認", sansu: "計算ミス撲滅・時間管理", rika: "全分野の一問一答確認", shakai: "頻出事項の最終暗記", routine: "過去問＋弱点復習のバランス" },
            { month: "12月", kokugo: "本番形式の演習のみ", sansu: "本番形式で時間を測って演習", rika: "化学計算・物理の最終確認", shakai: "時事問題の最終確認", routine: "本番のスケジュールに合わせる" },
          ],
        },
        {
          phase: "直前（1月）",
          months: [
            { month: "1月", kokugo: "漢字・語彙カードで最終チェックのみ", sansu: "得意分野で自信をつける演習", rika: "暗記カードで最終確認", shakai: "年表・地図の最終確認", routine: "体調管理最優先。過度な詰め込みNG" },
          ],
        },
      ],
    },
  };
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const accessToken = (session as any)?.accessToken as string | undefined;
    if (!session || !accessToken) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const files: Array<{ name: string }> = body?.files ?? [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const firstResult: any = body?.firstResult ?? {};

    const fileNames = files.map((f) => f.name).join("、");
    const averages = firstResult?.deviationScores?.averages;
    const topWeaknesses = [
      ...(Array.isArray(firstResult?.weaknesses?.sansu) ? firstResult.weaknesses.sansu.slice(0, 3) : []),
      ...(Array.isArray(firstResult?.weaknesses?.kokugo) ? firstResult.weaknesses.kokugo.slice(0, 3) : []),
      ...(Array.isArray(firstResult?.weaknesses?.rika) ? firstResult.weaknesses.rika.slice(0, 2) : []),
      ...(Array.isArray(firstResult?.weaknesses?.shakai) ? firstResult.weaknesses.shakai.slice(0, 2) : []),
    ];

    const context = `
【分析ファイル】${fileNames || "（ファイル名不明）"}
【偏差値平均】${averages ? `国語:${averages.kokugo} 算数:${averages.sansu} 理科:${averages.rika} 社会:${averages.shakai} 4科計:${averages.total}` : "データなし"}
【主な弱点】${topWeaknesses.length > 0 ? topWeaknesses.map((w: { unit?: string; priority?: string }) => `${w.unit}(${w.priority})`).join("、") : "データなし"}
`;

    console.log(`[analyze-detail] starting step2, context: ${context.slice(0, 200)}`);

    const response = await claude.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      system:
        "あなたは中学受験の学習計画の専門家です。提供された成績データをもとに志望校分析・ルーティン・バックキャスト計画を作成し、必ずJSON形式のみで返答してください。コードブロック（```）は使わず、JSONオブジェクトだけを返してください。",
      messages: [
        {
          role: "user",
          content: `以下の成績データをもとに学習計画を作成してください。
JSONのみを返してください。説明文・コードブロックは不要です。

${context}

【要件】
- schoolJudgments: ファイルに志望校情報があれば科目別偏差値差分・判定・対策を返す。なければ空配列
- routine: 毎日45分の時間配分（科目・メニュー・教材・重要度）と6時期の変化表
- backcast: 入試日から逆算した月別タスク（守り期〜直前の6フェーズ）
- データが不足している場合も偏差値・弱点データから推測して必ず全項目を具体的に埋めること

{
  "schoolJudgments": [
    {"name":"第一志望校名","tag":"第一志望","currentJudgment":"C判定","pointsToA":"あと15点","strongSubjects":"国語・理科","weakSubjects":"算数・社会","strategy":"算数の比・割合を集中強化。社会の近現代史を整理する","decisionTiming":"2025年10月の模試で判断","diffs":{"kokugo":-2,"sansu":8,"rika":-3,"shakai":5}}
  ],
  "routine": {
    "summary": "毎日45分の学習ルーティン。算数・国語を中心に、理科・社会は週次でまとめて学習する",
    "items": [
      {"time":"15分","subject":"算数","importance":"最高","menu":"弱点単元の演習","detail":"比・割合・速さを中心に。天王山期は図形に移行"},
      {"time":"15分","subject":"国語","importance":"高","menu":"漢字・語彙・読解","detail":"漢字10字＋読解1題。記述は週3回"},
      {"time":"10分","subject":"理科","importance":"中","menu":"弱点単元の確認","detail":"てこ・電気・化学計算を交互に"},
      {"time":"5分","subject":"社会","importance":"継続","menu":"一問一答・時事","detail":"歴史年表・地理白地図の確認"}
    ],
    "phases": [
      {"period":"3〜5月（守り期）","reading":"説明文読解の基礎固め","vocabulary":"慣用句・ことわざ100選"},
      {"period":"6〜7月（始動期）","reading":"物語文・詩の読解強化","vocabulary":"漢字の読み書き徹底"},
      {"period":"8月（天王山）","reading":"志望校形式の読解演習","vocabulary":"記述表現の集中練習"},
      {"period":"9〜10月（過去問期）","reading":"過去問の読解分析","vocabulary":"頻出語彙の最終確認"},
      {"period":"11〜12月（仕上げ）","reading":"弱点単元の総復習","vocabulary":"語彙・慣用句の総まとめ"},
      {"period":"1月（直前）","reading":"本番形式の演習のみ","vocabulary":"暗記カードで最終チェック"}
    ]
  },
  "backcast": {
    "topPriorities": "算数の比・割合・速さと国語の記述表現が最優先。社会の近現代史も早急に整理が必要",
    "phases": [
      {
        "phase":"守り期（3〜5月）",
        "months": [
          {"month":"3月","kokugo":"説明文読解基礎・慣用句100選スタート","sansu":"比・割合の基本問題を毎日10問","rika":"化学計算の公式整理","shakai":"地理の白地図書き込みスタート","routine":"毎日45分基本ルーティン"},
          {"month":"4月","kokugo":"物語文読解・漢字50字確認","sansu":"速さの文章題・単位換算","rika":"てこ・滑車の基本パターン10種","shakai":"産業地図の完成","routine":"算数を20分に増加"},
          {"month":"5月","kokugo":"詩・短歌の表現技法整理","sansu":"平面図形・補助線パターン暗記","rika":"電気回路の基礎","shakai":"歴史年表（古代〜江戸）作成","routine":"模試対策を週1回追加"}
        ]
      },
      {
        "phase":"始動期（6〜7月）",
        "months": [
          {"month":"6月","kokugo":"記述表現50字練習スタート","sansu":"立体図形・展開図演習","rika":"気体の性質・発生まとめ","shakai":"歴史年表（明治〜昭和）作成","routine":"理科を15分に増加"},
          {"month":"7月","kokugo":"要約100字練習・模試復習","sansu":"場合の数・規則性","rika":"植物・動物のつくり整理","shakai":"公民（三権分立）図解作成","routine":"夏期講習併用"}
        ]
      },
      {
        "phase":"天王山（8月）",
        "months": [
          {"month":"8月","kokugo":"志望校形式の読解・記述集中演習","sansu":"全弱点単元の総演習（比・割合・図形）","rika":"化学・物理の複合問題演習","shakai":"近現代史の流れを完成","routine":"1日2時間以上。弱点に集中"}
        ]
      },
      {
        "phase":"過去問期（9〜10月）",
        "months": [
          {"month":"9月","kokugo":"志望校過去問の読解傾向分析","sansu":"過去問算数の頻出パターン把握","rika":"過去問理科の頻出分野確認","shakai":"過去問社会の傾向分析","routine":"週1回過去問演習"},
          {"month":"10月","kokugo":"記述の採点基準を意識した練習","sansu":"過去問で時間配分を確認","rika":"弱点分野の過去問演習","shakai":"歴史・公民の最終整理","routine":"週2回過去問演習に増加"}
        ]
      },
      {
        "phase":"仕上げ（11〜12月）",
        "months": [
          {"month":"11月","kokugo":"弱点単元の総復習・頻出語彙確認","sansu":"計算ミス撲滅・時間管理","rika":"全分野の一問一答確認","shakai":"頻出事項の最終暗記","routine":"過去問＋弱点復習のバランス"},
          {"month":"12月","kokugo":"本番形式の演習のみ","sansu":"本番形式で時間を測って演習","rika":"化学計算・物理の最終確認","shakai":"時事問題の最終確認","routine":"本番のスケジュールに合わせる"}
        ]
      },
      {
        "phase":"直前（1月）",
        "months": [
          {"month":"1月","kokugo":"漢字・語彙カードで最終チェックのみ","sansu":"得意分野で自信をつける演習","rika":"暗記カードで最終確認","shakai":"年表・地図の最終確認","routine":"体調管理最優先。過度な詰め込みNG"}
        ]
      }
    ]
  }
}

上記はサンプルです。実際の偏差値・弱点データを最大限活用して内容を具体化してください。`,
        },
      ],
    });

    const text =
      response.content[0].type === "text" ? response.content[0].text : "";

    console.log(`[analyze-detail] step2 response len=${text.length}, preview=${text.slice(0, 200)}`);

    const parsed = extractJson(text);
    if (!parsed) {
      console.error("[analyze-detail] Could not extract JSON. Returning default plan.");
      return Response.json(defaultPlan(), { status: 200 });
    }

    console.log("[analyze-detail] step2 success");
    return Response.json(parsed);

  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[analyze-detail] Unexpected error:", msg);
    return Response.json(
      { error: "学習計画の生成中にエラーが発生しました", detail: msg },
      { status: 500 }
    );
  }
}
