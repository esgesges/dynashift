import { useStore } from '../store/useStore'
import { useBle } from '../hooks/useBle'
import './CtrlPanel.css'

const MODES = [
  { id: 'default',   label: 'Default', color: '#4488ff' },
  { id: 'eco',       label: 'Eco',     color: '#00cc66' },
  { id: 'turbo',     label: 'Turbo',   color: '#ff4444' },
  { id: 'automatic', label: 'Auto',    color: '#ffaa00' },
]

export default function CtrlPanel() {
  const power     = useStore(s => s.power)
  const mode      = useStore(s => s.mode)
  const switchPos = useStore(s => s.switchPos)
  const panelConn = useStore(s => s.connections.panel)
  const setMode   = useStore(s => s.setMode)

  // useBle() qui restituisce lo stesso singleton inizializzato in App.jsx
  const { status, pair, send } = useBle()

  const isConnecting = status === 'scanning' || status === 'connecting'
  const togglePower  = () => send(power ? 'SHUT_DOWN' : 'WAKE_UP')

  return (
    <div className="panel-card ctrl-card">
      {/* power = bottone vero collegato a BLE */}
      <button
        className={`pwr-block ${power ? 'on' : 'off'}`}
        onClick={togglePower}
        disabled={!panelConn}
        title={panelConn ? '' : 'Pulsantiera non connessa'}
      >
        <svg viewBox="0 0 48 48" className="pwr-svg">
          <circle cx="24" cy="24" r="16" className="pwr-ring" />
          <line x1="24" y1="10" x2="24" y2="24" className="pwr-line" />
        </svg>
        <span className="pwr-label">{power ? 'ACCESO' : 'SPENTO'}</span>
        {switchPos && <span className="pwr-switch">SW: {switchPos}</span>}
      </button>

      {/* bottone di accoppiamento — visibile solo se BLE non connesso */}
      {!panelConn && (
        <button className="ble-pair-btn" onClick={pair} disabled={isConnecting}>
          {isConnecting ? '⏳ Connessione...' : '🔗 Connetti pulsantiera'}
        </button>
      )}

      <div className="ctrl-divider" />

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
