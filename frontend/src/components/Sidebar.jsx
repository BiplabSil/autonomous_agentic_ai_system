export default function Sidebar({ plan }) {
  return (
    <div style={styles.sidebar}>
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>Agent Workflow</h3>
        <div style={styles.workflow}>
          {['Observe', 'Plan', 'Think', 'Execute'].map((step, i) => (
            <div key={step} style={styles.workflowStep}>
              <div style={{
                ...styles.stepDot,
                background: i < plan.length ? 'var(--nvidia-green)' : 'var(--border-light)',
              }} />
              <span style={{
                ...styles.stepLabel,
                color: i < plan.length ? 'var(--nvidia-green)' : 'var(--text-muted)',
              }}>{step}</span>
              {i < 3 && <div style={styles.stepLine} />}
            </div>
          ))}
        </div>
      </div>

      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>Current Plan</h3>
        {plan.length === 0 ? (
          <p style={styles.emptyText}>No active plan</p>
        ) : (
          <div style={styles.planList}>
            {plan.map((item, i) => (
              <div key={i} style={styles.planItem}>
                <div style={{
                  ...styles.planStatus,
                  background: item.status === 'completed' ? 'var(--nvidia-green)' : 'var(--border-light)',
                }}>
                  {item.status === 'completed' && (
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="3">
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                  )}
                </div>
                <span style={{
                  ...styles.planTask,
                  textDecoration: item.status === 'completed' ? 'line-through' : 'none',
                  color: item.status === 'completed' ? 'var(--text-muted)' : 'var(--text-secondary)',
                }}>{item.task}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>Tools</h3>
        <div style={styles.toolItem}>
          <span style={styles.toolDot} />
          <span style={styles.toolName}>Tavily Web Search</span>
        </div>
      </div>
    </div>
  )
}

const styles = {
  sidebar: {
    width: '260px',
    background: 'var(--bg-secondary)',
    borderRight: '1px solid var(--border-color)',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
    overflowY: 'auto',
    flexShrink: 0,
  },
  section: {},
  sectionTitle: {
    fontSize: '11px',
    fontWeight: '600',
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    marginBottom: '12px',
  },
  workflow: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0',
  },
  workflowStep: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    position: 'relative',
  },
  stepDot: {
    width: '10px',
    height: '10px',
    borderRadius: '50%',
    flexShrink: 0,
    zIndex: 1,
  },
  stepLabel: {
    fontSize: '13px',
    fontWeight: '500',
  },
  stepLine: {
    position: 'absolute',
    left: '4px',
    top: '14px',
    width: '2px',
    height: '24px',
    background: 'var(--border-color)',
  },
  planList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  planItem: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '10px',
  },
  planStatus: {
    width: '18px',
    height: '18px',
    borderRadius: '4px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: '2px',
  },
  planTask: {
    fontSize: '13px',
    lineHeight: '1.4',
  },
  emptyText: {
    fontSize: '13px',
    color: 'var(--text-muted)',
  },
  toolItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 10px',
    background: 'var(--bg-tertiary)',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--border-color)',
  },
  toolDot: {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    background: 'var(--nvidia-green)',
  },
  toolName: {
    fontSize: '12px',
    color: 'var(--text-secondary)',
    fontWeight: '500',
  },
}
