import { Router, type Request, type Response } from "express";
import { db } from "@workspace/db";
import { siteSettingsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { authMiddleware, adminMiddleware } from "./auth";

const router = Router();

const DEFAULT_SETTINGS: Record<string, string> = {
  registration_bonus: "98",
  spin_cooldown_hours: "24",
  daily_reward_requires_deposit: "true",
  bkash_number: "",
  nagad_number: "",
  bkash_name: "bKash",
  nagad_name: "Nagad",
  min_deposit: "100",
  max_deposit: "50000",
  min_withdraw: "500",
  max_withdraw: "25000",
  deposit_bonus_1_min: "500",
  deposit_bonus_1_pct: "10",
  deposit_bonus_1_max: "200",
  deposit_bonus_2_min: "1000",
  deposit_bonus_2_pct: "15",
  deposit_bonus_2_max: "500",
  deposit_bonus_3_min: "5000",
  deposit_bonus_3_pct: "20",
  deposit_bonus_3_max: "2000",
  red_pocket_min: "5",
  red_pocket_max: "50",
  red_pocket_interval_minutes: "30",
};

export async function getSetting(key: string): Promise<string> {
  const rows = await db.select().from(siteSettingsTable).where(eq(siteSettingsTable.key, key)).limit(1);
  if (rows.length > 0) return rows[0].value;
  return DEFAULT_SETTINGS[key] || "";
}

export async function getAllSettings(): Promise<Record<string, string>> {
  const rows = await db.select().from(siteSettingsTable);
  const result: Record<string, string> = { ...DEFAULT_SETTINGS };
  for (const row of rows) {
    result[row.key] = row.value;
  }
  return result;
}

router.get("/settings/public", async (_req: Request, res: Response) => {
  try {
    const settings = await getAllSettings();
    res.json({
      success: true,
      settings: {
        bkash_number: settings.bkash_number,
        nagad_number: settings.nagad_number,
        min_deposit: settings.min_deposit,
        max_deposit: settings.max_deposit,
        min_withdraw: settings.min_withdraw,
        max_withdraw: settings.max_withdraw,
        red_pocket_min: settings.red_pocket_min,
        red_pocket_max: settings.red_pocket_max,
        red_pocket_interval_minutes: settings.red_pocket_interval_minutes,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to load settings" });
  }
});

router.get("/admin/settings", authMiddleware, adminMiddleware, async (_req: Request, res: Response) => {
  try {
    const settings = await getAllSettings();
    res.json({ success: true, settings });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to load settings" });
  }
});

router.post("/admin/settings", authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
  try {
    const { settings } = req.body as { settings?: Record<string, string> };
    if (!settings || typeof settings !== "object") {
      res.status(400).json({ success: false, message: "Invalid settings" });
      return;
    }

    for (const [key, value] of Object.entries(settings)) {
      const existing = await db.select().from(siteSettingsTable).where(eq(siteSettingsTable.key, key)).limit(1);
      if (existing.length > 0) {
        await db.update(siteSettingsTable).set({ value, updatedAt: new Date() }).where(eq(siteSettingsTable.key, key));
      } else {
        await db.insert(siteSettingsTable).values({ key, value });
      }
    }

    res.json({ success: true, message: "Settings saved" });
  } catch (err) {
    req.log.error({ err }, "Settings save failed");
    res.status(500).json({ success: false, message: "Failed to save settings" });
  }
});

export default router;
