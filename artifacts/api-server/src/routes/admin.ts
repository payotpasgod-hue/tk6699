import { Router, type Request, type Response } from "express";
import { db } from "@workspace/db";
import { usersTable, transactionsTable } from "@workspace/db/schema";
import { eq, desc, sql } from "drizzle-orm";
import { authMiddleware, adminMiddleware } from "./auth";

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

export default router;
