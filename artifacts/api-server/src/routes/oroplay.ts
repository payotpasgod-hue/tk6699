import { Router, type IRouter, type Request, type Response } from "express";
import * as fs from "fs";
import * as path from "path";

const router: IRouter = Router();

let cachedToken: string | null = null;
let tokenExpiry: number = 0;
let tokenPromise: Promise<string> | null = null;

const DEFAULT_CURRENCY = "BDT";

const playerBalances: Record<string, { balance: number; currency: string }> = {};
const processedTransactions = new Set<string>();

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
  apiPath: string,
  body: unknown,
  clientId: string,
  clientSecret: string,
  apiEndpoint: string
): Promise<unknown> {
  let token = await getValidToken(clientId, clientSecret, apiEndpoint);
  const url = `${apiEndpoint}${apiPath}`;

  const doRequest = async (authToken: string) => {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      accept: "*/*",
      authorization: `Bearer ${authToken}`,
    };
    return fetch(url, {
      method,
      headers,
      body: method === "POST" ? JSON.stringify(body) : undefined,
    });
  };

  let resp = await doRequest(token);

  if (resp.status === 401) {
    cachedToken = null;
    tokenExpiry = 0;
    token = await getValidToken(clientId, clientSecret, apiEndpoint);
    resp = await doRequest(token);
  }

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
      const errorCode = r.errorCode || 0;
      if (errorCode === 401) {
        cachedToken = null;
        tokenExpiry = 0;
        token = await getValidToken(clientId, clientSecret, apiEndpoint);
        const retryResp = await doRequest(token);
        const retryText = await retryResp.text();
        try {
          const retryResult = JSON.parse(retryText);
          if (retryResult.success === false) {
            throw new Error(`OroPlay error (${retryResult.errorCode || 0}): ${typeof retryResult.message === "string" ? retryResult.message : JSON.stringify(retryResult)}`);
          }
          return retryResult;
        } catch (e) {
          if (e instanceof Error && e.message.startsWith("OroPlay")) throw e;
          throw new Error(`OroPlay API error: ${retryText}`);
        }
      }
      const errorMsg = typeof r.message === "string" ? r.message : JSON.stringify(r);
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
    const { vendorCode, gameCode } = req.body as { vendorCode: string; gameCode: string };
    const data = await oroplayRequest("POST", "/game/detail", { vendorCode, gameCode }, env.clientId, env.clientSecret, env.apiEndpoint);
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
    const { vendorCode, gameCode, userCode, language, lobbyUrl, theme } = req.body as {
      vendorCode: string;
      gameCode: string;
      userCode: string;
      language?: string;
      lobbyUrl?: string;
      theme?: number;
    };

    if (!playerBalances[userCode]) {
      playerBalances[userCode] = { balance: 0, currency: DEFAULT_CURRENCY };
    }

    const data = await oroplayRequest(
      "POST",
      "/game/launch-url",
      {
        vendorCode,
        gameCode,
        userCode,
        language: language || "en",
        lobbyUrl: lobbyUrl || "",
        ...(theme !== undefined ? { theme } : {}),
      },
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
    const { userCode } = req.body as { userCode: string };
    if (!userCode) {
      res.status(400).json({ success: false, message: "Missing userCode" });
      return;
    }

    if (!playerBalances[userCode]) {
      playerBalances[userCode] = { balance: 0, currency: DEFAULT_CURRENCY };
      req.log.info({ userCode }, "Player created");
      res.json({ success: true, message: `Player ${userCode} created` });
    } else {
      res.json({ success: true, message: `Player ${userCode} already exists` });
    }
  } catch (err) {
    req.log.error({ err }, "Player create failed");
    res.status(400).json({ success: false, message: err instanceof Error ? err.message : "Failed to create player" });
  }
});

router.post("/oroplay/player/balance", (req: Request, res: Response) => {
  try {
    const { userCode } = req.body as { userCode: string };
    if (!userCode) {
      res.status(400).json({ success: false, message: "Missing userCode" });
      return;
    }

    if (!playerBalances[userCode]) {
      playerBalances[userCode] = { balance: 0, currency: DEFAULT_CURRENCY };
    }

    res.json({ success: true, message: playerBalances[userCode].balance });
  } catch (err) {
    req.log.error({ err }, "Balance fetch failed");
    res.status(400).json({ success: false, message: err instanceof Error ? err.message : "Failed to fetch balance" });
  }
});

