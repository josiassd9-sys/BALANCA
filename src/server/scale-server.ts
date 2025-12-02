
/**
 * Scale Communication Bridge
 * 
 * This server acts as a crucial bridge between the physical scale and the web application.
 * It solves the critical problem of browser security limitations (CORS, mixed-content)
 * by providing a unified, secure interface.
 * 
 * Functionality:
 * 1.  TCP Client: Connects directly to the scale's TCP server (e.g., a WT3000-I model)
 *     on a specific IP and port (e.g., 192.168.18.8:8080) to receive raw weight data.
 * 2.  WebSocket Server: Broadcasts the processed weight data in real-time to all
 *     connected web application clients. This is the primary, most efficient method
 *     for live updates.
 * 3.  HTTP Server: Provides a simple REST endpoint (e.g., /weight) as a fallback
 *     for clients or environments where WebSockets are not available. The app will
 *     poll this endpoint if the WebSocket connection fails.
 * 
 * How to Run:
 * - Make sure you have `tsx` and `typescript` installed (`npm install -D tsx typescript`).
 * - Run the server using `npm run dev:scale`.
 */

import net from 'net';
import { WebSocketServer, WebSocket } from 'ws';
import express from 'express';
import cors from 'cors';
import http from 'http';

// --- Configuration ---
const SCALE_HOST = process.env.SCALE_HOST || '192.168.18.8';
const SCALE_TCP_PORT = process.env.SCALE_TCP_PORT ? parseInt(process.env.SCALE_TCP_PORT) : 8080;
const WEBSOCKET_PORT = process.env.WEBSOCKET_PORT ? parseInt(process.env.WEBSOCKET_PORT) : 3001;
const HTTP_PORT = process.env.HTTP_PORT ? parseInt(process.env.HTTP_PORT) : 3002;

let currentWeight = 0;
let lastTcpConnectionTime = 0;
let tcpConnectionStatus: 'connected' | 'connecting' | 'disconnected' = 'disconnected';

// --- WebSocket Server Setup ---
const wss = new WebSocketServer({ port: WEBSOCKET_PORT });

wss.on('connection', ws => {
  console.log('WebSocket client connected');
  // Send the current weight immediately on connection
  ws.send(JSON.stringify({ weight: currentWeight }));
  ws.on('close', () => console.log('WebSocket client disconnected'));
});

function broadcastWeight(weight: number) {
  currentWeight = weight;
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({ weight }));
    }
  });
}

console.log(`WebSocket server started on ws://localhost:${WEBSOCKET_PORT}`);

// --- HTTP Server (Fallback) Setup ---
const app = express();
app.use(cors()); // Allow cross-origin requests

app.get('/weight', (req, res) => {
  res.json({ weight: currentWeight, lastUpdate: new Date(lastTcpConnectionTime) });
});

app.listen(HTTP_PORT, () => {
  console.log(`HTTP fallback server started on http://localhost:${HTTP_PORT}`);
});

// --- TCP Client to connect to the Scale ---
const tcpClient = new net.Socket();

function connectTcp() {
  if (tcpConnectionStatus === 'connected' || tcpConnectionStatus === 'connecting') {
    return;
  }
  console.log(`Attempting to connect to scale at ${SCALE_HOST}:${SCALE_TCP_PORT}...`);
  tcpConnectionStatus = 'connecting';
  tcpClient.connect(SCALE_TCP_PORT, SCALE_HOST, () => {
    console.log('Successfully connected to scale TCP server.');
    tcpConnectionStatus = 'connected';
    lastTcpConnectionTime = Date.now();
  });
}

tcpClient.on('data', (data) => {
  // Assuming data format is similar to "ST,GS, 0070.00kg"
  // This parsing logic needs to be robust.
  const rawData = data.toString();
  const match = rawData.match(/[+-]?\s*(\d+(\.\d+)?)/);

  if (match && match[1]) {
    const parsedWeight = parseFloat(match[1]);
    if (!isNaN(parsedWeight)) {
        broadcastWeight(parsedWeight);
        lastTcpConnectionTime = Date.now();
    }
  }
});

tcpClient.on('close', () => {
  console.log('Connection to scale closed. Attempting to reconnect in 5 seconds...');
  tcpConnectionStatus = 'disconnected';
  setTimeout(connectTcp, 5000);
});

tcpClient.on('error', (err) => {
  console.error(`TCP connection error: ${err.message}. Retrying in 5 seconds...`);
  tcpConnectionStatus = 'disconnected';
  // The 'close' event will be called automatically after an error,
  // so the reconnection logic there will handle it.
});

// Initial connection attempt
connectTcp();
