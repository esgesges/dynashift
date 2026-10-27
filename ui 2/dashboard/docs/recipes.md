# Ricette — modifiche comuni

Esempi pratici. Ogni ricetta è autosufficiente.

## Indice

- [Aggiungere un nuovo dato dal broker MQTT](#aggiungere-un-nuovo-dato-dal-broker-mqtt)
- [Aggiungere un nuovo componente al layout](#aggiungere-un-nuovo-componente-al-layout)
- [Spostare un componente in un'altra cella](#spostare-un-componente-in-unaltra-cella)
- [Cambiare i colori globali](#cambiare-i-colori-globali)
- [Aggiungere una nuova modalità](#aggiungere-una-nuova-modalità)
- [Pubblicare l'override via MQTT](#pubblicare-loverride-via-mqtt)
- [Aggiungere il logging della sessione](#aggiungere-il-logging-della-sessione)
- [Debug: il dato non arriva](#debug-il-dato-non-arriva)

---

## Aggiungere un nuovo dato dal broker MQTT

Esempio: aggiungere `temperature` letto dal topic `test/temperature`.

**1.** In `src/store/useStore.js` aggiungi stato iniziale:
```js
export const useStore = create((set, get) => ({
  // ...
  temperature: 0,
  // ...
}))
```

**2.** In `src/hooks/useMqtt.js` aggiungi alla mappa:
```js
const TOPIC_MAP = {
  // ...
  'test/temperature': (d, set) => set({ temperature: d.value }),
}
```

**3.** Nel simulatore `src/hooks/useMqttSimulator.js` genera il dato per il dev:
```js
set({
  // ...
  temperature: 70 + Math.sin(t) * 10,
})
```

**4.** Usalo in un componente:
```jsx
const temperature = useStore(s => s.temperature)
```

---

## Aggiungere un nuovo componente al layout

Esempio: un nuovo pannello "Temperatura" in una nuova cella.

**1.** Crea `src/components/TempPanel.jsx`:
```jsx
import { useStore } from '../store/useStore'

export default function TempPanel() {
  const temp = useStore(s => s.temperature)
  return (
    <div className="panel-card">
      <h3>Temperatura</h3>
      <div className="live-value">{temp.toFixed(1)} <small>°C</small></div>
    </div>
  )
}
```

**2.** In `App.jsx` importalo e aggiungi un `<div className="area-temp">`.

**3.** In `App.css` estendi la grid. Esempio aggiungendo una colonna:
```css
.grid {
  grid-template-columns: 1fr 1fr 1fr 1fr 155px;  /* +1fr */
  grid-template-areas:
    "graph1  graph2  model    temp  conn"
    "heat    actctrl data     data  ctrl";
}
.area-temp { grid-area: temp; display: flex; flex-direction: column; min-height: 0; }
```

---

## Spostare un componente in un'altra cella

Modifica solo `grid-template-areas` in `App.css`. I nomi delle aree
(`graph1`, `heat`, …) sono fissi e collegati ai `<div className="area-XXX">` in JSX.

Esempio: scambiare heatmap e controllo attuatori:
```css
grid-template-areas:
  "graph1  graph2  model   conn"
  "actctrl heat    data    ctrl";  /* prima era "heat actctrl data ctrl" */
```

---

## Cambiare i colori globali

I colori sono **CSS custom properties** in `App.css` su `:root`. Modifica lì per
cambio globale:

```css
:root {
  --bg:      #0a0a0f;
  --surface: #111118;
  --border:  #1e1e2a;
}
```

I **colori per attuatore** sono ripetuti in più file. Per cambiarli tutti in una
volta:

```bash
# trova tutte le occorrenze
grep -rn "4488ff\|00cc88\|ffaa00\|ff4444" src/components/
```

Oppure centralizza creando in `App.css`:
```css
:root {
  --act-fl: #4488ff;
  --act-fr: #00cc88;
  --act-rl: #ffaa00;
  --act-rr: #ff4444;
}
```
e sostituendo in `LiveData.jsx`, `PressureChart.jsx`, `SpoilerModel.jsx`.

---

## Aggiungere una nuova modalità

In `src/components/CtrlPanel.jsx` aggiungi un oggetto all'array `MODES`:

```js
const MODES = [
  { id: 'default',   label: 'Default', color: '#4488ff' },
  { id: 'eco',       label: 'Eco',     color: '#00cc66' },
  { id: 'turbo',     label: 'Turbo',   color: '#ff4444' },
  { id: 'automatic', label: 'Auto',    color: '#ffaa00' },
  { id: 'race',      label: 'Race',    color: '#ff00ff' },   // ← nuova
]
```

Il bottone usa `var(--mc)` dinamicamente dal `style={{ '--mc': m.color }}`,
quindi i colori si propagano automaticamente.

---

## Pubblicare l'override via MQTT

Al momento `manualPos` viene salvato nello store ma non spedito al broker. Per
chiudere il loop:

**1.** Esporta il client da `useMqtt`:
```js
// src/hooks/useMqtt.js
export function useMqtt() {
  // ...
  return clientRef    // ← già lo ritorna
}
```

**2.** In `App.jsx`, salva il riferimento e passalo dove serve, oppure tieni il
client in un altro store:
```js
// store/mqttClient.js
export let mqttClient = null
export const setMqttClient = c => mqttClient = c
```
e in `useMqtt`: `setMqttClient(client)` al `connect`.

**3.** In `ActuatorControl.jsx`, dopo `setManualPos`:
```js
import { mqttClient } from '../store/mqttClient'

onChange={e => {
  const newPos = { ...manualPos, [key]: parseFloat(e.target.value) }
  setManualPos(newPos)
  mqttClient?.publish('cmd/actuator_override', JSON.stringify({
    enabled: manualOverride,
    pos: newPos,
  }))
}}
```

---

## Aggiungere il logging della sessione

Il logging è stato rimosso dallo store. Per riaggiungerlo:

**1.** Estendi lo store in `src/store/useStore.js`:
```js
recording: false,
sessionLog: [],

set: (partial) => {
  set(partial)
  // se stiamo registrando, accoda il delta con timestamp
  const s = get()                  // serve `get` nel signature: create((set, get) => …)
  if (s.recording) s.sessionLog.push({ t: Date.now(), ...partial })
},

startRecording: () => set({ recording: true, sessionLog: [] }),
stopRecording: () => {
  const log = get().sessionLog
  set({ recording: false })
  return log
},
```

**2.** Aggiungi un bottone in un pannello qualsiasi (es. `CtrlPanel.jsx`):
```jsx
const recording = useStore(s => s.recording)
const startRecording = useStore(s => s.startRecording)
const stopRecording  = useStore(s => s.stopRecording)

const handleToggle = () => {
  if (recording) {
    const log = stopRecording()
    const blob = new Blob([JSON.stringify(log)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `session_${Date.now()}.json`
    a.click()
  } else {
    startRecording()
  }
}

return <button onClick={handleToggle}>{recording ? '■ Stop' : '● Rec'}</button>
```

> Nota: l'helper logga solo update che passano da `set(partial)`. Gli aggiornamenti
> di MQTT lo usano già; i setter locali (es. `setMode`) usano direttamente `set` di
> Zustand e quindi non vengono loggati. Cambia i setter per passare dall'helper se
> ti serve loggare anche le interazioni utente.

---

## Debug: il dato non arriva

Checklist veloce:

1. **Broker raggiungibile?** Apri DevTools → Network → WS. Dovresti vedere una
   connessione `ws://localhost:9001`. Se è in "pending" o "failed", il broker
   non è in ascolto o non ha il listener WebSocket.

2. **Topic giusto?** Verifica con:
   ```bash
   mosquitto_sub -h localhost -t 'test/#' -v
   ```
   Se vedi messaggi qui ma non in UI, il problema è lato client.

3. **JSON valido?** L'handler in `useMqtt.js` fa `JSON.parse()` e ignora errori in
   silenzio. Per debug, aggiungi temporaneamente:
   ```js
   client.on('message', (topic, payload) => {
     console.log('MQTT', topic, payload.toString())
     // ...
   })
   ```

4. **Lo store viene aggiornato?** In DevTools console:
   ```js
   // se hai installato l'extension Zustand devtools, altrimenti:
   window._store = useStore   // exporta temporaneamente da useStore.js
   _store.getState().speed     // ispeziona valori
   ```

5. **Il componente legge la chiave giusta?** Errore tipico:
   `useStore(s => s.actuator_pos)` invece di `s.actuatorPos` — JavaScript non
   segnala, ritorna `undefined`.
