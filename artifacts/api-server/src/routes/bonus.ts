import { Router, type Request, type Response } from "express";
import { db, pool } from "@workspace/db";
import { usersTable, bonusClaimsTable, depositsTable } from "@workspace/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { authMiddleware } from "./auth";
import { getSetting } from "./settings";

const router = Router();

const SPIN_PRIZES = [10, 25, 50, 100, 200, 500, 20, 75];

router.post("/bonus/claim", authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { bonusType, bonusKey } = req.body as { bonusType?: string; bonusKey?: string };

    if (!bonusType || !bonusKey) {
      res.status(400).json({ success: false, message: "Missing bonusType or bonusKey" });
      return;
    }

    const validTypes = ["spin", "daily", "hourly", "red_pocket"];
    if (!validTypes.includes(bonusType)) {
      res.status(400).json({ success: false, message: "Invalid bonus type" });
      return;
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query("SELECT pg_advisory_xact_lock($1)", [userId]);

      const existing = await client.query(
        "SELECT id FROM bonus_claims WHERE user_id = $1 AND bonus_type = $2 AND bonus_key = $3 LIMIT 1",
        [userId, bonusType, bonusKey]
      );
      if (existing.rows.length > 0) {
        await client.query("ROLLBACK");
        res.status(400).json({ success: false, message: "Already claimed" });
        return;
      }

      let amount = 0;

      if (bonusType === "spin") {
        const cooldownHours = parseInt(await getSetting("spin_cooldown_hours")) || 24;
        const lastSpin = await client.query(
          "SELECT created_at FROM bonus_claims WHERE user_id = $1 AND bonus_type = 'spin' ORDER BY created_at DESC LIMIT 1",
          [userId]
        );
        if (lastSpin.rows.length > 0) {
          const lastTime = new Date(lastSpin.rows[0].created_at).getTime();
          if (Date.now() - lastTime < cooldownHours * 60 * 60 * 1000) {
            await client.query("ROLLBACK");
            res.status(400).json({ success: false, message: `Lucky spin resets every ${cooldownHours} hours. Try again later.` });
            return;
          }
        }
        const idx = Math.floor(Math.random() * SPIN_PRIZES.length);
        amount = SPIN_PRIZES[idx];
      } else if (bonusType === "daily") {
        const requiresDeposit = (await getSetting("daily_reward_requires_deposit")) === "true";

        if (requiresDeposit) {
          const dayMatch = bonusKey.match(/day_(\d+)/);
          if (!dayMatch) {
            await client.query("ROLLBACK");
            res.status(400).json({ success: false, message: "Invalid daily reward key" });
            return;
          }

          const todayStart = new Date();
          todayStart.setHours(0, 0, 0, 0);

          const todayDeposit = await client.query(
            "SELECT id FROM deposits WHERE user_id = $1 AND status = 'approved' AND created_at >= $2 LIMIT 1",
            [userId, todayStart.toISOString()]
          );

          if (todayDeposit.rows.length === 0) {
            await client.query("ROLLBACK");
            res.status(400).json({ success: false, message: "You must make a deposit today to claim daily reward" });
            return;
          }
        }

        const dayAmounts: Record<string, number> = {
          day_1: 10, day_2: 20, day_3: 30, day_4: 50, day_5: 75, day_6: 100, day_7: 500,
        };
        amount = dayAmounts[bonusKey] || 0;
        if (amount === 0) {
          await client.query("ROLLBACK");
          res.status(400).json({ success: false, message: "Invalid daily reward" });
          return;
        }
      } else if (bonusType === "hourly") {
        const lastHourly = await client.query(
          "SELECT created_at FROM bonus_claims WHERE user_id = $1 AND bonus_type = 'hourly' ORDER BY created_at DESC LIMIT 1",
          [userId]
        );
        if (lastHourly.rows.length > 0) {
          const lastTime = new Date(lastHourly.rows[0].created_at).getTime();
          if (Date.now() - lastTime < 60 * 60 * 1000) {
            await client.query("ROLLBACK");
            res.status(400).json({ success: false, message: "Hourly bonus already claimed. Try again later." });
            return;
          }
        }
        amount = Math.floor(Math.random() * 96) + 5;
      } else if (bonusType === "red_pocket") {
        const minAmount = parseInt(await getSetting("red_pocket_min")) || 5;
        const maxAmount = parseInt(await getSetting("red_pocket_max")) || 50;
        const intervalMin = parseInt(await getSetting("red_pocket_interval_minutes")) || 30;

        const lastRedPocket = await client.query(
          "SELECT created_at FROM bonus_claims WHERE user_id = $1 AND bonus_type = 'red_pocket' ORDER BY created_at DESC LIMIT 1",
          [userId]
        );
        if (lastRedPocket.rows.length > 0) {
          const lastTime = new Date(lastRedPocket.rows[0].created_at).getTime();
          if (Date.now() - lastTime < intervalMin * 60 * 1000) {
            await client.query("ROLLBACK");
            res.status(400).json({ success: false, message: `Red pocket available every ${intervalMin} minutes` });
            return;
          }
        }
        amount = Math.floor(Math.random() * (maxAmount - minAmount + 1)) + minAmount;
      }

      const balResult = await client.query(
        "UPDATE users SET balance = balance + $1, updated_at = NOW() WHERE id = $2 RETURNING balance AS new_balance",
        [amount, userId]
      );
      const newBalance = Number(balResult.rows[0].new_balance);

      await client.query(
        "INSERT INTO bonus_claims (user_id, bonus_type, bonus_key, amount) VALUES ($1, $2, $3, $4)",
        [userId, bonusType, bonusKey, amount.toString()]
      );

      await client.query("COMMIT");

      res.json({
        success: true,
        amount,
        newBalance,
        message: `৳${amount} bonus credited!`,
      });
    } catch (txErr) {
      await client.query("ROLLBACK");
      throw txErr;
    } finally {
      client.release();
    }
  } catch (err) {
    req.log.error({ err }, "Bonus claim error");
    res.status(500).json({ success: false, message: "Internal error" });
  }
});

router.get("/bonus/claims", authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const claims = await db.select().from(bonusClaimsTable).where(eq(bonusClaimsTable.userId, userId));
    res.json({
      success: true,
      claims: claims.map((c) => ({
        bonusType: c.bonusType,
        bonusKey: c.bonusKey,
        amount: c.amount,
        claimedAt: c.createdAt,
      })),
    });
  } catch (err) {
    req.log.error({ err }, "Bonus claims fetch error");
    res.status(500).json({ success: false, message: "Internal error" });
  }
});

export default router;
