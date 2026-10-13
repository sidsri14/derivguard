import { test } from 'node:test';
import { strictEqual, ok } from 'node:assert';

import { createDerivGuardServer } from '../src/server.mjs';

test('11. DerivGuard server exposes trading API, killswitch, and ledger verification', async () => {
  const { server } = createDerivGuardServer();
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    // 1. Static HTML check
    const rootRes = await fetch(`${baseUrl}/`);
    strictEqual(rootRes.status, 200);
    const htmlText = await rootRes.text();
    ok(htmlText.includes('DerivGuard'));

    // 2. Status check
    const statusRes = await fetch(`${baseUrl}/api/status`);
    strictEqual(statusRes.status, 200);
    const statusData = await statusRes.json();
    strictEqual(statusData.circuitBreaker, false);

    // 3. Trade execution check
    const tradeRes = await fetch(`${baseUrl}/api/trade`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ symbol: 'R_100', amount: 25, type: 'CALL' })
    });
    strictEqual(tradeRes.status, 200);
    const tradeData = await tradeRes.json();
    strictEqual(tradeData.success, true);
    ok(tradeData.contract.contractId);

    // 4. Overrun trade check (rejected)
    const badTradeRes = await fetch(`${baseUrl}/api/trade`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ symbol: 'R_100', amount: 100, type: 'CALL' })
    });
    strictEqual(badTradeRes.status, 200);
    const badTradeData = await badTradeRes.json();
    strictEqual(badTradeData.success, false);
    strictEqual(badTradeData.error, 'EXCEEDS_MAX_POSITION_SIZE');

    // 5. Kill switch check
    const killRes = await fetch(`${baseUrl}/api/killswitch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: true, reason: 'Test halt' })
    });
    strictEqual(killRes.status, 200);
    const killData = await killRes.json();
    strictEqual(killData.circuitBreaker, true);

    // 6. Ledger verification
    const ledgerRes = await fetch(`${baseUrl}/api/ledger`);
    strictEqual(ledgerRes.status, 200);
    const ledgerData = await ledgerRes.json();
    strictEqual(ledgerData.proof.valid, true);
    ok(ledgerData.entries.length >= 2);

  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
