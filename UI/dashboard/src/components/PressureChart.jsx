import { useStore } from '../store/useStore'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

const COLORS = { fl: '#4488ff', fr: '#00ff88', rl: '#ffaa00', rr: '#ff4444' }

export default function PressureChart() {
  const series = useStore(s => s.pressureSeries)
  const acts   = useStore(s => s.actuators)

  const data = series.map((p, i) => ({ t: i, fl: p.fl, fr: p.fr, rl: p.rl, rr: p.rr }))

  return (
    <div className="panel-card chart-card">
      <div className="chart-header">
        <h3>Pressione Attuatori</h3>
        <span className="live-value" style={{ fontSize: '0.75rem' }}>
          {['fl','fr','rl','rr'].map(k => (
            <span key={k} style={{ color: COLORS[k], marginLeft: 6 }}>
              {k.toUpperCase()} {acts[k]?.toFixed(1)}
            </span>
          ))} <small>bar</small>
        </span>
      </div>
      <div className="chart-fill">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: -22 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1a1a1a" />
            <XAxis dataKey="t" hide />
            <YAxis domain={[0, 16]} tick={{ fontSize: 9, fill: '#444' }} tickCount={4} />
            <Tooltip
              contentStyle={{ background: '#111', border: '1px solid #333', fontSize: 11, padding: '4px 8px' }}
              formatter={(v, n) => [`${v?.toFixed(1)} bar`, n.toUpperCase()]}
              labelFormatter={() => ''}
            />
            {Object.entries(COLORS).map(([key, color]) => (
              <Line key={key} type="monotone" dataKey={key} stroke={color}
                dot={false} strokeWidth={1.5} isAnimationActive={false} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
