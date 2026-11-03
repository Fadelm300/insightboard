import { createHash } from "node:crypto";
import { NextRequest } from "next/server";

import LoginAttempt from "@/models/LoginAttempt";

const WINDOW_MS = 15 * 60 * 1000;

export async function allowLoginAttempt(req: NextRequest, email: string) {
  const bucket = Math.floor(Date.now() / WINDOW_MS);
  // Proxy IP headers are trusted only on Vercel. Other hosts share a safe limit.
  const address = process.env.VERCEL === "1"
    ? req.headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim() || "unknown"
    : "local-or-untrusted-proxy";

  const limits: [string, number][] = [[`email:${email}`, 10], [`ip:${address}`, 30]];

  for (const [identity, maximum] of limits) {
    const key = createHash("sha256").update(`${bucket}:${identity}`).digest("hex");
    const update = {
      $inc: { attempts: 1 },
      $setOnInsert: { expiresAt: new Date((bucket + 2) * WINDOW_MS) },
    };
    let record;

    try {
      record = await LoginAttempt.findOneAndUpdate({ _id: key }, update, {
        upsert: true,
        returnDocument: "after",
      }).lean();
    } catch (error) {
      if (!(typeof error === "object" && error !== null && "code" in error && error.code === 11000)) {
        throw error;
      }

      record = await LoginAttempt.findOneAndUpdate({ _id: key }, { $inc: { attempts: 1 } }, { returnDocument: "after" }).lean();
    }

    if (!record || (record as unknown as { attempts: number }).attempts > maximum) {
      return false;
    }
  }

  return true;
}
