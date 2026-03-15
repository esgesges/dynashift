const ws = new WebSocket("ws://localhost:8765");

ws.onmessage = (event) => {
    if (event.data) {
        console.log(event.data)
    }
};