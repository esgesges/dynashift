import { useStore } from '../store/useStore'
import './TopBar.css'

export default function TopBar({ selectedSection, onSectionChange }) {
  const speed = useStore(s => s.speed)

  const sections = [
    { value: 'overview', label: 'Overview' },
    { value: 'spoilerlive', label: 'Spoiler+LD' },
    { value: 'graphs', label: 'Graphs' }
  ]

  return (
    <header className="topbar">
      <span className="logo">DYNASHIFT</span>
      <span className="logo-sub">Dynamic Spoiler Control</span>
      <nav className="topbar-nav">
        {sections.map(sec => (
          <button
            key={sec.value}
            className={`topbar-btn ${selectedSection === sec.value ? 'active' : ''}`}
            onClick={() => onSectionChange(sec.value)}
          >
            {sec.label}
          </button>
        ))}
      </nav>
      <div className="topbar-speed">
        <span className="spd-val">{speed.toFixed(0)}</span>
        <span className="spd-unit">km/h</span>
      </div>
    </header>
  )
}