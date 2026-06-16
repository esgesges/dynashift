import { useEffect, useRef } from 'react'
import mqtt from 'mqtt'
import { useStore } from '../store/useStore'

const BROKER_URL = 'ws://localhost:9001'

const TOPIC_MAP = {
  'test/speed':        (d, set) => set({ speed: d.value }),
  'test/actuators':    (d, set) => set({ actuators: d }),
  'test/steering':     (d, set) => set({ steering: d.angle }),
  'test/gyro':         (d, set) => set({ gyro: d }),
  'test/mode':         (d, set) => set({ mode: d.mode }),
  'test/power':        (d, set) => set({ power: d.on }),
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
