import net from 'net';
import { WebSocketServer, WebSocket } from 'ws';

// --- Configurações ---
const TCP_HOST = '127.0.0.1'; // IP do servidor TCP da balança
const TCP_PORT = 3000;         // Porta do servidor TCP da balança
const WEBSOCKET_PORT = 8081;   // Porta para o servidor WebSocket
// --------------------

const wss = new WebSocketServer({ port: WEBSOCKET_PORT });

let lastKnownWeight = 0;
let tcpClient = new net.Socket();
let isTcpReconnecting = false;

console.log(`Servidor WebSocket escutando na porta ${WEBSOCKET_PORT}`);


// Função para conectar ao servidor TCP
const connectTcp = () => {
    if (tcpClient.connecting || tcpClient.writable) {
        console.log('Tentativa de reconexão enquanto já conectado/conectando. Ignorando.');
        return;
    }
    
    isTcpReconnecting = false;
    console.log(`Conectando à balança em TCP ${TCP_HOST}:${TCP_PORT}...`);
    
    tcpClient.connect(TCP_PORT, TCP_HOST, () => {
        console.log('Conectado com sucesso à balança via TCP.');
    });
};

// Configura os listeners do cliente TCP
tcpClient.on('data', (data) => {
    const weightString = data.toString().trim();
    // Tenta extrair um número da string recebida
    const weightMatch = weightString.match(/(\d+\.?\d*)/);
    
    if (weightMatch) {
        const weight = parseFloat(weightMatch[1]);
        if (!isNaN(weight)) {
            lastKnownWeight = weight;
            console.log(`Peso recebido: ${weight}`);
            // Envia o peso para todos os clientes WebSocket conectados
            wss.clients.forEach(client => {
                if (client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify({ weight: lastKnownWeight }));
                }
            });
        }
    }
});

tcpClient.on('close', () => {
    console.log('Conexão TCP com a balança foi fechada.');
    if (!isTcpReconnecting) {
        isTcpReconnecting = true;
        console.log('Tentando reconectar em 5 segundos...');
        setTimeout(connectTcp, 5000);
    }
});

tcpClient.on('error', (err) => {
    console.error('Erro na conexão TCP:', err.message);
    // A 'close' event will be fired, triggering the reconnection logic.
    tcpClient.destroy(); // Garante que o socket seja fechado para a reconexão
});

// Inicia a primeira tentativa de conexão TCP
connectTcp();

// Lógica do servidor WebSocket
wss.on('connection', (ws) => {
    console.log('Novo cliente WebSocket conectado.');
    
    // Envia o último peso conhecido imediatamente ao novo cliente
    if (lastKnownWeight > 0) {
        ws.send(JSON.stringify({ weight: lastKnownWeight }));
    }

    ws.on('message', (message) => {
        console.log(`Mensagem recebida do cliente: ${message}`);
        // Pode-se adicionar lógica para receber comandos do cliente, se necessário
    });

    ws.on('close', () => {
        console.log('Cliente WebSocket desconectado.');
    });
});

    