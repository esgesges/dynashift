import paho.mqtt.client as mqtt
import time
import random

speed = 100
pressure = 100
angle = 100

def on_connect(client, userdata, flags, rc, properties=None):
    print("Connected with result code " + str(rc))

client = mqtt.Client(transport="websockets")
client.on_connect = on_connect
client.connect("localhost", 9001, 60)
client.loop_start()
i = 0
while i<10000:
    val = random.randint(-1, 1)
    speed += val
    client.publish("test/speed", str(speed))

    val2 = random.randint(-1, 1)
    pressure += val2
    client.publish("test/pressure", str(pressure))

    val3 = random.randint(-1, 1)
    angle += val3
    client.publish("test/angle", str(angle))

    time.sleep(0.010)
    #i += 1
client.loop_stop()
client.disconnect()