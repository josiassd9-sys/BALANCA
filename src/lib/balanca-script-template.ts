export const BALANCA_SCRIPT_STORAGE_KEY = 'balanca-js-backup';

export const DEFAULT_BALANCA_JS = String.raw`/**
 * MANUAL RAPIDO - Ponte Serial -> TCP/WS/HTTP (balanca.js)
 *
 * Objetivo:
 * - Ler dados da balanca na serial (COM)
 * - Expor peso por TCP (porta 8080), WebSocket (porta 3001) e HTTP (porta 3000)
 *
 * Fluxo:
 * 1) SerialPort recebe linha da balanca
 * 2) Parse atualiza config.peso
 * 3) Peso e distribuido para TCP e WebSocket
 * 4) Endpoint /peso retorna o mesmo formato texto
 *
 * Como usar:
 * - npm install
 * - node balanca.js
 *
 * Variaveis opcionais (.env):
 * - TCP_PORT=8080
 * - SERIAL_BAUD_RATE=4800
 * - SERIAL_PORT=COM1
 */

require('dotenv').config();

const { SerialPort } = require('serialport');
const net = require('net');
const express = require('express');
const fs = require('fs');
const http = require('http');
const cors = require('cors');
const { WebSocketServer } = require('ws');

// ------------------------------------------------
// CONFIGURACAO BASICA
// ------------------------------------------------
const app = express();

app.use(cors());
app.use(express.static('public'));

let config = {
  tcpPort: parseInt(process.env.TCP_PORT) || 8080,
  baudRate: parseInt(process.env.SERIAL_BAUD_RATE) || 4800,
  serialPortPath: process.env.SERIAL_PORT || 'COM1',
  status: 'Parado',
  peso: 0
};

let serialPort = null;
let tcpServer = null;
let buffer = '';
const clientesTCP = new Set();

// ------------------------------------------------
// LOG SIMPLES
// ------------------------------------------------
const log = (msg) => {
  const ts = new Date().toISOString();
  const linha = \`${'${ts}'} ${'${msg}'}\`;
  console.log(linha);
  try {
    fs.appendFileSync('C:\\\\balanca\\\\debug.log', linha + '\\n');
  } catch {}
};

// ------------------------------------------------
// FORMATA PESO - PADRAO SATURNO "PRA DAR NUMEROS NEGATIVOS"
// ------------------------------------------------
function formatPeso() {
  const pesoAbs = Math.abs(config.peso);
  const sinal = config.peso < 0 ? '-' : '+';
  const str = String(pesoAbs.toFixed(2)).replace('.', ',');
  return \`ST,GS,${'${sinal}'}${'${str.padStart(7, \'0\')'} }kg\\r\\n\`;
}

// ------------------------------------------------
// FORMATA PESO - PADRAO SATURNO "ORIGINAL"
// ------------------------------------------------
// function formatPeso() {
//   const str = String(config.peso.toFixed(2)).replace('.', ',');
//   return \`ST,GS,+${'${str.padStart(7, \'0\')'} }kg\\r\\n\`;
// }

// ------------------------------------------------
// SERIAL - LEITURA CONTINUA
// ------------------------------------------------
function iniciarSerial() {
  if (serialPort) {
    serialPort.close(() => log('Serial anterior fechada'));
  }

  serialPort = new SerialPort({
    path: config.serialPortPath,
    baudRate: config.baudRate,
    dataBits: 8,
    parity: 'none',
    stopBits: 1,
    autoOpen: false
  });

  serialPort.open(err => {
    if (err) {
      log(\`ERRO ao abrir ${'${config.serialPortPath}'}: ${'${err.message}'}\`);
      config.status = 'Erro na porta';
      return;
    }
    log(\`Porta ${'${config.serialPortPath}'} aberta\`);
    config.status = 'Iniciado';
  });

  buffer = '';

  serialPort.on('data', chunk => {
    buffer += chunk.toString('utf8');
    const lines = buffer.split(/\\r?\\n/);
    buffer = lines.pop() || '';

    for (let line of lines) {
      line = line.trim();
      if (!line) continue;

      log(\`RECEBIDO: ${'${line}'}\`);

      const match = line.match(/([-\\d]{6})EL_/);
      if (match) {
        const pesoStr = match[1].replace(/^0+/, '') || '0';
        config.peso = parseInt(pesoStr, 10);
        log(\`PESO ATUALIZADO: ${'${config.peso.toFixed(2)}'} kg\`);

        broadcastTCP();
        broadcastWS();
      }
    }
  });

  serialPort.on('error', err => {
    log(\`ERRO serial: ${'${err.message}'}\`);
    config.status = 'Erro';
  });
}

// ------------------------------------------------
// TCP SERVER - PORTA 8080
// ------------------------------------------------
function broadcastTCP() {
  const msg = formatPeso();
  clientesTCP.forEach(client => {
    if (client.writable) {
      client.write(msg);
    } else {
      clientesTCP.delete(client);
    }
  });
}

function iniciarTCP() {
  tcpServer = net.createServer(socket => {
    log(\`Cliente TCP conectado: ${'${socket.remoteAddress}'}\`);
    clientesTCP.add(socket);

    socket.write(formatPeso());

    socket.on('end', () => {
      clientesTCP.delete(socket);
      log('Cliente TCP desconectado');
    });

    socket.on('error', err => {
      log(\`Erro TCP: ${'${err.message}'}\`);
      clientesTCP.delete(socket);
    });
  });

  tcpServer.listen(config.tcpPort, '0.0.0.0', () => {
    log(\`TCP ativo na porta ${'${config.tcpPort}'}\`);
  });
}

// ------------------------------------------------
// WEBSOCKET SIMPLES - PORTA 3001
// ------------------------------------------------
const wss = new WebSocketServer({ port: 3001 });

function broadcastWS() {
  const msg = JSON.stringify({ weight: config.peso });
  wss.clients.forEach(client => {
    if (client.readyState === client.OPEN) {
      client.send(msg);
    }
  });
}

wss.on('connection', ws => {
  log('Cliente WS conectado');
  ws.send(JSON.stringify({ weight: config.peso }));

  ws.on('error', err => {
    log(\`Erro WS: ${'${err.message}'}\`);
  });
});

// ------------------------------------------------
// HTTP - PORTA 3000
// ------------------------------------------------
app.get('/peso', (req, res) => {
  res.type('text/plain');
  res.send(formatPeso().trim());
});

app.get('/status', (req, res) => res.json(config));

http.createServer(app).listen(3000, '0.0.0.0', () => {
  log('HTTP ativo -> http://192.168.18.13:3000');
  log('Peso bruto -> /peso');
  log('Tela -> /pesoreal.html');

  iniciarSerial();
  iniciarTCP();
});
`;