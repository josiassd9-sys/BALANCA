import https from 'https';
import WebSocket, { WebSocketServer } from 'ws';
import app from 'https-localhost';

// --- Configuration ---
const BRIDGE_SERVER_PORT = 3001;

console.log('--- Secure WebSocket Bridge for Scale ---');

const server = https.createServer(app);
const wss = new WebSocketServer({ server });

let scaleSocket: WebSocket | null = null;
let reconnectInterval: NodeJS.Timeout | null = null;
let clientWs: WebSocket | null = null;
let currentConfig = { ip: '', port: '' };

const connectToScale = (config: { ip: string, port: string }) => {
    // Prevent connection if config is not set
    if (!config.ip || !config.port) {
        console.log("Scale IP and Port not configured. Waiting for client configuration.");
        if (clientWs?.readyState === WebSocket.OPEN) {
            clientWs.send(JSON.stringify({ type: 'error', message: 'Configuração da balança não recebida.' }));
        }
        return;
    }
    
    const scaleUrl = `ws://${config.ip}:${config.port}`;
    console.log(`Attempting to connect to scale at: ${scaleUrl}`);

    if (scaleSocket && (scaleSocket.readyState === WebSocket.OPEN || scaleSocket.readyState === WebSocket.CONNECTING)) {
        console.log('A connection attempt to the scale is already in progress.');
        return;
    }

    if (scaleSocket) {
        scaleSocket.removeAllListeners();
        scaleSocket.terminate();
    }

    scaleSocket = new WebSocket(scaleUrl);

    scaleSocket.on('open', () => {
        console.log('>>> Successfully connected to the scale.');
        if (reconnectInterval) {
            clearInterval(reconnectInterval);
            reconnectInterval = null;
        }
    });

    scaleSocket.on('message', (data) => {
        const rawMessage = data.toString();
        // Regex to extract weight like "+0070,00" from "ST,GS,+0070,00kg\r\n"
        const match = rawMessage.match(/\+([0-9,]+)kg/);
        if (match && match[1]) {
            // Replace comma with dot for correct float parsing
            const weightString = match[1].replace(',', '.');
            const weight = parseFloat(weightString);
            if (!isNaN(weight) && clientWs && clientWs.readyState === WebSocket.OPEN) {
                // Send a structured JSON message to the client
                clientWs.send(JSON.stringify({ type: 'weightUpdate', weight: weight }));
            }
        }
    });

    scaleSocket.on('close', () => {
        console.log('!!! Disconnected from the scale.');
        if (clientWs && clientWs.readyState === WebSocket.OPEN) {
            clientWs.send(JSON.stringify({ type: 'error', message: 'Conexão com a balança perdida.' }));
        }
        // Set up reconnection only if a config is present
        if (!reconnectInterval && currentConfig.ip && currentConfig.port) {
            console.log('Will attempt to reconnect in 5 seconds...');
            reconnectInterval = setInterval(() => connectToScale(currentConfig), 5000);
        }
    });

    scaleSocket.on('error', (err) => {
        console.error('--- Error connecting to scale ---', err.message);
        if (clientWs && clientWs.readyState === WebSocket.OPEN) {
            clientWs.send(JSON.stringify({ type: 'error', message: `Erro ao conectar à balança: ${err.message}` }));
        }
        // The 'close' event will be triggered next, which handles reconnection.
    });
};

wss.on('connection', (ws) => {
    console.log('>>> Web app client connected to the bridge.');
    clientWs = ws;

    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message.toString());
            // Check for 'configure' message type
            if (data.type === 'configure' && data.ip && data.port) {
                console.log(`Received new config from client: IP=${data.ip}, Port=${data.port}`);
                currentConfig = { ip: data.ip, port: data.port };
                
                // If a reconnection interval is running, clear it to apply new settings immediately
                if (reconnectInterval) {
                    clearInterval(reconnectInterval);
                    reconnectInterval = null;
                }
                connectToScale(currentConfig);
            }
        } catch (e) {
            console.error('Invalid message from client:', message.toString());
        }
    });

    ws.on('close', () => {
        console.log('<<< Web app client disconnected.');
        clientWs = null; // Clear the client reference
        if (scaleSocket) {
            scaleSocket.close();
        }
        if(reconnectInterval) {
            clearInterval(reconnectInterval);
            reconnectInterval = null;
        }
        // Reset config to ensure new client provides it
        currentConfig = { ip: '', port: '' }; 
    });

    ws.on('error', (err) => {
        console.error('--- Web app client WebSocket error ---', err.message);
    });
});

server.listen(BRIDGE_SERVER_PORT, () => {
    console.log(`================================================================`);
    console.log(`  Secure WebSocket Bridge Server is running on: wss://localhost:${BRIDGE_SERVER_PORT}`);
    console.log(`  Waiting for configuration from the client app...`);
    console.log(`================================================================`);
});

server.on('error', (err) => {
    console.error(`--- Bridge Server Error ---`, err);
});

    