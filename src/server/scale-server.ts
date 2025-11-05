import https from 'https';
import fs from 'fs';
import path from 'path';
import { WebSocketServer, WebSocket } from 'ws';
import fetch from 'node-fetch';
import httpsLocalhost from 'https-localhost';

const SCALE_URL = 'http://192.168.18.8:3001/';
const BRIDGE_PORT = 3001;

async function main() {
    const app = httpsLocalhost();
    const certs = await app.getCerts();
    const server = https.createServer(certs, (req, res) => {
        res.writeHead(200);
        res.end('WebSocket server is running securely.');
    });

    const wss = new WebSocketServer({ server });

    wss.on('connection', (ws) => {
        console.log('Client connected to WebSocket bridge');

        let isFetching = false;
        const interval = setInterval(async () => {
            if (isFetching) return;
            isFetching = true;

            try {
                const response = await fetch(SCALE_URL);
                if (!response.ok) {
                    throw new Error(`Scale responded with status: ${response.status}`);
                }
                const textResponse = await response.text();
                const match = textResponse.match(/(\d[\d,.]*)/);
                const weight = match ? parseFloat(match[1].replace(',', '.')) : 0;

                if (!isNaN(weight)) {
                    ws.send(JSON.stringify({ weight: weight }));
                }
            } catch (error) {
                console.error('Error fetching from scale:', error);
                // Optionally send an error to the client
                ws.send(JSON.stringify({ error: 'Failed to fetch from scale.' }));
            } finally {
                isFetching = false;
            }
        }, 2000); // Fetch every 2 seconds

        ws.on('close', () => {
            console.log('Client disconnected');
            clearInterval(interval);
        });

        ws.on('error', (error) => {
            console.error('WebSocket error:', error);
            clearInterval(interval);
        });
    });

    server.listen(BRIDGE_PORT, () => {
        console.log(`✅ Secure WebSocket bridge server running on wss://localhost:${BRIDGE_PORT}`);
        console.log(`Forwarding requests to scale at ${SCALE_URL}`);
    });
}

main().catch(console.error);
