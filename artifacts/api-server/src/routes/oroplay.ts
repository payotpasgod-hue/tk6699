import { Router, type IRouter, type Request, type Response } from "express";
import * as fs from "fs";
import * as path from "path";
import { db, pool } from "@workspace/db";
import { usersTable, transactionsTable } from "@workspace/db/schema";
import { eq, sql } from "drizzle-orm";
import { authMiddleware, adminMiddleware } from "./auth";

const router: IRouter = Router();

let cachedToken: string | null = null;
let tokenExpiry: number = 0;
let tokenPromise: Promise<string> | null = null;

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

async function autoRefreshCache(): Promise<void> {
  if (memoryCache && memoryCache.games.length > 0) return;
  const env = getEnvConfig();
  if (!env.clientId || !env.clientSecret) {
    console.log("[cache] Skipping auto-refresh: API credentials not configured");
    return;
  }
  console.log("[cache] No games in cache, auto-refreshing from OroPlay...");
  try {
    const vendorData = await oroplayRequest("GET", "/vendors/list", null, env.clientId, env.clientSecret, env.apiEndpoint) as { success: boolean; message?: Array<{ vendorCode: string; type: number; name: string; url?: string }> };
    const vendors = vendorData.message || [];
    const allGames: Array<Record<string, unknown>> = [];
    for (const vendor of vendors) {
      try {
        const gamesData = await oroplayRequest("POST", "/games/list", { vendorCode: vendor.vendorCode, language: "en" }, env.clientId, env.clientSecret, env.apiEndpoint) as { success: boolean; message?: Array<Record<string, unknown>> };
        if (gamesData.message && Array.isArray(gamesData.message)) {
          for (const game of gamesData.message) {
            game.vendorCode = vendor.vendorCode;
            allGames.push(game);
          }
        }
      } catch {}
    }
    const cacheData: CachedData = {
      vendors,
      games: allGames,
      timestamp: Date.now(),
      totalGames: allGames.length,
      totalVendors: vendors.length,
    };
    saveCacheToFile(cacheData);
    console.log(`[cache] Auto-refresh complete: ${allGames.length} games, ${vendors.length} vendors`);
  } catch (err) {
    console.error("[cache] Auto-refresh failed:", err);
  }
}

setTimeout(() => autoRefreshCache(), 3000);

function getEnvConfig() {
  const endpoint = (process.env["OROPLAY_API_ENDPOINT"] || "https://bs.sxvwlkohlv.com/api/v2").replace(/\/+$/, "");
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
    if (!resp.ok) {
      const snippet = text.length > 200 ? text.substring(0, 200) + "..." : text;
      const isHtml = text.trimStart().startsWith("<");
      throw new Error(
        isHtml
          ? `OroPlay service unavailable (${resp.status}). Please try again.`
          : `OroPlay API error ${resp.status}: ${snippet}`
      );
    }
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

async function atomicBalanceUpdate(userId: number, amount: number, allowNegative: boolean = false): Promise<number | null> {
  if (amount < 0 && !allowNegative) {
    const result = await db.execute(sql`
      UPDATE users SET balance = balance + ${amount}, updated_at = NOW()
      WHERE id = ${userId} AND balance >= ${Math.abs(amount)}
      RETURNING balance AS new_balance
    `);
    if (result.rows.length === 0) return null;
    return Number(result.rows[0].new_balance);
  }

  const result = await db.execute(sql`
    UPDATE users SET balance = balance + ${amount}, updated_at = NOW()
    WHERE id = ${userId}
    RETURNING balance AS new_balance
  `);
  if (result.rows.length === 0) return null;
  return Number(result.rows[0].new_balance);
}

router.get("/oroplay/config", (_req: Request, res: Response) => {
  const { clientId, apiEndpoint } = getEnvConfig();
  res.json({
    hasCredentials: Boolean(process.env["OROPLAY_CLIENT_ID"] && process.env["OROPLAY_CLIENT_SECRET"]),
    apiEndpoint,
    clientId: clientId ? clientId.substring(0, 4) + "****" : "",
  });
});

router.post("/oroplay/token", authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
  try {
    const env = getEnvConfig();
    if (!env.clientId || !env.clientSecret) {
      res.status(400).json({ success: false, message: "API credentials not configured" });
      return;
    }
    cachedToken = null;
    tokenExpiry = 0;
    const result = await fetchToken(env.clientId, env.clientSecret, env.apiEndpoint);
    cachedToken = result.token;
    tokenExpiry = result.expiration;
    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "Token creation failed");
    res.status(400).json({ success: false, message: err instanceof Error ? err.message : "Token creation failed" });
  }
});