router.post("/oroplay/player/deposit", (req: Request, res: Response) => {
  try {
    const { userCode, amount } = req.body as { userCode: string; amount: number };
    if (!userCode || !amount || amount <= 0) {
      res.status(400).json({ success: false, message: "Missing userCode or invalid amount" });
      return;
    }

    if (!playerBalances[userCode]) {
      playerBalances[userCode] = { balance: 0, currency: DEFAULT_CURRENCY };
    }

    playerBalances[userCode].balance += amount;
    req.log.info({ userCode, amount, newBalance: playerBalances[userCode].balance }, "Deposit processed");
    res.json({ success: true, message: playerBalances[userCode].balance });
  } catch (err) {
    req.log.error({ err }, "Deposit failed");
    res.status(400).json({ success: false, message: err instanceof Error ? err.message : "Failed to deposit" });
  }
});

router.post("/oroplay/player/withdraw", (req: Request, res: Response) => {
  try {
    const { userCode, amount } = req.body as { userCode: string; amount: number };
    if (!userCode) {
      res.status(400).json({ success: false, message: "Missing userCode" });
      return;
    }
    if (amount !== -1 && (amount === undefined || amount <= 0)) {
      res.status(400).json({ success: false, message: "Invalid amount: must be positive or -1 for withdraw-all" });
      return;
    }

    if (!playerBalances[userCode]) {
      playerBalances[userCode] = { balance: 0, currency: DEFAULT_CURRENCY };
    }

    if (amount === -1) {
      playerBalances[userCode].balance = 0;
    } else {
      if (playerBalances[userCode].balance < amount) {
        res.status(400).json({ success: false, message: "Insufficient balance" });
        return;
      }
      playerBalances[userCode].balance -= amount;
    }

    req.log.info({ userCode, amount, newBalance: playerBalances[userCode].balance }, "Withdraw processed");
    res.json({ success: true, message: playerBalances[userCode].balance });
  } catch (err) {
    req.log.error({ err }, "Withdraw failed");
    res.status(400).json({ success: false, message: err instanceof Error ? err.message : "Failed to withdraw" });
  }
});

router.get("/oroplay/agent/balance", async (req: Request, res: Response) => {
  try {
    const env = getEnvConfig();
    if (!env.clientId || !env.clientSecret) {
      res.status(400).json({ success: false, message: "API credentials not configured" });
      return;
    }

    const data = await oroplayRequest("GET", "/agent/balance", null, env.clientId, env.clientSecret, env.apiEndpoint) as { success: boolean; message?: number; errorCode?: number };

    res.json({ success: true, message: typeof data.message === "number" ? data.message : 0 });
  } catch (err) {
    req.log.error({ err }, "Agent balance fetch failed");
    res.status(400).json({ success: false, message: err instanceof Error ? err.message : "Failed to fetch agent balance" });
  }
});

function verifyCallbackAuth(req: Request, res: Response): boolean {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Basic ")) {
    res.status(401).json({ success: false, errorCode: 401, message: "Unauthorized" });
    return false;
  }
  const { clientId, clientSecret } = getEnvConfig();
  if (!clientId || !clientSecret) {
    return true;
  }
  try {
    const decoded = Buffer.from(authHeader.slice(6), "base64").toString("utf-8");
    const [id, secret] = decoded.split(":");
    if (id !== clientId || secret !== clientSecret) {
      res.status(401).json({ success: false, errorCode: 401, message: "Invalid credentials" });
      return false;
    }
  } catch {
    res.status(401).json({ success: false, errorCode: 401, message: "Invalid auth header" });
    return false;
  }
  return true;
}

router.post("/balance", (req: Request, res: Response) => {
  if (!verifyCallbackAuth(req, res)) return;
  try {
    const { userCode } = req.body as { userCode?: string };
    req.log.info({ userCode }, "Seamless wallet: balance callback");

    if (!userCode) {
      res.status(400).json({ success: false, errorCode: 400, message: "Missing userCode" });
      return;
    }

    if (!playerBalances[userCode]) {
      playerBalances[userCode] = { balance: 0, currency: DEFAULT_CURRENCY };
    }

    res.json({
      success: true,
      message: playerBalances[userCode].balance,
      errorCode: 0,
    });
  } catch (err) {
    req.log.error({ err }, "Balance callback error");
    res.status(500).json({ success: false, errorCode: 500, message: "Internal error" });
  }
});

