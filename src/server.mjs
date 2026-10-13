/**
 * DerivGuard Interactive Dashboard Server
 * Real-time API & GUI server for quantitative trading risk firewall
 */

import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { DerivGuard } from './deriv_guard.mjs';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const root = resolve(__dirname, '..');
const publicDir = resolve(root, 'public');

export function createDerivGuardServer(options = {}) {
  const guard = new DerivGuard(options);

  const server = createServer(async (req, res) => {
    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const pathname = parsedUrl.pathname;

    // Status endpoint
    if (pathname === '/api/status' && req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        policy: guard.policy,
        circuitBreaker: guard.policy.circuitBreakerTripped,
        dailyLoss: guard.policy.cumulativeLossToday,
        remainingLimit: Math.max(0, guard.policy.dailyLossLimit - guard.policy.cumulativeLossToday)
      }));
      return;
    }

    // Ledger endpoint
    if (pathname === '/api/ledger' && req.method === 'GET') {
      const proof = guard.verifyLedger();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        proof,
        entries: guard.ledger.chain
      }));
      return;
    }

    // Emergency kill switch
    if (pathname === '/api/killswitch' && req.method === 'POST') {
      let body = '';
      req.on('data', (c) => { body += c; });
      req.on('end', () => {
        try {
          const { active, reason } = JSON.parse(body || '{}');
          if (active) {
            guard.emergencyKillSwitch(reason || 'Operator intervention');
          } else {
            guard.reinstateTrading(reason || 'Manual reinstatement');
          }
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, circuitBreaker: guard.policy.circuitBreakerTripped }));
        } catch (err) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: err.message }));
        }
      });
      return;
    }

    // Execute trade endpoint
    if (pathname === '/api/trade' && req.method === 'POST') {
      let body = '';
      req.on('data', (c) => { body += c; });
      req.on('end', () => {
        try {
          const { symbol, amount, type } = JSON.parse(body || '{}');
          const result = guard.executeTrade({
            symbol: symbol || 'R_100',
            amount: Number(amount) || 10,
            type: type || 'CALL'
          });
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(result));
        } catch (err) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: err.message }));
        }
      });
      return;
    }

    // Static assets
    if (req.method === 'GET') {
      let filePath = pathname === '/' ? join(publicDir, 'index.html') : join(publicDir, pathname);
      if (existsSync(filePath)) {
        const ext = filePath.split('.').pop();
        const mimeTypes = {
          html: 'text/html',
          css: 'text/css',
          js: 'application/javascript',
          json: 'application/json',
          png: 'image/png',
          svg: 'image/svg+xml'
        };
        res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'text/plain' });
        res.end(readFileSync(filePath));
        return;
      }
    }

    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
  });

  return { server, guard };
}

// CLI entry
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const port = process.env.PORT || 4200;
  const { server } = createDerivGuardServer();
  server.listen(port, () => {
    console.log(`📈 DerivGuard Trading Firewall UI running at http://127.0.0.1:${port}`);
  });
}
