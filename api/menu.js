const fs = require('fs');
const path = require('path');

module.exports = (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const menuPath = path.join(process.cwd(), 'menu.json');

  if (req.method === 'GET') {
    try {
      const data = fs.readFileSync(menuPath, 'utf8');
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      return res.status(200).send(data);
    } catch (err) {
      return res.status(500).json({ error: 'Failed to read menu.json', details: err.message });
    }
  }

  if (req.method === 'POST') {
    try {
      let body = req.body;
      if (typeof body === 'string') {
        body = JSON.parse(body);
      }
      if (!Array.isArray(body)) {
        return res.status(400).json({ error: 'Body must be an array of menu items' });
      }
      fs.writeFileSync(menuPath, JSON.stringify(body, null, 2), 'utf8');
      return res.status(200).json({ success: true, count: body.length, timestamp: Date.now() });
    } catch (err) {
      return res.status(500).json({ error: 'Failed to save menu', details: err.message });
    }
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
};
