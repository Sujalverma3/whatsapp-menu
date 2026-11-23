const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = process.env.PORT || 3001;
const MENU_FILE = path.join(__dirname, 'menu.json');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon'
};

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

const server = http.createServer((req, res) => {
  setCors(res);

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    return res.end();
  }

  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;

  // --- API Endpoints ---
  if (pathname === '/api/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ status: 'ok', time: new Date().toISOString() }));
  }

  if (pathname === '/api/menu') {
    if (req.method === 'GET') {
      fs.readFile(MENU_FILE, 'utf8', (err, data) => {
        if (err) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: 'Failed to read menu file' }));
        }
        res.writeHead(200, {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        });
        return res.end(data);
      });
      return;
    }

    if (req.method === 'POST') {
      let bodyStr = '';
      req.on('data', chunk => {
        bodyStr += chunk;
        // 10MB limit safety guard
        if (bodyStr.length > 1e7) {
          req.connection.destroy();
        }
      });

      req.on('end', () => {
        try {
          const items = JSON.parse(bodyStr);
          if (!Array.isArray(items)) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ error: 'Body must be an array of menu items' }));
          }

          fs.writeFile(MENU_FILE, JSON.stringify(items, null, 2), 'utf8', err => {
            if (err) {
              res.writeHead(500, { 'Content-Type': 'application/json' });
              return res.end(JSON.stringify({ error: 'Failed to write menu file' }));
            }
            res.writeHead(200, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({
              success: true,
              count: items.length,
              timestamp: Date.now()
            }));
          });
        } catch (e) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: 'Invalid JSON: ' + e.message }));
        }
      });
      return;
    }

    res.writeHead(405, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ error: 'Method Not Allowed' }));
  }

  // --- Static Files Serving ---
  let filePath = path.join(__dirname, pathname === '/' ? 'index.html' : pathname);

  // Prevent directory traversal
  if (!filePath.startsWith(__dirname)) {
    res.writeHead(403);
    return res.end('Forbidden');
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      // Check if it's an extensionless URL like /admin
      const htmlPath = filePath + '.html';
      if (fs.existsSync(htmlPath)) {
        filePath = htmlPath;
      } else {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        return res.end('404 Not Found');
      }
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': ext === '.html' || ext === '.json' ? 'no-cache' : 'public, max-age=86400'
    });

    fs.createReadStream(filePath).pipe(res);
  });
});

server.listen(PORT, () => {
  console.log(`TrueCafe Live Backend Server running at http://localhost:${PORT}`);
});
