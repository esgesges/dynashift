#!/usr/bin/env python3
"""
Visualizzatore 3D in tempo reale per IMU WT901C232 + ESP32-S3
Mostra una macchina che si muove come il sensore (via MQTT).

Requisiti:
    pip install pygame-ce PyOpenGL PyOpenGL_accelerate numpy paho-mqtt

Esegui:
    python car_3d_viewer.py
"""

import struct
import threading
import time
from collections import deque

import paho.mqtt.client as mqtt
import pygame
from pygame.locals import *
from OpenGL.GL import *
from OpenGL.GLU import *
import numpy as np

# ============================================================
# CONFIGURAZIONE MQTT & PACCHETTO
# ============================================================
MQTT_BROKER    = "10.236.196.93"   # IP del broker MQTT (es. "localhost" o IP PC)
MQTT_PORT      = 1883              # Porta broker MQTT standard
MQTT_TOPIC     = "test/gyro"       # Topic pubblicato dall'ESP32
MQTT_CLIENT_ID = "car_3d_viewer"

MAGIC          = 0x54454C41
PACKET_FORMAT  = "<III11fB3x"
PACKET_SIZE    = struct.calcsize(PACKET_FORMAT)

WINDOW_WIDTH  = 1280
WINDOW_HEIGHT = 720

# ============================================================
# DATI SENSORE (condivisi tra thread)
# ============================================================
class SensorData:
    def __init__(self):
        self.lock = threading.Lock()
        self.roll = 0.0
        self.pitch = 0.0
        self.yaw = 0.0
        self.accX = 0.0
        self.accY = 0.0
        self.accZ = 1.0
        self.gyroZ = 0.0
        self.state = 0
        self.hz = 0.0
        self.packets = 0
        self.lost = 0
        self.connected = False
        self.last_packet_time = 0

    def update(self, roll, pitch, yaw, accX, accY, accZ, gyroZ, state):
        with self.lock:
            self.roll = roll
            self.pitch = pitch
            self.yaw = yaw
            self.accX = accX
            self.accY = accY
            self.accZ = accZ
            self.gyroZ = gyroZ
            self.state = state
            self.last_packet_time = time.time()
            self.connected = True

    def get(self):
        with self.lock:
            return (self.roll, self.pitch, self.yaw,
                    self.accX, self.accY, self.accZ, self.gyroZ,
                    self.state, self.hz, self.packets, self.lost, self.connected)

sensor = SensorData()

# ============================================================
# THREAD MQTT - riceve dati dall'ESP32
# ============================================================
def create_mqtt_client():
    try:
        # Paho MQTT v2.0+
        return mqtt.Client(mqtt.CallbackAPIVersion.VERSION2, client_id=MQTT_CLIENT_ID)
    except AttributeError:
        # Paho MQTT v1.x fallback
        return mqtt.Client(client_id=MQTT_CLIENT_ID)


def mqtt_receiver():
    last_counter = -1
    fps_window = deque(maxlen=200)

    def on_connect(client, userdata, flags, rc, *args):
        rc_val = getattr(rc, "value", rc)
        if rc_val == 0:
            print(f"[MQTT] Connesso al broker {MQTT_BROKER}:{MQTT_PORT}")
            print(f"[MQTT] Sottoscrizione al topic: {MQTT_TOPIC}")
            client.subscribe(MQTT_TOPIC)
        else:
            print(f"[MQTT] Errore connessione broker (codice: {rc})")

    def on_message(client, userdata, msg):
        nonlocal last_counter
        data = msg.payload

        if len(data) != PACKET_SIZE:
            return

        try:
            unpacked = struct.unpack(PACKET_FORMAT, data)
        except struct.error:
            return

        (magic, timestamp, counter,
         accX_raw, accY_raw, accZ_raw, gyroZ_raw,
         accX_filt, accY_filt, accZ_filt, gyroZ_filt,
         roll, pitch, yaw,
         state) = unpacked

        if magic != MAGIC:
            return

        # Conta pacchetti persi
        if last_counter >= 0 and counter > last_counter + 1:
            with sensor.lock:
                sensor.lost += (counter - last_counter - 1)
        last_counter = counter

        with sensor.lock:
            sensor.packets += 1

        # Calcola Hz
        now = time.time()
        fps_window.append(now)
        if len(fps_window) > 1:
            with sensor.lock:
                sensor.hz = (len(fps_window) - 1) / (fps_window[-1] - fps_window[0])

        # Aggiorna dati
        sensor.update(roll, pitch, yaw, accX_filt, accY_filt, accZ_filt, gyroZ_raw, state)

    def on_disconnect(client, userdata, *args):
        print("[MQTT] Disconnesso dal broker")
        with sensor.lock:
            sensor.connected = False

    client = create_mqtt_client()
    client.on_connect = on_connect
    client.on_message = on_message
    client.on_disconnect = on_disconnect

    print(f"[MQTT] Connessione a {MQTT_BROKER}:{MQTT_PORT}...")
    while True:
        try:
            client.connect(MQTT_BROKER, MQTT_PORT, keepalive=60)
            client.loop_forever()
        except Exception as e:
            print(f"[MQTT] Errore connessione: {e}. Riconnessione tra 2s...")
            with sensor.lock:
                sensor.connected = False
            time.sleep(2)


