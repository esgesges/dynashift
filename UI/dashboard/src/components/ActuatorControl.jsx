import { useStore } from '../store/useStore'
import './ActuatorControl.css'

const ACT_KEYS = [
  { key: 'fl', label: 'FL' },
  { key: 'fr', label: 'FR' },
  { key: 'rl', label: 'RL' },
  { key: 'rr', label: 'RR' },
]

export default function ActuatorControl() {
  const actuatorPos       = useStore(s => s.actuatorPos)
  const actuatorLimits    = useStore(s => s.actuatorLimits)
  const manualOverride    = useStore(s => s.manualOverride)
  const manualPos         = useStore(s => s.manualPos)
  const setManualOverride = useStore(s => s.setManualOverride)
  const setManualPos      = useStore(s => s.setManualPos)
  const setActuatorLimits = useStore(s => s.setActuatorLimits)

  const pos = manualOverride ? manualPos : actuatorPos

  return (
    <div className="panel-card act-card">
      <div className="act-toprow">
        <h3>Attuatori</h3>
        {/* toggle switch touch-friendly */}
        <label className="toggle-switch">
          <input type="checkbox" checked={manualOverride}
            onChange={e => setManualOverride(e.target.checked)} />
          <span className="toggle-track">
            <span className="toggle-thumb" />
          </span>
          <span className="toggle-label">Override</span>
        </label>
      </div>

      {/* 4 barre verticali */}
      <div className="act-bars">
        {ACT_KEYS.map(({ key, label }) => {
          const v = pos[key] ?? 0
          const lim = actuatorLimits[key] ?? 1
          return (
            <div key={key} className="act-col">
              <span className="act-pct">{(v * 100).toFixed(0)}<small>%</small></span>
              <div className="act-bar-wrap">
                <div className="act-bar-fill" style={{ height: `${v * 100}%` }} />
                <div className="act-limit-mark" style={{ bottom: `${lim * 100}%` }} />
              </div>
              <span className="act-lbl">{label}</span>
            </div>
          )
        })}
      </div>

      {/* sliders override manuale */}
      {manualOverride && (
        <div className="act-sliders">
          <div className="sliders-title">Posizione manuale</div>
          {ACT_KEYS.map(({ key, label }) => (
            <div key={key} className="slider-row">
              <span>{label}</span>
              <input type="range" min={0} max={actuatorLimits[key] ?? 1} step={0.01}
                value={manualPos[key] ?? 0}
                onChange={e => setManualPos({ ...manualPos, [key]: parseFloat(e.target.value) })} />
              <span>{((manualPos[key] ?? 0) * 100).toFixed(0)}%</span>
            </div>
          ))}
        </div>
      )}

      {/* limiti */}
      <div className="act-limits">
        <div className="sliders-title">Limiti <span style={{ color: '#4488ff' }}>━━</span></div>
        {ACT_KEYS.map(({ key, label }) => (
          <div key={key} className="slider-row">
            <span>{label}</span>
            <input type="range" min={0} max={1} step={0.05}
              value={actuatorLimits[key] ?? 1}
              onChange={e => setActuatorLimits({ ...actuatorLimits, [key]: parseFloat(e.target.value) })} />
            <span>{((actuatorLimits[key] ?? 1) * 100).toFixed(0)}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}
