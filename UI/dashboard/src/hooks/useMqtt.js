import { useEffect, useRef } from 'react'
import mqtt from 'mqtt'
import { useStore } from '../store/useStore'

const BROKER_URL = 'ws://localhost:9001'
const MAGIC = 0x54454C41 // "TELA" (packet size 60 bytes)

function parseGyroBinary(payload) {
  try {
    const buf = payload.buffer.slice(payload.byteOffset, payload.byteOffset + payload.byteLength)
    const view = new DataView(buf)
    const magic = view.getUint32(0, true)
    if (magic !== MAGIC) return null

    const timestamp  = view.getUint32(4, true)
    const counter    = view.getUint32(8, true)
    const accX_raw   = view.getFloat32(12, true)
    const accY_raw   = view.getFloat32(16, true)
    const accZ_raw   = view.getFloat32(20, true)
    const gyroZ_raw  = view.getFloat32(24, true)
    const accX_filt  = view.getFloat32(28, true)
    const accY_filt  = view.getFloat32(32, true)
    const accZ_filt  = view.getFloat32(36, true)
    const gyroZ_filt = view.getFloat32(40, true)
    const roll       = view.getFloat32(44, true)
    const pitch      = view.getFloat32(48, true)
    const yaw        = view.getFloat32(52, true)
    const state      = view.getUint8(56)

    return {
      x: roll,
      y: pitch,
      z: yaw,
      roll,
      pitch,
      yaw,
      accX: accX_filt,
      accY: accY_filt,
      accZ: accZ_filt,
      gyroZ: gyroZ_filt || gyroZ_raw,
      state,
      calibrated: state === 0,
      timestamp,
      counter,
    }
  } catch (_) {
    return null
  }
}

const TOPIC_MAP = {
  'test/speed':        (d, set) => set({ speed: d.value }),
  'test/actuators':    (d, set) => set({ actuators: d }),
  'test/steering':     (d, set) => set({ steering: d.angle }),
  'test/gyro':         (d, set) => set({
    gyro: {
      x: d.roll ?? d.x ?? 0,
      y: d.pitch ?? d.y ?? 0,
      z: d.yaw ?? d.z ?? 0,
      roll: d.roll ?? d.x ?? 0,
      pitch: d.pitch ?? d.y ?? 0,
      yaw: d.yaw ?? d.z ?? 0,
      accX: d.accX ?? 0,
      accY: d.accY ?? 0,
      accZ: d.accZ ?? 1,
      gyroZ: d.gyroZ ?? 0,
      state: d.state ?? 0,
      calibrated: d.calibrated ?? (d.state === 0),
      ...d,
    }
  }),
  'test/mode':         (d, set) => set({ mode: d.mode }),
  // 'test/power' rimosso: lo stato di accensione arriva dalla pulsantiera via BLE
  'test/connections':  (d, set) => set({ connections: d }),
  'test/actuator_pos': (d, set) => set({ actuatorPos: d }),
}

export function useMqtt() {
  const clientRef = useRef(null)
  const set = useStore(s => s.set)
  const addSpeedPoint    = useStore(s => s.addSpeedPoint)
  const addPressurePoint = useStore(s => s.addPressurePoint)
  const addHeatPoint     = useStore(s => s.addHeatPoint)
  const setConnected     = useStore(s => s.setMqttConnected)

  useEffect(() => {
    const client = mqtt.connect(BROKER_URL, { reconnectPeriod: 2000, connectTimeout: 5000 })
    clientRef.current = client
    client.on('connect', () => { setConnected(true); client.subscribe(Object.keys(TOPIC_MAP)) })
    client.on('offline', () => setConnected(false))
    client.on('error',   () => setConnected(false))
    client.on('message', (topic, payload) => {
      try {
        if (topic === 'test/gyro') {
          const binaryGyro = parseGyroBinary(payload)
          if (binaryGyro) {
            set({ gyro: binaryGyro, connections: { ...useStore.getState().connections, gyro: true } })
            return
          }
        }
        const data = JSON.parse(payload.toString())
        TOPIC_MAP[topic]?.(data, set)
        const now = Date.now()
        const state = useStore.getState()
        if (topic === 'test/speed') addSpeedPoint({ t: now, v: data.value })
        if (topic === 'test/actuators') addPressurePoint({ t: now, ...data, steer: state.steering })
        if (topic === 'test/speed' || topic === 'test/actuator_pos') {
          const p = state.actuatorPos
          addHeatPoint({ speed: state.speed, angle: (p.fl + p.fr + p.rl + p.rr) / 4 - 0.5 })
        }
      } catch (_) {}
    })
    return () => client.end()
  }, [])

  return clientRef
}
