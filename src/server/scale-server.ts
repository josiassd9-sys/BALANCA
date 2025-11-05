import WebSocket, { WebSocketServer } from 'ws';
import https from 'https';
import localhost from 'https-localhost';

const APP_NAME = 'balanca-ponte';
const WSS_PORT = 3001; // Secure WebSocket port for the bridge
const SCALE_IP = '192.168.18.8'; // IP of the actual scale
const SCALE_PORT = 8080; // Port of the actual scale's server

let lastKnownWeight = 0;

async function startServer() {
  try {
    const app = localhost(APP_NAME);

    const server = https.createServer(
      await app.getCerts(),
      (req, res) => {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ weight: lastKnownWeight, app: APP_NAME, message: "WSS server is running" }));
      }
    );

    const wss = new WebSocketServer({ server });

    wss.on('connection', ws => {
      console.log('Client connected to WSS bridge');
      ws.send(JSON.stringify({ weight: lastKnownWeight })); // Send last known weight on connection

      ws.on('close', () => {
        console.log('Client disconnected from WSS bridge');
      });
    });

    server.listen(WSS_PORT, () => {
      console.log(`✅ Secure WebSocket (WSS) bridge server is running on https://localhost:${WSS_PORT}`);
      console.log(`Forwarding data from scale at ws://${SCALE_IP}:${SCALE_PORT}`);
    });

    // Function to connect to the actual scale's WebSocket
    const connectToScale = () => {
      const scaleWs = new WebSocket(`ws://${SCALE_IP}:${SCALE_PORT}`);

      scaleWs.on('open', () => {
        console.log(`✅ Connected to scale at ws://${SCALE_IP}:${SCALE_PORT}`);
      });

      scaleWs.on('message', data => {
        try {
            // Assuming the scale sends plain text weight
            const weightStr = data.toString().trim();
            const weight = parseFloat(weightStr);
            
            if (!isNaN(weight)) {
                lastKnownWeight = weight;
                // Broadcast the new weight to all connected clients of the bridge
                wss.clients.forEach(client => {
                    if (client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify({ weight: lastKnownWeight }));
                    }
                });
            } else {
                // If the message is JSON, try parsing it.
                const message = JSON.parse(data.toString());
                if (typeof message.weight === 'number') {
                    lastKnownWeight = message.weight;
                    wss.clients.forEach(client => {
                        if (client.readyState === WebSocket.OPEN) {
                        client.send(JSON.stringify({ weight: lastKnownWeight }));
                        }
                    });
                }
            }
        } catch (e) {
            // Fallback for non-JSON messages, perhaps plain weight string.
            const weightStr = data.toString().trim();
            const weight = parseFloat(weightStr);
            if (!isNaN(weight)) {
                lastKnownWeight = weight;
                 wss.clients.forEach(client => {
                    if (client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify({ weight: lastKnownWeight }));
                    }
                });
            } else {
                 console.error('Error parsing scale message:', e);
            }
        }
      });

      scaleWs.on('close', () => {
        console.log('Disconnected from scale. Retrying in 5 seconds...');
        setTimeout(connectToScale, 5000); // Retry connection
      });

      scaleWs.on('error', (err) => {
        console.error('Scale connection error:', err.message);
        scaleWs.close(); // Ensure connection is closed before retrying
      });
    };

    connectToScale();
  } catch (error) {
    console.error("Failed to start the secure server.", error);
    console.log("Please ensure you have run the setup for https-localhost for the app name 'balanca-ponte' if this is your first time.");
  }
}

startServer();
