import React from 'react'
//import { useMqttSimulator } from './hooks/useMqttSimulator'
import { useMqtt } from './hooks/useMqtt'
import { useBle }  from './hooks/useBle'

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
  //useMqttSimulator()
  useMqtt()
  useBle()

  const [selectedSection, setSelectedSection] = React.useState('overview');

  const overviewContent = (
    <>
      <div className="area-graph1">  <SpeedChart /> </div>
      <div className="area-graph2">  <PressureChart /> </div>
      <div className="area-model">   <SpoilerModel /> </div>
      <div className="area-conn">    <ConnectionStatus /> </div>
      <div className="area-heat">    <Heatmap /> </div>
      <div className="area-actctrl"> <ActuatorControl /> </div>
      <div className="area-data">    <LiveData /> </div>
      <div className="area-ctrl">    <CtrlPanel /> </div>
    </>
  );

  const spoilerLiveContent = (
    <>
      <div className="area-model">   <SpoilerModel /> </div>
      <div className="area-data">    <LiveData /> </div>
    </>
  );

  const graphsContent = (
    <>
      <div className="area-speed">     <SpeedChart /> </div>
      <div className="area-pressure">  <PressureChart /> </div>
      <div className="area-heatmap">   <Heatmap /> </div>
      <div className="area-actuator">  <ActuatorControl /> </div>
    </>
  );

  return (
    <div className="app">
      <TopBar selectedSection={selectedSection} onSectionChange={setSelectedSection} />
      <main className={`grid ${selectedSection}`}>
        {selectedSection === 'overview' && overviewContent}
        {selectedSection === 'spoilerlive' && spoilerLiveContent}
        {selectedSection === 'graphs' && graphsContent}
      </main>
    </div>
  );
}