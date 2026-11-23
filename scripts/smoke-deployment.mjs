import { setTimeout } from "node:timers/promises";

const base = new URL(process.argv[2] ?? "http://127.0.0.1:3000");
const local = ["localhost", "127.0.0.1", "[::1]"].includes(base.hostname);
const preview = base.protocol === "https:" && base.hostname.endsWith(".vercel.app");
if ((!local && !preview) || !["http:", "https:"].includes(base.protocol) ||
    base.username || base.password || base.pathname !== "/" || base.search || base.hash) {
  throw new Error("Use a loopback address or a Vercel Preview origin");
}
const bypass = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
const headers = { Accept: "application/json" };
if (preview && bypass) headers["x-vercel-protection-bypass"] = bypass;

let failure = "No response received";
const deadline = Date.now() + 60_000;
do {
  try {
    const login = await fetch(new URL("/login", base), {
      headers, redirect: "manual", signal: AbortSignal.timeout(5_000),
    });
    if (login.status !== 200) {
      await login.body?.cancel();
      throw new Error(`/login returned ${login.status}`);
    }
    if (!(await login.text()).includes("Sign in to Dashboard")) {
      throw new Error("/login did not render the InsightBoard sign-in form");
    }

    const session = await fetch(new URL("/api/auth/me", base), {
      headers, redirect: "manual", signal: AbortSignal.timeout(5_000),
    });
    const contentType = session.headers.get("content-type");
    await session.body?.cancel();
    if (session.status !== 401 || !contentType?.includes("application/json")) {
      throw new Error(`/api/auth/me expected a JSON 401, received ${session.status}`);
    }
    console.log("Smoke passed: login UI renders and an unauthenticated session request returns JSON 401.");
    process.exitCode = 0;
    break;
  } catch (error) {
    failure = error.message;
    if (Date.now() >= deadline) {
      console.error(`Smoke failed: ${failure}`);
      process.exitCode = 1;
      break;
    }
    await setTimeout(2_000);
  }
} while (true);
