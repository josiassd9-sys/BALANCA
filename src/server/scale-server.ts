import https from 'https';
import WebSocket, { WebSocketServer } from 'ws';
import app from 'https-localhost';

// --- Configuration ---
const SCALE_WEBSOCKET_URL = 'ws://192.168.18.8:8080';
const BRIDGE_SERVER_PORT = 3001;

console.log('--- Secure WebSocket Bridge for Scale ---');

// Create a secure HTTPS server using https-localhost
// This automatically generates self-signed certificates for localhost
const server = https.createServer(app);

// Create a secure WebSocket server (WSS) and attach it to the HTTPS server
const wss = new WebSocketServer({ server });

let scaleClient: WebSocket | null = null;
let lastKnownWeight = 0;
let reconnectInterval: NodeJS.Timeout | null = null;

// Function to connect to the physical scale's WebSocket
const connectToScale = () => {
  console.log(`Attempting to connect to scale at: ${SCALE_WEBSOCKET_URL}`);
  
  if (scaleClient && (scaleClient.readyState === WebSocket.OPEN || scaleClient.readyState === WebSocket.CONNECTING)) {
      console.log('A connection attempt to the scale is already in progress.');
      return;
  }

  // Close any existing connection before creating a new one
  if(scaleClient) {
      scaleClient.removeAllListeners();
      scaleClient.terminate();
  }

  scaleClient = new WebSocket(SCALE_WEBSOCKET_URL);

  scaleClient.on('open', () => {
    console.log('>>> Successfully connected to the scale.');
    if(reconnectInterval) {
        clearInterval(reconnectInterval);
        reconnectInterval = null;
    }
  });

  scaleClient.on('message', (data) => {
    const rawMessage = data.toString(); // "ST,GS,+0070,00kg\r\n"
    
    // Regex to find the weight value
    const match = rawMessage.match(/\+([0-9,]+)kg/);
    if (match && match[1]) {
      // Found "+0070,00kg", match[1] is "0070,00"
      const weightString = match[1].replace(',', '.'); // "0070.00"
      const weight = parseFloat(weightString);
      
      if (!isNaN(weight)) {
        lastKnownWeight = weight;
        // Broadcast the new weight to all connected web app clients
        wss.clients.forEach((client) => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({ type: 'weightUpdate', weight: lastKnownWeight }));
          }
        });
      }
    }
  });

  scaleClient.on('close', () => {
    console.log('!!! Disconnected from the scale.');
    if (!reconnectInterval) {
        console.log('Will attempt to reconnect in 3 seconds...');
        reconnectInterval = setInterval(connectToScale, 3000);
    }
  });

  scaleClient.on('error', (err) => {
    console.error('--- Error connecting to scale ---', err.message);
    // The 'close' event will be triggered next, which handles reconnection.
  });
};


// --- Bridge Server Logic (WSS) ---
wss.on('connection', (ws) => {
  console.log('>>> Web app client connected to the bridge.');

  // Send the last known weight immediately upon connection
  ws.send(JSON.stringify({ type: 'weightUpdate', weight: lastKnownWeight }));

  ws.on('close', () => {
    console.log('<<< Web app client disconnected.');
  });

  ws.on('error', (err) => {
    console.error('--- Web app client WebSocket error ---', err.message);
  });
});

// Start the secure bridge server
server.listen(BRIDGE_SERVER_PORT, () => {
  console.log(`================================================================`);
  console.log(`  Secure WebSocket Bridge Server is running on: wss://localhost:${BRIDGE_SERVER_PORT}`);
  console.log(`  It is now bridging to the scale at: ${SCALE_WEBSOCKET_URL}`);
  console.log(`================================================================`);
  
  // Initial connection attempt to the scale
  connectToScale();
});

server.on('error', (err) => {
    console.error(`--- Bridge Server Error ---`, err);
});
