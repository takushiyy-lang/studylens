'use client'
import { useState } from 'react'

const NAVY = '#0C447C'

export default function FeedbackButton() {
  const [open, setOpen] = useState(false)
  const [message, setMessage] = useState('')
  const [name, setName] = useState('')
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')

  async function handleSubmit() {
    if (!message.trim()) return
    setStatus('sending')
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, message }),
      })
      if (!res.ok) throw new Error()
      setStatus('sent')
      setTimeout(() => {
        setOpen(false)
        setStatus('idle')
        setMessage('')
        setName('')
      }, 2000)
    } catch {
      setStatus('error')
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        style={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          zIndex: 999,
          background: NAVY,
          color: 'white',
          border: 'none',
          borderRadius: 32,
          padding: '12px 20px',
          fontSize: 14,
          fontWeight: 700,
          cursor: 'pointer',
          boxShadow: '0 4px 20px rgba(12,68,124,0.35)',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          fontFamily: 'inherit',
        }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
          <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/>
        </svg>
        フィードバック
      </button>

      {open && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 24,
          }}
          onClick={() => setOpen(false)}
        >
          <div
            style={{
              background: 'white', borderRadius: 20, padding: 32,
              width: '100%', maxWidth: 480,
              boxShadow: '0 24px 60px rgba(0,0,0,0.2)',
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: NAVY, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
                  <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/>
                </svg>
              </div>
              <h3 style={{ fontSize: 18, fontWeight: 800, color: '#1f2937', margin: 0 }}>フィードバックを送る</h3>
            </div>
            <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 24, lineHeight: 1.6 }}>
              StudyLensはテスト版です。ご意見・ご要望・不具合報告をお気軽にお送りください。開発チームが直接確認します。
            </p>

            {status === 'sent' ? (
              <div style={{ textAlign: 'center', padding: '32px 0', color: '#16a34a', fontWeight: 700, fontSize: 16 }}>
                ✓ 送信しました。ありがとうございます！
              </div>
            ) : (
              <>
                <input
                  placeholder="お名前（任意）"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  style={{
                    width: '100%', border: '1px solid #e5e7eb', borderRadius: 10,
                    padding: '10px 14px', fontSize: 14, marginBottom: 12,
                    boxSizing: 'border-box', outline: 'none', fontFamily: 'inherit',
                  }}
                />
                <textarea
                  placeholder="ご意見・ご要望・不具合などをお書きください"
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  rows={5}
                  style={{
                    width: '100%', border: '1px solid #e5e7eb', borderRadius: 10,
                    padding: '10px 14px', fontSize: 14, marginBottom: 16,
                    boxSizing: 'border-box', outline: 'none', resize: 'vertical',
                    fontFamily: 'inherit',
                  }}
                />
                {status === 'error' && (
                  <p style={{ fontSize: 13, color: '#dc2626', marginBottom: 12 }}>
                    送信に失敗しました。もう一度お試しください。
                  </p>
                )}
                <div style={{ display: 'flex', gap: 12 }}>
                  <button
                    onClick={() => setOpen(false)}
                    style={{
                      flex: 1, padding: '12px', borderRadius: 12,
                      border: '1px solid #e5e7eb', background: 'white',
                      fontSize: 14, cursor: 'pointer', fontFamily: 'inherit',
                    }}
                  >
                    キャンセル
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={!message.trim() || status === 'sending'}
                    style={{
                      flex: 2, padding: '12px', borderRadius: 12,
                      border: 'none', background: NAVY, color: 'white',
                      fontSize: 14, fontWeight: 700, cursor: 'pointer',
                      opacity: !message.trim() || status === 'sending' ? 0.5 : 1,
                      fontFamily: 'inherit',
                    }}
                  >
                    {status === 'sending' ? '送信中...' : '送信する'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}
