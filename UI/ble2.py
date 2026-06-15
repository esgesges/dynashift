import asyncio
from bleak import BleakClient, BleakScanner
from datetime import datetime

SERVICE_UUID = "6e400001-b5a3-f393-e0a9-e50e24dcca9e"
TX_UUID      = "6e400003-b5a3-f393-e0a9-e50e24dcca9e"  # notify (read)
RX_UUID      = "6e400002-b5a3-f393-e0a9-e50e24dcca9e"  # write commands

DEVICE_NAME          = "ESP32_Test"
MAX_RECONNECT        = 15
RECONNECT_DELAY      = 1.5

# --- Shared state ---
pulsantiera_on = None   # True=on, False=off, None=unknown
switch_pos     = None   # "UP" / "CENTER" / "DOWN" / None
rx_char        = None

def timestamp():
    now = datetime.now()
    return now.strftime("%H:%M:%S.") + f"{now.microsecond // 10000:02d}"

ICONS = {
    "sys":   "[ SYS ]",
    "btn":   "[ BTN ]",
    "enc":   "[ ENC ]",
    "sw":    "[ SW  ]",
    "state": "[STATE]",
    "warn":  "[WARN ]",
}

def log(msg, type="sys"):
    print(f"{timestamp()}  {ICONS.get(type, '[ SYS ]')}  {msg}")

def print_state():
    power  = {True: "ON", False: "OFF", None: "?"}[pulsantiera_on]
    switch = switch_pos or "?"
    print(f"            ↳ state → power={power}  switch={switch}")

def handle_notification(sender, data: bytearray):
    global pulsantiera_on, switch_pos

    text = data.decode("utf-8", errors="replace")
    for line in text.split("\n"):
        msg = line.strip()
        if not msg:
            continue

        if msg.startswith("BTN:"):
            log(msg, "btn")

        elif msg.startswith("ENC:"):
            log(msg, "enc")

        elif msg.startswith("SW:"):
            pos = msg[3:]
            if pos in ("UP", "CENTER", "DOWN"):
                switch_pos = pos
            log(msg, "sw")
            print_state()

        elif msg.startswith("STATE:"):
            what = msg[6:]
            log(msg, "state")
            if what == "AWAKE":
                pulsantiera_on = True
                log("→ Pulsantiera accesa", "sys")
            elif what == "SHUTDOWN":
                pulsantiera_on = False
                log("→ Pulsantiera spenta", "sys")
            elif what == "REFUSED_SWITCH_UP":
                log("⚠ Impossibile spegnere: switch in UP, riportalo al centro", "warn")
            elif what == "REFUSED_SWITCH_CENTER":
                log("⚠ Impossibile accendere: switch in CENTER", "warn")
            elif what.startswith("CONNECTED:"):
                log("→ Attendo stato dalla pulsantiera...", "sys")
            print_state()

        elif msg == "DYNASHIFT_OFF":
            pulsantiera_on = False
            log("DYNASHIFT_OFF — spegnimento forzato dallo switch fisico", "state")
            print_state()

        else:
            log(msg, "sys")

async def send_command(cmd: str):
    global rx_char
    if not rx_char:
        log("RX characteristic not available", "warn")
        return
    try:
        await rx_char.write_gatt_char(RX_UUID, cmd.encode("utf-8"))
        log(f"→ Sent: {cmd}")
    except Exception as e:
        log(f"Send error: {e}", "warn")

async def connect_and_listen():
    global rx_char

    log(f"Scanning for '{DEVICE_NAME}'...")
    device = await BleakScanner.find_device_by_name(DEVICE_NAME, timeout=10.0)
    if not device:
        log("Device not found.", "warn")
        return

    reconnect_attempts = 0
    disconnects_since_connect = 0

    while reconnect_attempts <= MAX_RECONNECT:
        try:
            log(f"Connecting... (attempt {reconnect_attempts + 1})")
            async with BleakClient(device) as client:
                log(f"Connected to {device.name}")
                reconnect_attempts = 0
                disconnects_since_connect = 0

                rx_char = client  # store client ref for send_command
                try:
                    await client.get_services()  # ensure services are discovered
                except Exception:
                    pass

                await client.start_notify(TX_UUID, handle_notification)
                log("Listening. Commands: SHUT_DOWN / WAKE_UP / quit")

                while client.is_connected:
                    try:
                        cmd = await asyncio.wait_for(
                            asyncio.get_event_loop().run_in_executor(None, input, "> "),
                            timeout=1.0
                        )
                        cmd = cmd.strip()
                        if cmd.lower() == "quit":
                            return
                        if cmd in ("SHUT_DOWN", "WAKE_UP"):
                            await send_command(cmd)
                        elif cmd:
                            log(f"Unknown command: {cmd}", "warn")
                            log("Available: SHUT_DOWN, WAKE_UP, quit", "sys")
                    except asyncio.TimeoutError:
                        pass

        except Exception as e:
            reconnect_attempts += 1
            disconnects_since_connect += 1
            if reconnect_attempts > MAX_RECONNECT:
                log("Max reconnect attempts reached.", "warn")
                break
            # Mirror JS: only auto-reconnect on first disconnect (auth handshake)
            if disconnects_since_connect == 1:
                log(f"Disconnected (auth?), reconnecting in {RECONNECT_DELAY}s... "
                    f"({reconnect_attempts}/{MAX_RECONNECT})", "warn")
            else:
                log(f"Disconnected. Reconnecting in {RECONNECT_DELAY}s... "
                    f"({reconnect_attempts}/{MAX_RECONNECT})", "warn")
            await asyncio.sleep(RECONNECT_DELAY)

if __name__ == "__main__":
    try:
        asyncio.run(connect_and_listen())
    except KeyboardInterrupt:
        log("Exiting.")