# ============================================================
# DISEGNO 3D - macchina
# ============================================================
def draw_car():
    """Disegna una macchina sportiva semplificata"""

    # === CORPO PRINCIPALE (chassis) ===
    glColor3f(0.8, 0.1, 0.1)  # Rosso
    draw_box(2.0, 0.4, 4.0)   # larghezza, altezza, lunghezza

    # === TETTO ===
    glPushMatrix()
    glTranslatef(0, 0.5, -0.3)
    glColor3f(0.6, 0.05, 0.05)  # Rosso scuro
    draw_box(1.7, 0.5, 2.2)
    glPopMatrix()

    # === COFANO ANTERIORE ===
    glPushMatrix()
    glTranslatef(0, 0.1, 1.5)
    glColor3f(0.7, 0.08, 0.08)
    draw_box(1.9, 0.2, 1.0)
    glPopMatrix()

    # === ALETTONE POSTERIORE (Zenvo-style!) ===
    glPushMatrix()
    glTranslatef(0, 0.7, -1.9)
    glColor3f(0.1, 0.1, 0.1)  # Nero
    draw_box(2.2, 0.08, 0.4)
    # Supporti alettone
    glColor3f(0.3, 0.3, 0.3)
    glPushMatrix()
    glTranslatef(-0.8, -0.3, 0)
    draw_box(0.08, 0.5, 0.1)
    glPopMatrix()
    glPushMatrix()
    glTranslatef(0.8, -0.3, 0)
    draw_box(0.08, 0.5, 0.1)
    glPopMatrix()
    glPopMatrix()

    # === RUOTE (4) ===
    glColor3f(0.1, 0.1, 0.1)  # Nero
    wheel_positions = [
        (-1.0, -0.3, 1.4),   # ant sx
        (1.0, -0.3, 1.4),    # ant dx
        (-1.0, -0.3, -1.4),  # post sx
        (1.0, -0.3, -1.4),   # post dx
    ]
    for x, y, z in wheel_positions:
        glPushMatrix()
        glTranslatef(x, y, z)
        draw_wheel()
        glPopMatrix()

    # === FARI ANTERIORI ===
    glColor3f(1.0, 1.0, 0.7)
    glPushMatrix()
    glTranslatef(-0.7, 0.0, 2.0)
    draw_box(0.3, 0.15, 0.1)
    glPopMatrix()
    glPushMatrix()
    glTranslatef(0.7, 0.0, 2.0)
    draw_box(0.3, 0.15, 0.1)
    glPopMatrix()

    # === FARI POSTERIORI ===
    glColor3f(1.0, 0.0, 0.0)
    glPushMatrix()
    glTranslatef(-0.7, 0.0, -2.0)
    draw_box(0.3, 0.15, 0.05)
    glPopMatrix()
    glPushMatrix()
    glTranslatef(0.7, 0.0, -2.0)
    draw_box(0.3, 0.15, 0.05)
    glPopMatrix()

    # === FRECCIA DIREZIONE X (avanti) ===
    glColor3f(0.0, 1.0, 0.0)
    glLineWidth(3.0)
    glBegin(GL_LINES)
    glVertex3f(0, 1.2, 0)
    glVertex3f(0, 1.2, 2.5)
    glEnd()


