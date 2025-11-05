import http from 'http';
import fetch from 'node-fetch'; // Certifique-se de que 'node-fetch' está no seu package.json

const SCALE_URL = 'http://192.168.18.8:3001/';
const BRIDGE_PORT = 3001; // Porta em que o servidor-ponte irá rodar

const server = http.createServer(async (req, res) => {
  // Adiciona cabeçalhos CORS para permitir requisições do seu app
  res.setHeader('Access-Control-Allow-Origin', '*'); // Em produção, restrinja para o domínio do seu app
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Lida com requisições OPTIONS (pre-flight)
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.url === '/getWeight' && req.method === 'GET') {
    try {
      const scaleResponse = await fetch(SCALE_URL);
      if (!scaleResponse.ok) {
        throw new Error(`Scale server returned status ${scaleResponse.status}`);
      }
      
      const textResponse = await scaleResponse.text();
      
      // Tenta extrair um número do texto. Robusto para HTML ou texto simples.
      const match = textResponse.match(/(\d[\d,.]*)/);
      const weight = match ? parseFloat(match[1].replace(',', '.')) : 0;

      if (isNaN(weight)) {
          throw new Error('Could not parse weight from scale response');
      }

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ weight: weight }));

    } catch (error) {
      console.error('Error fetching from scale:', error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Failed to fetch weight from scale.' }));
    }
  } else {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not Found' }));
  }
});

server.listen(BRIDGE_PORT, () => {
  console.log(`✅ HTTP Bridge server running on http://localhost:${BRIDGE_PORT}`);
  console.log(`Forwarding requests to scale at ${SCALE_URL}`);
});
