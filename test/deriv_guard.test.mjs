import test from 'node:test';
import assert from 'node:assert/strict';
import { DerivGuard } from '../src/deriv_guard.mjs';

test('DerivGuard Algorithmic Risk Firewall Test Suite', async (t) => {
  const guard = new DerivGuard({
    policy: {
      maxPositionStake: 25.0,
      dailyLossLimit: 60.0,
      maxTradesPerMinute: 3,
      allowedSymbols: ['R_100', 'frxEURUSD'],
    },
  });

  await t.test('Test 1: Valid trade within risk boundaries executes successfully', () => {
    const res = guard.executeTrade({
      symbol: 'R_100',
      amount: 15.0,
      type: 'CALL',
      timestamp: 1000,
    });
    assert.equal(res.success, true);
    assert.equal(res.contract.status, 'EXECUTED');
    assert.equal(res.contract.symbol, 'R_100');
  });

  await t.test('Test 2: Single position stake exceeding limit is rejected', () => {
    const res = guard.executeTrade({
      symbol: 'R_100',
      amount: 35.0, // Limit is 25.0
      type: 'CALL',
      timestamp: 2000,
    });
    assert.equal(res.success, false);
    assert.equal(res.error, 'EXCEEDS_MAX_POSITION_SIZE');
  });

  await t.test('Test 3: Zero or negative stake is rejected', () => {
    const res = guard.executeTrade({
      symbol: 'R_100',
      amount: -5.0,
      type: 'CALL',
      timestamp: 3000,
    });
    assert.equal(res.success, false);
    assert.equal(res.error, 'EXCEEDS_MAX_POSITION_SIZE');
  });

  await t.test('Test 4: Unauthorized trading symbol is blocked', () => {
    const res = guard.executeTrade({
      symbol: 'MEME_UNAPPROVED_TOKEN',
      amount: 10.0,
      type: 'PUT',
      timestamp: 4000,
    });
    assert.equal(res.success, false);
    assert.equal(res.error, 'UNAUTHORIZED_SYMBOL');
  });

  await t.test('Test 5: Daily cumulative loss ceiling breach halts trading', () => {
    guard.settleTrade('contract_123', { result: 'LOSS', lossAmount: 50.0 });
    // Cumulative loss is 50.0, remaining limit is 10.0
    const res = guard.executeTrade({
      symbol: 'R_100',
      amount: 15.0, // 50 + 15 = 65 > 60
      type: 'CALL',
      timestamp: 5000,
    });
    assert.equal(res.success, false);
    assert.equal(res.error, 'EXCEEDS_DAILY_DRAWDOWN_LIMIT');
  });

  await t.test('Test 6: Velocity throttle prevents high-frequency order spam', () => {
    const fastGuard = new DerivGuard({
      policy: {
        maxPositionStake: 50.0,
        dailyLossLimit: 500.0,
        maxTradesPerMinute: 2,
        allowedSymbols: ['R_100'],
      },
    });

    const t1 = fastGuard.executeTrade({ symbol: 'R_100', amount: 10.0, timestamp: 10000 });
    assert.equal(t1.success, true);
    const t2 = fastGuard.executeTrade({ symbol: 'R_100', amount: 10.0, timestamp: 10500 });
    assert.equal(t2.success, true);
    // 3rd trade within 60s exceeds maxTradesPerMinute = 2
    const t3 = fastGuard.executeTrade({ symbol: 'R_100', amount: 10.0, timestamp: 11000 });
    assert.equal(t3.success, false);
    assert.equal(t3.error, 'VELOCITY_THROTTLED');
  });

  await t.test('Test 7: Emergency kill switch halts trading immediately', () => {
    guard.emergencyKillSwitch('Market flash crash detected');
    const res = guard.executeTrade({
      symbol: 'R_100',
      amount: 5.0,
      type: 'CALL',
      timestamp: 6000,
    });
    assert.equal(res.success, false);
    assert.equal(res.error, 'CIRCUIT_BREAKER_ACTIVE');
  });

  await t.test('Test 8: Reinstatement restores lawful trading execution', () => {
    guard.reinstateTrading();
    guard.policy.cumulativeLossToday = 0; // Reset loss for reinstatement test
    const res = guard.executeTrade({
      symbol: 'R_100',
      amount: 10.0,
      type: 'CALL',
      timestamp: 7000,
    });
    assert.equal(res.success, true);
    assert.equal(res.contract.status, 'EXECUTED');
  });

  await t.test('Test 9: SHA-256 audit ledger verifies integrity', () => {
    const proof = guard.verifyLedger();
    assert.equal(proof.valid, true);
    assert.ok(proof.length > 5);
  });
});
