'use client'
import { useState, useRef } from 'react'

const NAVY = '#0C447C'

interface Props {
  onSend: (text: string) => void
  loading: boolean
  suggestions: string[]
}

export default function ChatInput({ onSend, loading, suggestions }: Props) {
  const [value, setValue] = useState('')
  const [isComposing, setIsComposing] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleSend = () => {
    const text = value.trim()
    if (!text || loading || isComposing) return
    onSend(text)
    setValue('')
    inputRef.current?.focus()
  }

  return (
    <div>
      {/* サジェストボタン */}
      <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', padding: '8px 12px', scrollbarWidth: 'none' }}>
        {suggestions.map(s => (
          <button
            key={s}
            onClick={() => onSend(s)}
            disabled={loading}
            style={{
              whiteSpace: 'nowrap',
              fontSize: '12px',
              padding: '5px 12px',
              borderRadius: '20px',
              border: `1px solid ${NAVY}`,
              background: 'white',
              color: NAVY,
              cursor: 'pointer',
              flexShrink: 0,
              opacity: loading ? 0.5 : 1,
            }}
          >
            {s}
          </button>
        ))}
      </div>

      {/* 入力フォーム */}
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', padding: '10px 12px', borderTop: '1px solid #eee' }}>
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onCompositionStart={() => setIsComposing(true)}
          onCompositionEnd={(e) => {
            setIsComposing(false)
            setValue(e.currentTarget.value)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !isComposing) {
              e.preventDefault()
              handleSend()
            }
          }}
          placeholder="メッセージを入力..."
          disabled={loading}
          style={{
            flex: 1,
            padding: '10px 16px',
            fontSize: '14px',
            border: '1px solid #ddd',
            borderRadius: '24px',
            outline: 'none',
            background: '#f5f5f3',
            fontFamily: 'inherit',
            cursor: 'text',
          }}
        />
        <button
          onClick={handleSend}
          disabled={loading}
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            background: NAVY,
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            opacity: loading ? 0.5 : 1,
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M22 2L11 13" stroke="white" strokeWidth="2" strokeLinecap="round" />
            <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
    </div>
  )
}
