import { Router, type IRouter, type Request, type Response } from "express";
import * as fs from "fs";
import * as path from "path";

const router: IRouter = Router();

let cachedToken: string | null = null;
let tokenExpiry: number = 0;
let tokenPromise: Promise<string> | null = null;

const playerBalances: Record<string, { balance: number; currency: string }> = {};

const CACHE_DIR = path.join(process.cwd(), "data");
const CACHE_FILE = path.join(CACHE_DIR, "games-cache.json");

interface CachedData {
  vendors: Array<{ vendorCode: string; type: number; name: string; url?: string }>;
  games: Array<Record<string, unknown>>;
  timestamp: number;
  totalGames: number;
  totalVendors: number;
}

let memoryCache: CachedData | null = null;

function loadCacheFromFile(): CachedData | null {
  try {
    if (fs.existsSync(CACHE_FILE)) {
      const raw = fs.readFileSync(CACHE_FILE, "utf-8");
      memoryCache = JSON.parse(raw) as CachedData;
      return memoryCache;
    }
  } catch {}
  return null;
}

function saveCacheToFile(data: CachedData): void {
  try {
    if (!fs.existsSync(CACHE_DIR)) {
      fs.mkdirSync(CACHE_DIR, { recursive: true });
    }
    fs.writeFileSync(CACHE_FILE, JSON.stringify(data), "utf-8");
    memoryCache = data;
  } catch (err) {
    console.error("Failed to save cache:", err);
  }
}

loadCacheFromFile();

function getEnvConfig() {
  const endpoint = (process.env["OROPLAY_API_ENDPOINT"] || "https://api-endpoint.com/api/v2").replace(/\/+$/, "");
  return {
    clientId: process.env["OROPLAY_CLIENT_ID"] || "",
    clientSecret: process.env["OROPLAY_CLIENT_SECRET"] || "",
    apiEndpoint: endpoint,
  };
}

async function fetchToken(clientId: string, clientSecret: string, apiEndpoint: string): Promise<{ token: string; expiration: number }> {
  const url = `${apiEndpoint}/auth/createtoken`;
  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", accept: "*/*" },
    body: JSON.stringify({ clientId, clientSecret }),
  });
  const text = await resp.text();
  if (!resp.ok) {
    throw new Error(`Token fetch failed: ${resp.status} ${resp.statusText} - ${text}`);
  }
  let data: { success?: boolean; token?: string; expiration?: number; message?: string; errorCode?: number };
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`Invalid token response: ${text}`);
  }
  if (data.success === false || data.errorCode) {
    throw new Error(`OroPlay auth error (${data.errorCode}): ${data.message || "Unknown error"}`);
  }
  if (!data.token) {
    throw new Error(`No token in response: ${text}`);
  }
  return { token: data.token, expiration: data.expiration || 0 };
}

async function getValidToken(clientId: string, clientSecret: string, apiEndpoint: string): Promise<string> {
  const nowSec = Math.floor(Date.now() / 1000);
  if (cachedToken && tokenExpiry > nowSec + 60) {
    return cachedToken;
  }
  if (tokenPromise) {
    return tokenPromise;
  }
  tokenPromise = fetchToken(clientId, clientSecret, apiEndpoint).then((result) => {
    cachedToken = result.token;
    tokenExpiry = result.expiration;
    tokenPromise = null;
    return cachedToken;
  }).catch((err) => {
    tokenPromise = null;
    throw err;
  });
  return tokenPromise;
}

async function oroplayRequest(
  method: "GET" | "POST",
  path: string,
  body: unknown,
  clientId: string,
  clientSecret: string,
  apiEndpoint: string
): Promise<unknown> {
  const token = await getValidToken(clientId, clientSecret, apiEndpoint);
  const url = `${apiEndpoint}${path}`;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    accept: "*/*",
    authorization: `Bearer ${token}`,
  };
  const resp = await fetch(url, {
    method,
    headers,
    body: method === "POST" ? JSON.stringify(body) : undefined,
  });
  const text = await resp.text();
  let result: unknown;
  try {
    result = JSON.parse(text);
  } catch {
    if (!resp.ok) throw new Error(`OroPlay API error ${resp.status}: ${text}`);
    return text;
  }
  if (!resp.ok) {
    const msg = (result as Record<string, unknown>)?.message || text;
    throw new Error(`OroPlay API error ${resp.status}: ${msg}`);
  }
  if (typeof result === "object" && result !== null) {
    const r = result as Record<string, unknown>;
    if (r.success === false) {
      const errorMsg = r.message || "Unknown OroPlay error";
      const errorCode = r.errorCode || 0;
      throw new Error(`OroPlay error (${errorCode}): ${errorMsg}`);
    }
  }
  return result;
}

