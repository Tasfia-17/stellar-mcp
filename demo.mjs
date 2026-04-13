#!/usr/bin/env node
// x402 Stellar MCP — Terminal Demo
// Runs all tools in a single MCP session and prints results

import { spawn } from "child_process";
import { createInterface } from "readline";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const TEAL = "\x1b[38;2;0;212;170m";
const PURPLE = "\x1b[38;2;123;97;255m";
const BOLD = "\x1b[1m";
const DIM = "\x1b[2m";
const RESET = "\x1b[0m";
const RED = "\x1b[31m";

const SEP = "━".repeat(78);

function header() {
  console.clear();
  console.log(`${TEAL}${BOLD}`);
  console.log("  ██╗  ██╗ ██╗  ██████╗ ██████╗     ███╗   ███╗ ██████╗██████╗ ");
  console.log("  ╚██╗██╔╝██╔╝ ██╔═══██╗╚════██╗    ████╗ ████║██╔════╝██╔══██╗");
  console.log("   ╚███╔╝██╔╝  ██║   ██║ █████╔╝    ██╔████╔██║██║     ██████╔╝");
  console.log("   ██╔██╗╚██╗  ██║   ██║██╔═══╝     ██║╚██╔╝██║██║     ██╔═══╝ ");
  console.log("  ██╔╝ ██╗╚██╗ ╚██████╔╝███████╗    ██║ ╚═╝ ██║╚██████╗██║     ");
  console.log("  ╚═╝  ╚═╝ ╚═╝  ╚═════╝ ╚══════╝    ╚═╝     ╚═╝ ╚═════╝╚═╝     ");
  console.log(`${RESET}`);
  console.log(`${DIM}  Agents That Pay. Autonomously. — github.com/Tasfia-17/stellar-mcp${RESET}`);
  console.log(`\n${SEP}\n`);
}

async function runDemo() {
  header();

  const serverPath = path.join(__dirname, "dist", "index.js");
  const proc = spawn("node", [serverPath], {
    stdio: ["pipe", "pipe", "pipe"],
    env: { ...process.env },
  });

  const responses = new Map();
  let idCounter = 1;

  const rl = createInterface({ input: proc.stdout });
  rl.on("line", (line) => {
    try {
      const msg = JSON.parse(line);
      if (msg.id !== undefined) responses.set(msg.id, msg);
    } catch {}
  });

  proc.stderr.on("data", () => {}); // suppress stderr

  const send = (msg) => {
    proc.stdin.write(JSON.stringify(msg) + "\n");
  };

  const waitFor = (id, timeout = 15000) =>
    new Promise((resolve, reject) => {
      const start = Date.now();
      const check = setInterval(() => {
        if (responses.has(id)) {
          clearInterval(check);
          resolve(responses.get(id));
        } else if (Date.now() - start > timeout) {
          clearInterval(check);
          reject(new Error(`Timeout waiting for id ${id}`));
        }
      }, 50);
    });

  const callTool = async (name, args = {}) => {
    const id = idCounter++;
    send({ jsonrpc: "2.0", id, method: "tools/call", params: { name, arguments: args } });
    const res = await waitFor(id);
    if (res.result?.content?.[0]?.text) return res.result.content[0].text;
    if (res.result?.isError) return `${RED}Error: ${res.result.content?.[0]?.text}${RESET}`;
    return JSON.stringify(res);
  };

  // Initialize
  send({
    jsonrpc: "2.0", id: idCounter++,
    method: "initialize",
    params: { protocolVersion: "2024-11-05", capabilities: {}, clientInfo: { name: "demo", version: "1.0" } },
  });
  await waitFor(1);

  // Step 1
  console.log(`${PURPLE}${BOLD}[STEP 1]${RESET} Check agent wallet balance`);
  console.log(`${DIM}  Tool: wallet_balance${RESET}\n`);
  console.log(await callTool("wallet_balance"));
  console.log(`\n${SEP}\n`);

  // Step 2
  console.log(`${PURPLE}${BOLD}[STEP 2]${RESET} Discover available x402 services on Stellar`);
  console.log(`${DIM}  Tool: discover_services${RESET}\n`);
  console.log(await callTool("discover_services"));
  console.log(`\n${SEP}\n`);

  // Step 3
  console.log(`${PURPLE}${BOLD}[STEP 3]${RESET} Probe crypto endpoint — check price before paying`);
  console.log(`${DIM}  Tool: x402_probe  URL: https://xlm402.com/testnet/markets/crypto/quote?symbol=BTC-USD${RESET}\n`);
  console.log(await callTool("x402_probe", { url: "https://xlm402.com/testnet/markets/crypto/quote?symbol=BTC-USD" }));
  console.log(`\n${SEP}\n`);

  // Step 4
  console.log(`${TEAL}${BOLD}[STEP 4] Pay and fetch — agent pays autonomously via x402 on Stellar${RESET}`);
  console.log(`${DIM}  Tool: x402_fetch  URL: https://xlm402.com/testnet/markets/crypto/quote?symbol=BTC-USD${RESET}`);
  console.log(`${DIM}  Signing Soroban auth entry... settling USDC on Stellar testnet...${RESET}\n`);
  console.log(await callTool("x402_fetch", { url: "https://xlm402.com/testnet/markets/crypto/quote?symbol=BTC-USD" }));
  console.log(`\n${SEP}\n`);

  // Step 5
  console.log(`${PURPLE}${BOLD}[STEP 5]${RESET} Check wallet balance again — USDC decreased`);
  console.log(`${DIM}  Tool: wallet_balance${RESET}\n`);
  console.log(await callTool("wallet_balance"));
  console.log(`\n${SEP}\n`);

  console.log(`${TEAL}${BOLD}  Complete.${RESET}`);
  console.log(`${DIM}  Verify transactions: https://stellar.expert/explorer/testnet${RESET}`);
  console.log(`${DIM}  Wallet: GBMU4ZXZ2DUYB2ZZMMORQ74MZ6NXJSNHB23HE2L3MYSV263YHTZM5DEQ${RESET}\n`);

  proc.stdin.end();
  proc.kill();
}

runDemo().catch((e) => {
  console.error("Demo error:", e.message);
  process.exit(1);
});
