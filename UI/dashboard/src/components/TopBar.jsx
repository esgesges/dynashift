import { useStore } from '../store/useStore'
import './TopBar.css'

export default function TopBar() {
  const speed = useStore(s => s.speed)

  return (
    <header className="topbar">
      <span className="logo">DYNASHIFT</span>
      <span className="logo-sub">Dynamic Spoiler Control</span>
      <div className="topbar-speed">
        <span className="spd-val">{speed.toFixed(0)}</span>
        <span className="spd-unit">km/h</span>
      </div>
    </header>
  )
}
