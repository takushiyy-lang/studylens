import { NextRequest } from 'next/server'

export async function POST(req: NextRequest) {
  const webhookUrl = process.env.SLACK_FEEDBACK_WEBHOOK_URL
  if (!webhookUrl) {
    return Response.json({ error: 'Webhook not configured' }, { status: 500 })
  }

  const body = await req.json()
  const name: string = body?.name?.trim() || '匿名'
  const message: string = body?.message?.trim()

  if (!message) {
    return Response.json({ error: 'Message required' }, { status: 400 })
  }

  const text = `*📬 StudyLens フィードバック*\n*送信者:* ${name}\n*メッセージ:*\n${message}`

  const res = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  })

  if (!res.ok) {
    return Response.json({ error: 'Slack error' }, { status: 500 })
  }

  return Response.json({ ok: true })
}
