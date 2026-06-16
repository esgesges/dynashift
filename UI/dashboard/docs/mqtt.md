# MQTT — Topic, payload, integrazione

## Topic e payload attesi

Lo store si aspetta JSON sui seguenti topic. Definiti in `src/hooks/useMqtt.js`
nella mappa `TOPIC_MAP`.

| Topic | Payload JSON | Esempio |
|---|---|---|
| `test/speed`        | `{ value: number, unit?: string }`        | `{"value":134.5,"unit":"km/h"}` |
| `test/actuators`    | `{ fl, fr, rl, rr: number }` (bar)        | `{"fl":4.2,"fr":3.8,"rl":2.1,"rr":1.9}` |
| `test/actuator_pos` | `{ fl, fr, rl, rr: number }` (0–1)        | `{"fl":0.30,"fr":0.28,"rl":0.15,"rr":0.12}` |
| `test/steering`     | `{ angle: number }` (gradi, ±)            | `{"angle":-12.3}` |
| `test/gyro`         | `{ x, y, z: number, calibrated: bool }`   | `{"x":0.01,"y":-0.02,"z":0.0,"calibrated":true}` |
| `test/mode`         | `{ mode: string }`                         | `{"mode":"turbo"}` |
| `test/power`        | `{ on: bool }`                            | `{"on":true}` |
| `test/connections`  | `{ ecu, gyro, panel: bool }`              | `{"ecu":true,"gyro":true,"panel":false}` |

> **Convenzione**: nomi attuatori sono **fl** (front-left), **fr** (front-right),
> **rl** (rear-left), **rr** (rear-right). Sono usati ovunque.

> Il prefisso `test/` può essere cambiato modificando `TOPIC_MAP` in `useMqtt.js`.

## Modalità sviluppo: simulatore

Per default `App.jsx` usa `useMqttSimulator()`, che **non si connette a nessun
broker** ma genera dati sintetici plausibili (onde sinusoidali) ogni 250 ms.

```jsx
// src/App.jsx
import { useMqttSimulator } from './hooks/useMqttSimulator'
// import { useMqtt } from './hooks/useMqtt'

export default function App() {
  useMqttSimulator()    // ← attivo in sviluppo
  // useMqtt()          // ← attivare per broker reale
  ...
}
```

Il simulatore imposta automaticamente `power: true`, `mode: 'default'`,
`gyro.calibrated: true` e tutte le connessioni a `true`, così l'UI è "viva"
appena apri il browser.

## Abilitare il broker reale

1. **Setup Mosquitto** con listener WebSocket:
   ```conf
   # /etc/mosquitto/mosquitto.conf
   listener 1883                # client classici (centralina)
   protocol mqtt

   listener 9001                # client browser
   protocol websockets
   allow_anonymous true         # solo per LAN/test
   ```
2. **Verifica URL** in `src/hooks/useMqtt.js`:
   ```js
   const BROKER_URL = 'ws://localhost:9001'
   ```
   Se l'app gira sul Pi e il broker pure, `localhost` va bene. Se sono macchine
   diverse, usa l'IP del broker.
3. **Switch in `App.jsx`**:
   ```jsx
   // useMqttSimulator()
   useMqtt()
   ```

Per testare velocemente da terminale:
```bash
mosquitto_pub -h localhost -t test/speed -m '{"value":120}'
mosquitto_pub -h localhost -t test/actuators -m '{"fl":4.5,"fr":4.4,"rl":2.1,"rr":2.0}'
```

## Come funziona `useMqtt`

```js
// 1. Connessione
client = mqtt.connect('ws://...', { reconnectPeriod: 2000 })

// 2. On connect → subscribe a tutti i topic della mappa
client.on('connect', () => client.subscribe(Object.keys(TOPIC_MAP)))

// 3. On message → trova l'handler nella mappa, parsalo, chiama set() dello store
client.on('message', (topic, payload) => {
  const data = JSON.parse(payload.toString())
  TOPIC_MAP[topic]?.(data, set)
  // …aggiunge anche punti alle serie temporali
})
```

La mappa `TOPIC_MAP` separa la **decodifica del topic** dalla **scrittura nello store**.
Per supportare un nuovo topic basta aggiungere una riga:

```js
'test/temperature': (d, set) => set({ temperature: d.value }),
```

e aggiungere `temperature: 0` allo stato iniziale di `useStore.js`.

## Riconnessione automatica

`mqtt.js` riconnette automaticamente con `reconnectPeriod: 2000` (2 secondi).
L'indicatore `MQTT` in `ConnectionStatus` mostra `OK`/`OFF` in base agli eventi
`connect`/`offline`/`error`.

## Pubblicare dal dashboard (se servirà)

Il dashboard ora è solo **subscriber**. Per pubblicare comandi (es. cambio modalità,
override attuatori), basta esporre `clientRef` dall'hook e chiamare:

```js
clientRef.current.publish('cmd/mode', JSON.stringify({ mode: 'turbo' }))
```

Suggerimento: convenzione `cmd/*` per i comandi in uscita, `test/*` (o `data/*`)
per i dati in entrata.