def draw_box(width, height, depth):
    """Disegna un parallelepipedo centrato sull'origine"""
    w, h, d = width/2, height/2, depth/2

    glBegin(GL_QUADS)
    # Faccia anteriore (Z+)
    glVertex3f(-w, -h,  d); glVertex3f( w, -h,  d)
    glVertex3f( w,  h,  d); glVertex3f(-w,  h,  d)
    # Faccia posteriore (Z-)
    glVertex3f(-w, -h, -d); glVertex3f(-w,  h, -d)
    glVertex3f( w,  h, -d); glVertex3f( w, -h, -d)
    # Faccia sopra (Y+)
    glVertex3f(-w,  h, -d); glVertex3f(-w,  h,  d)
    glVertex3f( w,  h,  d); glVertex3f( w,  h, -d)
    # Faccia sotto (Y-)
    glVertex3f(-w, -h, -d); glVertex3f( w, -h, -d)
    glVertex3f( w, -h,  d); glVertex3f(-w, -h,  d)
    # Faccia destra (X+)
    glVertex3f( w, -h, -d); glVertex3f( w,  h, -d)
    glVertex3f( w,  h,  d); glVertex3f( w, -h,  d)
    # Faccia sinistra (X-)
    glVertex3f(-w, -h, -d); glVertex3f(-w, -h,  d)
    glVertex3f(-w,  h,  d); glVertex3f(-w,  h, -d)
    glEnd()


def draw_wheel():
    """Disegna una ruota (cilindro)"""
    quad = gluNewQuadric()
    glPushMatrix()
    glRotatef(90, 0, 1, 0)
    glTranslatef(0, 0, -0.1)
    gluCylinder(quad, 0.35, 0.35, 0.2, 16, 1)
    # Tappi del cilindro
    gluDisk(quad, 0, 0.35, 16, 1)
    glTranslatef(0, 0, 0.2)
    gluDisk(quad, 0, 0.35, 16, 1)
    glPopMatrix()


def draw_floor():
    """Disegna un pavimento a griglia"""
    glColor3f(0.2, 0.2, 0.25)
    glBegin(GL_QUADS)
    glVertex3f(-20, -0.65, -20)
    glVertex3f( 20, -0.65, -20)
    glVertex3f( 20, -0.65,  20)
    glVertex3f(-20, -0.65,  20)
    glEnd()

    # Griglia
    glColor3f(0.3, 0.3, 0.35)
    glLineWidth(1.0)
    glBegin(GL_LINES)
    for i in range(-20, 21, 2):
        glVertex3f(i, -0.64, -20)
        glVertex3f(i, -0.64,  20)
        glVertex3f(-20, -0.64, i)
        glVertex3f( 20, -0.64, i)
    glEnd()


def draw_force_arrows(accX, accY, accZ):
    """Disegna frecce per le forze G applicate alla macchina"""
    glLineWidth(4.0)

    # Forza laterale (AccY) - freccia rossa
    if abs(accY) > 0.05:
        glColor3f(1.0, 0.3, 0.3)
        glBegin(GL_LINES)
        glVertex3f(0, 0.3, 0)
        glVertex3f(accY * 3, 0.3, 0)
        glEnd()

    # Forza longitudinale (AccX) - freccia blu
    if abs(accX) > 0.05:
        glColor3f(0.3, 0.5, 1.0)
        glBegin(GL_LINES)
        glVertex3f(0, 0.3, 0)
        glVertex3f(0, 0.3, accX * 3)
        glEnd()

    # Forza verticale (cunette) - freccia verde
    vert = accZ - 1.0
    if abs(vert) > 0.05:
        glColor3f(0.3, 1.0, 0.3)
        glBegin(GL_LINES)
        glVertex3f(0, 0.3, 0)
        glVertex3f(0, 0.3 + vert * 2, 0)
        glEnd()


