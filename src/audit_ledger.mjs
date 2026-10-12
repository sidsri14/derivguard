/**
 * DerivGuard Tamper-Evident SHA-256 Trade & Risk Audit Ledger
 */

import { createHash } from 'node:crypto';

export class DerivAuditLedger {
  constructor() {
    this.chain = [];
    this.genesisHash = '0000000000000000000000000000000000000000000000000000000000000000';
  }

  append(event, details) {
    const prevHash =
      this.chain.length === 0
        ? this.genesisHash
        : this.chain[this.chain.length - 1].hash;

    const timestamp = Date.now();
    const payload = JSON.stringify({
      index: this.chain.length,
      prevHash,
      event,
      details,
      timestamp,
    });

    const hash = createHash('sha256').update(payload).digest('hex');

    const entry = {
      index: this.chain.length,
      prevHash,
      hash,
      event,
      details,
      timestamp,
    };

    this.chain.push(entry);
    return entry;
  }

  verifyLedger() {
    for (let i = 0; i < this.chain.length; i++) {
      const current = this.chain[i];
      const expectedPrevHash =
        i === 0 ? this.genesisHash : this.chain[i - 1].hash;

      if (current.prevHash !== expectedPrevHash) {
        return { valid: false, errorIndex: i, reason: 'Broken prevHash pointer' };
      }

      const payload = JSON.stringify({
        index: current.index,
        prevHash: current.prevHash,
        event: current.event,
        details: current.details,
        timestamp: current.timestamp,
      });

      const calculated = createHash('sha256').update(payload).digest('hex');
      if (calculated !== current.hash) {
        return { valid: false, errorIndex: i, reason: 'Tampered entry hash' };
      }
    }

    return {
      valid: true,
      length: this.chain.length,
      headHash: this.chain.length > 0 ? this.chain[this.chain.length - 1].hash : null,
    };
  }
}
