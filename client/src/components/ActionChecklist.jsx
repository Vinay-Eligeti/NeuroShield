import { useState } from 'react'

export default function ActionChecklist({ actions, riskScore }) {
  const [checkedItems, setCheckedItems] = useState(new Set())

  if (!actions || actions.length === 0) return null

  const toggleItem = (id) => {
    setCheckedItems(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const completedCount = checkedItems.size
  const totalCount = actions.length
  const progress = Math.round((completedCount / totalCount) * 100)

  return (
    <div className="section">
      <div className="section-header">
        <div>
          <h3>Immediate Safety Actions</h3>
          <p>
            {riskScore >= 70
              ? 'CRITICAL: Complete all these steps immediately to protect yourself'
              : riskScore >= 40
                ? 'Recommended safety precautions to take'
                : 'General safety reminders'}
          </p>
        </div>
      </div>

      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: '12px',
        padding: '16px 20px',
        marginBottom: '16px',
        display: 'flex',
        alignItems: 'center',
        gap: '16px'
      }}>
        <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
          {completedCount} / {totalCount} completed
        </span>
        <div style={{
          flex: 1, height: '6px', background: 'var(--bg-secondary)',
          borderRadius: '3px', overflow: 'hidden'
        }}>
          <div style={{
            width: `${progress}%`, height: '100%',
            background: 'var(--safe)', borderRadius: '3px',
            transition: 'width 0.3s ease'
          }} />
        </div>
        <span style={{
          fontFamily: 'var(--font-mono)', fontSize: '0.8rem',
          fontWeight: 700, color: progress === 100 ? 'var(--safe)' : 'var(--text-muted)'
        }}>
          {progress}%
        </span>
      </div>

      <div className="actions-grid">
        {actions.map((action) => (
          <div
            key={action.id}
            className={`action-item ${checkedItems.has(action.id) ? 'checked' : ''}`}
            onClick={() => toggleItem(action.id)}
          >
            <div className="action-checkbox">
              {checkedItems.has(action.id) ? '✓' : ''}
            </div>
            <span className="action-text">{action.text}</span>
            <span className={`action-priority ${action.priority}`}>
              {action.priority}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
