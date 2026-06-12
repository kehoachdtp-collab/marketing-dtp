const http = require('http');
const fs = require('fs');
const path = require('path');
const PORT = 3399;
const DIR = __dirname;

http.createServer((req, res) => {
  const cleanUrl = decodeURIComponent((req.url || '/').split('?')[0]);
  const routeToIndex = cleanUrl === '/' || cleanUrl === '/login';
  const filePath = path.join(DIR, routeToIndex ? 'index.html' : cleanUrl);
  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(404); res.end('Not found'); return; }
    const ext = path.extname(filePath);
    const mime = { '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.css':'text/css; charset=utf-8' }[ext] || 'text/plain; charset=utf-8';
    res.writeHead(200, { 'Content-Type': mime });
    res.end(data);
  });
}).listen(PORT, () => console.log('MKT Dashboard at http://localhost:' + PORT + '/login'));
