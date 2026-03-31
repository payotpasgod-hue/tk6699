import { Router, type Request, type Response } from "express";
import { db } from "@workspace/db";
import { transactionsTable } from "@workspace/db/schema";
import { eq, desc, sql, and, gte } from "drizzle-orm";
import { authMiddleware } from "./auth";

const router = Router();

router.get("/profile/transactions", authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id as number;
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const offset = Number(req.query.offset) || 0;
    const type = req.query.type as string | undefined;

    const conditions = [eq(transactionsTable.userId, userId)];
    if (type && type !== "all") {
      conditions.push(eq(transactionsTable.type, type));
    }

    const txns = await db
      .select()
      .from(transactionsTable)
      .where(and(...conditions))
      .orderBy(desc(transactionsTable.createdAt))
      .limit(limit)
      .offset(offset);

    const [countResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(transactionsTable)
      .where(and(...conditions));

    res.json({
      success: true,
      transactions: txns.map((t) => ({
        ...t,
        amount: Number(t.amount),
        balanceAfter: Number(t.balanceAfter),
      })),
      total: countResult?.count || 0,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get user transactions");
    res.status(500).json({ success: false, message: "Failed to get transactions" });
  }
});

router.get("/profile/stats", authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id as number;

    const [stats] = await db.execute(sql`
      SELECT
        COUNT(*)::int AS total_bets,
        COALESCE(SUM(CASE WHEN type = 'bet' THEN amount ELSE 0 END), 0)::numeric AS total_wagered,
        COALESCE(SUM(CASE WHEN type = 'win' THEN amount ELSE 0 END), 0)::numeric AS total_won,
        COALESCE(SUM(CASE WHEN type = 'admin_deposit' THEN amount ELSE 0 END), 0)::numeric AS total_deposited,
        COALESCE(SUM(CASE WHEN type = 'admin_withdraw' THEN amount ELSE 0 END), 0)::numeric AS total_withdrawn,
        COUNT(DISTINCT game_code) AS games_played,
        MIN(created_at) AS first_transaction
      FROM transactions
      WHERE user_id = ${userId}
    `);

    const row = (stats as any).rows?.[0] || stats;

    res.json({
      success: true,
      stats: {
        totalBets: Number(row.total_bets) || 0,
        totalWagered: Math.abs(Number(row.total_wagered)) || 0,
        totalWon: Number(row.total_won) || 0,
        totalDeposited: Number(row.total_deposited) || 0,
        totalWithdrawn: Math.abs(Number(row.total_withdrawn)) || 0,
        gamesPlayed: Number(row.games_played) || 0,
        memberSince: row.first_transaction || null,
      },
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get user stats");
    res.status(500).json({ success: false, message: "Failed to get stats" });
  }
});

export default router;
