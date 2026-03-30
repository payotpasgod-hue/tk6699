import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const bonusClaimsTable = pgTable("bonus_claims", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  bonusType: text("bonus_type").notNull(),
  bonusKey: text("bonus_key").notNull(),
  amount: text("amount").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type BonusClaim = typeof bonusClaimsTable.$inferSelect;
