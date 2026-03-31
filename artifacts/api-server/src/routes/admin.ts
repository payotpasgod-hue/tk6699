import { Router, type Request, type Response } from "express";
import { db } from "@workspace/db";
import { usersTable, transactionsTable } from "@workspace/db/schema";
import { eq, desc, sql } from "drizzle-orm";
import { authMiddleware, adminMiddleware } from "./auth";
import { requestLog, errorLog } from "../lib/request-logger";
import { getVisitorStats } from "../lib/visitor-tracker";

async function atomicBalanceUpdate(userId: number, amount: number, requireSufficient: boolean = false): Promise<number | null> {
  if (requireSufficient && amount < 0) {
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

const router = Router();

router.get("/admin/users", authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
  try {
    const users = await db
      .select({
        id: usersTable.id,
        phone: usersTable.phone,
        displayName: usersTable.displayName,
        balance: usersTable.balance,
        currency: usersTable.currency,
        role: usersTable.role,
        userCode: usersTable.userCode,
        isActive: usersTable.isActive,
        createdAt: usersTable.createdAt,
      })
      .from(usersTable)
      .orderBy(desc(usersTable.createdAt));

    res.json({
      success: true,
      users: users.map((u) => ({ ...u, balance: Number(u.balance) })),
    });
  } catch (err) {
    req.log.error({ err }, "Failed to list users");
    res.status(500).json({ success: false, message: "Failed to list users" });
  }
});

router.post("/admin/deposit", authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
  try {
    const { userId, amount } = req.body as { userId: number; amount: number };
    if (!userId || !amount || amount <= 0) {
      res.status(400).json({ success: false, message: "Invalid userId or amount" });
      return;
    }

    const newBalance = await atomicBalanceUpdate(userId, amount);
    if (newBalance === null) {
      res.status(404).json({ success: false, message: "User not found" });
      return;
    }

    await db.insert(transactionsTable).values({
      userId,
      type: "admin_deposit",
      amount: amount.toFixed(2),
      balanceAfter: newBalance.toFixed(2),
      description: `Admin deposit by ${(req as any).user.displayName}`,
    });

    res.json({ success: true, balance: newBalance });
  } catch (err) {
    req.log.error({ err }, "Admin deposit failed");
    res.status(500).json({ success: false, message: "Deposit failed" });
  }
});

router.post("/admin/withdraw", authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
  try {
    const { userId, amount } = req.body as { userId: number; amount: number };
    if (!userId || !amount || amount <= 0) {
      res.status(400).json({ success: false, message: "Invalid userId or amount" });
      return;
    }

    const newBalance = await atomicBalanceUpdate(userId, -amount, true);
    if (newBalance === null) {
      res.status(400).json({ success: false, message: "Insufficient balance or user not found" });
      return;
    }

    await db.insert(transactionsTable).values({
      userId,
      type: "admin_withdraw",
      amount: (-amount).toFixed(2),
      balanceAfter: newBalance.toFixed(2),
      description: `Admin withdrawal by ${(req as any).user.displayName}`,
    });

    res.json({ success: true, balance: newBalance });
  } catch (err) {
    req.log.error({ err }, "Admin withdraw failed");
    res.status(500).json({ success: false, message: "Withdrawal failed" });
  }
});

router.post("/admin/toggle-user", authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
  try {
    const { userId, isActive } = req.body as { userId: number; isActive: boolean };
    if (!userId) {
      res.status(400).json({ success: false, message: "Missing userId" });
      return;
    }

    await db.update(usersTable).set({ isActive, updatedAt: new Date() }).where(eq(usersTable.id, userId));

    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "Toggle user failed");
    res.status(500).json({ success: false, message: "Failed to toggle user" });
  }
});

router.get("/admin/transactions", authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 100, 500);
    const offset = Number(req.query.offset) || 0;

    const txns = await db
      .select({
        id: transactionsTable.id,
        userId: transactionsTable.userId,
        type: transactionsTable.type,
        amount: transactionsTable.amount,
        balanceAfter: transactionsTable.balanceAfter,
        transactionCode: transactionsTable.transactionCode,
        vendorCode: transactionsTable.vendorCode,
        gameCode: transactionsTable.gameCode,
        roundId: transactionsTable.roundId,
        description: transactionsTable.description,
        createdAt: transactionsTable.createdAt,
        displayName: usersTable.displayName,
        phone: usersTable.phone,
      })
      .from(transactionsTable)
      .innerJoin(usersTable, eq(transactionsTable.userId, usersTable.id))
      .orderBy(desc(transactionsTable.createdAt))
      .limit(limit)
      .offset(offset);

    res.json({
      success: true,
      transactions: txns.map((t) => ({
        ...t,
        amount: Number(t.amount),
        balanceAfter: Number(t.balanceAfter),
      })),
    });
  } catch (err) {
    req.log.error({ err }, "Failed to list transactions");
    res.status(500).json({ success: false, message: "Failed to list transactions" });
  }
});