router.get("/oroplay/config", (_req: Request, res: Response) => {
  const { clientId, apiEndpoint } = getEnvConfig();
  res.json({
    hasCredentials: Boolean(process.env["OROPLAY_CLIENT_ID"] && process.env["OROPLAY_CLIENT_SECRET"]),
    apiEndpoint,
    clientId: clientId ? clientId.substring(0, 4) + "****" : "",
  });
});

router.post("/oroplay/token", async (req: Request, res: Response) => {
  try {
    const { clientId, clientSecret, apiEndpoint } = req.body as { clientId?: string; clientSecret?: string; apiEndpoint?: string };
    const env = getEnvConfig();
    const id = (clientId && clientId !== "env") ? clientId : env.clientId;
    const secret = (clientSecret && clientSecret !== "env") ? clientSecret : env.clientSecret;
    const endpoint = (apiEndpoint && apiEndpoint !== "env") ? apiEndpoint.replace(/\/+$/, "") : env.apiEndpoint;

    if (!id || !secret) {
      res.status(400).json({ success: false, message: "Missing clientId or clientSecret" });
      return;
    }

    cachedToken = null;
    tokenExpiry = 0;

    const result = await fetchToken(id, secret, endpoint);
    cachedToken = result.token;
    tokenExpiry = result.expiration;

    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "Token creation failed");
    res.status(400).json({ success: false, message: err instanceof Error ? err.message : "Token creation failed" });
  }
});

router.get("/oroplay/vendors", async (req: Request, res: Response) => {
  try {
    const env = getEnvConfig();
    if (!env.clientId || !env.clientSecret) {
      res.status(400).json({ success: false, message: "API credentials not configured" });
      return;
    }
    const data = await oroplayRequest("GET", "/vendors/list", null, env.clientId, env.clientSecret, env.apiEndpoint);
    res.json(data);
  } catch (err) {
    req.log.error({ err }, "Vendors fetch failed");
    res.status(400).json({ success: false, message: err instanceof Error ? err.message : "Failed to fetch vendors" });
  }
});

router.post("/oroplay/games", async (req: Request, res: Response) => {
  try {
    const env = getEnvConfig();
    if (!env.clientId || !env.clientSecret) {
      res.status(400).json({ success: false, message: "API credentials not configured" });
      return;
    }
    const { vendorCode, language } = req.body as { vendorCode: string; language: string };
    const data = await oroplayRequest("POST", "/games/list", { vendorCode, language }, env.clientId, env.clientSecret, env.apiEndpoint);
    res.json(data);
  } catch (err) {
    req.log.error({ err }, "Games fetch failed");
    res.status(400).json({ success: false, message: err instanceof Error ? err.message : "Failed to fetch games" });
  }
});

router.post("/oroplay/game/detail", async (req: Request, res: Response) => {
  try {
    const env = getEnvConfig();
    if (!env.clientId || !env.clientSecret) {
      res.status(400).json({ success: false, message: "API credentials not configured" });
      return;
    }
    const { vendorCode, gameCode, language } = req.body as { vendorCode: string; gameCode: string; language: string };
    const data = await oroplayRequest("POST", "/game/detail", { vendorCode, gameCode, language }, env.clientId, env.clientSecret, env.apiEndpoint);
    res.json(data);
  } catch (err) {
    req.log.error({ err }, "Game detail fetch failed");
    res.status(400).json({ success: false, message: err instanceof Error ? err.message : "Failed to fetch game detail" });
  }
});

router.post("/oroplay/game/launch", async (req: Request, res: Response) => {
  try {
    const env = getEnvConfig();
    if (!env.clientId || !env.clientSecret) {
      res.status(400).json({ success: false, message: "API credentials not configured" });
      return;
    }
    const { vendorCode, gameCode, playerCode, language, homeUrl, depositUrl } = req.body as {
      vendorCode: string;
      gameCode: string;
      playerCode: string;
      language?: string;
      homeUrl?: string;
      depositUrl?: string;
    };

    if (!playerBalances[playerCode]) {
      playerBalances[playerCode] = { balance: 0, currency: "USD" };
    }

    const data = await oroplayRequest(
      "POST",
      "/game/launch",
      { vendorCode, gameCode, playerCode, language: language || "en", homeUrl, depositUrl },
      env.clientId,
      env.clientSecret,
      env.apiEndpoint
    );
    res.json(data);
  } catch (err) {
    req.log.error({ err }, "Game launch failed");
    res.status(400).json({ success: false, message: err instanceof Error ? err.message : "Failed to launch game" });
  }
});

router.get("/oroplay/cache", (_req: Request, res: Response) => {
  if (!memoryCache) {
    const loaded = loadCacheFromFile();
    if (!loaded) {
      res.json({ success: false, message: "No cache available" });
      return;
    }
  }
  res.json({ success: true, ...memoryCache });
});

