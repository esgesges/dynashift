import { useEffect } from 'react'
import { useStore } from '../store/useStore'

export function useMqttSimulator() {
  const set = useStore(s => s.set)
  const addSpeedPoint    = useStore(s => s.addSpeedPoint)
  const addPressurePoint = useStore(s => s.addPressurePoint)
  const addHeatPoint     = useStore(s => s.addHeatPoint)
  const setMqttConnected = useStore(s => s.setMqttConnected)

  useEffect(() => {
    setMqttConnected(true)
    set({ connections: { ecu: true, gyro: true, panel: true }, power: true, mode: 'default',
          gyro: { x: 0, y: 0, z: 0, calibrated: true } })

    let t = 0
    const iv = setInterval(() => {
      t += 0.1
      const speed    = 80 + Math.sin(t * 0.3) * 60 + Math.random() * 4
      const steering = Math.sin(t * 0.5) * 25
      const fl = Math.max(0, Math.min(1, 0.5 + Math.sin(t * 0.4) * 0.4))
      const fr = Math.max(0, Math.min(1, 0.5 + Math.sin(t * 0.4 + 0.3) * 0.4))
      const rl = Math.max(0, Math.min(1, 0.5 + Math.sin(t * 0.4 + 0.6) * 0.4))
      const rr = Math.max(0, Math.min(1, 0.5 + Math.sin(t * 0.4 + 0.9) * 0.4))

      set({
        speed, steering,
        actuators:   { fl: fl * 14, fr: fr * 14, rl: rl * 14, rr: rr * 14 },
        actuatorPos: { fl, fr, rl, rr },
        gyro: { x: (Math.random() - 0.5) * 0.1, y: (Math.random() - 0.5) * 0.1, z: Math.random() * 0.05, calibrated: true },
      })
      addSpeedPoint({ t: Date.now(), v: speed })
      addPressurePoint({ t: Date.now(), fl: fl * 14, fr: fr * 14, rl: rl * 14, rr: rr * 14, steer: steering })
      addHeatPoint({ speed, angle: (fl + fr + rl + rr) / 4 - 0.5 })
    }, 250)

    return () => clearInterval(iv)
  }, [])
}
