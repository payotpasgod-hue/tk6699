import { Router, type Request, type Response } from "express";
import { db } from "@workspace/db";
import { depositsTable, usersTable, siteSettingsTable } from "@workspace/db/schema";
import { eq, desc, sql } from "drizzle-orm";
import { authMiddleware, adminMiddleware } from "./auth";
import * as fs from "fs";
import * as path from "path";

const router = Router();

const UPLOADS_DIR = path.join(process.cwd(), "uploads");
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

router.post("/deposit/create", authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { amount, method, transactionId, screenshot } = req.body as {
      amount?: number;
      method?: string;
      transactionId?: string;
      screenshot?: string;
    };

    if (!amount || amount < 100) {
      res.status(400).json({ success: false, message: "Minimum deposit is ৳100" });
      return;
    }
    if (amount > 50000) {
      res.status(400).json({ success: false, message: "Maximum deposit is ৳50,000" });
      return;
    }
    if (!method || !["bkash", "nagad"].includes(method)) {
      res.status(400).json({ success: false, message: "Invalid payment method" });
      return;
    }
    if (!transactionId) {
      res.status(400).json({ success: false, message: "Transaction ID is required" });
      return;
    }

    let screenshotUrl: string | null = null;
    if (screenshot) {
      try {
        const matches = screenshot.match(/^data:image\/(png|jpg|jpeg|webp);base64,(.+)$/);
        if (matches) {
          const ext = matches[1];
          const data = Buffer.from(matches[2], "base64");
          const filename = `deposit_${userId}_${Date.now()}.${ext}`;
          fs.writeFileSync(path.join(UPLOADS_DIR, filename), data);
          screenshotUrl = `/uploads/${filename}`;
        }
      } catch {}
    }

    const [deposit] = await db.insert(depositsTable).values({
      userId,
      amount: amount.toFixed(2),
      method,
      transactionId,
      screenshotUrl,
      status: "pending",
    }).returning();

    res.json({ success: true, deposit: { id: deposit.id, amount: Number(deposit.amount), method, status: "pending" } });
  } catch (err) {
    req.log.error({ err }, "Deposit creation failed");
    res.status(500).json({ success: false, message: "Failed to create deposit request" });
  }
});

router.get("/deposit/history", authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const deposits = await db.select().from(depositsTable)
      .where(eq(depositsTable.userId, userId))
      .orderBy(desc(depositsTable.createdAt))
      .limit(50);

    res.json({
      success: true,
      deposits: deposits.map(d => ({
        id: d.id,
        amount: Number(d.amount),
        method: d.method,
        transactionId: d.transactionId,
        status: d.status,
        adminNote: d.adminNote,
        createdAt: d.createdAt,
      })),
    });
  } catch (err) {
    req.log.error({ err }, "Deposit history fetch failed");
    res.status(500).json({ success: false, message: "Failed to fetch deposit history" });
  }
});

router.get("/deposit/bonuses", authMiddleware, async (req: Request, res: Response) => {
  try {
    const settings = await db.select().from(siteSettingsTable);
    const settingsMap: Record<string, string> = {};
    for (const s of settings) settingsMap[s.key] = s.value;

    const bonuses = [];
    for (let i = 1; i <= 5; i++) {
      const min = settingsMap[`deposit_bonus_${i}_min`];
      const pct = settingsMap[`deposit_bonus_${i}_pct`];
      const max = settingsMap[`deposit_bonus_${i}_max`];
      if (min && pct) {
        bonuses.push({
          minDeposit: Number(min),
          percentage: Number(pct),
          maxBonus: max ? Number(max) : null,
        });
      }
    }

    res.json({ success: true, bonuses });
  } catch (err) {
    req.log.error({ err }, "Deposit bonuses fetch failed");
    res.status(500).json({ success: false, message: "Failed to fetch deposit bonuses" });
  }
});

router.get("/admin/deposits", authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
  try {
    const deposits = await db.select({
      id: depositsTable.id,
      userId: depositsTable.userId,
      amount: depositsTable.amount,
      method: depositsTable.method,
      transactionId: depositsTable.transactionId,
      screenshotUrl: depositsTable.screenshotUrl,
      status: depositsTable.status,
      adminNote: depositsTable.adminNote,
      createdAt: depositsTable.createdAt,
      userName: usersTable.displayName,
      userPhone: usersTable.phone,
    })
      .from(depositsTable)
      .leftJoin(usersTable, eq(depositsTable.userId, usersTable.id))
      .orderBy(desc(depositsTable.createdAt))
      .limit(100);

    res.json({ success: true, deposits });
  } catch (err) {
    req.log.error({ err }, "Admin deposits fetch failed");
    res.status(500).json({ success: false, message: "Failed to fetch deposits" });
  }
});

router.post("/admin/deposit/:id/approve", authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
  try {
    const depositId = parseInt(req.params.id);
    const { note } = req.body as { note?: string };

    const [deposit] = await db.select().from(depositsTable).where(eq(depositsTable.id, depositId)).limit(1);
    if (!deposit) {
      res.status(404).json({ success: false, message: "Deposit not found" });
      return;
    }
    if (deposit.status !== "pending") {
      res.status(400).json({ success: false, message: "Deposit already processed" });
      return;
    }

    const amount = Number(deposit.amount);

    const settings = await db.select().from(siteSettingsTable);
    const settingsMap: Record<string, string> = {};
    for (const s of settings) settingsMap[s.key] = s.value;

    let bonusAmount = 0;
    for (let i = 1; i <= 5; i++) {
      const min = Number(settingsMap[`deposit_bonus_${i}_min`] || 0);
      const pct = Number(settingsMap[`deposit_bonus_${i}_pct`] || 0);
      const max = Number(settingsMap[`deposit_bonus_${i}_max`] || 999999);
      if (min > 0 && pct > 0 && amount >= min) {
        const bonus = Math.min(amount * pct / 100, max);
        if (bonus > bonusAmount) bonusAmount = bonus;
      }
    }

    const totalCredit = amount + bonusAmount;

    await db.execute(sql`
      UPDATE users SET balance = balance + ${totalCredit}, updated_at = NOW()
      WHERE id = ${deposit.userId}
    `);

    await db.update(depositsTable)
      .set({ status: "approved", adminNote: note || `Approved. Bonus: ৳${bonusAmount.toFixed(0)}`, updatedAt: new Date() })
      .where(eq(depositsTable.id, depositId));

    res.json({ success: true, message: `Deposit approved. ৳${amount} + ৳${bonusAmount.toFixed(0)} bonus credited.` });
  } catch (err) {
    req.log.error({ err }, "Deposit approval failed");
    res.status(500).json({ success: false, message: "Failed to approve deposit" });
  }
});

router.post("/admin/deposit/:id/reject", authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
  try {
    const depositId = parseInt(req.params.id);
    const { note } = req.body as { note?: string };

    const [deposit] = await db.select().from(depositsTable).where(eq(depositsTable.id, depositId)).limit(1);
    if (!deposit) {
      res.status(404).json({ success: false, message: "Deposit not found" });
      return;
    }
    if (deposit.status !== "pending") {
      res.status(400).json({ success: false, message: "Deposit already processed" });
      return;
    }

    await db.update(depositsTable)
      .set({ status: "rejected", adminNote: note || "Rejected", updatedAt: new Date() })
      .where(eq(depositsTable.id, depositId));

    res.json({ success: true, message: "Deposit rejected" });
  } catch (err) {
    req.log.error({ err }, "Deposit rejection failed");
    res.status(500).json({ success: false, message: "Failed to reject deposit" });
  }
});

export default router;
