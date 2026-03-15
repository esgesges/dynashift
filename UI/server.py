import asyncio
import websockets

connected_clients = set()

async def ws_handler(websocket):
    connected_clients.add(websocket)
    print("Client connected")
    try:
        async for message in websocket:
            print(f"Received: {message}")
            # broadcast to all other connected clients
            for client in connected_clients:
                if client != websocket:
                    try:
                        await client.send(message)
                    except websockets.exceptions.ConnectionClosed:
                        pass
    finally:
        connected_clients.remove(websocket)
        print("Client disconnected")

async def main():
    async with websockets.serve(ws_handler, "localhost", 8765):
        print("WebSocket server running on ws://localhost:8765")
        await asyncio.Future()  # run forever

asyncio.run(main())