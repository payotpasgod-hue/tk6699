import { Router, type Request, type Response, type NextFunction } from "express";
import { db } from "@workspace/db";
import { usersTable, sessionsTable } from "@workspace/db/schema";
import { eq, and, gt } from "drizzle-orm";
import bcrypt from "bcryptjs";
import crypto from "crypto";

const router = Router();

const registerAttempts = new Map<string, { count: number; resetAt: number }>();
const REGISTER_LIMIT = 5;
const REGISTER_WINDOW_MS = 60 * 60 * 1000;

function checkRegisterRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = registerAttempts.get(ip);
  if (!entry || now > entry.resetAt) {
    registerAttempts.set(ip, { count: 1, resetAt: now + REGISTER_WINDOW_MS });
    return true;
  }
  if (entry.count >= REGISTER_LIMIT) return false;
  entry.count++;
  return true;
}

function generateToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

function generateUserCode(phone: string): string {
  return `tk_${phone.replace(/\D/g, "").slice(-8)}_${Date.now().toString(36)}`;
}

export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) {
    res.status(401).json({ success: false, message: "Not authenticated" });
    return;
  }

  const sessions = await db
    .select()
    .from(sessionsTable)
    .where(and(eq(sessionsTable.token, token), gt(sessionsTable.expiresAt, new Date())))
    .limit(1);

  if (sessions.length === 0) {
    res.status(401).json({ success: false, message: "Session expired" });
    return;
  }

  const users = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, sessions[0].userId))
    .limit(1);

  if (users.length === 0 || !users[0].isActive) {
    res.status(401).json({ success: false, message: "User not found" });
    return;
  }

  (req as any).user = users[0];
  (req as any).session = sessions[0];
  next();
}

export async function adminMiddleware(req: Request, res: Response, next: NextFunction) {
  const user = (req as any).user;
  if (!user || user.role !== "admin") {
    res.status(403).json({ success: false, message: "Admin access required" });
    return;
  }
  next();
}

router.post("/auth/register", async (req: Request, res: Response) => {
  try {
    const clientIp = req.ip || req.socket.remoteAddress || "unknown";
    if (!checkRegisterRateLimit(clientIp)) {
      res.status(429).json({ success: false, message: "Too many registration attempts. Please try again later." });
      return;
    }

    const { phone, password, displayName } = req.body as {
      phone?: string;
      password?: string;
      displayName?: string;
    };

    if (!phone || !password) {
      res.status(400).json({ success: false, message: "Phone and password are required" });
      return;
    }

    const cleanPhone = phone.replace(/\D/g, "");
    if (cleanPhone.length < 10 || cleanPhone.length > 15) {
      res.status(400).json({ success: false, message: "Invalid phone number" });
      return;
    }

    if (password.length < 6) {
      res.status(400).json({ success: false, message: "Password must be at least 6 characters" });
      return;
    }

    const existing = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.phone, cleanPhone))
      .limit(1);

    if (existing.length > 0) {
      res.status(400).json({ success: false, message: "Phone number already registered" });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const userCode = generateUserCode(cleanPhone);
    const name = displayName || `Player_${cleanPhone.slice(-4)}`;

    const [newUser] = await db
      .insert(usersTable)
      .values({
        phone: cleanPhone,
        passwordHash,
        displayName: name,
        userCode,
        balance: "19",
        currency: "BDT",
        role: "player",
        isActive: true,
      })
      .returning();

    const token = generateToken();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    await db.insert(sessionsTable).values({
      token,
      userId: newUser.id,
      expiresAt,
    });

    res.json({
      success: true,
      token,
      user: {
        id: newUser.id,
        phone: newUser.phone,
        displayName: newUser.displayName,
        balance: Number(newUser.balance),
        currency: newUser.currency,
        role: newUser.role,
        userCode: newUser.userCode,
      },
    });
  } catch (err) {
    req.log.error({ err }, "Registration failed");
    res.status(500).json({ success: false, message: "Registration failed" });
  }
});

router.post("/auth/login", async (req: Request, res: Response) => {
  try {
    const { phone, password } = req.body as { phone?: string; password?: string };

    if (!phone || !password) {
      res.status(400).json({ success: false, message: "Phone and password are required" });
      return;
    }

    const cleanPhone = phone.replace(/\D/g, "");

    const users = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.phone, cleanPhone))
      .limit(1);

    if (users.length === 0) {
      res.status(401).json({ success: false, message: "Invalid phone or password" });
      return;
    }

    const user = users[0];
    if (!user.isActive) {
      res.status(401).json({ success: false, message: "Account is disabled" });
      return;
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      res.status(401).json({ success: false, message: "Invalid phone or password" });
      return;
    }

    const token = generateToken();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    await db.insert(sessionsTable).values({
      token,
      userId: user.id,
      expiresAt,
    });

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        phone: user.phone,
        displayName: user.displayName,
        balance: Number(user.balance),
        currency: user.currency,
        role: user.role,
        userCode: user.userCode,
      },
    });
  } catch (err) {
    req.log.error({ err }, "Login failed");
    res.status(500).json({ success: false, message: "Login failed" });
  }
});

