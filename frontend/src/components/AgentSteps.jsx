import { useState } from 'react'

const STEP_ICONS = {
  observe: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="3" />
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    </svg>
  ),
  plan: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M9 11l3 3L22 4M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
    </svg>
  ),
  think: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 2a7 7 0 017 7c0 2.38-1.19 4.47-3 5.74V17a2 2 0 01-2 2h-4a2 2 0 01-2-2v-2.26C6.19 13.47 5 11.38 5 9a7 7 0 017-7z" />
      <path d="M9 22h6" />
    </svg>
  ),
  execute: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polygon points="5 3 19 12 5 21 5 3" />
    </svg>
  ),
  clarify: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3M12 17h.01" />
    </svg>
  ),
}

const STEP_COLORS = {
  observe: '#76b900',
  plan: '#00a8e8',
  think: '#a855f7',
  execute: '#f59e0b',
  clarify: '#ef4444',
}

export default function AgentSteps({ steps }) {
  const [expandedIndex, setExpandedIndex] = useState(null)

  if (!steps || steps.length === 0) return null

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--nvidia-green)" strokeWidth="2">
          <path d="M12 2v20M2 12h20" />
        </svg>
        <span style={styles.headerText}>Agent Process</span>
        <span style={styles.badge}>{steps.length} steps</span>
      </div>

      <div style={styles.stepsList}>
        {steps.map((step, i) => {
          const isExpanded = expandedIndex === i
          const color = STEP_COLORS[step.name] || '#76b900'

          return (
            <div key={i} style={styles.stepWrapper}>
              {/* Connector line */}
              {i < steps.length - 1 && (
                <div style={{
                  ...styles.connector,
                  background: `linear-gradient(to bottom, ${color}40, ${STEP_COLORS[steps[i + 1].name] || '#76b900'}40)`,
                }} />
              )}

              <button
                style={{
                  ...styles.stepHeader,
                  borderColor: isExpanded ? color : 'var(--border-color)',
                  background: isExpanded ? `${color}08` : 'transparent',
                }}
                onClick={() => setExpandedIndex(isExpanded ? null : i)}
              >
                <div style={{
                  ...styles.stepIcon,
                  background: `${color}20`,
                  color: color,
                  borderColor: `${color}40`,
                }}>
                  {STEP_ICONS[step.name] || STEP_ICONS.observe}
                </div>

                <div style={styles.stepInfo}>
                  <span style={styles.stepTitle}>{step.title}</span>
                  <span style={styles.stepPreview}>
                    {step.detail.substring(0, 80)}{step.detail.length > 80 ? '...' : ''}
                  </span>
                </div>

                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="var(--text-muted)"
                  strokeWidth="2"
                  style={{
                    transform: isExpanded ? 'rotate(180deg)' : 'rotate(0)',
                    transition: 'transform 0.2s',
                    flexShrink: 0,
                  }}
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>

              {isExpanded && (
                <div style={styles.stepContent}>
                  <div style={styles.stepDetail}>
                    {step.detail.split('\n').map((line, j) => (
                      <p key={j} style={styles.detailLine}>{line}</p>
                    ))}
                  </div>

                  {step.meta && Object.keys(step.meta).length > 0 && (
                    <div style={styles.metaSection}>
                      <span style={styles.metaLabel}>Metadata</span>
                      <pre style={styles.metaJson}>
                        {JSON.stringify(step.meta, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

const styles = {
  container: {
    margin: '8px 0 4px 42px',
    background: 'var(--bg-tertiary)',
    border: '1px solid var(--border-color)',
    borderRadius: 'var(--radius-md)',
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 14px',
    borderBottom: '1px solid var(--border-color)',
    background: 'var(--bg-secondary)',
  },
  headerText: {
    fontSize: '12px',
    fontWeight: '600',
    color: 'var(--text-secondary)',
    flex: 1,
  },
  badge: {
    fontSize: '10px',
    fontWeight: '600',
    color: 'var(--nvidia-green)',
    background: 'rgba(118, 185, 0, 0.1)',
    padding: '2px 8px',
    borderRadius: '10px',
    border: '1px solid rgba(118, 185, 0, 0.2)',
  },
  stepsList: {
    padding: '6px',
  },
  stepWrapper: {
    position: 'relative',
    marginBottom: '4px',
  },
  connector: {
    position: 'absolute',
    left: '19px',
    top: '42px',
    width: '2px',
    height: 'calc(100% - 42px)',
    zIndex: 0,
  },
  stepHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    width: '100%',
    padding: '8px 10px',
    border: '1px solid var(--border-color)',
    borderRadius: 'var(--radius-sm)',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    textAlign: 'left',
    position: 'relative',
    zIndex: 1,
  },
  stepIcon: {
    width: '30px',
    height: '30px',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '1px solid',
    flexShrink: 0,
  },
  stepInfo: {
    flex: 1,
    minWidth: 0,
  },
  stepTitle: {
    display: 'block',
    fontSize: '12px',
    fontWeight: '600',
    color: 'var(--text-primary)',
  },
  stepPreview: {
    display: 'block',
    fontSize: '11px',
    color: 'var(--text-muted)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  stepContent: {
    padding: '8px 10px 8px 50px',
    position: 'relative',
    zIndex: 1,
  },
  stepDetail: {
    fontSize: '12px',
    color: 'var(--text-secondary)',
    lineHeight: '1.6',
  },
  detailLine: {
    margin: '2px 0',
  },
  metaSection: {
    marginTop: '8px',
    padding: '8px',
    background: 'var(--bg-secondary)',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--border-color)',
  },
  metaLabel: {
    fontSize: '10px',
    fontWeight: '600',
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  metaJson: {
    fontSize: '10px',
    color: 'var(--text-muted)',
    marginTop: '4px',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-all',
    fontFamily: 'monospace',
    margin: 0,
  },
}
