import { useMqttSimulator } from './hooks/useMqttSimulator'
// import { useMqtt } from './hooks/useMqtt'

import TopBar           from './components/TopBar'
import SpeedChart       from './components/SpeedChart'
import PressureChart    from './components/PressureChart'
import SpoilerModel     from './components/SpoilerModel'
import ConnectionStatus from './components/ConnectionStatus'
import Heatmap          from './components/Heatmap'
import ActuatorControl  from './components/ActuatorControl'
import LiveData         from './components/LiveData'
import CtrlPanel        from './components/CtrlPanel'
import './App.css'

export default function App() {
  useMqttSimulator()

  return (
    <div className="app">
      <TopBar />
      <main className="grid">
        <div className="area-graph1">  <SpeedChart /> </div>
        <div className="area-graph2">  <PressureChart /> </div>
        <div className="area-model">   <SpoilerModel /> </div>
        <div className="area-conn">    <ConnectionStatus /> </div>
        <div className="area-heat">    <Heatmap /> </div>
        <div className="area-actctrl"> <ActuatorControl /> </div>
        <div className="area-data">    <LiveData /> </div>
        <div className="area-ctrl">    <CtrlPanel /> </div>
      </main>
    </div>
  )
}
