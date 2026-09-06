export default function Header({ onToggleSidebar }) {
  return (
    <header style={styles.header}>
      <div style={styles.left}>
        <button style={styles.menuBtn} onClick={onToggleSidebar}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 12h18M3 6h18M3 18h18" />
          </svg>
        </button>

        <div style={styles.logo}>
          <div style={styles.logoIcon}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="var(--nvidia-green)">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
          </div>
          <div>
            <h1 style={styles.title}>Agentic AI</h1>
            <p style={styles.subtitle}>Autonomous Agent System</p>
          </div>
        </div>
      </div>

      <div style={styles.right}>
        <div style={styles.statusDot} />
        <span style={styles.statusText}>GPT-4o Powered</span>
      </div>
    </header>
  )
}

const styles = {
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 20px',
    background: 'var(--bg-secondary)',
    borderBottom: '1px solid var(--border-color)',
    zIndex: 10,
  },
  left: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  menuBtn: {
    background: 'transparent',
    border: 'none',
    color: 'var(--text-secondary)',
    cursor: 'pointer',
    padding: '6px',
    borderRadius: 'var(--radius-sm)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  logoIcon: {
    width: '36px',
    height: '36px',
    background: 'rgba(118, 185, 0, 0.1)',
    borderRadius: 'var(--radius-sm)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '1px solid rgba(118, 185, 0, 0.3)',
  },
  title: {
    fontSize: '16px',
    fontWeight: '700',
    color: 'var(--text-primary)',
    letterSpacing: '-0.3px',
  },
  subtitle: {
    fontSize: '11px',
    color: 'var(--text-muted)',
    fontWeight: '400',
  },
  right: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  statusDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    background: 'var(--nvidia-green)',
    boxShadow: '0 0 8px var(--nvidia-green-glow)',
  },
  statusText: {
    fontSize: '12px',
    color: 'var(--text-secondary)',
    fontWeight: '500',
  },
}
