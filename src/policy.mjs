/**
 * DerivGuard Algorithmic Trading Risk Policy Engine
 * Deterministic pre-trade invariants for Deriv APIs and trading agents
 */

export class DerivRiskPolicy {
  constructor(config = {}) {
    this.agentId = config.agentId || 'deriv-agent-default';
    this.maxPositionStake = config.maxPositionStake ?? 50.0;
    this.dailyLossLimit = config.dailyLossLimit ?? 200.0;
    this.maxTradesPerMinute = config.maxTradesPerMinute || 10;
    this.allowedSymbols = config.allowedSymbols || [
      'R_100',
      'R_50',
      'R_25',
      'frxEURUSD',
      'frxUSDJPY',
      'frxGBPUSD',
    ];
    this.cumulativeLossToday = 0;
    this.tradeTimestamps = [];
    this.circuitBreakerTripped = false;
    this.killSwitchReason = null;
  }

  /**
   * Evaluates if submission rate exceeds frequency bounds
   */
  _isVelocityThrottled(now = Date.now()) {
    this.tradeTimestamps = this.tradeTimestamps.filter((t) => now - t < 60000);
    if (this.tradeTimestamps.length >= this.maxTradesPerMinute) {
      return true;
    }
    this.tradeTimestamps.push(now);
    return false;
  }

  /**
   * Pre-trade validation against risk invariants
   */
  evaluateTradeProposal(proposal) {
    if (this.circuitBreakerTripped) {
      return {
        approved: false,
        reason: 'CIRCUIT_BREAKER_ACTIVE',
        message: `Trading halted: ${this.killSwitchReason || 'Emergency circuit breaker active'}`,
      };
    }

    if (!proposal || typeof proposal !== 'object') {
      return {
        approved: false,
        reason: 'INVALID_PROPOSAL_SCHEMA',
        message: 'Trade proposal must be a valid object',
      };
    }

    if (!proposal.symbol || !this.allowedSymbols.includes(proposal.symbol)) {
      return {
        approved: false,
        reason: 'UNAUTHORIZED_SYMBOL',
        message: `Trading on asset '${proposal.symbol}' is not permitted by policy whitelist.`,
      };
    }

    const amount = Number(proposal.amount);
    if (isNaN(amount) || amount <= 0 || amount > this.maxPositionStake) {
      return {
        approved: false,
        reason: 'EXCEEDS_MAX_POSITION_SIZE',
        message: `Stake of $${amount} exceeds single-trade ceiling of $${this.maxPositionStake}.`,
      };
    }

    if (this.cumulativeLossToday + amount > this.dailyLossLimit) {
      return {
        approved: false,
        reason: 'EXCEEDS_DAILY_DRAWDOWN_LIMIT',
        message: `Projected loss breach: cumulative loss ($${this.cumulativeLossToday}) + stake ($${amount}) > daily ceiling ($${this.dailyLossLimit}).`,
      };
    }

    const now = proposal.timestamp || Date.now();
    if (this._isVelocityThrottled(now)) {
      return {
        approved: false,
        reason: 'VELOCITY_THROTTLED',
        message: `Submission rate exceeds ceiling of ${this.maxTradesPerMinute} orders per minute.`,
      };
    }

    return {
      approved: true,
      reason: 'RISK_INVARIANTS_SATISFIED',
    };
  }

  /**
   * Updates daily P&L and trips circuit breaker upon limit breach
   */
  recordTradeResult(lossAmount) {
    const loss = Number(lossAmount);
    if (!isNaN(loss) && loss > 0) {
      this.cumulativeLossToday += loss;
      if (this.cumulativeLossToday >= this.dailyLossLimit) {
        this.tripCircuitBreaker('Daily cumulative drawdown limit reached');
      }
    }
  }

  /**
   * Emergency trip circuit breaker
   */
  tripCircuitBreaker(reason = 'Operator emergency intervention') {
    this.circuitBreakerTripped = true;
    this.killSwitchReason = reason;
  }

  /**
   * Resets circuit breaker
   */
  resetCircuitBreaker() {
    this.circuitBreakerTripped = false;
    this.killSwitchReason = null;
  }
}
