import { Router, type Request, type Response } from "express";
import { db, pool } from "@workspace/db";
import { usersTable, bonusClaimsTable } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import { authMiddleware } from "./auth";

const router = Router();

const GIFT_BOX_AMOUNTS = [5, 10, 15, 20, 25, 50, 75, 100, 200, 500];
const GIFT_BOX_WEIGHTS = [30, 25, 15, 10, 8, 5, 3, 2, 1.5, 0.5];
const SPIN_PRIZES = [10, 25, 50, 100, 200, 500, 20, 75];

function weightedRandom(amounts: number[], weights: number[]): number {
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  let random = Math.random() * totalWeight;
  for (let i = 0; i < weights.length; i++) {
    random -= weights[i];
    if (random <= 0) return amounts[i];
  }
  return amounts[0];
}

router.post("/bonus/claim", authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { bonusType, bonusKey } = req.body as { bonusType?: string; bonusKey?: string };

    if (!bonusType || !bonusKey) {
      res.status(400).json({ success: false, message: "Missing bonusType or bonusKey" });
      return;
    }

    const validTypes = ["gift_box", "spin", "daily", "hourly"];
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

      if (bonusType === "gift_box") {
        const boxId = parseInt(bonusKey.replace("box_", ""));
        if (isNaN(boxId) || boxId < 0 || boxId > 8) {
          await client.query("ROLLBACK");
          res.status(400).json({ success: false, message: "Invalid gift box" });
          return;
        }
        amount = weightedRandom(GIFT_BOX_AMOUNTS, GIFT_BOX_WEIGHTS);
      } else if (bonusType === "spin") {
        const idx = Math.floor(Math.random() * SPIN_PRIZES.length);
        amount = SPIN_PRIZES[idx];
      } else if (bonusType === "daily") {
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
