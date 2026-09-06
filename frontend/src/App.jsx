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
  const [streamingSteps, setStreamingSteps] = useState([])
  const [streamingTokens, setStreamingTokens] = useState('')
  const messagesEndRef = useRef(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, streamingTokens])

  const handleSend = async (text) => {
    if (!text.trim() || isLoading) return

    setMessages(prev => [...prev, { role: 'user', content: text, id: Date.now() }])
    setIsLoading(true)
    setClarification(null)
    setStreamingSteps([])
    setStreamingTokens('')

    try {
      const history = messages.map(m => ({ role: m.role, content: m.content }))

      const res = await fetch(`${API_BASE}/chat/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, history }),
      })

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let allSteps = []
      let allTokens = ''
      let finalPlan = []

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })

        // SSE messages are separated by \n\n
        const parts = buffer.split('\n\n')
        buffer = parts.pop() // incomplete message stays in buffer

        for (const part of parts) {
          if (!part.trim()) continue

          let eventType = ''
          let dataStr = ''

          for (const line of part.split('\n')) {
            if (line.startsWith('event: ')) {
              eventType = line.slice(7).trim()
            } else if (line.startsWith('data: ')) {
              dataStr = line.slice(6)
            }
          }

          if (!eventType || !dataStr) continue

          let data
          try {
            data = JSON.parse(dataStr)
          } catch {
            continue
          }

          if (eventType === 'step') {
            allSteps = [...allSteps, data]
            setStreamingSteps([...allSteps])
          } else if (eventType === 'plan') {
            if (data.plan) {
              finalPlan = data.plan
              setCurrentPlan(data.plan)
            }
          } else if (eventType === 'token') {
            allTokens += data.content
            setStreamingTokens(allTokens)
          } else if (eventType === 'final') {
            if (data.response) allTokens = data.response
            if (data.plan) finalPlan = data.plan
          } else if (eventType === 'clarification') {
            setClarification({
              question: data.question,
              options: data.options || [],
              originalMessage: text,
            })
          } else if (eventType === 'error') {
            allTokens += `\n\nError: ${data.message}`
            setStreamingTokens(allTokens)
          }
        }
      }

      // Add final assistant message
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: allTokens,
        plan: finalPlan,
        steps: allSteps,
        id: Date.now(),
      }])

      if (finalPlan.length > 0) setCurrentPlan(finalPlan)

    } catch (err) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `Error: ${err.message}. Make sure the backend is running on port 8000.`,
        id: Date.now(),
      }])
    } finally {
      setIsLoading(false)
      setStreamingSteps([])
      setStreamingTokens('')
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
        {showSidebar && <Sidebar plan={currentPlan} />}
        <div style={styles.chatArea}>
          <ChatInterface
            messages={messages}
            isLoading={isLoading}
            messagesEndRef={messagesEndRef}
            streamingSteps={streamingSteps}
            streamingTokens={streamingTokens}
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
    if (textInput.trim()) { onAnswer(textInput); setTextInput('') }
  }
  return (
    <div style={styles.clarificationBox}>
      <div style={styles.clarificationIcon}>?</div>
      <p style={styles.clarificationText}>{question}</p>
      {options.length > 0 ? (
        <div style={styles.optionsGrid}>
          {options.map((opt, i) => (
            <button key={i} style={styles.optionBtn} onClick={() => onAnswer(opt)}
              onMouseEnter={e => { e.target.style.borderColor = 'var(--nvidia-green)'; e.target.style.background = 'rgba(118, 185, 0, 0.1)' }}
              onMouseLeave={e => { e.target.style.borderColor = 'var(--border-light)'; e.target.style.background = 'transparent' }}
            >{opt}</button>
          ))}
        </div>
      ) : (
        <div style={styles.textInputRow}>
          <input style={styles.textInput} value={textInput} onChange={e => setTextInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()} placeholder="Type your answer..." autoFocus />
          <button style={styles.submitBtn} onClick={handleSubmit}>Send</button>
        </div>
      )}
    </div>
  )
}

const styles = {
  app: { display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--bg-primary)' },
  main: { display: 'flex', flex: 1, overflow: 'hidden' },
  chatArea: { flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 },
  clarificationBox: { margin: '12px 20px', padding: '20px', background: 'linear-gradient(135deg, var(--bg-card), var(--bg-tertiary))', border: '1px solid var(--nvidia-green)', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-glow)' },
  clarificationIcon: { width: '32px', height: '32px', borderRadius: '50%', background: 'var(--nvidia-green)', color: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', fontSize: '16px', marginBottom: '12px' },
  clarificationText: { color: 'var(--text-primary)', fontSize: '15px', marginBottom: '16px', lineHeight: '1.5' },
  optionsGrid: { display: 'flex', flexDirection: 'column', gap: '8px' },
  optionBtn: { padding: '12px 16px', background: 'transparent', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', fontSize: '14px', cursor: 'pointer', textAlign: 'left', transition: 'var(--transition)' },
  textInputRow: { display: 'flex', gap: '8px' },
  textInput: { flex: 1, padding: '10px 14px', background: 'var(--bg-secondary)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', fontSize: '14px', outline: 'none' },
  submitBtn: { padding: '10px 20px', background: 'var(--nvidia-green)', border: 'none', borderRadius: 'var(--radius-sm)', color: '#000', fontWeight: '600', fontSize: '14px', cursor: 'pointer' },
}