router.post("/transaction", (req: Request, res: Response) => {
  if (!verifyCallbackAuth(req, res)) return;
  try {
    const {
      userCode,
      vendorCode,
      gameCode,
      historyId,
      roundId,
      gameType,
      transactionCode,
      isFinished,
      isCanceled,
      amount,
      detail,
      createdAt,
    } = req.body as {
      userCode?: string;
      vendorCode?: string;
      gameCode?: string;
      historyId?: number;
      roundId?: string;
      gameType?: number;
      transactionCode?: string;
      isFinished?: boolean;
      isCanceled?: boolean;
      amount?: number;
      detail?: string;
      createdAt?: string;
    };

    req.log.info({ userCode, vendorCode, gameCode, transactionCode, amount, roundId, isFinished, isCanceled, historyId }, "Seamless wallet: transaction callback");

    if (!userCode || amount === undefined || !transactionCode) {
      res.status(400).json({ success: false, errorCode: 400, message: "Missing required fields" });
      return;
    }

    if (processedTransactions.has(transactionCode)) {
      const player = playerBalances[userCode];
      res.json({
        success: false,
        errorCode: 6,
        message: player ? player.balance : 0,
      });
      return;
    }

    if (!playerBalances[userCode]) {
      playerBalances[userCode] = { balance: 0, currency: DEFAULT_CURRENCY };
    }

    const player = playerBalances[userCode];

    if (isCanceled) {
      if (amount < 0) {
        player.balance += Math.abs(amount);
      }
      processedTransactions.add(transactionCode);
      res.json({ success: true, message: player.balance, errorCode: 0 });
      return;
    }

    if (amount < 0) {
      const betAmount = Math.abs(amount);
      if (player.balance < betAmount) {
        res.json({
          success: false,
          errorCode: 4,
          message: player.balance,
        });
        return;
      }
      player.balance -= betAmount;
    } else if (amount > 0) {
      player.balance += amount;
    }

    processedTransactions.add(transactionCode);

    if (processedTransactions.size > 100000) {
      const entries = Array.from(processedTransactions);
      for (let i = 0; i < 50000; i++) {
        processedTransactions.delete(entries[i]);
      }
    }

    res.json({
      success: true,
      message: player.balance,
      errorCode: 0,
    });
  } catch (err) {
    req.log.error({ err }, "Transaction callback error");
    res.status(500).json({ success: false, errorCode: 500, message: "Internal error" });
  }
});

router.post("/batch-transactions", (req: Request, res: Response) => {
  if (!verifyCallbackAuth(req, res)) return;
  try {
    const { userCode, transactions } = req.body as {
      userCode?: string;
      transactions?: Array<{
        userCode?: string;
        vendorCode?: string;
        gameCode?: string;
        historyId?: number;
        roundId?: string;
        gameType?: number;
        transactionCode?: string;
        isFinished?: boolean;
        isCanceled?: boolean;
        amount?: number;
        detail?: string;
        createdAt?: string;
      }>;
    };

    req.log.info({ userCode, txnCount: transactions?.length }, "Seamless wallet: batch-transactions callback");

    if (!userCode || !transactions || !Array.isArray(transactions)) {
      res.status(400).json({ success: false, errorCode: 400, message: "Missing required fields" });
      return;
    }

    if (!playerBalances[userCode]) {
      playerBalances[userCode] = { balance: 0, currency: DEFAULT_CURRENCY };
    }

    const player = playerBalances[userCode];

    for (const txn of transactions) {
      const txnCode = txn.transactionCode;
      if (txnCode && processedTransactions.has(txnCode)) {
        continue;
      }

      const amount = txn.amount || 0;

      if (txn.isCanceled) {
        if (amount < 0) {
          player.balance += Math.abs(amount);
        }
        if (txnCode) processedTransactions.add(txnCode);
        continue;
      }

      if (amount < 0) {
        const betAmount = Math.abs(amount);
        if (player.balance >= betAmount) {
          player.balance -= betAmount;
        }
      } else if (amount > 0) {
        player.balance += amount;
      }

      if (txnCode) {
        processedTransactions.add(txnCode);
      }
    }

    res.json({
      success: true,
      message: player.balance,
      errorCode: 0,
    });
  } catch (err) {
    req.log.error({ err }, "Batch transactions callback error");
    res.status(500).json({ success: false, errorCode: 500, message: "Internal error" });
  }
});

export default router;
