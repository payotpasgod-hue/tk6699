import type { Request, Response, NextFunction } from "express";

export interface LogEntry {
  id: number;
  timestamp: string;
  method: string;
  path: string;
  status: number;
  duration: number;
  ip: string;
  userAgent: string;
  userId?: number;
  userName?: string;
  error?: string;
  body?: unknown;
  responseSnippet?: string;
}

export interface ErrorEntry {
  id: number;
  timestamp: string;
  method: string;
  path: string;
  status: number;
  error: string;
  stack?: string;
  body?: unknown;
  userId?: number;
  userName?: string;
}

const MAX_ENTRIES = 500;
const MAX_ERRORS = 200;
let nextId = 1;
let nextErrorId = 1;

export const requestLog: LogEntry[] = [];
export const errorLog: ErrorEntry[] = [];

export function requestLoggerMiddleware(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();
  const originalJson = res.json.bind(res);
  let responseBody: unknown = undefined;

  res.json = function (body: unknown) {
    responseBody = body;
    return originalJson(body);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    const user = (req as any).user;
    const entry: LogEntry = {
      id: nextId++,
      timestamp: new Date().toISOString(),
      method: req.method,
      path: req.originalUrl?.split("?")[0] || req.path,
      status: res.statusCode,
      duration,
      ip: (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.ip || "",
      userAgent: (req.headers["user-agent"] || "").substring(0, 120),
      userId: user?.id,
      userName: user?.displayName,
    };

    if (req.method === "POST" && req.body && typeof req.body === "object") {
      const sanitized = { ...req.body };
      const sensitiveKeys = ["password", "clientSecret", "token", "secret", "accessToken", "refreshToken", "apiKey"];
      for (const key of sensitiveKeys) {
        if (sanitized[key]) sanitized[key] = "***";
      }
      entry.body = sanitized;
    }

    if (res.statusCode >= 400 && responseBody && typeof responseBody === "object") {
      const rb = responseBody as Record<string, unknown>;
      entry.responseSnippet = rb.message ? String(rb.message).substring(0, 200) : undefined;
    }

    requestLog.unshift(entry);
    if (requestLog.length > MAX_ENTRIES) requestLog.length = MAX_ENTRIES;

    if (res.statusCode >= 400) {
      const errEntry: ErrorEntry = {
        id: nextErrorId++,
        timestamp: entry.timestamp,
        method: req.method,
        path: entry.path,
        status: res.statusCode,
        error: entry.responseSnippet || `HTTP ${res.statusCode}`,
        body: entry.body,
        userId: user?.id,
        userName: user?.displayName,
      };
      errorLog.unshift(errEntry);
      if (errorLog.length > MAX_ERRORS) errorLog.length = MAX_ERRORS;
    }
  });

  next();
}
