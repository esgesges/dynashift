import { useStore } from '../store/useStore'
import './ConnectionStatus.css'

const CONNS = [
  { key: 'ecu',   label: 'Centralina' },
  { key: 'gyro',  label: 'Giroscopio' },
  { key: 'panel', label: 'Pulsantiera' },
]

export default function ConnectionStatus() {
  const connections   = useStore(s => s.connections)
  const mqttConnected = useStore(s => s.mqttConnected)
  const gyro          = useStore(s => s.gyro)

  return (
    <div className="panel-card conn-card">
      <h3>Connessioni</h3>
      <div className="conn-rows">
        <ConnRow label="MQTT" ok={mqttConnected} />
        {CONNS.map(({ key, label }) => (
          <ConnRow key={key} label={label} ok={connections[key]} />
        ))}
      </div>
      <div className={`gyro-badge ${gyro.calibrated ? 'ok' : 'warn'}`}>
        {gyro.calibrated ? '✓ Giroscopio calibrato' : '⚠ Calibrazione richiesta'}
      </div>
      <div className="gyro-xyz">
        <span>X {gyro.x?.toFixed(2)}</span>
        <span>Y {gyro.y?.toFixed(2)}</span>
        <span>Z {gyro.z?.toFixed(2)}</span>
      </div>
    </div>
  )
}

function ConnRow({ label, ok }) {
  return (
    <div className="conn-row">
      <span className={`conn-dot ${ok ? 'green' : 'red'}`} />
      <span className="conn-label">{label}</span>
      <span className={`conn-state ${ok ? 'ok' : 'err'}`}>{ok ? 'OK' : 'OFF'}</span>
    </div>
  )
}
