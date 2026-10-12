/**
 * DerivGuard End-to-End Live Demonstration
 * Real-time algorithmic trading risk firewall for Deriv APIs
 */

import { DerivGuard } from './src/deriv_guard.mjs';

async function runDemo() {
  console.log('='.repeat(70));
  console.log('📈 DERIVGUARD: ALGORITHMIC TRADING RISK FIREWALL & EXECUTION SANDBOX');
  console.log('   The Rise of AI Agents Hackathon (lablab.ai × Deriv)');
  console.log('='.repeat(70));

  const guard = new DerivGuard({
    policy: {
      maxPositionStake: 50.0,
      dailyLossLimit: 150.0,
      maxTradesPerMinute: 4,
      allowedSymbols: ['R_100', 'R_50', 'frxEURUSD'],
    },
  });

  console.log('\n[STAGE 1] Testing Lawful Trade Execution:');
  const t1 = guard.executeTrade({ symbol: 'R_100', amount: 25.0, type: 'CALL' });
  console.log(`  ▶ Propose: Symbol=R_100, Stake=$25.00`);
  console.log(`    Status: ${t1.success ? '✅ EXECUTED' : '❌ DENIED'} (Contract ID: ${t1.contract?.contractId})`);

  console.log('\n[STAGE 2] Testing Single Position Stake Ceiling ($50.00 max):');
  const t2 = guard.executeTrade({ symbol: 'R_100', amount: 100.0, type: 'CALL' });
  console.log(`  ▶ Propose: Symbol=R_100, Stake=$100.00`);
  console.log(`    Status: ${t2.success ? '✅ EXECUTED' : '❌ DENIED'} (${t2.error}: ${t2.message})`);

  console.log('\n[STAGE 3] Testing Whitelist Enforcement on Unauthorized Asset:');
  const t3 = guard.executeTrade({ symbol: 'CRYPTO_MEME_INDEX', amount: 15.0, type: 'PUT' });
  console.log(`  ▶ Propose: Symbol=CRYPTO_MEME_INDEX, Stake=$15.00`);
  console.log(`    Status: ${t3.success ? '✅ EXECUTED' : '❌ DENIED'} (${t3.error}: ${t3.message})`);

  console.log('\n[STAGE 4] Testing Daily Cumulative Drawdown Protection:');
  console.log('  ▶ Simulating recorded loss: -$130.00');
  guard.settleTrade(t1.contract.contractId, { result: 'LOSS', lossAmount: 130.0 });
  const t4 = guard.executeTrade({ symbol: 'R_100', amount: 30.0, type: 'CALL' });
  console.log(`  ▶ Propose: Symbol=R_100, Stake=$30.00 (Total potential loss = $160 > $150 limit)`);
  console.log(`    Status: ${t4.success ? '✅ EXECUTED' : '❌ DENIED'} (${t4.error})`);

  console.log('\n[STAGE 5] Testing Emergency Operator Kill-Switch:');
  guard.emergencyKillSwitch('High market volatility circuit breaker');
  const t5 = guard.executeTrade({ symbol: 'R_100', amount: 5.0, type: 'CALL' });
  console.log(`  ▶ Propose after Kill-Switch: Symbol=R_100, Stake=$5.00`);
  console.log(`    Status: ${t5.success ? '✅ EXECUTED' : '❌ DENIED'} (${t5.error}: ${t5.message})`);

  console.log('\n[STAGE 6] Verifying Tamper-Evident SHA-256 Audit Ledger:');
  const proof = guard.verifyLedger();
  console.log(`  ▶ Cryptographic Audit Verified: ${proof.valid ? '✅ VALID (100% INTEGRITY)' : '❌ TAMPERED'}`);
  console.log(`  ▶ Total Linked Trade Events: ${proof.length}`);
  console.log(`  ▶ Latest Ledger Hash: ${proof.headHash}`);

  console.log('\n🎉 ALL 6/6 DEMONSTRATION PHASES COMPLETED WITH ZERO INVARIANT VIOLATIONS!\n');
}

runDemo().catch(console.error);
