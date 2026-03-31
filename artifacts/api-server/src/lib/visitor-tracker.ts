import type { Request, Response, NextFunction } from "express";

export interface VisitorTracker {
  onlineNow: number;
  totalVisits: number;
  todayVisits: number;
  todayDate: string;
  todayUniqueIPs: Set<string>;
  activeSessions: Map<string, number>;
}

const tracker: VisitorTracker = {
  onlineNow: 0,
  totalVisits: 0,
  todayVisits: 0,
  todayDate: new Date().toISOString().slice(0, 10),
  todayUniqueIPs: new Set(),
  activeSessions: new Map(),
};

const SESSION_TIMEOUT = 5 * 60 * 1000;

function cleanupSessions() {
  const now = Date.now();
  for (const [key, lastSeen] of tracker.activeSessions) {
    if (now - lastSeen > SESSION_TIMEOUT) {
      tracker.activeSessions.delete(key);
    }
  }
  tracker.onlineNow = tracker.activeSessions.size;
}

setInterval(cleanupSessions, 30_000);

function getToday() {
  return new Date().toISOString().slice(0, 10);
}

function getClientIP(req: Request): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string") {
    return forwarded.split(",")[0]?.trim() || "unknown";
  }
  return req.socket.remoteAddress || "unknown";
}

export function trackVisitor(req: Request, _res: Response, next: NextFunction) {
  const ip = getClientIP(req);
  const user = (req as any).user;
  const sessionKey = user?.id ? `user:${user.id}` : `ip:${ip}`;

  const today = getToday();
  if (today !== tracker.todayDate) {
    tracker.todayVisits = 0;
    tracker.todayDate = today;
    tracker.todayUniqueIPs.clear();
  }

  if (!tracker.activeSessions.has(sessionKey)) {
    tracker.totalVisits++;
    tracker.todayVisits++;
  }

  tracker.activeSessions.set(sessionKey, Date.now());
  tracker.todayUniqueIPs.add(ip);
  tracker.onlineNow = tracker.activeSessions.size;

  next();
}

export function getVisitorStats() {
  cleanupSessions();
  return {
    onlineNow: tracker.onlineNow,
    totalVisits: tracker.totalVisits,
    todayVisits: tracker.todayVisits,
    todayUniqueIPs: tracker.todayUniqueIPs.size,
  };
}
