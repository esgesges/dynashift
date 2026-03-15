const ws = new WebSocket("ws://localhost:8765");

ws.onmessage = (event) => {
    if (event.data) {
        console.log(event.data)
    }
};

const client = mqtt.connect("ws://192.168.178.3:9001");

client.on("connect", () => {
    console.log("Connesso!");
    client.subscribe("test/topic");
});

client.on("message", (topic, message) => {
    console.log(`[${topic}] ${message.toString()}`);
});