#!/usr/bin/env node
import "dotenv/config";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import {
  createEd25519Signer,
  DEFAULT_TESTNET_RPC_URL,
  STELLAR_TESTNET_CAIP2,
  getHorizonClient,
  USDC_TESTNET_ADDRESS,
} from "@x402/stellar";
import { ExactStellarScheme } from "@x402/stellar/exact/client";
import { wrapFetchWithPayment, x402Client } from "@x402/fetch";

// ── Config ────────────────────────────────────────────────────────────────────

const PRIVATE_KEY = process.env.STELLAR_PRIVATE_KEY;
if (!PRIVATE_KEY) {
  process.stderr.write("Error: STELLAR_PRIVATE_KEY is not set in environment\n");
  process.exit(1);
}

// ── Payment client setup ──────────────────────────────────────────────────────

const signer = createEd25519Signer(PRIVATE_KEY, STELLAR_TESTNET_CAIP2);
const rpcConfig = { url: DEFAULT_TESTNET_RPC_URL };

const client = new x402Client().register(
  "stellar:*",
  new ExactStellarScheme(signer, rpcConfig)
);

const fetchWithPayment = wrapFetchWithPayment(fetch, client);

// ── MCP Server ────────────────────────────────────────────────────────────────

const server = new McpServer({
  name: "x402-stellar-mcp",
  version: "1.0.0",
});

// Tool 1: Pay and fetch any x402-protected URL
server.tool(
  "x402_fetch",
  "Fetch a URL that may require x402 micropayment on Stellar. Automatically pays in USDC if a 402 response is received.",
  {
    url: z.string().url().describe("The URL to fetch (may be x402-protected)"),
    method: z.enum(["GET", "POST"]).default("GET").describe("HTTP method"),
    body: z.string().optional().describe("Request body for POST requests"),
  },
  async ({ url, method, body }) => {
    try {
      const response = await fetchWithPayment(url, {
        method,
        ...(body ? { body, headers: { "Content-Type": "application/json" } } : {}),
      });

      const text = await response.text();
      const paid = response.headers.get("x-payment-response") !== null;

      return {
        content: [
          {
            type: "text",
            text: paid
              ? `✅ Paid via x402 on Stellar testnet\n\n${text}`
              : text,
          },
        ],
      };
    } catch (err) {
      return {
        content: [{ type: "text", text: `Failed: ${String(err)}` }],
        isError: true,
      };
    }
  }
);

// Tool 2: Check wallet balance
server.tool(
  "wallet_balance",
  "Check the USDC and XLM balance of the configured Stellar wallet",
  {},
  async () => {
    try {
      const horizon = getHorizonClient(STELLAR_TESTNET_CAIP2);
      const account = await horizon.loadAccount(signer.address);

      const xlm = account.balances.find((b) => b.asset_type === "native");
      const usdc = account.balances.find(
        (b) =>
          b.asset_type === "credit_alphanum4" &&
          "asset_code" in b &&
          b.asset_code === "USDC"
      );

      const lines = [
        `Wallet: ${signer.address}`,
        `XLM:    ${xlm?.balance ?? "0"} XLM`,
        `USDC:   ${usdc && "balance" in usdc ? usdc.balance : "no trustline"} USDC`,
      ];

      return { content: [{ type: "text", text: lines.join("\n") }] };
    } catch (err) {
      return {
        content: [{ type: "text", text: `Failed to load account: ${String(err)}` }],
        isError: true,
      };
    }
  }
);

// Tool 3: Probe a URL for x402 payment requirements without paying
server.tool(
  "x402_probe",
  "Check if a URL requires x402 payment and see the price without paying",
  {
    url: z.string().url().describe("The URL to probe for x402 requirements"),
  },
  async ({ url }) => {
    try {
      const response = await fetch(url);

      if (response.status !== 402) {
        return {
          content: [{ type: "text", text: `No payment required (HTTP ${response.status})` }],
        };
      }

      const paymentRequired = response.headers.get("x-payment-required");
      if (!paymentRequired) {
        return {
          content: [{ type: "text", text: "HTTP 402 received but no payment details found" }],
        };
      }

      const details = JSON.parse(Buffer.from(paymentRequired, "base64").toString());
      const accepts = details?.accepts?.[0];

      const lines = [
        `🔒 x402 Payment Required`,
        `Price:    ${accepts?.maxAmountRequired ?? "unknown"} (${accepts?.asset ?? "unknown"})`,
        `Network:  ${accepts?.network ?? "unknown"}`,
        `Pay to:   ${accepts?.payTo ?? "unknown"}`,
      ];

      return { content: [{ type: "text", text: lines.join("\n") }] };
    } catch (err) {
      return {
        content: [{ type: "text", text: `Probe failed: ${String(err)}` }],
        isError: true,
      };
    }
  }
);

// Tool 4: Discover available x402 services on Stellar
server.tool(
  "discover_services",
  "List available x402-protected services on Stellar that the agent can pay for. Shows service name, description, price, and endpoint URL.",
  {},
  async () => {
    // Catalog of known x402 services on Stellar testnet (xlm402.com)
    // In production this would query a Bazaar-compatible discovery endpoint
    const services = [
      {
        name: "Crypto Market Data",
        description: "Real-time prices for BTC, ETH, XLM and 100+ assets",
        price: "$0.01 USDC",
        url: "https://xlm402.com/api/crypto",
      },
      {
        name: "News Aggregation",
        description: "Latest crypto and tech news headlines",
        price: "$0.01 USDC",
        url: "https://xlm402.com/api/news",
      },
      {
        name: "Weather Intelligence",
        description: "Current weather data for any city",
        price: "$0.01 USDC",
        url: "https://xlm402.com/api/weather",
      },
      {
        name: "AI Inference",
        description: "GPT-powered text generation and analysis",
        price: "$0.05 USDC",
        url: "https://xlm402.com/api/ai",
      },
      {
        name: "Web Extraction",
        description: "Extract structured data from any webpage",
        price: "$0.03 USDC",
        url: "https://xlm402.com/api/extract",
      },
      {
        name: "Image Generation",
        description: "AI-generated images from text prompts",
        price: "$0.10 USDC",
        url: "https://xlm402.com/api/image",
      },
    ];

    const lines = [
      "Available x402 services on Stellar testnet:",
      "",
      ...services.map(
        (s) => `• ${s.name} — ${s.price}\n  ${s.description}\n  ${s.url}`
      ),
      "",
      "Use x402_fetch with any URL above to pay and retrieve data.",
    ];

    return { content: [{ type: "text", text: lines.join("\n") }] };
  }
);

// ── Start ─────────────────────────────────────────────────────────────────────

const transport = new StdioServerTransport();
await server.connect(transport);
