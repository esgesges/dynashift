# Dynashift Dashboard — Documentazione

Interfaccia di controllo per alettone dinamico a 4 attuatori. Riceve dati via MQTT
da centralina, giroscopio e pulsantiera, e li mostra in tempo reale su un display
touch (target: Raspberry Pi 3B).

## Indice

1. **[Architettura](architecture.md)** — come è organizzato il codice, layout grid, flusso dei dati
2. **[MQTT](mqtt.md)** — topic, payload, simulatore, integrazione broker reale
3. **[Componenti](components.md)** — cosa fa ogni componente e come modificarlo
4. **[Ricette](recipes.md)** — esempi pratici (aggiungere un dato, cambiare layout, ecc.)

## Quickstart

```bash
cd dashboard
npm install           # solo la prima volta
npm run dev           # avvia dev server su http://localhost:5173
npm run build         # build di produzione → dist/
npm run preview       # serve la build di produzione
```

L'app parte con dati **simulati** (`useMqttSimulator`). Per collegarsi al broker
MQTT reale vedi [mqtt.md](mqtt.md#abilitare-il-broker-reale).

## Stack tecnico

| Layer | Libreria | Scelta perché |
|---|---|---|
| Framework | **React 19 + Vite** | HMR veloce, bundle leggero |
| State | **Zustand** | API minimale, no boilerplate vs Redux |
| MQTT | **mqtt.js** | client standard, supporta WebSocket |
| Grafici linea | **Recharts** | dichiarativo, integrato con React |
| Heatmap | **D3** | controllo fine su rendering custom |
| 3D / SVG | **SVG inline** | zero dipendenze, leggerissimo per Pi 3B |

Three.js è stato rimosso in favore di un SVG top-down per ridurre il bundle del 62%
(adatto a Pi 3B con poca GPU).

## Struttura del progetto

```
dashboard/
├── src/
│   ├── App.jsx              ← layout principale (grid + componenti)
│   ├── App.css              ← grid CSS, varianti card, tokens
│   ├── index.css            ← reset base
│   ├── main.jsx             ← entry point React
│   ├── hooks/
│   │   ├── useMqtt.js          ← connessione broker reale
│   │   └── useMqttSimulator.js ← generatore dati per sviluppo
│   ├── store/
│   │   └── useStore.js      ← stato globale Zustand
│   └── components/
│       ├── TopBar.jsx          ← header con velocità live
│       ├── SpeedChart.jsx      ← grafico velocità nel tempo
│       ├── PressureChart.jsx   ← grafico pressione 4 attuatori
│       ├── SpoilerModel.jsx    ← vista top SVG dell'alettone
│       ├── Heatmap.jsx         ← heatmap velocità–angolo (D3)
│       ├── ActuatorControl.jsx ← barre attuatori + override + limiti
│       ├── LiveData.jsx        ← pannello numerico riassuntivo
│       ├── ConnectionStatus.jsx← stato connessioni + gyro
│       └── CtrlPanel.jsx       ← power + 4 bottoni modalità
├── docs/                    ← questa documentazione
└── package.json
```

## Feature non implementate al momento

- **Registrazione sessione**: rimossa dallo store. Vedi
  [recipes.md → Aggiungere il logging della sessione](recipes.md#aggiungere-il-logging-della-sessione)
  per riaggiungerla.
- **Pubblicazione override su MQTT**: `manualPos` viene salvato nello store ma non
  pubblicato sul broker. Vedi
  [recipes.md → Pubblicare l'override via MQTT](recipes.md#pubblicare-loverride-via-mqtt).
