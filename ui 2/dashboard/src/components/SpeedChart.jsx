import { useStore } from '../store/useStore'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

export default function SpeedChart() {
  const series = useStore(s => s.speedSeries)
  const speed  = useStore(s => s.speed)

  const data = series.map((p, i) => ({ t: i, v: p.v }))

  return (
    <div className="panel-card chart-card">
      <div className="chart-header">
        <h3>Velocità</h3>
        <span className="live-value">{speed.toFixed(1)} <small>km/h</small></span>
      </div>
      <div className="chart-fill">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: -22 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1a1a1a" />
            <XAxis dataKey="t" hide />
            <YAxis domain={['auto', 'auto']} tick={{ fontSize: 9, fill: '#444' }} tickCount={4} />
            <Tooltip
              contentStyle={{ background: '#111', border: '1px solid #333', fontSize: 11, padding: '4px 8px' }}
              formatter={v => [`${v.toFixed(1)} km/h`, 'Velocità']}
              labelFormatter={() => ''}
            />
            <Line type="monotone" dataKey="v" stroke="#4488ff" dot={false} strokeWidth={2} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