router.get("/admin/stats", authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
  try {
    const totalUsers = await db.select({ count: sql<number>`count(*)` }).from(usersTable);
    const activeUsers = await db.select({ count: sql<number>`count(*)` }).from(usersTable).where(eq(usersTable.isActive, true));
    const totalBalance = await db.select({ sum: sql<string>`coalesce(sum(balance::numeric), 0)` }).from(usersTable);

    res.json({
      success: true,
      stats: {
        totalUsers: Number(totalUsers[0].count),
        activeUsers: Number(activeUsers[0].count),
        totalBalance: Number(totalBalance[0].sum),
      },
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get stats");
    res.status(500).json({ success: false, message: "Failed to get stats" });
  }
});

router.get("/admin/request-log", authMiddleware, adminMiddleware, async (_req: Request, res: Response) => {
  res.json({ success: true, logs: requestLog.slice(0, 200) });
});

router.get("/admin/error-log", authMiddleware, adminMiddleware, async (_req: Request, res: Response) => {
  res.json({ success: true, errors: errorLog.slice(0, 100) });
});

router.get("/admin/bonus-claims", authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 100, 500);
    const claims = await db.execute(sql`
      SELECT bc.id, bc.user_id, bc.bonus_type, bc.bonus_key, bc.amount, bc.created_at,
             u.display_name, u.phone
      FROM bonus_claims bc
      JOIN users u ON bc.user_id = u.id
      ORDER BY bc.created_at DESC
      LIMIT ${limit}
    `);
    res.json({
      success: true,
      claims: claims.rows.map((c: any) => ({
        id: c.id,
        userId: c.user_id,
        bonusType: c.bonus_type,
        bonusKey: c.bonus_key,
        amount: Number(c.amount),
        displayName: c.display_name,
        phone: c.phone,
        createdAt: c.created_at,
      })),
    });
  } catch (err) {
    req.log.error({ err }, "Failed to list bonus claims");
    res.status(500).json({ success: false, message: "Failed to list bonus claims" });
  }
});

router.get("/admin/system-health", authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
  try {
    const apiEndpoint = (process.env["OROPLAY_API_ENDPOINT"] || "").replace(/\/+$/, "");

    let apiStatus = "unknown";
    let apiLatency = 0;
    try {
      const start = Date.now();
      const resp = await fetch(`${apiEndpoint}/auth/createtoken`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId: "ping", clientSecret: "ping" }),
        signal: AbortSignal.timeout(5000),
      });
      apiLatency = Date.now() - start;
      apiStatus = resp.status === 401 || resp.status === 200 || resp.status === 400 ? "online" : "error";
    } catch {
      apiStatus = "offline";
    }

    let dbStatus = "unknown";
    let dbLatency = 0;
    try {
      const start = Date.now();
      await db.execute(sql`SELECT 1`);
      dbLatency = Date.now() - start;
      dbStatus = "online";
    } catch {
      dbStatus = "offline";
    }

    const totalErrors = errorLog.length;
    const recentErrors = errorLog.filter(
      (e) => Date.now() - new Date(e.timestamp).getTime() < 60 * 60 * 1000
    ).length;
    const totalRequests = requestLog.length;

    const gameCacheFile = (await import("path")).join(process.cwd(), "data", "games-cache.json");
    let cacheInfo = { exists: false, size: 0, age: 0, totalGames: 0, totalVendors: 0 };
    try {
      const fs = await import("fs");
      if (fs.existsSync(gameCacheFile)) {
        const stat = fs.statSync(gameCacheFile);
        const raw = fs.readFileSync(gameCacheFile, "utf-8");
        const data = JSON.parse(raw);
        cacheInfo = {
          exists: true,
          size: Math.round(stat.size / 1024),
          age: Math.round((Date.now() - (data.timestamp || 0)) / 1000 / 60),
          totalGames: data.totalGames || 0,
          totalVendors: data.totalVendors || 0,
        };
      }
    } catch {}

    const visitors = getVisitorStats();

    res.json({
      success: true,
      health: {
        oroplayApi: { status: apiStatus, latency: apiLatency, endpoint: apiEndpoint },
        database: { status: dbStatus, latency: dbLatency },
        cache: cacheInfo,
        errors: { total: totalErrors, lastHour: recentErrors },
        requests: { tracked: totalRequests },
        uptime: Math.round(process.uptime()),
        memory: Math.round(process.memoryUsage().rss / 1024 / 1024),
        visitors,
      },
    });
  } catch (err) {
    req.log.error({ err }, "Health check failed");
    res.status(500).json({ success: false, message: "Health check failed" });
  }
});

export default router;
