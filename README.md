# x402-stellar-mcp

> Every AI agent can reason, plan, and act — until it needs to pay for something.
> This is the missing piece.

An MCP server that gives Claude (or any MCP-compatible agent) a Stellar wallet and the ability to autonomously pay for x402-protected APIs using USDC — no API keys, no subscriptions, no human in the loop.

Built for the [Stellar Hacks: Agents](https://dorahacks.io/hackathon/stellar-hacks-agents) hackathon.

---

## The Problem

AI agents are hitting a wall. They can search, reason, and plan — but the moment they need to call a paid API, they stop. Someone has to pre-register an account, enter a credit card, manage API keys, and set up billing. That's not autonomous. That's a human doing the work.

The result: agents are limited to free-tier APIs, or developers pay for subscriptions they barely use. A research agent that needs 50 different data sources can't subscribe to all 50.

## The Solution

x402 on Stellar fixes this at the protocol level. When an agent hits a paywall, it gets an HTTP 402 response with payment instructions. It pays in USDC on Stellar (~$0.00001 in fees, <5 second settlement), and gets the data. No accounts. No API keys. No human approval.

This MCP server brings that capability to Claude and any MCP-compatible agent.

```
Agent asks: "Give me a market briefing"
    ↓
discover_services → finds crypto data, news, AI inference endpoints
    ↓
x402_fetch("https://xlm402.com/api/crypto")
    ↓  HTTP 402 received
    ↓  Signs Soroban auth entry
    ↓  Pays 0.01 USDC on Stellar testnet
    ↓  Facilitator settles on-chain (~5 seconds)
    ↓  200 OK
Agent returns: BTC $94,200 | ETH $3,100 | ...
```

Total cost: $0.03. No API keys. Real Stellar transactions.

## Why Stellar

| | Ethereum/Base | Stellar |
|---|---|---|
| Tx fee | $0.001–$2+ (volatile gas) | ~$0.00001 (fixed) |
| Settlement | Variable | <5 seconds |
| Native USDC | Bridged | Native (Circle) |
| Uptime | 99.9% | 99.99% |

A $0.01 micropayment on Ethereum costs more in gas than the payment itself. On Stellar, the economics work at any scale.

## Tools

| Tool | What it does |
|---|---|
| `discover_services` | List available x402 services the agent can pay for |
| `x402_fetch` | Fetch any URL, auto-pay in USDC if 402 received |
| `x402_probe` | Preview payment price without paying |
| `wallet_balance` | Check USDC + XLM balance of the agent wallet |

## Setup

### 1. Get a free Stellar testnet wallet (no real money needed)

```bash
# 1. Generate keypair + fund with XLM
open https://lab.stellar.org/account/fund

# 2. Get free testnet USDC
open https://faucet.circle.com   # select "Stellar Testnet"
```

### 2. Install

```bash
git clone https://github.com/your-username/x402-stellar-mcp
cd x402-stellar-mcp
npm install && npm run build
```

### 3. Configure

```bash
echo "STELLAR_PRIVATE_KEY=S..." > .env
```

### 4. Add to Claude Desktop

Edit `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "x402-stellar": {
      "command": "node",
      "args": ["/absolute/path/to/x402-stellar-mcp/dist/index.js"],
      "env": { "STELLAR_PRIVATE_KEY": "S..." }
    }
  }
}
```

Restart Claude Desktop.

### 5. Add to Kiro

```json
{
  "mcpServers": {
    "x402-stellar": {
      "command": "node",
      "args": ["/absolute/path/to/x402-stellar-mcp/dist/index.js"],
      "env": { "STELLAR_PRIVATE_KEY": "S..." }
    }
  }
}
```

## Demo Script

This is the exact flow to show in your demo video:

**Prompt 1 — Setup check:**
> "Check my wallet balance"

Shows: wallet address, USDC balance, XLM balance.

**Prompt 2 — Discovery:**
> "What paid services can you access?"

Shows: `discover_services` returns the catalog of x402 APIs with prices.

**Prompt 3 — The money shot:**
> "Give me a crypto market briefing and the latest news. Use the cheapest services available."

Shows:
1. Agent calls `discover_services` → picks crypto ($0.01) + news ($0.01)
2. Calls `x402_fetch` for each → HTTP 402 received → pays automatically
3. Returns synthesized briefing
4. Check wallet balance again → USDC decreased by $0.02

All transactions verifiable at https://stellar.expert/explorer/testnet

## Why this matters now

- x402 just crossed 154M transactions and $600M annualized volume (April 2026)
- Stripe launched MPP in March 2026 — machine payments are becoming standard
- Google, Visa, Cloudflare all joined the x402 Foundation
- The Stellar Development Foundation explicitly named MCP integration as their next roadmap item — this ships it

## Who uses this

- **AI developers** building agents that need data without managing API keys
- **API providers** who want to monetize per-call instead of subscriptions
- **Enterprises** deploying agents that need controlled, auditable spending

## Path forward

- [ ] Bazaar integration — agents discover services dynamically, not from a hardcoded list
- [ ] Spending policy layer — Soroban smart contract enforcing per-tx and daily limits
- [ ] Python SDK — same capability for LangChain/CrewAI agents
- [ ] OpenClaw skill — one-click install for OpenClaw users

## Architecture

```
src/
└── index.ts    # MCP server + 4 tools + x402 payment client (180 lines)
```

Single file. No unnecessary abstraction. The entire x402 payment flow is handled by `@x402/fetch` + `@x402/stellar`.

## License

MIT
