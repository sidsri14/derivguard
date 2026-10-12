/**
 * DerivGuard — Autonomous Trading Risk Firewall & Execution Gateway
 */

import { randomBytes } from 'node:crypto';
import { DerivRiskPolicy } from './policy.mjs';
import { DerivAuditLedger } from './audit_ledger.mjs';

export class DerivGuard {
  constructor(config = {}) {
    this.policy = new DerivRiskPolicy(config.policy);
    this.ledger = new DerivAuditLedger();
  }

  /**
   * Evaluates trade proposal and executes or denies with fail-closed security
   */
  executeTrade(proposal) {
    const evaluation = this.policy.evaluateTradeProposal(proposal);
    const txId = `deriv_${randomBytes(6).toString('hex')}`;

    if (!evaluation.approved) {
      const record = {
        txId,
        timestamp: new Date().toISOString(),
        status: 'DENIED',
        symbol: proposal?.symbol,
        amount: proposal?.amount,
        reason: evaluation.reason,
        message: evaluation.message,
      };

      this.ledger.append('TRADE_REJECTED', record);
      return {
        success: false,
        error: evaluation.reason,
        message: evaluation.message,
        details: record,
      };
    }

    // Executed trade record
    const contractId = `contract_${randomBytes(4).toString('hex')}`;
    const record = {
      txId,
      contractId,
      timestamp: new Date().toISOString(),
      status: 'EXECUTED',
      symbol: proposal.symbol,
      amount: proposal.amount,
      type: proposal.type || 'CALL',
      duration: proposal.duration || '1m',
    };

    this.ledger.append('TRADE_EXECUTED', record);
    return {
      success: true,
      contract: record,
    };
  }

  /**
   * Settle trade result
   */
  settleTrade(contractId, outcome) {
    if (outcome.result === 'LOSS') {
      this.policy.recordTradeResult(outcome.lossAmount);
      this.ledger.append('TRADE_SETTLED_LOSS', { contractId, lossAmount: outcome.lossAmount });
    } else {
      this.ledger.append('TRADE_SETTLED_PROFIT', { contractId, profitAmount: outcome.profitAmount });
    }
  }

  /**
   * Emergency operator kill-switch
   */
  emergencyKillSwitch(reason) {
    this.policy.tripCircuitBreaker(reason);
    this.ledger.append('EMERGENCY_KILL_SWITCH_TRIPPED', { reason });
  }

  /**
   * Reinstates trading
   */
  reinstateTrading() {
    this.policy.resetCircuitBreaker();
    this.ledger.append('TRADING_REINSTATED', {});
  }

  /**
   * Verifies the cryptographic audit ledger
   */
  verifyLedger() {
    return this.ledger.verifyLedger();
  }
}
