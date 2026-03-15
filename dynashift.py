import serial
import time

# Funzione per configurare la connessione seriale
def open_serial_connection(serial_port, baud_rate= 115200):
    try:
        ser = serial.Serial(serial_port, baud_rate, timeout=0.1)  # Timeout breve
        print(f"Connected to {serial_port} at {baud_rate} baud.")
        return ser
    except Exception as e:
        print(f"Error opening serial port: {e}")
        exit()

# Funzione per inviare una sequenza di stringhe
def send_sequence(serial_connection, sequence):
    try:
        print("Waiting 5 seconds before sending the first string...")
        time.sleep(5)  # Ritardo iniziale per il primo invio
        for index, string in enumerate(sequence):
            if index == 0:
                # Invia subito la prima stringa dopo 5 secondi
                serial_connection.write(string.encode('utf-8'))
                print(f"Sent: {string}")
                time.sleep(0.01)  # Ridotto il tempo di attesa tra le stringhe
            else:
                # Attendi il messaggio "in assetto" dal seriale prima di inviare la stringa successiva
                while True:
                    incoming_data = serial_connection.readline().decode('utf-8').strip()
                    if incoming_data:  # Ignora righe vuote
                        print(f"Received: {incoming_data}")  # Visualizza il messaggio ricevuto
                        if incoming_data == "in position":
                            serial_connection.write(string.encode('utf-8'))  # Invia la stringa
                            print(f"Sent: {string}")
                            time.sleep(0.01)  # Ridotto il tempo di attesa tra le stringhe
                            break
    except Exception as e:
        print(f"Error while sending: {e}")
    finally:
        # Attendi il messaggio "in assetto" prima di chiudere la connessione
        print("Waiting for final 'in position' message before closing...")
        while True:
            try:
                incoming_data = serial_connection.readline().decode('utf-8').strip()
                if incoming_data:  # Ignora righe vuote
                    print(f"Received: {incoming_data}")  # Visualizza il messaggio ricevuto
                    if incoming_data == "in position":
                        print("Final 'in position' message received. Closing serial port.")
                        break
            except Exception as e:
                print(f"Error while waiting for final message: {e}")
                break
        serial_connection.close()
        print("Serial port closed")

# Configurazioni
serial_port = '/dev/ttyACM0'  # Sostituisci con la porta seriale corretta
baud_rate = 115200  # Imposta il baud rate appropriato

# Sequenza di stringhe da inviare
sequence = [
    "1,100;2,100;3,100;4,100;\n",  # Taratura 100mm
    "1,10;4,190;2,10;3,190;\n",    # Abbassamento sinistra
    "4,10;1,190;3,10;2,190;\n",    # Abbassamento destra
    "1,60;4,60;2,140;3,140;\n",    # Accelerazione
    "2,60;3,60;1,140;4,140;\n",    # Frenata
    "1,100;2,180;3,100;4,20;\n",   # Angolato basso destra
    "1,30;2,100;3,170;4,100;\n",   # Angolato basso sinistra
    "1,100;2,30;3,100;4,170;\n",   # Angolato basso sinistra dietro
    "1,170;2,100;3,30;4,100;\n",   # Angolato basso destra dietro
    "1,100;2,100;3,100;4,100;\n"   # Taratura 100mm
]

# Esegui il programma
serial_connection = open_serial_connection(serial_port, baud_rate)
send_sequence(serial_connection, sequence)