def analizza_situazione(gyroZ, accY, accX):
    """Riconosce cosa sta facendo la macchina"""
    sterzando = abs(gyroZ) > 10
    forza_lat = abs(accY) > 0.1
    forza_long = abs(accX) > 0.15

    if forza_long and accX < -0.3:
        return "FRENATA FORTE"
    if forza_long and accX > 0.3:
        return "ACCELERAZIONE"
    if sterzando:
        if abs(gyroZ) > 100:
            return f"STERZO BRUSCO {'<-' if gyroZ>0 else '->'}"
        return f"CURVA {'SX' if gyroZ>0 else 'DX'}"
    if forza_lat:
        return f"IN CURVA {'SX' if accY>0 else 'DX'}"
    return "RETTILINEO"


# ============================================================
# MAIN
# ============================================================
def main():
    pygame.init()
    pygame.display.set_caption("Alettone Active Aero - Live 3D Viewer (MQTT)")

    # Crea finestra con OpenGL
    screen = pygame.display.set_mode((WINDOW_WIDTH, WINDOW_HEIGHT), DOUBLEBUF | OPENGL)

    # Setup OpenGL
    glEnable(GL_DEPTH_TEST)
    glEnable(GL_CULL_FACE)
    glCullFace(GL_BACK)
    glClearColor(0.05, 0.05, 0.1, 1.0)

    glMatrixMode(GL_PROJECTION)
    gluPerspective(45, (WINDOW_WIDTH - 350) / WINDOW_HEIGHT, 0.1, 100.0)
    glMatrixMode(GL_MODELVIEW)

    # Avvia thread ricezione MQTT
    mqtt_th = threading.Thread(target=mqtt_receiver, daemon=True)
    mqtt_th.start()

    # Variabili telecamera
    cam_distance = 8.0
    cam_yaw = 30.0
    cam_pitch = 20.0
    mouse_dragging = False
    last_mouse = (0, 0)
    last_console_print = 0.0

    clock = pygame.time.Clock()
    running = True

    while running:
        # Stampa dati su console ogni 1 secondo
        now = time.time()
        if now - last_console_print >= 1.0:
            last_console_print = now
            roll_c, pitch_c, yaw_c, ax_c, ay_c, az_c, gz_c, st_c, hz_c, pk_c, ls_c, conn_c = sensor.get()
            if conn_c:
                st_name = {0: "RUNNING", 1: "ERROR", 2: "CALIB"}.get(st_c, str(st_c))
                print(f"[DATA] Roll:{roll_c:+6.2f}° | Pitch:{pitch_c:+6.2f}° | Yaw:{yaw_c:+6.2f}° | "
                      f"Acc:[X:{ax_c:+5.2f}, Y:{ay_c:+5.2f}, Z:{az_c:+5.2f}]g | "
                      f"GyroZ:{gz_c:+6.1f}°/s | {hz_c:5.1f}Hz | Pkt:{pk_c} | Lost:{ls_c} | {st_name}")
            else:
                print("[DATA] In attesa di dati MQTT (Disconnesso)...")
        for event in pygame.event.get():
            if event.type == QUIT:
                running = False
            elif event.type == KEYDOWN:
                if event.key == K_ESCAPE:
                    running = False
            elif event.type == MOUSEBUTTONDOWN:
                if event.button == 1:
                    mouse_dragging = True
                    last_mouse = event.pos
                elif event.button == 4:  # rotella su
                    cam_distance = max(3.0, cam_distance - 0.5)
                elif event.button == 5:  # rotella giù
                    cam_distance = min(20.0, cam_distance + 0.5)
            elif event.type == MOUSEBUTTONUP:
                if event.button == 1:
                    mouse_dragging = False
            elif event.type == MOUSEMOTION:
                if mouse_dragging:
                    dx = event.pos[0] - last_mouse[0]
                    dy = event.pos[1] - last_mouse[1]
                    cam_yaw += dx * 0.3
                    cam_pitch = max(-89, min(89, cam_pitch + dy * 0.3))
                    last_mouse = event.pos

        # Watchdog timeout connessione se non arrivano pacchetti
        with sensor.lock:
            if sensor.connected and (time.time() - sensor.last_packet_time > 1.0):
                sensor.connected = False

        # Ottieni dati sensore
        roll, pitch, yaw, accX, accY, accZ, gyroZ, state, hz, packets, lost, connected = sensor.get()

        # ===== RENDER 3D =====
        glViewport(0, 0, WINDOW_WIDTH - 350, WINDOW_HEIGHT)
        glClear(GL_COLOR_BUFFER_BIT | GL_DEPTH_BUFFER_BIT)

        glMatrixMode(GL_PROJECTION)
        glLoadIdentity()
        gluPerspective(45, (WINDOW_WIDTH - 350) / WINDOW_HEIGHT, 0.1, 100.0)

        glMatrixMode(GL_MODELVIEW)
        glLoadIdentity()

        # Posiziona telecamera
        cam_x = cam_distance * np.cos(np.radians(cam_pitch)) * np.sin(np.radians(cam_yaw))
        cam_y = cam_distance * np.sin(np.radians(cam_pitch))
        cam_z = cam_distance * np.cos(np.radians(cam_pitch)) * np.cos(np.radians(cam_yaw))
        gluLookAt(cam_x, cam_y, cam_z, 0, 0, 0, 0, 1, 0)

        # Disegna pavimento
        draw_floor()

        # Trasforma e disegna macchina secondo dati sensore
        glPushMatrix()
        # Rotazioni: Yaw → Pitch → Roll (ordine ZYX)
        glRotatef(yaw, 0, 1, 0)     # imbardata attorno Y
        glRotatef(pitch, 1, 0, 0)   # beccheggio attorno X
        glRotatef(roll, 0, 0, 1)    # rollio attorno Z

        draw_car()
        draw_force_arrows(accX, accY, accZ)
        glPopMatrix()

        # ===== RENDER 2D (dashboard) =====
        glViewport(WINDOW_WIDTH - 350, 0, 350, WINDOW_HEIGHT)
        glMatrixMode(GL_PROJECTION)
        glLoadIdentity()
        glOrtho(0, 350, WINDOW_HEIGHT, 0, -1, 1)
        glMatrixMode(GL_MODELVIEW)
        glLoadIdentity()
        glDisable(GL_DEPTH_TEST)

        # Sfondo dashboard
        glColor3f(0.0, 0.0, 0.0)
        glBegin(GL_QUADS)
        glVertex2f(0, 0)
        glVertex2f(350, 0)
        glVertex2f(350, WINDOW_HEIGHT)
        glVertex2f(0, WINDOW_HEIGHT)
        glEnd()

        render_dashboard_gl(roll, pitch, yaw, accX, accY, accZ, gyroZ, state, hz, packets, lost, connected)

        glEnable(GL_DEPTH_TEST)

        pygame.display.flip()
        clock.tick(60)  # 60 FPS rendering

    pygame.quit()


