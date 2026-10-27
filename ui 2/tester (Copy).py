import paho.mqtt.client as mqtt
import time

def on_connect(client, userdata, flags, rc, properties=None):
    print("Connected with result code " + str(rc))

client = mqtt.Client(transport="websockets")
client.on_connect = on_connect
client.connect("localhost", 9001, 60)
client.loop_start()
time.sleep(2)
client.publish("test/power", "on")
time.sleep(1)
client.publish("test/mode", "1")
time.sleep(1)
client.publish("test/speed", "100")
time.sleep(1)
client.publish("test/angle", "100")
time.sleep(1)
client.publish("test/pressure", "100")
time.sleep(1)
client.publish("test/power", "off")
time.sleep(1)
client.loop_stop()
client.disconnect()