router.post("/oroplay/cache/refresh", async (req: Request, res: Response) => {
  try {
    const env = getEnvConfig();
    if (!env.clientId || !env.clientSecret) {
      res.status(400).json({ success: false, message: "API credentials not configured" });
      return;
    }

    const vendorData = await oroplayRequest("GET", "/vendors/list", null, env.clientId, env.clientSecret, env.apiEndpoint) as { success: boolean; message?: Array<{ vendorCode: string; type: number; name: string; url?: string }> };
    const vendors = vendorData.message || [];

    const allGames: Array<Record<string, unknown>> = [];
    let failedVendors = 0;

    for (const vendor of vendors) {
      try {
        const gamesData = await oroplayRequest("POST", "/games/list", { vendorCode: vendor.vendorCode, language: "en" }, env.clientId, env.clientSecret, env.apiEndpoint) as { success: boolean; message?: Array<Record<string, unknown>> };
        if (gamesData.message && Array.isArray(gamesData.message)) {
          for (const game of gamesData.message) {
            game.vendorCode = vendor.vendorCode;
            allGames.push(game);
          }
        }
      } catch (err) {
        failedVendors++;
        req.log.warn({ vendor: vendor.vendorCode, err }, "Failed to fetch games for vendor during cache refresh");
      }
    }

    const cacheData: CachedData = {
      vendors,
      games: allGames,
      timestamp: Date.now(),
      totalGames: allGames.length,
      totalVendors: vendors.length,
    };

    saveCacheToFile(cacheData);

    res.json({
      success: true,
      ...cacheData,
      failedVendors,
    });
  } catch (err) {
    req.log.error({ err }, "Cache refresh failed");
    res.status(400).json({ success: false, message: err instanceof Error ? err.message : "Failed to refresh cache" });
  }
});

router.post("/oroplay/player/create", (req: Request, res: Response) => {
  try {
    const { playerCode, currency } = req.body as { playerCode: string; currency?: string };
    if (!playerCode) {
      res.status(400).json({ success: false, message: "Missing playerCode" });
      return;
    }
    const cur = currency || "USD";
    playerBalances[playerCode] = { balance: 0, currency: cur };
    req.log.info({ playerCode, currency: cur }, "Player created (seamless wallet)");
    res.json({ success: true, message: `Player ${playerCode} registered` });
  } catch (err) {
    req.log.error({ err }, "Player create failed");
    res.status(400).json({ success: false, message: err instanceof Error ? err.message : "Failed to create player" });
  }
});

router.post("/oroplay/player/balance", (req: Request, res: Response) => {
  try {
    const { playerCode } = req.body as { playerCode: string };
    if (!playerCode) {
      res.status(400).json({ success: false, message: "Missing playerCode" });
      return;
    }
    const player = playerBalances[playerCode];
    if (!player) {
      playerBalances[playerCode] = { balance: 0, currency: "USD" };
    }
    const p = playerBalances[playerCode];
    res.json({ success: true, message: p.balance });
  } catch (err) {
    req.log.error({ err }, "Balance fetch failed");
    res.status(400).json({ success: false, message: err instanceof Error ? err.message : "Failed to fetch balance" });
  }
});

router.post("/oroplay/player/deposit", (req: Request, res: Response) => {
  try {
    const { playerCode, amount } = req.body as { playerCode: string; amount: number; txnId?: string };
    if (!playerCode || !amount || amount <= 0) {
      res.status(400).json({ success: false, message: "Missing playerCode or invalid amount" });
      return;
    }
    if (!playerBalances[playerCode]) {
      playerBalances[playerCode] = { balance: 0, currency: "USD" };
    }
    playerBalances[playerCode].balance += amount;
    req.log.info({ playerCode, amount, newBalance: playerBalances[playerCode].balance }, "Deposit processed (seamless wallet)");
    res.json({ success: true, message: playerBalances[playerCode].balance });
  } catch (err) {
    req.log.error({ err }, "Deposit failed");
    res.status(400).json({ success: false, message: err instanceof Error ? err.message : "Failed to deposit" });
  }
});

router.post("/oroplay/player/withdraw", (req: Request, res: Response) => {
  try {
    const { playerCode, amount } = req.body as { playerCode: string; amount: number; txnId?: string };
    if (!playerCode) {
      res.status(400).json({ success: false, message: "Missing playerCode" });
      return;
    }
    if (!playerBalances[playerCode]) {
      playerBalances[playerCode] = { balance: 0, currency: "USD" };
    }
    const player = playerBalances[playerCode];
    const withdrawAmount = (amount === -1) ? player.balance : Math.min(amount, player.balance);
    player.balance = Math.max(0, player.balance - withdrawAmount);
    req.log.info({ playerCode, withdrew: withdrawAmount, newBalance: player.balance }, "Withdrawal processed (seamless wallet)");
    res.json({ success: true, message: player.balance });
  } catch (err) {
    req.log.error({ err }, "Withdraw failed");
    res.status(400).json({ success: false, message: err instanceof Error ? err.message : "Failed to withdraw" });
  }
});

