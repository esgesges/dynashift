import { useStore } from '../store/useStore'
import './LiveData.css'

const ACT_COLORS = { fl: '#4488ff', fr: '#00cc88', rl: '#ffaa00', rr: '#ff4444' }

export default function LiveData() {
  const speed       = useStore(s => s.speed)
  const steering    = useStore(s => s.steering)
  const actuators   = useStore(s => s.actuators)
  const actuatorPos = useStore(s => s.actuatorPos)
  const gyro        = useStore(s => s.gyro)

  const steerColor = Math.abs(steering) > 20 ? '#ff4444' : Math.abs(steering) > 10 ? '#ffaa00' : '#ccd'

  return (
    <div className="panel-card livedata-card">
      <h3>Dati live</h3>

      {/* riga 1: velocità + sterzo */}
      <div className="ld-row-top">
        <Tile label="Velocità" accent="#4488ff">
          <BigNum value={speed.toFixed(0)} unit="km/h" color="#4488ff" />
        </Tile>
        <Tile label="Sterzo" accent={steerColor}>
          <BigNum value={(steering > 0 ? '+' : '') + steering.toFixed(1)} unit="°" color={steerColor} />
        </Tile>
      </div>

      {/* riga 2: gyro */}
      <Tile label={`Giroscopio  ${gyro.calibrated ? '✓ calibrato' : '⚠ calibrare'}`}
            accent={gyro.calibrated ? '#00cc66' : '#ffaa00'}>
        <div className="ld-gyro-vals">
          {['x','y','z'].map(ax => (
            <div key={ax} className="ld-gyro-item">
              <span className="ld-gyro-ax">{ax.toUpperCase()}</span>
              <span className="ld-gyro-num">{gyro[ax]?.toFixed(3)}</span>
            </div>
          ))}
        </div>
      </Tile>

      {/* riga 3: pressione 4 attuatori */}
      <Tile label="Pressione attuatori">
        <div className="ld-act-row">
          {['fl','fr','rl','rr'].map(k => (
            <div key={k} className="ld-act-cell">
              <span className="ld-act-key" style={{ color: ACT_COLORS[k] }}>{k.toUpperCase()}</span>
              <span className="ld-act-num">{actuators[k]?.toFixed(1)}<small>bar</small></span>
            </div>
          ))}
        </div>
      </Tile>

      {/* riga 4: posizione 4 attuatori con barre */}
      <Tile label="Risposta attuatori">
        <div className="ld-pos-grid">
          {['fl','fr','rl','rr'].map(k => {
            const v = actuatorPos[k] ?? 0
            return (
              <div key={k} className="ld-pos-item">
                <span className="ld-act-key" style={{ color: ACT_COLORS[k] }}>{k.toUpperCase()}</span>
                <div className="ld-bar-wrap">
                  <div className="ld-bar-fill" style={{ width: `${v * 100}%`, background: ACT_COLORS[k] }} />
                </div>
                <span className="ld-pos-num">{(v * 100).toFixed(0)}<small>%</small></span>
              </div>
            )
          })}
        </div>
      </Tile>
    </div>
  )
}

function Tile({ label, accent = '#4488ff', children }) {
  return (
    <div className="ld-tile" style={{ '--ta': accent }}>
      <span className="ld-tile-label">{label}</span>
      {children}
    </div>
  )
}

function BigNum({ value, unit, color }) {
  return (
    <div className="ld-bignum" style={{ color }}>
      {value}<small>{unit}</small>
    </div>
  )
}
