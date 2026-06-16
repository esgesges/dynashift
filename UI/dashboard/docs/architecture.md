# Architettura

## Flusso dei dati

```
┌─────────────┐         ┌──────────────┐         ┌──────────┐         ┌──────────┐
│  Centralina │  MQTT   │   Broker     │   WS    │  useMqtt │  set()  │  Zustand │
│   Gyro      │ ──────► │ (Mosquitto)  │ ──────► │   hook   │ ──────► │   store  │
│   Pulsantiera│         │  porta 9001  │         │          │         │          │
└─────────────┘         └──────────────┘         └──────────┘         └────┬─────┘
                                                                            │
                                                                            │ useStore(selector)
                                                                            ▼
                                                                    ┌──────────────┐
                                                                    │  Componenti  │
                                                                    │  React       │
                                                                    └──────────────┘
```

**Una sola fonte di verità: lo store.** Tutti i componenti leggono lo stato con
`useStore(selector)` e Zustand si occupa di re-renderizzare solo quelli interessati
dal selettore. Nessun componente comunica direttamente con MQTT — solo l'hook
(`useMqtt` o `useMqttSimulator`) scrive nello store.

Per dettagli sui topic MQTT → vedi [mqtt.md](mqtt.md).

## Layout principale

Definito in `App.jsx` + `App.css`. È una griglia CSS 4×2:

```
┌────────────────── TopBar (48px) ──────────────────┐
├──────────┬──────────┬─────────────┬───────────────┤
│ graph1   │ graph2   │ model       │ conn          │  ← riga 1
│ SpeedChart│Pressure │ SpoilerModel│ ConnectionStat│
├──────────┼──────────┼─────────────┼───────────────┤
│ heat     │ actctrl  │ data        │ ctrl          │  ← riga 2
│ Heatmap  │ ActCtrl  │ LiveData    │ CtrlPanel     │
└──────────┴──────────┴─────────────┴───────────────┘
   1fr        1fr       1fr           155px
```

**`App.css`** (estratto significativo):
```css
.grid {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr 155px;
  grid-template-rows: 1fr 1fr;
  grid-template-areas:
    "graph1  graph2  model  conn"
    "heat    actctrl data   ctrl";
}
```

Ogni componente è avvolto in `<div className="area-XXX">` che fa il bridge fra la
griglia e il pannello vero. Le aree usano `display: flex; min-height: 0` per
permettere ai figli di scalare correttamente con `flex: 1`.

## Pattern dei componenti

Tutti i componenti seguono lo stesso schema:

```jsx
import { useStore } from '../store/useStore'
import './NomeComponente.css'

export default function NomeComponente() {
  const datoCheServe = useStore(s => s.datoCheServe)
  return (
    <div className="panel-card">
      <h3>Titolo</h3>
      {/* contenuto */}
    </div>
  )
}
```

**Convenzioni:**
- Selettori granulari (`useStore(s => s.speed)`) per evitare re-render inutili
- Wrapper standard `<div className="panel-card">` per uniformità grafica
- CSS sibling con stesso nome (`Foo.jsx` ↔ `Foo.css`)
- Per i grafici che usano `ResponsiveContainer height="100%"`, avvolgere in
  `<div className="chart-fill">` perché Recharts ha bisogno di un genitore con
  altezza esplicita

## Design tokens (CSS variables)

Definiti in `App.css` su `:root`:

```css
--bg:      #0a0a0f   /* sfondo app */
--surface: #111118   /* sfondo card */
--border:  #1e1e2a   /* bordi sottili */
--text:    #dde      /* testo primario */
--hdr:     48px      /* altezza topbar */
--gap:     7px       /* spazio fra card della grid */
--pad:     7px       /* padding esterno della grid */
```

**Colori per attuatore** (usati in più componenti):
- FL = `#4488ff` (blu)
- FR = `#00cc88` (verde)
- RL = `#ffaa00` (arancio)
- RR = `#ff4444` (rosso)

Se cambi questi valori, cerca con `grep -r "4488ff" src/` per trovare tutti i punti
dove sono usati.

## Considerazioni di performance (Pi 3B)

Il Pi 3B ha CPU ARM Cortex-A53 4-core a 1.2 GHz e 1 GB di RAM. Linee guida che
abbiamo seguito:

- **Nessun WebGL/Three.js**: solo SVG per il modello alettone
- **Update throttling**: il simulatore aggiorna a 4 Hz (250 ms). Per dati reali via
  MQTT, se la centralina pubblica più velocemente, valutare un debounce nello store
- **Ring buffer per le serie**: `MAX_SERIES=150` e `MAX_HEAT=3000` in `useStore.js`
  evitano che lo store cresca all'infinito
- **`isAnimationActive={false}`** su tutte le `<Line>` Recharts per saltare le
  animazioni di entrata che pesano sulla CPU
- **`transition: 0.15s`** invece di 0.3s sulle barre — già percepibile come fluido
  ma più leggero

## Build e bundle

```bash
npm run build
# dist/assets/index-*.js   ~580 KB  (~178 KB gzipped)
# dist/assets/index-*.css  ~8 KB    (~2 KB gzipped)
```

Il bundle è dominato da Recharts (~300 KB) e D3 (~150 KB). Volendo si possono
sostituire entrambi con SVG inline custom, ma 178 KB gzipped è più che accettabile
anche su Pi 3B in rete locale.
