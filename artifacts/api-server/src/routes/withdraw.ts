import { Router, type Request, type Response } from "express";
import { db, pool } from "@workspace/db";
import { withdrawalsTable, usersTable } from "@workspace/db/schema";
import { eq, desc, sql } from "drizzle-orm";
import { authMiddleware, adminMiddleware } from "./auth";
import bcrypt from "bcryptjs";

const router = Router();

router.get("/withdraw/has-password", authMiddleware, async (req: Request, res: Response) => {
  const user = (req as any).user;
  res.json({ success: true, hasPassword: !!user.withdrawPassword });
});

router.post("/withdraw/set-password", authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { password } = req.body as { password?: string };

    if (!password || password.length < 4 || password.length > 6) {
      res.status(400).json({ success: false, message: "Withdraw password must be 4-6 digits" });
      return;
    }
    if (!/^\d+$/.test(password)) {
      res.status(400).json({ success: false, message: "Withdraw password must be digits only" });
      return;
    }

    const hash = await bcrypt.hash(password, 10);
    await db.update(usersTable).set({ withdrawPassword: hash, updatedAt: new Date() }).where(eq(usersTable.id, userId));

    res.json({ success: true, message: "Withdraw password set successfully" });
  } catch (err) {
    req.log.error({ err }, "Set withdraw password failed");
    res.status(500).json({ success: false, message: "Failed to set withdraw password" });
  }
});

router.post("/withdraw/create", authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { amount, method, accountNumber, withdrawPassword } = req.body as {
      amount?: number;
      method?: string;
      accountNumber?: string;
      withdrawPassword?: string;
    };

    if (!user.withdrawPassword) {
      res.status(400).json({ success: false, message: "Please set a withdraw password first" });
      return;
    }
    if (!withdrawPassword) {
      res.status(400).json({ success: false, message: "Withdraw password is required" });
      return;
    }

    const validPass = await bcrypt.compare(withdrawPassword, user.withdrawPassword);
    if (!validPass) {
      res.status(400).json({ success: false, message: "Invalid withdraw password" });
      return;
    }

    if (!amount || amount < 500) {
      res.status(400).json({ success: false, message: "Minimum withdrawal is ৳500" });
      return;
    }
    if (amount > 25000) {
      res.status(400).json({ success: false, message: "Maximum withdrawal is ৳25,000" });
      return;
    }
    if (!method || !["bkash", "nagad"].includes(method)) {
      res.status(400).json({ success: false, message: "Invalid payment method" });
      return;
    }
    if (!accountNumber || accountNumber.length < 11) {
      res.status(400).json({ success: false, message: "Valid account number is required" });
      return;
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query("SELECT pg_advisory_xact_lock($1)", [user.id]);

      const balRes = await client.query("SELECT balance FROM users WHERE id = $1", [user.id]);
      const currentBalance = Number(balRes.rows[0]?.balance || 0);

      if (currentBalance < amount) {
        await client.query("ROLLBACK");
        res.status(400).json({ success: false, message: "Insufficient balance" });
        return;
      }

      await client.query(
        "UPDATE users SET balance = balance - $1, updated_at = NOW() WHERE id = $2",
        [amount, user.id]
      );

      const result = await client.query(
        `INSERT INTO withdrawals (user_id, amount, method, account_number, status)
         VALUES ($1, $2, $3, $4, 'pending') RETURNING id`,
        [user.id, amount.toFixed(2), method, accountNumber]
      );

      await client.query("COMMIT");

      const newBalance = currentBalance - amount;

      res.json({
        success: true,
        withdrawal: { id: result.rows[0].id, amount, method, status: "pending" },
        newBalance,
      });
    } catch (txErr) {
      await client.query("ROLLBACK");
      throw txErr;
    } finally {
      client.release();
    }
  } catch (err) {
    req.log.error({ err }, "Withdrawal creation failed");
    res.status(500).json({ success: false, message: "Failed to create withdrawal request" });
  }
});

