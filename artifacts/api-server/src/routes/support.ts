import { Router, type Request, type Response } from "express";
import { db } from "@workspace/db";
import { supportMessagesTable, usersTable } from "@workspace/db/schema";
import { eq, desc, asc, and, sql } from "drizzle-orm";
import { authMiddleware, adminMiddleware } from "./auth";

const router = Router();

router.post("/support/send", authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId as number;
    const { message } = req.body as { message?: string };

    if (!message || !message.trim()) {
      res.status(400).json({ success: false, message: "Message is required" });
      return;
    }

    const [msg] = await db.insert(supportMessagesTable).values({
      userId,
      sender: "user",
      message: message.trim(),
    }).returning();

    res.json({ success: true, message: msg });
  } catch (err) {
    req.log.error({ err }, "Support send error");
    res.status(500).json({ success: false, message: "Internal error" });
  }
});

router.get("/support/messages", authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId as number;
    const after = req.query.after ? Number(req.query.after) : 0;

    const messages = await db
      .select()
      .from(supportMessagesTable)
      .where(
        after > 0
          ? and(eq(supportMessagesTable.userId, userId), sql`${supportMessagesTable.id} > ${after}`)
          : eq(supportMessagesTable.userId, userId)
      )
      .orderBy(asc(supportMessagesTable.createdAt))
      .limit(100);

    res.json({ success: true, messages });
  } catch (err) {
    req.log.error({ err }, "Support messages error");
    res.status(500).json({ success: false, message: "Internal error" });
  }
});

router.get("/admin/support/conversations", authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
  try {
    const conversations = await db.execute(sql`
      SELECT
        u.id AS user_id,
        u.display_name,
        u.phone,
        COUNT(sm.id)::int AS total_messages,
        COUNT(CASE WHEN sm.is_read = false AND sm.sender = 'user' THEN 1 END)::int AS unread_count,
        MAX(sm.created_at) AS last_message_at,
        (SELECT message FROM support_messages WHERE user_id = u.id ORDER BY created_at DESC LIMIT 1) AS last_message
      FROM support_messages sm
      JOIN users u ON u.id = sm.user_id
      GROUP BY u.id, u.display_name, u.phone
      ORDER BY MAX(sm.created_at) DESC
    `);

    res.json({ success: true, conversations: conversations.rows });
  } catch (err) {
    req.log.error({ err }, "Admin support conversations error");
    res.status(500).json({ success: false, message: "Internal error" });
  }
});

router.get("/admin/support/messages/:userId", authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = Number(req.params.userId);
    const messages = await db
      .select()
      .from(supportMessagesTable)
      .where(eq(supportMessagesTable.userId, userId))
      .orderBy(asc(supportMessagesTable.createdAt))
      .limit(200);

    await db
      .update(supportMessagesTable)
      .set({ isRead: true })
      .where(and(eq(supportMessagesTable.userId, userId), eq(supportMessagesTable.sender, "user")));

    res.json({ success: true, messages });
  } catch (err) {
    req.log.error({ err }, "Admin support messages error");
    res.status(500).json({ success: false, message: "Internal error" });
  }
});

router.post("/admin/support/reply", authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
  try {
    const { userId, message } = req.body as { userId?: number; message?: string };

    if (!userId || !message || !message.trim()) {
      res.status(400).json({ success: false, message: "userId and message are required" });
      return;
    }

    const [msg] = await db.insert(supportMessagesTable).values({
      userId,
      sender: "admin",
      message: message.trim(),
      isRead: false,
    }).returning();

    res.json({ success: true, message: msg });
  } catch (err) {
    req.log.error({ err }, "Admin support reply error");
    res.status(500).json({ success: false, message: "Internal error" });
  }
});

export default router;
