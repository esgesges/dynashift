import { useStore } from '../store/useStore'
import './CtrlPanel.css'

const MODES = [
  { id: 'default',   label: 'Default', color: '#4488ff' },
  { id: 'eco',       label: 'Eco',     color: '#00cc66' },
  { id: 'turbo',     label: 'Turbo',   color: '#ff4444' },
  { id: 'automatic', label: 'Auto',    color: '#ffaa00' },
]

export default function CtrlPanel() {
  const power   = useStore(s => s.power)
  const mode    = useStore(s => s.mode)
  const setMode = useStore(s => s.setMode)

  return (
    <div className="panel-card ctrl-card">
      {/* Power — grande e ben visibile */}
      <div className={`pwr-block ${power ? 'on' : 'off'}`}>
        <svg viewBox="0 0 48 48" className="pwr-svg">
          <circle cx="24" cy="24" r="16" className="pwr-ring" />
          <line x1="24" y1="10" x2="24" y2="24" className="pwr-line" />
        </svg>
        <span className="pwr-label">{power ? 'ACCESO' : 'SPENTO'}</span>
      </div>

      <div className="ctrl-divider" />

      {/* 4 bottoni modalità — stacked, touch-friendly */}
      <div className="mode-stack">
        {MODES.map(m => (
          <button
            key={m.id}
            className={`modesel-btn ${mode === m.id ? 'active' : ''}`}
            style={{ '--mc': m.color }}
            onClick={() => setMode(m.id)}
          >
            {m.label}
          </button>
        ))}
      </div>
    </div>
  )
}
