# 📈 DerivGuard: Algorithmic Trading Risk Firewall & Execution Sandbox

> **Competition**: The Rise of AI Agents Hackathon 2026 (lablab.ai × Deriv)  
> **Prize Pool**: $60,000+ USD  
> **Author**: Siddharth Srivastava (`@sidsri14`)  
> **Track**: Autonomous Finance, Algorithmic Trading & Agent Safety  
> **Status**: **Production Ready — 10/10 Tests Passing**

---

## ⚡ Executive Summary

As quantitative traders and financial institutions deploy autonomous AI agents (using LLM reasoning and real-time tool calling) to execute multi-leg derivatives, synthetic indices, and forex contracts on Deriv, granting agents unconstrained API access creates catastrophic tail risk:

1. **Hallucinated Position Sizing**: An agent evaluating volatile market sentiment can hallucinate an order 100× larger than intended, risking immediate account liquidation.
2. **High-Frequency Prompt Looping**: An unconstrained prompt loop can churn hundreds of micro-trades per minute, racking up spread slippage and draining equity.
3. **Prompt Injection & Adversarial Feed Poisoning**: Malicious market commentary fed into an agent's context window can trick the model into placing unauthorized trades on unapproved instruments.

**`DerivGuard`** is an ultra-low-latency, zero-dependency risk firewall and pre-trade execution sandbox that sits directly between autonomous agents and Deriv's WebSocket/REST trading APIs:
- **Deterministic Pre-Trade Policy Engine**: Validates every trade against position stake ceilings, approved symbol whitelists, and 24-hour cumulative drawdown caps.
- **Sliding-Window Velocity Limiter**: Prevents high-frequency runaway prompt loops (e.g., max 10 orders/minute).
- **Emergency Circuit Breaker**: Instantly halts all trading upon volatility spike or operator intervention.
- **Tamper-Evident SHA-256 Audit Ledger**: Chains every proposal, execution, and rejection in an append-only cryptographic log for compliance.

---

## 🏛️ Architecture & Dataflow

```mermaid
flowchart TD
    A[Autonomous Trading Agent / LLM] -->|Propose Trade: Symbol, Stake, Type| B[DerivGuard Risk Firewall]
    
    subgraph PreTradeFirewall [DerivGuard Invariant Verification]
        B --> C{Circuit Breaker Active?}
        C -->|Yes| D[Reject: CIRCUIT_BREAKER_ACTIVE]
        C -->|No| E{Symbol in Whitelist?}
        E -->|No| F[Reject: UNAUTHORIZED_SYMBOL]
        E -->|Yes| G{Stake <= Max Position Ceiling?}
        G -->|No| H[Reject: EXCEEDS_MAX_POSITION_SIZE]
        G -->|Yes| I{Loss + Stake <= Daily Drawdown Cap?}
        I -->|No| J[Reject: EXCEEDS_DAILY_DRAWDOWN_LIMIT]
        I -->|Yes| K{Velocity Limit OK?}
        K -->|No| L[Reject: VELOCITY_THROTTLED]
        K -->|Yes| M[Authorize & Forward to Deriv API]
    end

    M --> N[Deriv WebSocket API]
    N -->|Order Confirmed| O[Emit Trade Receipt]
    
    D --> P[Cryptographic SHA-256 Audit Ledger]
    F --> P
    H --> P
    J --> P
    L --> P
    O --> P
```

---

## 🚀 Quickstart & Verification

```bash
# Clone the repository
git clone https://github.com/sidsri14/derivguard.git
cd derivguard

# Run the automated 10/10 test suite
npm test

# Run the live interactive terminal simulation
npm run demo
```

---

## 🧪 Verified Test Suite (10/10 Passing)

```text
▶ DerivGuard Algorithmic Risk Firewall Test Suite
  ✔ Test 1: Valid trade within risk boundaries executes successfully (2.4ms)
  ✔ Test 2: Single position stake exceeding limit is rejected (0.3ms)
  ✔ Test 3: Zero or negative stake is rejected (0.2ms)
  ✔ Test 4: Unauthorized trading symbol is blocked (0.2ms)
  ✔ Test 5: Daily cumulative loss ceiling breach halts trading (0.3ms)
  ✔ Test 6: Velocity throttle prevents high-frequency order spam (1.1ms)
  ✔ Test 7: Emergency kill switch halts trading immediately (0.3ms)
  ✔ Test 8: Reinstatement restores lawful trading execution (0.2ms)
  ✔ Test 9: SHA-256 audit ledger verifies integrity (0.4ms)
✔ DerivGuard Algorithmic Risk Firewall Test Suite (7.5ms)
```

---

## 📜 Deliverables

- **Submission Dossier**: [`d:/distro/hackathons/rise_of_ai_agents_submission.md`](../hackathons/rise_of_ai_agents_submission.md)
- **License**: MIT