router.get("/withdraw/history", authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const withdrawals = await db.select().from(withdrawalsTable)
      .where(eq(withdrawalsTable.userId, userId))
      .orderBy(desc(withdrawalsTable.createdAt))
      .limit(50);

    res.json({
      success: true,
      withdrawals: withdrawals.map(w => ({
        id: w.id,
        amount: Number(w.amount),
        method: w.method,
        accountNumber: w.accountNumber,
        status: w.status,
        adminNote: w.adminNote,
        createdAt: w.createdAt,
      })),
    });
  } catch (err) {
    req.log.error({ err }, "Withdrawal history fetch failed");
    res.status(500).json({ success: false, message: "Failed to fetch withdrawal history" });
  }
});

router.get("/admin/withdrawals", authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
  try {
    const withdrawals = await db.select({
      id: withdrawalsTable.id,
      userId: withdrawalsTable.userId,
      amount: withdrawalsTable.amount,
      method: withdrawalsTable.method,
      accountNumber: withdrawalsTable.accountNumber,
      status: withdrawalsTable.status,
      adminNote: withdrawalsTable.adminNote,
      createdAt: withdrawalsTable.createdAt,
      userName: usersTable.displayName,
      userPhone: usersTable.phone,
    })
      .from(withdrawalsTable)
      .leftJoin(usersTable, eq(withdrawalsTable.userId, usersTable.id))
      .orderBy(desc(withdrawalsTable.createdAt))
      .limit(100);

    res.json({ success: true, withdrawals });
  } catch (err) {
    req.log.error({ err }, "Admin withdrawals fetch failed");
    res.status(500).json({ success: false, message: "Failed to fetch withdrawals" });
  }
});

router.post("/admin/withdrawal/:id/approve", authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
  try {
    const withdrawalId = parseInt(req.params.id);
    const { note } = req.body as { note?: string };

    const [withdrawal] = await db.select().from(withdrawalsTable).where(eq(withdrawalsTable.id, withdrawalId)).limit(1);
    if (!withdrawal) {
      res.status(404).json({ success: false, message: "Withdrawal not found" });
      return;
    }
    if (withdrawal.status !== "pending") {
      res.status(400).json({ success: false, message: "Withdrawal already processed" });
      return;
    }

    await db.update(withdrawalsTable)
      .set({ status: "approved", adminNote: note || "Approved", updatedAt: new Date() })
      .where(eq(withdrawalsTable.id, withdrawalId));

    res.json({ success: true, message: "Withdrawal approved" });
  } catch (err) {
    req.log.error({ err }, "Withdrawal approval failed");
    res.status(500).json({ success: false, message: "Failed to approve withdrawal" });
  }
});

router.post("/admin/withdrawal/:id/reject", authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
  try {
    const withdrawalId = parseInt(req.params.id);
    const { note } = req.body as { note?: string };

    const [withdrawal] = await db.select().from(withdrawalsTable).where(eq(withdrawalsTable.id, withdrawalId)).limit(1);
    if (!withdrawal) {
      res.status(404).json({ success: false, message: "Withdrawal not found" });
      return;
    }
    if (withdrawal.status !== "pending") {
      res.status(400).json({ success: false, message: "Withdrawal already processed" });
      return;
    }

    await db.execute(sql`
      UPDATE users SET balance = balance + ${Number(withdrawal.amount)}, updated_at = NOW()
      WHERE id = ${withdrawal.userId}
    `);

    await db.update(withdrawalsTable)
      .set({ status: "rejected", adminNote: note || "Rejected - balance refunded", updatedAt: new Date() })
      .where(eq(withdrawalsTable.id, withdrawalId));

    res.json({ success: true, message: "Withdrawal rejected and balance refunded" });
  } catch (err) {
    req.log.error({ err }, "Withdrawal rejection failed");
    res.status(500).json({ success: false, message: "Failed to reject withdrawal" });
  }
});

export default router;
