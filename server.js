const http = require('http');
const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, 'trades.json');

function loadTrades() {
  if (fs.existsSync(DATA_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    } catch (e) {
      console.error('Failed to parse trades.json', e);
    }
  }
  return [];
}

function saveTrades(trades) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(trades, null, 2));
}

let trades = loadTrades();

const server = http.createServer((req, res) => {
  if (req.method === 'GET' && req.url === '/api/trades') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(trades));
    return;
  }
  if (req.method === 'PUT' && req.url === '/api/trades') {
    let body = '';
    req.on('data', chunk => (body += chunk));
    req.on('end', () => {
      try {
        trades = JSON.parse(body);
        saveTrades(trades);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true }));
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid JSON' }));
      }
    });
    return;
  }
  res.writeHead(404);
  res.end();
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
