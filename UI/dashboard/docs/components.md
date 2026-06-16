# Componenti

Descrizione, dati letti dallo store e punti di personalizzazione di ogni
componente. I file CSS hanno lo stesso nome del JSX (`Foo.jsx` ↔ `Foo.css`).

---

## TopBar

**File**: `src/components/TopBar.jsx`

Header in cima. Mostra logo Dynashift e velocità live grande sulla destra.

| Legge dallo store | Note |
|---|---|
| `speed` | numero principale, allineato a destra |

**Personalizzare**: cambia `font-size` di `.spd-val` in `TopBar.css` per ingrandire
il numero della velocità.

---

## SpeedChart

**File**: `src/components/SpeedChart.jsx`

Grafico lineare velocità nel tempo, basato su Recharts. La serie temporale è
ring-bufferizzata a 150 punti.

| Legge dallo store | Note |
|---|---|
| `speedSeries` | array `[{ t, v }, ...]` |
| `speed` | valore istantaneo nell'header |

**Personalizzare**:
- Cambia il colore della linea (`stroke="#4488ff"`)
- `domain={['auto', 'auto']}` adatta la scala Y automaticamente. Per fissare a
  0–250 km/h: `domain={[0, 250]}`
- Per più punti storici, aumenta `MAX_SERIES` in `useStore.js`

---

## PressureChart

**File**: `src/components/PressureChart.jsx`

Grafico lineare con 4 linee (una per attuatore) della pressione in bar.

| Legge dallo store | Note |
|---|---|
| `pressureSeries` | `[{ t, fl, fr, rl, rr }, ...]` |
| `actuators` | valori istantanei nell'header |

**Personalizzare**: la costante `COLORS` in cima al file mappa attuatore → colore.

---

## SpoilerModel

**File**: `src/components/SpoilerModel.jsx`

Vista top-down SVG dell'alettone con 4 cerchi che rappresentano gli attuatori. Ogni
cerchio si riempie ad arco in base alla posizione, con colore che scala
blu → arancio → rosso al crescere del valore.

| Legge dallo store | Note |
|---|---|
| `actuatorPos` | `{ fl, fr, rl, rr }` 0–1 |

**Personalizzare**:
- Soglie di colore in `ActCircle()`: `value > 0.7 ? '#ff4444' : value > 0.4 ? '#ffaa00' : '#4488ff'`
- Posizione dei cerchi nella costante `ACTS` in alto al file (coordinate SVG)
- L'SVG ha `viewBox="0 0 260 200"` con `preserveAspectRatio="xMidYMid meet"` quindi
  scala mantenendo le proporzioni

---

## Heatmap

**File**: `src/components/Heatmap.jsx`

Heatmap 2D D3 della densità velocità–angolo. Accumula gli ultimi 3000 punti dello
store e li raggruppa in bin 15 km/h × 0.08 rad. La legenda colore è in basso.

| Legge dallo store | Note |
|---|---|
| `heatPoints` | `[{ speed, angle }, ...]` |

**Personalizzare**:
- Dimensione bin: variabili `bx` (velocità) e `by` (angolo) nella funzione `draw()`
- Scala colore: `d3.interpolateInferno` → prova `d3.interpolateViridis`, `Magma`,
  `Plasma`
- Range Y (angolo): `yScale.domain([-0.6, 0.6])`
- Numero massimo punti: `MAX_HEAT` in `useStore.js`

Il componente usa un `ResizeObserver` per ridisegnare quando la card cambia
dimensione, perché D3 non è "responsive" come Recharts.

---

## ActuatorControl

**File**: `src/components/ActuatorControl.jsx`

Pannello di controllo a 4 barre verticali per gli attuatori. Include:
- 4 barre con livello attuale + linea blu per il limite configurato
- Toggle "Override" per assumere il controllo manuale
- Sliders per posizione manuale (visibili solo se override attivo)
- Sliders per i limiti (sempre visibili)

| Legge dallo store | Scrive nello store |
|---|---|
| `actuatorPos`, `actuatorLimits`, `manualOverride`, `manualPos` | `setManualOverride`, `setManualPos`, `setActuatorLimits` |

**Comportamento dell'override**: quando `manualOverride === true`, le barre mostrano
`manualPos` invece di `actuatorPos`. Toccava al backend leggere `manualPos` dallo
store e pubblicare i comandi via MQTT — al momento questo non è collegato (vedi
[ricette](recipes.md#pubblicare-loverride-via-mqtt) per come farlo).

**Personalizzare**:
- Layout barre: `.act-bars` in `ActuatorControl.css` (`grid-template-columns: repeat(4, 1fr)`)
- Touch target degli slider: `.slider-row input[type=range] { height: 20px }`
  (l'altezza grande aumenta l'area di hit)

---

## LiveData

**File**: `src/components/LiveData.jsx`

Pannello riassuntivo di tutti i dati numerici importanti. È strutturato in "tile"
con bordo colorato a sinistra. Contiene:

1. **Velocità + Sterzo**: due tile affiancate con numeri grandi (1.9rem)
2. **Giroscopio**: X / Y / Z + badge calibrazione
3. **Pressione attuatori**: 4 valori bar con colori per attuatore
4. **Risposta attuatori**: 4 barre orizzontali animate

| Legge dallo store |
|---|
| `speed`, `steering`, `actuators`, `actuatorPos`, `gyro` |

**Personalizzare**:
- Le funzioni `Tile()` e `BigNum()` in fondo al file sono pattern riutilizzabili
- Soglie warning sterzo: `Math.abs(steering) > 20 ? '#ff4444' : > 10 ? '#ffaa00' : '#ccd'`
- Colori attuatori: costante `ACT_COLORS` in cima al file

---

## ConnectionStatus

**File**: `src/components/ConnectionStatus.jsx`

Pannello stato connessioni. Mostra MQTT broker, centralina, giroscopio, pulsantiera
ciascuno con pallino verde/rosso e label OK/OFF. In fondo c'è il badge gyro
calibrato + valori X/Y/Z.

| Legge dallo store |
|---|
| `mqttConnected`, `connections`, `gyro` |

**Personalizzare**:
- Aggiungere una nuova connessione: aggiungi al costante `CONNS` in alto e fai
  arrivare il dato in `connections` dal topic `test/connections`

---

## CtrlPanel

**File**: `src/components/CtrlPanel.jsx`

Colonna verticale a destra: indicatore power grande in alto, divisore, 4 bottoni
modalità impilati.

| Legge dallo store | Scrive nello store |
|---|---|
| `power`, `mode` | `setMode` |

**Personalizzare**:
- Aggiungere una modalità: aggiungi un oggetto a `MODES` (id + label + color)
- Touch target: i bottoni hanno `min-height: 44px` (linea guida WCAG per tap)
- Dimensione icona power: `.pwr-svg { width: 68px; height: 68px }`