# Rendering testo via texture OpenGL
font_cache = {}

def get_font(size, bold=False):
    key = (size, bold)
    if key not in font_cache:
        try:
            if pygame.font and pygame.font.get_init():
                font_cache[key] = pygame.font.SysFont("Consolas", size, bold=bold)
            elif pygame.font:
                pygame.font.init()
                font_cache[key] = pygame.font.SysFont("Consolas", size, bold=bold)
        except Exception:
            try:
                import pygame.freetype as freetype
                freetype.init()
                font_cache[key] = freetype.SysFont("Consolas", size)
            except Exception:
                font_cache[key] = None
    return font_cache.get(key)


def draw_gl_text(text, x, y, size=18, color=(255,255,255), bold=False):
    """Disegna testo come texture OpenGL"""
    font = get_font(size, bold)
    if font is None:
        return

    try:
        if hasattr(font, 'render'):
            # Standard pygame.font.Font
            surf = font.render(text, True, color)
        else:
            # pygame.freetype fallback
            surf, _ = font.render(text, color)
    except Exception:
        return

    surf = pygame.transform.flip(surf, False, True)  # OpenGL ha Y invertito
    text_data = pygame.image.tostring(surf, "RGBA", True)

    tex_id = glGenTextures(1)
    glBindTexture(GL_TEXTURE_2D, tex_id)
    glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MIN_FILTER, GL_LINEAR)
    glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MAG_FILTER, GL_LINEAR)
    glTexImage2D(GL_TEXTURE_2D, 0, GL_RGBA, surf.get_width(), surf.get_height(),
                 0, GL_RGBA, GL_UNSIGNED_BYTE, text_data)

    glEnable(GL_TEXTURE_2D)
    glEnable(GL_BLEND)
    glBlendFunc(GL_SRC_ALPHA, GL_ONE_MINUS_SRC_ALPHA)
    glColor4f(1, 1, 1, 1)

    w, h = surf.get_width(), surf.get_height()
    glBegin(GL_QUADS)
    glTexCoord2f(0, 1); glVertex2f(x, y)
    glTexCoord2f(1, 1); glVertex2f(x + w, y)
    glTexCoord2f(1, 0); glVertex2f(x + w, y + h)
    glTexCoord2f(0, 0); glVertex2f(x, y + h)
    glEnd()

    glDisable(GL_TEXTURE_2D)
    glDisable(GL_BLEND)
    glDeleteTextures([tex_id])


