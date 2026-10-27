import { useCallback, useEffect, useState } from 'react'
import { useStore } from '../store/useStore'

/* ──────────────────────────────────────────────────────────────
   Nordic UART Service — stessi UUID di ble2.py
   ────────────────────────────────────────────────────────────── */
const SERVICE_UUID = '6e400001-b5a3-f393-e0a9-e50e24dcca9e'
const TX_UUID      = '6e400003-b5a3-f393-e0a9-e50e24dcca9e'  // notify  (ESP32 → noi)
const RX_UUID      = '6e400002-b5a3-f393-e0a9-e50e24dcca9e'  // write   (noi → ESP32)

const DEVICE_NAME    = 'ESP32_Test'
const MAX_RECONNECT  = 15
const RECONNECT_MS   = 1500

/* ── logger speculare al Python ── */
const ICONS = { sys: '[ SYS ]', btn: '[ BTN ]', enc: '[ ENC ]',
                sw:  '[ SW  ]', state: '[STATE]', warn: '[WARN ]' }
function stamp() {
  const d = new Date(), pad = (n, w = 2) => String(n).padStart(w, '0')
  const cs = pad(Math.floor(d.getMilliseconds() / 10), 2)
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.${cs}`
}
function log(msg, type = 'sys') {
  console.log(`${stamp()}  ${ICONS[type] ?? ICONS.sys}  ${msg}`)
}

/* ──────────────────────────────────────────────────────────────
   Singleton module-level state
   - condiviso da useBle() e dalle funzioni esportate (bleSend/bleConnect)
   - notifica i React subscriber tramite `listeners`
   ────────────────────────────────────────────────────────────── */
const state = {
  status: 'idle',         // 'idle' | 'scanning' | 'connecting' | 'connected' | 'disconnected' | 'error'
  device: null,
  rxChar: null,
  wantConnected: false,
  reconnectAttempts: 0,
}
const listeners = new Set()

function setStatus(s) {
  state.status = s
  listeners.forEach(fn => fn(s))
}

/* ── store helpers (evitano l'hook in funzioni non-React) ── */
const setPower      = v   => useStore.setState({ power: v })
const setSwitchPos  = p   => useStore.setState({ switchPos: p })
const setPanelConn  = v   => useStore.setState(s => ({ connections: { ...s.connections, panel: v } }))

/* ── parsing notifiche, speculare a handle_notification() Python ── */
function handleNotification(event) {
  const text = new TextDecoder().decode(event.target.value)

  for (const raw of text.split('\n')) {
    const msg = raw.trim()
    if (!msg) continue

    if (msg.startsWith('BTN:')) {
      log(msg, 'btn')

    } else if (msg.startsWith('ENC:')) {
      log(msg, 'enc')

    } else if (msg.startsWith('SW:')) {
      const pos = msg.slice(3)
      if (pos === 'UP' || pos === 'CENTER' || pos === 'DOWN') setSwitchPos(pos)
      log(msg, 'sw')

    } else if (msg.startsWith('STATE:')) {
      const what = msg.slice(6)
      log(msg, 'state')
      if (what === 'AWAKE') {
        setPower(true);  log('→ Pulsantiera accesa', 'sys')
      } else if (what === 'SHUTDOWN') {
        setPower(false); log('→ Pulsantiera spenta', 'sys')
      } else if (what === 'REFUSED_SWITCH_UP') {
        log('⚠ Impossibile spegnere: switch in UP, riportalo al centro', 'warn')
      } else if (what === 'REFUSED_SWITCH_CENTER') {
        log('⚠ Impossibile accendere: switch in CENTER', 'warn')
      } else if (what.startsWith('CONNECTED:')) {
        log('→ Attendo stato dalla pulsantiera...', 'sys')
      }

    } else if (msg === 'DYNASHIFT_OFF') {
      setPower(false)
      log('DYNASHIFT_OFF — spegnimento forzato dallo switch fisico', 'state')

    } else {
      log(msg, 'sys')
    }
  }
}

/* ── connessione effettiva ── */
async function connectToDevice(device) {
  if (!device) throw new Error('Nessun device')
  setStatus('connecting')
  log(`Connecting to ${device.name}...`)

  const server  = await device.gatt.connect()
  const service = await server.getPrimaryService(SERVICE_UUID)
  const txChar  = await service.getCharacteristic(TX_UUID)
  const rxChar  = await service.getCharacteristic(RX_UUID)
  state.rxChar  = rxChar

  txChar.addEventListener('characteristicvaluechanged', handleNotification)
  await txChar.startNotifications()

  state.reconnectAttempts = 0
  setPanelConn(true)
  setStatus('connected')
  log(`Connected to ${device.name}`)
  log('In ascolto. Comandi: SHUT_DOWN / WAKE_UP')
}

/* ── handler disconnessione (dal device, non da richiesta utente) ── */
async function onDisconnected() {
  setPanelConn(false)
  state.rxChar = null
  setStatus('disconnected')
  log('Disconnesso.', 'warn')
  if (!state.wantConnected) return

  if (state.reconnectAttempts >= MAX_RECONNECT) {
    log('Max reconnect attempts raggiunto.', 'warn')
    return
  }
  state.reconnectAttempts += 1
  log(`Riconnessione in ${RECONNECT_MS}ms... (${state.reconnectAttempts}/${MAX_RECONNECT})`, 'warn')
  setTimeout(async () => {
    try { await connectToDevice(state.device) }
    catch (e) { log(`Errore riconnessione: ${e.message}`, 'warn') }
  }, RECONNECT_MS)
}

function attachDevice(device) {
  state.device = device
  device.addEventListener('gattserverdisconnected', onDisconnected)
}

/* ──────────────────────────────────────────────────────────────
   API ESPORTATA — usabile da qualunque componente senza hook
   ────────────────────────────────────────────────────────────── */

/** Tenta auto-connect a un device già accoppiato. NON apre prompt. */
export async function bleAutoConnect() {
  if (!navigator.bluetooth) {
    log('Web Bluetooth non supportato in questo browser.', 'warn')
    setStatus('error')
    return false
  }
  if (typeof navigator.bluetooth.getDevices !== 'function') {
    // browser senza getDevices() → serve gesto utente, fallback a blePair()
    return false
  }
  try {
    const devices = await navigator.bluetooth.getDevices()
    const known = devices.find(d => d.name === DEVICE_NAME)
    if (!known) return false
    log(`Device già autorizzato trovato: ${known.name}`)
    attachDevice(known)
    state.wantConnected = true

    // alcuni device tornano "advertising" solo dopo un evento utente; proviamo lo stesso
    await connectToDevice(known)
    return true
  } catch (e) {
    log(`Auto-connect fallito: ${e.message}`, 'warn')
    return false
  }
}

/** Apre il selettore di device del browser. DEVE essere chiamato da un click utente. */
export async function blePair() {
  if (!navigator.bluetooth) {
    log('Web Bluetooth non supportato in questo browser.', 'warn')
    setStatus('error')
    return
  }
  try {
    setStatus('scanning')
    log(`Scanning for '${DEVICE_NAME}'...`)
    const device = await navigator.bluetooth.requestDevice({
      filters: [{ name: DEVICE_NAME }],
      optionalServices: [SERVICE_UUID],
    })
    attachDevice(device)
    state.wantConnected = true
    await connectToDevice(device)
  } catch (e) {
    log(`Errore connessione: ${e.message}`, 'warn')
    setStatus('error')
    setPanelConn(false)
  }
}

/** Disconnessione esplicita (no riconnessione automatica). */
export function bleDisconnect() {
  state.wantConnected = false
  const dev = state.device
  if (dev?.gatt?.connected) dev.gatt.disconnect()
  setPanelConn(false)
  setStatus('idle')
  log('Disconnesso (richiesto).')
}

/** Invia un comando (SHUT_DOWN | WAKE_UP) — speculare a send_command() Python. */
export async function bleSend(cmd) {
  if (!state.rxChar) {
    log('RX characteristic non disponibile', 'warn')
    return
  }
  if (cmd !== 'SHUT_DOWN' && cmd !== 'WAKE_UP') {
    log(`Comando sconosciuto: ${cmd}`, 'warn')
    return
  }
  try {
    await state.rxChar.writeValue(new TextEncoder().encode(cmd))
    log(`→ Sent: ${cmd}`)
  } catch (e) {
    log(`Send error: ${e.message}`, 'warn')
  }
}

/* ──────────────────────────────────────────────────────────────
   Hook di inizializzazione — chiamare UNA SOLA VOLTA (in App.jsx)
   ────────────────────────────────────────────────────────────── */
export function useBle() {
  const [status, setLocalStatus] = useState(state.status)

  useEffect(() => {
    listeners.add(setLocalStatus)
    // tentativo di auto-connect all'avvio (device già accoppiato)
    bleAutoConnect().then(ok => {
      if (!ok) log('Premi "Connetti pulsantiera" per accoppiare la prima volta.')
    })
    return () => { listeners.delete(setLocalStatus) }
  }, [])

  return { status, pair: blePair, disconnect: bleDisconnect, send: bleSend }
}
