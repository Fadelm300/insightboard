"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, Box, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, Typography } from "@mui/material";

import { AUTH_CHANGED_EVENT, logout, notifyAuthChanged } from "@/lib/apiClient";

type SessionView = { expiresAt: string; absoluteExpiresAt: string; serverNow: string; warningSeconds: number };
type Snapshot = { expires: number; absolute: number; offset: number; warning: number };

const RETRY_DELAYS_MS = [2_000, 4_000, 8_000];

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const leaving = useRef(false);
  const [userId, setUserId] = useState("");
  const [checking, setChecking] = useState(true);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [absoluteWarning, setAbsoluteWarning] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    let snapshot: Snapshot | null = null;
    let lastActivity = 0;
    let lastRenew = 0;
    let lastCheck = 0;
    let inFlight = false;
    let continueRequested = false;
    let channel: BroadcastChannel | undefined;
    const statusRetry = { failures: 0, nextAttempt: 0 };
    const renewRetry = { failures: 0, nextAttempt: 0 };

    function leave(reason: "expired" | "logout" = "expired") {
      // Several requests and tabs can report the same end concurrently.
      if (!active || leaving.current) return false;
      leaving.current = true;
      snapshot = null;
      setChecking(true);
      router.replace(reason === "expired" ? "/login?reason=session-expired" : "/login");
      return true;
    }

    function update(view: SessionView) {
      const expires = Date.parse(view.expiresAt);
      const absolute = Date.parse(view.absoluteExpiresAt);
      const serverNow = Date.parse(view.serverNow);
      if (![expires, absolute, serverNow].every(Number.isFinite)) throw new Error("Invalid session response");
      snapshot = { expires, absolute, offset: serverNow - Date.now(), warning: view.warningSeconds * 1000 };
      setRemaining(Math.max(0, Math.ceil((Math.min(expires, absolute) - serverNow) / 1000)));
      setAbsoluteWarning(absolute - serverNow <= snapshot.warning);
      setChecking(false);
      setError("");
    }

    async function request(mode?: "activity" | "continue", manual = false) {
      if (!active || leaving.current) return;
      const retry = mode ? renewRetry : statusRetry;
      if (!manual && (retry.failures > RETRY_DELAYS_MS.length || Date.now() < retry.nextAttempt)) return;
      if (inFlight) {
        if (mode === "continue") continueRequested = true;
        return;
      }
      inFlight = true;
      if (mode === "continue") setBusy(true);

      try {
        const response = await fetch(mode ? "/api/auth/renew" : "/api/auth/me", {
          method: mode ? "POST" : "GET",
          credentials: "same-origin",
          cache: "no-store",
          headers: mode ? { "Content-Type": "application/json", "X-InsightBoard-Request": "1" } : {},
          body: mode ? JSON.stringify({ mode }) : undefined,
        });

        if (!active || leaving.current) return;
        if (response.status === 401) {
          if (leave("expired")) notifyAuthChanged("expired");
          return;
        }
        if (!response.ok) throw new Error("تعذر التأكد من الجلسة. حاول مرة ثانية.");
        const data = await response.json();
        if (!active || leaving.current) return;
        if (typeof data.data.user.id !== "string") throw new Error("Invalid user response");
        setUserId(data.data.user.id);
        update(data.data.session);
        retry.failures = 0;
        retry.nextAttempt = 0;

        if (mode) {
          lastRenew = Date.now();
          lastActivity = 0;
          channel?.postMessage("changed");
        }
      } catch {
        if (active && !leaving.current) {
          retry.failures = Math.min(retry.failures + 1, RETRY_DELAYS_MS.length + 1);
          retry.nextAttempt = Date.now() + (RETRY_DELAYS_MS[retry.failures - 1] ?? 0);
          setError("تعذر الاتصال للتحقق من الجلسة. حاول مرة ثانية.");
          if (!snapshot || snapshot.expires <= Date.now() + snapshot.offset) setChecking(true);
        }
      } finally {
        inFlight = false;
        if (active) setBusy(false);
        if (continueRequested && active && !leaving.current) {
          continueRequested = false;
          void request("continue", true);
        }
      }
    }

    function recordActivity(event: Event) {
      // Background polling and mouse movement do not count as user activity.
      if (event.isTrusted && document.visibilityState === "visible") lastActivity = Date.now();
    }

    function authChanged(event: Event) {
      const type = (event as CustomEvent<string>).detail;
      if (type === "logout" || type === "expired") leave(type);
      else if (type === "error") setError("تعذر تسجيل الخروج. حاول مرة ثانية.");
      else void request();
    }

    function visibilityChanged() {
      if (document.visibilityState === "visible") void request();
    }

    function pageRestored(event: PageTransitionEvent) {
      if (event.persisted) { setChecking(true); void request(); }
    }

    function continueSession() { void request("continue", true); }
    function retrySession() { void request(undefined, true); }

    if (typeof BroadcastChannel !== "undefined") {
      channel = new BroadcastChannel("insightboard-session");
      channel.onmessage = (event) => {
        if (event.data === "logout" || event.data === "expired") leave(event.data);
        else if (event.data === "changed") void request();
      };
    }

    const activityEvents = ["pointerdown", "keydown", "wheel"];
    for (const type of activityEvents) window.addEventListener(type, recordActivity, { passive: true });
    window.addEventListener(AUTH_CHANGED_EVENT, authChanged);
    window.addEventListener("pageshow", pageRestored);
    window.addEventListener("insightboard-session-continue", continueSession);
    window.addEventListener("insightboard-session-retry", retrySession);
    document.addEventListener("visibilitychange", visibilityChanged);
    void request();

    const timer = window.setInterval(() => {
      if (!snapshot || leaving.current) return;
      const now = Date.now() + snapshot.offset;
      const millis = Math.min(snapshot.expires, snapshot.absolute) - now;
      setRemaining(Math.max(0, Math.ceil(millis / 1000)));
      setAbsoluteWarning(snapshot.absolute - now <= snapshot.warning);

      if (millis <= 0) {
        setChecking(true);
        if (Date.now() - lastCheck > 3000) { lastCheck = Date.now(); void request(); }
      } else if (millis > snapshot.warning && lastActivity > lastRenew && Date.now() - lastActivity < 5000 && Date.now() - lastRenew > 10_000) {
        void request("activity");
      }
    }, 1000);

    return () => {
      active = false;
      window.clearInterval(timer);
      channel?.close();
      for (const type of activityEvents) window.removeEventListener(type, recordActivity);
      window.removeEventListener(AUTH_CHANGED_EVENT, authChanged);
      window.removeEventListener("pageshow", pageRestored);
      window.removeEventListener("insightboard-session-continue", continueSession);
      window.removeEventListener("insightboard-session-retry", retrySession);
      document.removeEventListener("visibilitychange", visibilityChanged);
    };
  }, [router]);

  async function signOut() {
    setBusy(true);
    try {
      await logout();
    } catch {
      setError("تعذر تسجيل الخروج. حاول مرة ثانية.");
    } finally { setBusy(false); }
  }

  if (checking) {
    return <Box sx={{ minHeight: "100vh", display: "grid", placeContent: "center", gap: 2 }}>
      {error ? <><Alert severity="error">{error}</Alert><Button onClick={() => window.dispatchEvent(new Event("insightboard-session-retry"))}>إعادة المحاولة</Button></> : <CircularProgress />}
    </Box>;
  }

  return <>
    {error && <Alert severity="error" sx={{ position: "fixed", top: 80, right: 16, zIndex: 1600 }}>{error}</Alert>}
    <Fragment key={userId}>{children}</Fragment>
    <Dialog open={remaining !== null && remaining <= 30} aria-labelledby="session-warning-title" dir="rtl">
      <DialogTitle id="session-warning-title">{absoluteWarning ? "قرب انتهاء الحد الأقصى للجلسة" : "جلستك قربت تنتهي"}</DialogTitle>
      <DialogContent>
        <Typography aria-live="polite">{absoluteWarning ? "يلزم تسجيل الدخول مجددًا بعد مرور 8 ساعات." : "اضغط استمرار إذا تبي تكمل الشغل."} تسجيل الخروج خلال {remaining} ثانية.</Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={signOut} disabled={busy}>تسجيل الخروج</Button>
        {!absoluteWarning && <Button autoFocus variant="contained" disabled={busy} onClick={() => window.dispatchEvent(new Event("insightboard-session-continue"))}>استمرار الجلسة</Button>}
      </DialogActions>
    </Dialog>
  </>;
}
