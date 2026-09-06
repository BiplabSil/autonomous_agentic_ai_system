import { useState, useRef, useEffect } from 'react'
import Header from './components/Header'
import ChatInterface from './components/ChatInterface'
import InputArea from './components/InputArea'
import Sidebar from './components/Sidebar'

const API_BASE = '/api'

export default function App() {
  const [messages, setMessages] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [clarification, setClarification] = useState(null)
  const [currentPlan, setCurrentPlan] = useState([])
  const [showSidebar, setShowSidebar] = useState(true)
  const messagesEndRef = useRef(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const addMessage = (role, content, extra = {}) => {
    setMessages(prev => [...prev, { role, content, ...extra, id: Date.now() }])
  }

  const handleSend = async (text) => {
    if (!text.trim() || isLoading) return

    // Add user message
    addMessage('user', text)
    setIsLoading(true)
    setClarification(null)

    try {
      const history = messages.map(m => ({
        role: m.role,
        content: m.content,
      }))

      const res = await fetch(`${API_BASE}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, history }),
      })

      const data = await res.json()

      if (data.type === 'clarification') {
        // Agent needs more info - show steps if available
        addMessage('assistant', data.question, {
          steps: data.steps || [],
          isClarification: true,
        })
        setClarification({
          question: data.question,
          options: data.options || [],
          originalMessage: text,
        })
        // Extract plan from steps if available
        const planStep = (data.steps || []).find(s => s.name === 'plan')
        if (planStep?.meta?.plan) {
          setCurrentPlan(planStep.meta.plan)
        }
      } else {
        // Got final response with steps
        addMessage('assistant', data.response, {
          plan: data.plan || [],
          steps: data.steps || [],
        })
        // Update plan from steps if available (shows plan earlier)
        const planStep = (data.steps || []).find(s => s.name === 'plan')
        if (planStep?.meta?.plan) {
          setCurrentPlan(planStep.meta.plan)
        } else if (data.plan?.length > 0) {
          setCurrentPlan(data.plan)
        }
      }
    } catch (err) {
      addMessage('assistant', `Error: ${err.message}. Make sure the backend is running on port 8000.`)
    } finally {
      setIsLoading(false)
    }
  }

  const handleClarificationAnswer = async (answer) => {
    if (!clarification) return

    const fullMessage = `${clarification.originalMessage}\n\nMy answer: ${answer}`
    setClarification(null)
    await handleSend(fullMessage)
  }

  return (
    <div style={styles.app}>
      <Header onToggleSidebar={() => setShowSidebar(!showSidebar)} />

      <div style={styles.main}>
        {showSidebar && (
          <Sidebar plan={currentPlan} />
        )}

        <div style={styles.chatArea}>
          <ChatInterface
            messages={messages}
            isLoading={isLoading}
            messagesEndRef={messagesEndRef}
          />

          {clarification && (
            <ClarificationBox
              question={clarification.question}
              options={clarification.options}
              onAnswer={handleClarificationAnswer}
            />
          )}

          <InputArea onSend={handleSend} isLoading={isLoading} />
        </div>
      </div>
    </div>
  )
}

function ClarificationBox({ question, options, onAnswer }) {
  const [textInput, setTextInput] = useState('')

  const handleSubmit = () => {
    if (options.length > 0) return
    if (textInput.trim()) {
      onAnswer(textInput)
      setTextInput('')
    }
  }

  return (
    <div style={styles.clarificationBox}>
      <div style={styles.clarificationIcon}>?</div>
      <p style={styles.clarificationText}>{question}</p>

      {options.length > 0 ? (
        <div style={styles.optionsGrid}>
          {options.map((opt, i) => (
            <button
              key={i}
              style={styles.optionBtn}
              onClick={() => onAnswer(opt)}
              onMouseEnter={e => {
                e.target.style.borderColor = 'var(--nvidia-green)'
                e.target.style.background = 'rgba(118, 185, 0, 0.1)'
              }}
              onMouseLeave={e => {
                e.target.style.borderColor = 'var(--border-light)'
                e.target.style.background = 'transparent'
              }}
            >
              {opt}
            </button>
          ))}
        </div>
      ) : (
        <div style={styles.textInputRow}>
          <input
            style={styles.textInput}
            value={textInput}
            onChange={e => setTextInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            placeholder="Type your answer..."
            autoFocus
          />
          <button style={styles.submitBtn} onClick={handleSubmit}>
            Send
          </button>
        </div>
      )}
    </div>
  )
}

const styles = {
  app: {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    background: 'var(--bg-primary)',
  },
  main: {
    display: 'flex',
    flex: 1,
    overflow: 'hidden',
  },
  chatArea: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    minWidth: 0,
  },
  clarificationBox: {
    margin: '12px 20px',
    padding: '20px',
    background: 'linear-gradient(135deg, var(--bg-card), var(--bg-tertiary))',
    border: '1px solid var(--nvidia-green)',
    borderRadius: 'var(--radius-md)',
    boxShadow: 'var(--shadow-glow)',
  },
  clarificationIcon: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    background: 'var(--nvidia-green)',
    color: '#000',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: '700',
    fontSize: '16px',
    marginBottom: '12px',
  },
  clarificationText: {
    color: 'var(--text-primary)',
    fontSize: '15px',
    marginBottom: '16px',
    lineHeight: '1.5',
  },
  optionsGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  optionBtn: {
    padding: '12px 16px',
    background: 'transparent',
    border: '1px solid var(--border-light)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--text-primary)',
    fontSize: '14px',
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'var(--transition)',
  },
  textInputRow: {
    display: 'flex',
    gap: '8px',
  },
  textInput: {
    flex: 1,
    padding: '10px 14px',
    background: 'var(--bg-secondary)',
    border: '1px solid var(--border-light)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--text-primary)',
    fontSize: '14px',
    outline: 'none',
  },
  submitBtn: {
    padding: '10px 20px',
    background: 'var(--nvidia-green)',
    border: 'none',
    borderRadius: 'var(--radius-sm)',
    color: '#000',
    fontWeight: '600',
    fontSize: '14px',
    cursor: 'pointer',
  },
}
