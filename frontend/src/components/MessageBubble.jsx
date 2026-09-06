import ReactMarkdown from 'react-markdown'
import AgentSteps from './AgentSteps'

export default function MessageBubble({ message }) {
  const isUser = message.role === 'user'

  return (
    <div style={{
      ...styles.wrapper,
      justifyContent: isUser ? 'flex-end' : 'flex-start',
    }}>
      {!isUser && (
        <div style={styles.avatar}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="var(--nvidia-green)">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
          </svg>
        </div>
      )}

      <div style={{ maxWidth: '75%' }}>
        <div style={{
          ...styles.bubble,
          ...(isUser ? styles.userBubble : styles.assistantBubble),
        }}>
          {isUser ? (
            <p style={styles.userText}>{message.content}</p>
          ) : (
            <div style={styles.markdown}>
              <ReactMarkdown>{message.content}</ReactMarkdown>
            </div>
          )}

          {message.plan && message.plan.length > 0 && (
            <div style={styles.planBadge}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--nvidia-green)" strokeWidth="2">
                <path d="M9 11l3 3L22 4M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
              </svg>
              <span>{message.plan.length} steps completed</span>
            </div>
          )}
        </div>

        {/* Show expandable agent steps below the message */}
        {!isUser && message.steps && message.steps.length > 0 && (
          <AgentSteps steps={message.steps} />
        )}
      </div>

      {isUser && (
        <div style={styles.userAvatar}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
            <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z" />
          </svg>
        </div>
      )}
    </div>
  )
}

const styles = {
  wrapper: {
    display: 'flex',
    alignItems: 'flex-end',
    gap: '10px',
  },
  avatar: {
    width: '32px',
    height: '32px',
    borderRadius: '8px',
    background: 'rgba(118, 185, 0, 0.1)',
    border: '1px solid rgba(118, 185, 0, 0.2)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  userAvatar: {
    width: '32px',
    height: '32px',
    borderRadius: '8px',
    background: 'var(--bg-tertiary)',
    border: '1px solid var(--border-light)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  bubble: {
    maxWidth: '100%',
    padding: '12px 16px',
    borderRadius: 'var(--radius-md)',
    lineHeight: '1.5',
  },
  userBubble: {
    background: 'linear-gradient(135deg, var(--nvidia-green-dark), var(--nvidia-green))',
    color: '#000',
    borderBottomRightRadius: '4px',
  },
  assistantBubble: {
    background: 'var(--bg-card)',
    border: '1px solid var(--border-color)',
    borderBottomLeftRadius: '4px',
  },
  userText: {
    fontSize: '14px',
    fontWeight: '500',
  },
  markdown: {
    fontSize: '14px',
    color: 'var(--text-primary)',
  },
  planBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    marginTop: '8px',
    padding: '4px 10px',
    background: 'rgba(118, 185, 0, 0.1)',
    border: '1px solid rgba(118, 185, 0, 0.2)',
    borderRadius: '20px',
    fontSize: '11px',
    color: 'var(--nvidia-green)',
    fontWeight: '600',
  },
}
