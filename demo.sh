#!/usr/bin/env bash
# x402 Stellar MCP — Terminal Demo Script
# Run this to show judges the full flow

set -e

BOLD="\033[1m"
TEAL="\033[38;2;0;212;170m"
PURPLE="\033[38;2;123;97;255m"
DIM="\033[2m"
RESET="\033[0m"

MCP="node /home/rifa/x402-stellar-mcp/dist/index.js"

call_tool() {
  local tool=$1
  local args=$2
  printf '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"demo","version":"1.0"}}}\n{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"'"$tool"'","arguments":'"$args"'}}' \
    | $MCP 2>/dev/null \
    | python3 -c "
import sys, json
for line in sys.stdin:
    line = line.strip()
    if not line: continue
    try:
        d = json.loads(line)
        if d.get('id') == 2 and 'result' in d:
            content = d['result'].get('content', [])
            if content: print(content[0]['text'])
    except: pass
"
}

clear

echo -e "${TEAL}${BOLD}"
echo "  ██╗  ██╗ ██╗  ██████╗ ██████╗     ███████╗████████╗███████╗██╗     ██╗      █████╗ ██████╗"
echo "  ╚██╗██╔╝██╔╝ ██╔═══██╗╚════██╗    ██╔════╝╚══██╔══╝██╔════╝██║     ██║     ██╔══██╗██╔══██╗"
echo "   ╚███╔╝██╔╝  ██║   ██║ █████╔╝    ███████╗   ██║   █████╗  ██║     ██║     ███████║██████╔╝"
echo "   ██╔██╗╚██╗  ██║   ██║██╔═══╝     ╚════██║   ██║   ██╔══╝  ██║     ██║     ██╔══██║██╔══██╗"
echo "  ██╔╝ ██╗╚██╗ ╚██████╔╝███████╗    ███████║   ██║   ███████╗███████╗███████╗██║  ██║██║  ██║"
echo "  ╚═╝  ╚═╝ ╚═╝  ╚═════╝ ╚══════╝    ╚══════╝   ╚═╝   ╚══════╝╚══════╝╚══════╝╚═╝  ╚═╝╚═╝  ╚═╝"
echo -e "${RESET}"
echo -e "${DIM}  MCP server that gives Claude a Stellar wallet — agents that pay autonomously${RESET}"
echo ""
echo -e "${DIM}  github.com/Tasfia-17/stellar-mcp${RESET}"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Step 1
echo -e "${PURPLE}${BOLD}[STEP 1]${RESET} Check agent wallet balance"
echo -e "${DIM}  Tool: wallet_balance${RESET}"
echo ""
call_tool "wallet_balance" "{}"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Step 2
echo -e "${PURPLE}${BOLD}[STEP 2]${RESET} Discover available x402 services on Stellar"
echo -e "${DIM}  Tool: discover_services${RESET}"
echo ""
call_tool "discover_services" "{}"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Step 3
echo -e "${PURPLE}${BOLD}[STEP 3]${RESET} Probe crypto endpoint — check price before paying"
echo -e "${DIM}  Tool: x402_probe — URL: https://xlm402.com/api/crypto${RESET}"
echo ""
call_tool "x402_probe" '{"url":"https://xlm402.com/api/crypto"}'
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Step 4
echo -e "${TEAL}${BOLD}[STEP 4]${RESET}${BOLD} Pay and fetch — agent pays autonomously via x402 on Stellar${RESET}"
echo -e "${DIM}  Tool: x402_fetch — URL: https://xlm402.com/api/crypto${RESET}"
echo -e "${DIM}  Signing Soroban auth entry... settling USDC on Stellar testnet...${RESET}"
echo ""
call_tool "x402_fetch" '{"url":"https://xlm402.com/api/crypto"}'
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Step 5
echo -e "${PURPLE}${BOLD}[STEP 5]${RESET} Check wallet balance again — USDC decreased"
echo -e "${DIM}  Tool: wallet_balance${RESET}"
echo ""
call_tool "wallet_balance" "{}"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo -e "${TEAL}${BOLD}  Demo complete.${RESET}"
echo -e "${DIM}  Real Stellar transactions. Verify at: https://stellar.expert/explorer/testnet${RESET}"
echo -e "${DIM}  Wallet: GBMU4ZXZ2DUYB2ZZMMORQ74MZ6NXJSNHB23HE2L3MYSV263YHTZM5DEQ${RESET}"
echo ""
