import { useState } from 'react'

export default function InputArea({ onSend, isLoading }) {
  const [text, setText] = useState('')

  const handleSubmit = () => {
    if (text.trim() && !isLoading) {
      onSend(text)
      setText('')
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <div style={styles.container}>
      <div style={styles.inputWrapper}>
        <textarea
          style={styles.textarea}
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask me anything... I'll plan my approach and get back to you."
          rows={1}
          disabled={isLoading}
        />

        <button
          style={{
            ...styles.sendBtn,
            opacity: (!text.trim() || isLoading) ? 0.4 : 1,
            cursor: (!text.trim() || isLoading) ? 'not-allowed' : 'pointer',
          }}
          onClick={handleSubmit}
          disabled={!text.trim() || isLoading}
        >
          {isLoading ? (
            <div style={styles.spinner} />
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
            </svg>
          )}
        </button>
      </div>

      <p style={styles.hint}>
        Powered by GPT-4o  |  Observe → Plan → Think → Execute
      </p>
    </div>
  )
}

const styles = {
  container: {
    padding: '16px 20px',
    borderTop: '1px solid var(--border-color)',
    background: 'var(--bg-secondary)',
  },
  inputWrapper: {
    display: 'flex',
    alignItems: 'flex-end',
    gap: '10px',
    padding: '10px 12px',
    background: 'var(--bg-tertiary)',
    border: '1px solid var(--border-light)',
    borderRadius: 'var(--radius-md)',
    transition: 'border-color 0.2s',
  },
  textarea: {
    flex: 1,
    background: 'transparent',
    border: 'none',
    color: 'var(--text-primary)',
    fontSize: '14px',
    fontFamily: 'inherit',
    resize: 'none',
    outline: 'none',
    lineHeight: '1.5',
    maxHeight: '120px',
    minHeight: '24px',
  },
  sendBtn: {
    width: '38px',
    height: '38px',
    borderRadius: 'var(--radius-sm)',
    background: 'var(--nvidia-green)',
    border: 'none',
    color: '#000',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    transition: 'var(--transition)',
  },
  spinner: {
    width: '18px',
    height: '18px',
    border: '2px solid rgba(0,0,0,0.2)',
    borderTopColor: '#000',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
  hint: {
    textAlign: 'center',
    fontSize: '11px',
    color: 'var(--text-muted)',
    marginTop: '8px',
  },
}
