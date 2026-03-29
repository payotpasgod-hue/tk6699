import { Router, type IRouter, type Request, type Response } from "express";

const router: IRouter = Router();

let cachedToken: string | null = null;
let tokenExpiry: number = 0;
let tokenPromise: Promise<string> | null = null;

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
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`OroPlay API error ${resp.status}: ${text}`);
  }
  return resp.json();
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

    res.json({ success: true, token: result.token, expiration: result.expiration });
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

router.post("/oroplay/player/create", async (req: Request, res: Response) => {
  try {
    const env = getEnvConfig();
    if (!env.clientId || !env.clientSecret) {
      res.status(400).json({ success: false, message: "API credentials not configured" });
      return;
    }
    const { playerCode, currency, nickname } = req.body as { playerCode: string; currency?: string; nickname?: string };
    const data = await oroplayRequest(
      "POST",
      "/game/users/create",
      { playerCode, currency: currency || "USD", nickname: nickname || playerCode },
      env.clientId,
      env.clientSecret,
      env.apiEndpoint
    );
    res.json(data);
  } catch (err) {
    req.log.error({ err }, "Player create failed");
    res.status(400).json({ success: false, message: err instanceof Error ? err.message : "Failed to create player" });
  }
});

router.post("/oroplay/player/balance", async (req: Request, res: Response) => {
  try {
    const env = getEnvConfig();
    if (!env.clientId || !env.clientSecret) {
      res.status(400).json({ success: false, message: "API credentials not configured" });
      return;
    }
    const { playerCode } = req.body as { playerCode: string };
    const data = await oroplayRequest(
      "GET",
      `/game/users/balance?playerCode=${encodeURIComponent(playerCode)}`,
      null,
      env.clientId,
      env.clientSecret,
      env.apiEndpoint
    );
    res.json(data);
  } catch (err) {
    req.log.error({ err }, "Balance fetch failed");
    res.status(400).json({ success: false, message: err instanceof Error ? err.message : "Failed to fetch balance" });
  }
});

router.post("/oroplay/player/deposit", async (req: Request, res: Response) => {
  try {
    const env = getEnvConfig();
    if (!env.clientId || !env.clientSecret) {
      res.status(400).json({ success: false, message: "API credentials not configured" });
      return;
    }
    const { playerCode, amount, txnId } = req.body as { playerCode: string; amount: number; txnId?: string };
    const transactionId = txnId || `txn_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const data = await oroplayRequest(
      "POST",
      "/game/users/deposit",
      { playerCode, amount, txnId: transactionId },
      env.clientId,
      env.clientSecret,
      env.apiEndpoint
    );
    res.json(data);
  } catch (err) {
    req.log.error({ err }, "Deposit failed");
    res.status(400).json({ success: false, message: err instanceof Error ? err.message : "Failed to deposit" });
  }
});

router.post("/oroplay/player/withdraw", async (req: Request, res: Response) => {
  try {
    const env = getEnvConfig();
    if (!env.clientId || !env.clientSecret) {
      res.status(400).json({ success: false, message: "API credentials not configured" });
      return;
    }
    const { playerCode, amount, txnId } = req.body as { playerCode: string; amount: number; txnId?: string };
    const transactionId = txnId || `txn_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    let endpoint = "/game/users/withdraw";
    let body: object = { playerCode, amount, txnId: transactionId };

    if (amount === -1) {
      endpoint = "/game/users/withdrawall";
      body = { playerCode, txnId: transactionId };
    }

    const data = await oroplayRequest("POST", endpoint, body, env.clientId, env.clientSecret, env.apiEndpoint);
    res.json(data);
  } catch (err) {
    req.log.error({ err }, "Withdraw failed");
    res.status(400).json({ success: false, message: err instanceof Error ? err.message : "Failed to withdraw" });
  }
});

export default router;