router.post("/balance", (req: Request, res: Response) => {
  try {
    const { playerCode, currency } = req.body as { playerCode?: string; currency?: string };
    req.log.info({ playerCode, currency }, "Seamless wallet: balance callback");

    if (!playerCode) {
      res.status(400).json({ success: false, errorCode: 400, message: "Missing playerCode" });
      return;
    }

    const player = playerBalances[playerCode];
    if (!player) {
      res.status(200).json({
        success: true,
        balance: 0,
        currency: currency || "USD",
      });
      return;
    }

    res.json({
      success: true,
      balance: player.balance,
      currency: player.currency,
    });
  } catch (err) {
    req.log.error({ err }, "Balance callback error");
    res.status(500).json({ success: false, errorCode: 500, message: "Internal error" });
  }
});

router.post("/transaction", (req: Request, res: Response) => {
  try {
    const { playerCode, currency, amount, txnId, txnType, gameCode, roundId, platformTxnId } = req.body as {
      playerCode?: string;
      currency?: string;
      amount?: number;
      txnId?: string;
      txnType?: string;
      gameCode?: string;
      roundId?: string;
      platformTxnId?: string;
    };

    req.log.info({ playerCode, txnType, amount, txnId, gameCode, roundId, platformTxnId }, "Seamless wallet: transaction callback");

    if (!playerCode || amount === undefined || !txnId || !txnType) {
      res.status(400).json({ success: false, errorCode: 400, message: "Missing required fields" });
      return;
    }

    if (!playerBalances[playerCode]) {
      playerBalances[playerCode] = { balance: 0, currency: currency || "USD" };
    }

    const player = playerBalances[playerCode];

    if (txnType === "BET" || txnType === "DEBIT") {
      if (player.balance < amount) {
        res.json({
          success: false,
          errorCode: 402,
          message: "Insufficient balance",
          balance: player.balance,
          currency: player.currency,
        });
        return;
      }
      player.balance -= amount;
    } else if (txnType === "WIN" || txnType === "CREDIT") {
      player.balance += amount;
    } else if (txnType === "ROLLBACK" || txnType === "REFUND") {
      player.balance += amount;
    }

    res.json({
      success: true,
      balance: player.balance,
      currency: player.currency,
      txnId,
      platformTxnId: platformTxnId || txnId,
    });
  } catch (err) {
    req.log.error({ err }, "Transaction callback error");
    res.status(500).json({ success: false, errorCode: 500, message: "Internal error" });
  }
});

router.post("/batch-transactions", (req: Request, res: Response) => {
  try {
    const { playerCode, currency, transactions } = req.body as {
      playerCode?: string;
      currency?: string;
      transactions?: Array<{ amount: number; txnId: string; txnType: string; gameCode?: string; roundId?: string; platformTxnId?: string }>;
    };

    req.log.info({ playerCode, txnCount: transactions?.length }, "Seamless wallet: batch-transactions callback");

    if (!playerCode || !transactions || !Array.isArray(transactions)) {
      res.status(400).json({ success: false, errorCode: 400, message: "Missing required fields" });
      return;
    }

    if (!playerBalances[playerCode]) {
      playerBalances[playerCode] = { balance: 0, currency: currency || "USD" };
    }

    const player = playerBalances[playerCode];
    const results: Array<{ txnId: string; success: boolean; balance: number }> = [];

    for (const txn of transactions) {
      if (txn.txnType === "BET" || txn.txnType === "DEBIT") {
        if (player.balance < txn.amount) {
          results.push({ txnId: txn.txnId, success: false, balance: player.balance });
          continue;
        }
        player.balance -= txn.amount;
      } else if (txn.txnType === "WIN" || txn.txnType === "CREDIT") {
        player.balance += txn.amount;
      } else if (txn.txnType === "ROLLBACK" || txn.txnType === "REFUND") {
        player.balance += txn.amount;
      }
      results.push({ txnId: txn.txnId, success: true, balance: player.balance });
    }

    res.json({
      success: true,
      balance: player.balance,
      currency: player.currency,
      transactions: results,
    });
  } catch (err) {
    req.log.error({ err }, "Batch transactions callback error");
    res.status(500).json({ success: false, errorCode: 500, message: "Internal error" });
  }
});

export default router;
