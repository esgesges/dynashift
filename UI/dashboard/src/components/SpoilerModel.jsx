import { useStore } from '../store/useStore'

const ACTS = [
  { key: 'fl', cx: 72,  cy: 62,  label: 'FL' },
  { key: 'fr', cx: 188, cy: 62,  label: 'FR' },
  { key: 'rl', cx: 72,  cy: 138, label: 'RL' },
  { key: 'rr', cx: 188, cy: 138, label: 'RR' },
]

function ActCircle({ cx, cy, label, value }) {
  const r = 16
  const angle = value * Math.PI * 2
  const x2 = cx + r * Math.sin(angle)
  const y2 = cy - r * Math.cos(angle)
  const large = angle > Math.PI ? 1 : 0
  const color = value > 0.7 ? '#ff4444' : value > 0.4 ? '#ffaa00' : '#4488ff'

  return (
    <g>
      <circle cx={cx} cy={cy} r={r} fill="#0d0d18" stroke="#2a2a3a" strokeWidth={1.5} />
      {value > 0.01 && (
        <path
          d={`M ${cx} ${cy} L ${cx} ${cy - r} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`}
          fill={color} opacity={0.3}
        />
      )}
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth={2} opacity={0.8} />
      <text x={cx} y={cy + 1} textAnchor="middle" dominantBaseline="middle"
        fill={color} fontSize={8} fontWeight="bold" fontFamily="monospace">
        {(value * 100).toFixed(0)}%
      </text>
      <text x={cx} y={cy + r + 10} textAnchor="middle"
        fill="#555" fontSize={8} fontFamily="monospace">{label}</text>
    </g>
  )
}

export default function SpoilerModel() {
  const pos = useStore(s => s.actuatorPos)

  return (
    <div className="panel-card spoiler-card">
      <div className="spoiler-header">
        <span className="panel-label">Alettone — Vista Top</span>
        <span className="act-legend"><span style={{ color: '#4488ff' }}>●</span> Pos. attuatori</span>
      </div>
      {/* viewBox fisso, svg si adatta al contenitore via flex */}
      <svg viewBox="0 0 260 200" preserveAspectRatio="xMidYMid meet"
        style={{ flex: 1, minHeight: 0, width: '100%', display: 'block' }}>
        <defs>
          <linearGradient id="wg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1e2a3a" />
            <stop offset="100%" stopColor="#0d1520" />
          </linearGradient>
        </defs>

        {/* corpo alettone */}
        <rect x="32" y="88" width="196" height="28" rx="4" fill="url(#wg)" stroke="#2a3a4a" strokeWidth="1.5" />
        {/* bordo anteriore rosso */}
        <rect x="32" y="88" width="196" height="5" rx="2" fill="#881111" />

        {/* assi guida */}
        <line x1="130" y1="30" x2="130" y2="170" stroke="#1e1e2a" strokeWidth="1" strokeDasharray="3 3" />
        <line x1="32"  y1="102" x2="228" y2="102" stroke="#1e1e2a" strokeWidth="1" strokeDasharray="3 3" />

        {/* etichette direzione */}
        <text x="130" y="18" textAnchor="middle" fill="#333" fontSize={8} fontFamily="monospace">▲ ANT</text>
        <text x="130" y="192" textAnchor="middle" fill="#333" fontSize={8} fontFamily="monospace">▼ POST</text>

        {/* bracci supporto */}
        <line x1="72"  y1="85" x2="72"  y2="20"  stroke="#1e2a3a" strokeWidth={4} strokeLinecap="round" />
        <line x1="188" y1="85" x2="188" y2="20"  stroke="#1e2a3a" strokeWidth={4} strokeLinecap="round" />
        <line x1="72"  y1="118" x2="72"  y2="175" stroke="#1e2a3a" strokeWidth={4} strokeLinecap="round" />
        <line x1="188" y1="118" x2="188" y2="175" stroke="#1e2a3a" strokeWidth={4} strokeLinecap="round" />

        {ACTS.map(a => (
          <ActCircle key={a.key} {...a} value={pos[a.key] ?? 0} />
        ))}
      </svg>
    </div>
  )
}