router.get("/oroplay/vendors", authMiddleware, async (req: Request, res: Response) => {
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

router.post("/oroplay/games", authMiddleware, async (req: Request, res: Response) => {
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

router.post("/oroplay/game/detail", authMiddleware, async (req: Request, res: Response) => {
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

router.post("/oroplay/game/launch", authMiddleware, async (req: Request, res: Response) => {
  try {
    const env = getEnvConfig();
    if (!env.clientId || !env.clientSecret) {
      res.status(400).json({ success: false, message: "API credentials not configured" });
      return;
    }

    const user = (req as any).user;
    const { vendorCode, gameCode, language, lobbyUrl, theme } = req.body as {
      vendorCode: string;
      gameCode: string;
      language?: string;
      lobbyUrl?: string;
      theme?: number;
    };

    if (Number(user.balance) <= 0) {
      res.status(400).json({ success: false, message: "Insufficient balance" });
      return;
    }

    const data = await oroplayRequest(
      "POST",
      "/game/launch-url",
      {
        vendorCode,
        gameCode,
        userCode: user.userCode,
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

router.post("/oroplay/cache/refresh", authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
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

router.get("/oroplay/player/balance", authMiddleware, async (req: Request, res: Response) => {
  const user = (req as any).user;
  res.json({ success: true, balance: Number(user.balance) });
});

router.get("/oroplay/agent/balance", authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
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
    res.status(500).json({ success: false, errorCode: 500, message: "Callback auth not configured" });
    return false;
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

router.get("/balance", (_req: Request, res: Response) => {
  res.json({ success: true, message: "Balance callback endpoint active", errorCode: 0 });
});

router.post("/balance", async (req: Request, res: Response) => {
  if (!verifyCallbackAuth(req, res)) return;
  try {
    const { userCode } = req.body as { userCode?: string };
    req.log.info({ userCode }, "Seamless wallet: balance callback");

    if (!userCode) {
      res.status(400).json({ success: false, errorCode: 400, message: "Missing userCode" });
      return;
    }

    const users = await db.select().from(usersTable).where(eq(usersTable.userCode, userCode)).limit(1);
    if (users.length === 0) {
      res.json({ success: true, message: 0, errorCode: 0 });
      return;
    }

    res.json({ success: true, message: Number(users[0].balance), errorCode: 0 });
  } catch (err) {
    req.log.error({ err }, "Balance callback error");
    res.status(500).json({ success: false, errorCode: 500, message: "Internal error" });
  }
});

router.get("/transaction", (_req: Request, res: Response) => {
  res.json({ success: true, message: "Transaction callback endpoint active", errorCode: 0 });
});

router.post("/transaction", async (req: Request, res: Response) => {
  if (!verifyCallbackAuth(req, res)) return;
  try {
    const {
      userCode,
      vendorCode,
      gameCode,
      roundId,
      transactionCode,
      isFinished,
      isCanceled,
      amount,
    } = req.body as {
      userCode?: string;
      vendorCode?: string;
      gameCode?: string;
      roundId?: string;
      transactionCode?: string;
      isFinished?: boolean;
      isCanceled?: boolean;
      amount?: number;
    };

    req.log.info({ userCode, vendorCode, gameCode, transactionCode, amount, roundId, isFinished, isCanceled }, "Seamless wallet: transaction callback");

    if (!userCode || amount === undefined || !transactionCode) {
      res.status(400).json({ success: false, errorCode: 400, message: "Missing required fields" });
      return;
    }

    if (processedTransactions.has(transactionCode)) {
      const users = await db.select().from(usersTable).where(eq(usersTable.userCode, userCode)).limit(1);
      res.json({ success: false, errorCode: 6, message: users.length > 0 ? Number(users[0].balance) : 0 });
      return;
    }

    const users = await db.select().from(usersTable).where(eq(usersTable.userCode, userCode)).limit(1);
    if (users.length === 0) {
      res.status(400).json({ success: false, errorCode: 2, message: "User not found" });
      return;
    }

    const user = users[0];
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      await client.query("SELECT pg_advisory_xact_lock($1)", [user.id]);

      const dupCheck = await client.query(
        "SELECT id FROM transactions WHERE transaction_code = $1 LIMIT 1",
        [transactionCode]
      );
      if (dupCheck.rows.length > 0) {
        await client.query("COMMIT");
        processedTransactions.add(transactionCode);
        const curBal = await client.query("SELECT balance FROM users WHERE id = $1", [user.id]);
        res.json({ success: false, errorCode: 6, message: curBal.rows.length > 0 ? Number(curBal.rows[0].balance) : 0 });
        return;
      }

      let balResult;
      if (isCanceled && amount < 0) {
        balResult = await client.query(
          "UPDATE users SET balance = balance + $1, updated_at = NOW() WHERE id = $2 RETURNING balance AS new_balance",
          [Math.abs(amount), user.id]
        );
      } else if (amount < 0) {
        balResult = await client.query(
          "UPDATE users SET balance = balance + $1, updated_at = NOW() WHERE id = $2 AND balance >= $3 RETURNING balance AS new_balance",
          [amount, user.id, Math.abs(amount)]
        );
        if (balResult.rows.length === 0) {
          await client.query("COMMIT");
          const curBal = await client.query("SELECT balance FROM users WHERE id = $1", [user.id]);
          res.json({ success: false, errorCode: 4, message: curBal.rows.length > 0 ? Number(curBal.rows[0].balance) : 0 });
          return;
        }
      } else if (amount > 0) {
        balResult = await client.query(
          "UPDATE users SET balance = balance + $1, updated_at = NOW() WHERE id = $2 RETURNING balance AS new_balance",
          [amount, user.id]
        );
      } else {
        balResult = { rows: [{ new_balance: user.balance }] };
      }

      const newBalance = Number(balResult.rows[0].new_balance);

      await client.query(
        `INSERT INTO transactions (user_id, type, amount, balance_after, transaction_code, vendor_code, game_code, round_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          user.id,
          isCanceled ? "cancel" : amount < 0 ? "bet" : "win",
          amount.toFixed(2),
          newBalance.toFixed(2),
          transactionCode,
          vendorCode || null,
          gameCode || null,
          roundId || null,
        ]
      );

      await client.query("COMMIT");

      processedTransactions.add(transactionCode);
      if (processedTransactions.size > 100000) {
        const entries = Array.from(processedTransactions);
        for (let i = 0; i < 50000; i++) {
          processedTransactions.delete(entries[i]);
        }
      }

      res.json({ success: true, message: newBalance, errorCode: 0 });
    } catch (txErr) {
      await client.query("ROLLBACK");
      throw txErr;
    } finally {
      client.release();
    }
  } catch (err) {
    req.log.error({ err }, "Transaction callback error");
    res.status(500).json({ success: false, errorCode: 500, message: "Internal error" });
  }
});

router.get("/batch-transactions", (_req: Request, res: Response) => {
  res.json({ success: true, message: "Batch transactions callback endpoint active", errorCode: 0 });
});

router.post("/batch-transactions", async (req: Request, res: Response) => {
  if (!verifyCallbackAuth(req, res)) return;
  try {
    const { userCode, transactions } = req.body as {
      userCode?: string;
      transactions?: Array<{
        vendorCode?: string;
        gameCode?: string;
        roundId?: string;
        transactionCode?: string;
        isFinished?: boolean;
        isCanceled?: boolean;
        amount?: number;
      }>;
    };

    req.log.info({ userCode, txnCount: transactions?.length }, "Seamless wallet: batch-transactions callback");

    if (!userCode || !transactions || !Array.isArray(transactions)) {
      res.status(400).json({ success: false, errorCode: 400, message: "Missing required fields" });
      return;
    }

    const users = await db.select().from(usersTable).where(eq(usersTable.userCode, userCode)).limit(1);
    if (users.length === 0) {
      res.status(400).json({ success: false, errorCode: 2, message: "User not found" });
      return;
    }

    const user = users[0];
    let latestBalance = Number(user.balance);
    const client = await pool.connect();

    try {
      await client.query("BEGIN");
      await client.query("SELECT pg_advisory_xact_lock($1)", [user.id]);

      for (const txn of transactions) {
        const txnCode = txn.transactionCode;
        if (txnCode && processedTransactions.has(txnCode)) continue;

        if (txnCode) {
          const dupCheck = await client.query(
            "SELECT id FROM transactions WHERE transaction_code = $1 LIMIT 1",
            [txnCode]
          );
          if (dupCheck.rows.length > 0) {
            processedTransactions.add(txnCode);
            continue;
          }
        }

        const amount = txn.amount || 0;
        if (amount === 0) continue;

        let balResult;
        if (txn.isCanceled && amount < 0) {
          balResult = await client.query(
            "UPDATE users SET balance = balance + $1, updated_at = NOW() WHERE id = $2 RETURNING balance AS new_balance",
            [Math.abs(amount), user.id]
          );
        } else if (amount < 0) {
          balResult = await client.query(
            "UPDATE users SET balance = balance + $1, updated_at = NOW() WHERE id = $2 AND balance >= $3 RETURNING balance AS new_balance",
            [amount, user.id, Math.abs(amount)]
          );
          if (balResult.rows.length === 0) continue;
        } else {
          balResult = await client.query(
            "UPDATE users SET balance = balance + $1, updated_at = NOW() WHERE id = $2 RETURNING balance AS new_balance",
            [amount, user.id]
          );
        }

        const newBal = Number(balResult.rows[0].new_balance);
        latestBalance = newBal;

        await client.query(
          `INSERT INTO transactions (user_id, type, amount, balance_after, transaction_code, vendor_code, game_code, round_id)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            user.id,
            txn.isCanceled ? "cancel" : amount < 0 ? "bet" : "win",
            amount.toFixed(2),
            newBal.toFixed(2),
            txnCode || null,
            txn.vendorCode || null,
            txn.gameCode || null,
            txn.roundId || null,
          ]
        );

        if (txnCode) processedTransactions.add(txnCode);
      }

      await client.query("COMMIT");
    } catch (txErr) {
      await client.query("ROLLBACK");
      throw txErr;
    } finally {
      client.release();
    }

    res.json({ success: true, message: latestBalance, errorCode: 0 });
  } catch (err) {
    req.log.error({ err }, "Batch transactions callback error");
    res.status(500).json({ success: false, errorCode: 500, message: "Internal error" });
  }
});

export default router;
