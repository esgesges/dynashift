import asyncio
import websockets
from bleak import BleakClient

# ======== CONFIGURAZIONE ========
ADDRESS = "E0:8C:FE:2F:55:E6"  # indirizzo MAC del tuo ESP32
CHAR_UUID = "abcdef01-1234-5678-1234-56789abcdef0"  # UUID della caratteristica
WS_URI = "ws://localhost:8765"  # indirizzo del server WebSocket

# riferimento globale alla connessione WebSocket
ws_connection = None

# ======== INVIO WEBSOCKET ========
async def send_to_ws(text):
    """Invia un messaggio al server WebSocket."""
    global ws_connection
    try:
        if ws_connection is None or ws_connection.closed:
            ws_connection = await websockets.connect(WS_URI)
        await ws_connection.send(text)
    except Exception as e:
        print(f"Errore invio WebSocket: {e}")
        ws_connection = None

# ======== CALLBACK NOTIFICHE ========
def notification_handler(sender, data):
    """
    Viene chiamato ad ogni notifica ricevuta dall'ESP32.
    data è un oggetto bytes, quindi lo convertiamo in stringa sicura.
    """
    try:
        # decodifica sicura ignorando byte non validi
        text = data.decode('utf-8', errors='ignore')
        if text:
            # invia al server WebSocket (schedule async dal callback sync)
            asyncio.get_event_loop().create_task(send_to_ws(text))
            # categorizza i messaggi per tipo
            if text.startswith("pulsante"):
                print(f"[PULSANTE] {text}")
            elif text in ["su", "giu", "centro"]:
                print(f"[SWITCH] {text}")
            elif text.startswith("Encoder:"):
                print(f"[ENCODER] {text}")
            elif text == "SW1":
                print(f"[ENCODER SW] {text}")
            else:
                print(f"[ALTRO] {text}")
        else:
            print(f"[ESP32] byte non decodificabili: {list(data)}")
    except Exception as e:
        print("Errore decodifica dati:", e, "Dati grezzi:", list(data))

# ======== LOOP PRINCIPALE ========
async def main():
    async with BleakClient(ADDRESS) as client:
        if client.is_connected:
            print("✅ Connesso all'ESP32!")

            # avvia notifiche
            await client.start_notify(CHAR_UUID, notification_handler)
            print("In attesa di notifiche... (CTRL+C per uscire)")

            # rimani in attesa finché l'utente non interrompe
            try:
                while True:
                    await asyncio.sleep(1)
            except KeyboardInterrupt:
                print("Interrotto dall'utente, chiusura notifiche...")
                await client.stop_notify(CHAR_UUID)

        else:
            print("❌ Connessione fallita!")

# ======== AVVIO ========
if __name__ == "__main__":
    asyncio.run(main())
