import { create } from 'zustand'

const MAX_SERIES = 150
const MAX_HEAT = 3000

// 4 attuatori: fl=front-left, fr=front-right, rl=rear-left, rr=rear-right
const DEFAULT_ACT = { fl: 0, fr: 0, rl: 0, rr: 0 }

export const useStore = create((set) => ({
  mqttConnected: false,
  connections: { ecu: false, gyro: false, panel: false },

  speed: 0,
  steering: 0,
  actuators:    { ...DEFAULT_ACT },   // pressione bar
  actuatorPos:  { ...DEFAULT_ACT },   // posizione 0-1
  gyro: { x: 0, y: 0, z: 0, calibrated: false },
  mode: 'default',
  power: false,

  speedSeries: [],
  pressureSeries: [],
  heatPoints: [],

  actuatorLimits: { fl: 1, fr: 1, rl: 1, rr: 1 },
  manualOverride: false,
  manualPos: { ...DEFAULT_ACT },

  set: (partial) => set(partial),
  setMqttConnected: (v) => set({ mqttConnected: v }),

  addSpeedPoint:    (pt) => set(s => ({ speedSeries:    [...s.speedSeries.slice(-MAX_SERIES + 1), pt] })),
  addPressurePoint: (pt) => set(s => ({ pressureSeries: [...s.pressureSeries.slice(-MAX_SERIES + 1), pt] })),
  addHeatPoint:     (pt) => set(s => ({ heatPoints:     [...s.heatPoints.slice(-MAX_HEAT + 1), pt] })),

  setMode:            (mode)   => set({ mode }),
  setActuatorLimits:  (limits) => set({ actuatorLimits: limits }),
  setManualOverride:  (v)      => set({ manualOverride: v }),
  setManualPos:       (pos)    => set({ manualPos: pos }),
}))