def render_dashboard_gl(roll, pitch, yaw, accX, accY, accZ, gyroZ, state, hz, packets, lost, connected):
    """Renderizza la dashboard usando texture OpenGL"""
    x_start = 15
    y = 20

    draw_gl_text("=== DASHBOARD ===", x_start, y, 22, (100, 200, 255), bold=True)
    y += 40

    if connected:
        state_color = (0, 255, 0) if state == 0 else (255, 100, 100)
        state_text = {0: "ONLINE", 1: "ERROR", 2: "CALIBRATING"}.get(state, "?")
    else:
        state_color = (150, 150, 150)
        state_text = "DISCONNESSO"
    draw_gl_text(state_text, x_start, y, 20, state_color, bold=True)
    y += 35

    draw_gl_text(f"Hz: {hz:5.1f}", x_start, y, 16, (200,200,200))
    y += 22
    draw_gl_text(f"Pacchetti: {packets}", x_start, y, 16, (200,200,200))
    y += 22
    loss_pct = (lost / max(packets + lost, 1)) * 100
    color = (200,200,200) if loss_pct < 1 else (255,200,0)
    draw_gl_text(f"Persi: {lost} ({loss_pct:.2f}%)", x_start, y, 16, color)
    y += 35

    draw_gl_text("--- ASSETTO ---", x_start, y, 18, (255, 200, 100), bold=True)
    y += 28
    draw_gl_text(f"Roll:  {roll:+7.2f}°", x_start, y, 18, (255,255,255))
    y += 24
    draw_gl_text(f"Pitch: {pitch:+7.2f}°", x_start, y, 18, (255,255,255))
    y += 24
    draw_gl_text(f"Yaw:   {yaw:+7.2f}°", x_start, y, 18, (255,255,255))
    y += 35

    draw_gl_text("--- FORZE G ---", x_start, y, 18, (255, 200, 100), bold=True)
    y += 28
    draw_gl_text(f"Long: {accX:+5.3f}g", x_start, y, 16, (100,200,255))
    y += 22
    draw_gl_text(f"Lat:  {accY:+5.3f}g", x_start, y, 16, (255,150,150))
    y += 22
    vert = accZ - 1.0
    draw_gl_text(f"Vert: {vert:+5.3f}g", x_start, y, 16, (150,255,150))
    y += 35

    draw_gl_text("--- STERZO ---", x_start, y, 18, (255, 200, 100), bold=True)
    y += 28
    draw_gl_text(f"GyroZ: {gyroZ:+6.1f}°/s", x_start, y, 18, (255,255,255))
    y += 24

    direzione = "SINISTRA" if gyroZ > 5 else "DESTRA" if gyroZ < -5 else "DRITTO"
    color = (100,255,100) if direzione == "DRITTO" else (255,255,100)
    draw_gl_text(f"--> {direzione}", x_start, y, 18, color, bold=True)
    y += 35

    draw_gl_text("--- SITUAZIONE ---", x_start, y, 18, (255, 200, 100), bold=True)
    y += 28
    situazione = analizza_situazione(gyroZ, accY, accX)
    draw_gl_text(situazione, x_start, y, 18, (255,220,150), bold=True)
    y += 35

    # Istruzioni in basso
    y = WINDOW_HEIGHT - 80
    draw_gl_text("ESC: esci", x_start, y, 12, (150,150,150))
    y += 18
    draw_gl_text("Mouse drag: ruota vista", x_start, y, 12, (150,150,150))
    y += 18
    draw_gl_text("Rotella: zoom", x_start, y, 12, (150,150,150))


if __name__ == "__main__":
    main()
