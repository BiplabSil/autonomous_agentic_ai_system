import MessageBubble from './MessageBubble'

export default function ChatInterface({ messages, isLoading, messagesEndRef }) {
  return (
    <div style={styles.container}>
      {messages.length === 0 ? (
        <WelcomeScreen />
      ) : (
        <div style={styles.messages}>
          {messages.map(msg => (
            <MessageBubble key={msg.id} message={msg} />
          ))}

          {isLoading && (
            <div style={styles.typing}>
              <div style={styles.typingDot} />
              <div style={{ ...styles.typingDot, animationDelay: '0.2s' }} />
              <div style={{ ...styles.typingDot, animationDelay: '0.4s' }} />
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      )}
    </div>
  )
}

function WelcomeScreen() {
  const suggestions = [
    { icon: '🔍', text: 'Research the latest AI trends in 2026' },
    { icon: '💻', text: 'Write a Python web scraper' },
    { icon: '📊', text: 'Analyze this data and create insights' },
    { icon: '✍️', text: 'Write a technical blog post' },
  ]

  return (
    <div style={styles.welcome}>
      <div style={styles.welcomeIcon}>
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--nvidia-green)" strokeWidth="1.5">
          <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
        </svg>
      </div>
      <h2 style={styles.welcomeTitle}>Agentic AI Assistant</h2>
      <p style={styles.welcomeText}>
        I can research, code, analyze, and create. I'll plan my approach
        and ask for clarification when needed.
      </p>

      <div style={styles.suggestions}>
        {suggestions.map((s, i) => (
          <div key={i} style={styles.suggestionCard}>
            <span style={styles.suggestionIcon}>{s.icon}</span>
            <span style={styles.suggestionText}>{s.text}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

const styles = {
  container: {
    flex: 1,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  },
  messages: {
    flex: 1,
    overflowY: 'auto',
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  typing: {
    display: 'flex',
    gap: '6px',
    padding: '12px 16px',
    background: 'var(--bg-card)',
    borderRadius: 'var(--radius-md)',
    width: 'fit-content',
    marginLeft: '48px',
  },
  typingDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    background: 'var(--nvidia-green)',
    animation: 'pulse 1.4s infinite ease-in-out',
  },
  welcome: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px',
    textAlign: 'center',
  },
  welcomeIcon: {
    width: '80px',
    height: '80px',
    background: 'rgba(118, 185, 0, 0.1)',
    borderRadius: '20px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '1px solid rgba(118, 185, 0, 0.2)',
    marginBottom: '24px',
  },
  welcomeTitle: {
    fontSize: '28px',
    fontWeight: '700',
    color: 'var(--text-primary)',
    marginBottom: '8px',
  },
  welcomeText: {
    fontSize: '15px',
    color: 'var(--text-secondary)',
    maxWidth: '500px',
    lineHeight: '1.6',
    marginBottom: '32px',
  },
  suggestions: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '12px',
    maxWidth: '600px',
  },
  suggestionCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '14px 16px',
    background: 'var(--bg-card)',
    border: '1px solid var(--border-color)',
    borderRadius: 'var(--radius-md)',
    cursor: 'pointer',
    transition: 'var(--transition)',
    textAlign: 'left',
  },
  suggestionIcon: {
    fontSize: '20px',
  },
  suggestionText: {
    fontSize: '13px',
    color: 'var(--text-secondary)',
  },
}