router.post("/auth/google", async (req: Request, res: Response) => {
  try {
    const { credential } = req.body as { credential?: string };
    if (!credential) {
      res.status(400).json({ success: false, message: "Missing Google credential" });
      return;
    }

    let payload: { sub?: string; email?: string; name?: string; picture?: string; user_id?: string; iss?: string; firebase?: any };
    try {
      const parts = credential.split(".");
      if (parts.length !== 3) throw new Error("Invalid token format");
      const decoded = Buffer.from(parts[1], "base64url").toString("utf-8");
      payload = JSON.parse(decoded);
    } catch {
      res.status(400).json({ success: false, message: "Invalid Google token" });
      return;
    }

    let googleId = payload.sub;
    let name = payload.name || "Player";

    if (!googleId) {
      res.status(400).json({ success: false, message: "Invalid Google token payload" });
      return;
    }

    const isFirebaseToken = !!(payload.iss && payload.iss.includes("securetoken.google.com"));

    if (isFirebaseToken) {
      const verifyResp = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=AIzaSyBA4SPo_2TPU2R5R6LsbmL0xnVLQOGk_LA`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken: credential }),
      });
      if (!verifyResp.ok) {
        req.log.error({ status: verifyResp.status }, "Firebase verification failed");
        res.status(401).json({ success: false, message: "Firebase token verification failed" });
        return;
      }
      const verifyData = await verifyResp.json() as { users?: Array<{ localId?: string; displayName?: string; email?: string; providerUserInfo?: Array<{ providerId?: string; rawId?: string; displayName?: string }> }> };
      const fbUser = verifyData.users?.[0];
      if (!fbUser?.localId) {
        res.status(401).json({ success: false, message: "Firebase token invalid" });
        return;
      }
      const googleProvider = fbUser.providerUserInfo?.find(p => p.providerId === "google.com");
      googleId = googleProvider?.rawId || fbUser.localId;
      name = googleProvider?.displayName || fbUser.displayName || name;
    } else {
      const tokenInfoResp = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${credential}`);
      if (!tokenInfoResp.ok) {
        res.status(401).json({ success: false, message: "Google token verification failed" });
        return;
      }
      const tokenInfo = await tokenInfoResp.json() as { sub?: string };
      if (tokenInfo.sub !== googleId) {
        res.status(401).json({ success: false, message: "Token mismatch" });
        return;
      }
    }

    const existing = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.googleId, googleId))
      .limit(1);

    let user;
    if (existing.length > 0) {
      user = existing[0];
      if (!user.isActive) {
        res.status(401).json({ success: false, message: "Account is disabled" });
        return;
      }
    } else {
      const clientIp = req.ip || req.socket.remoteAddress || "unknown";
      if (!checkRegisterRateLimit(clientIp)) {
        res.status(429).json({ success: false, message: "Too many registration attempts. Please try again later." });
        return;
      }

      const phone = `g_${googleId.slice(-10)}`;
      const userCode = `tk_g_${googleId.slice(-8)}_${Date.now().toString(36)}`;
      const randomPass = crypto.randomBytes(32).toString("hex");
      const passwordHash = await bcrypt.hash(randomPass, 10);

      const [newUser] = await db
        .insert(usersTable)
        .values({
          phone,
          passwordHash,
          displayName: name,
          userCode,
          googleId,
          balance: "19",
          currency: "BDT",
          role: "player",
          isActive: true,
        })
        .returning();
      user = newUser;
    }

    const token = generateToken();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    await db.insert(sessionsTable).values({ token, userId: user.id, expiresAt });

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        phone: user.phone,
        displayName: user.displayName,
        balance: Number(user.balance),
        currency: user.currency,
        role: user.role,
        userCode: user.userCode,
      },
    });
  } catch (err) {
    req.log.error({ err }, "Google auth failed");
    res.status(500).json({ success: false, message: "Google authentication failed" });
  }
});

router.post("/auth/logout", authMiddleware, async (req: Request, res: Response) => {
  try {
    const session = (req as any).session;
    await db.delete(sessionsTable).where(eq(sessionsTable.id, session.id));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: "Logout failed" });
  }
});

router.get("/auth/me", authMiddleware, async (req: Request, res: Response) => {
  const user = (req as any).user;
  res.json({
    success: true,
    user: {
      id: user.id,
      phone: user.phone,
      displayName: user.displayName,
      balance: Number(user.balance),
      currency: user.currency,
      role: user.role,
      userCode: user.userCode,
    },
  });
});

export default router;
