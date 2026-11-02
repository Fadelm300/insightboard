"use client";

export function getPreference(name: string) {
  if (typeof document === "undefined") return null;
  const value = document.cookie.split("; ").find((entry) => entry.startsWith(`${name}=`));
  try { return value ? decodeURIComponent(value.slice(name.length + 1)) : null; }
  catch { return null; }
}

export function setPreference(name: string, value: string) {
  document.cookie = `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=31536000; SameSite=Lax${location.protocol === "https:" ? "; Secure" : ""}`;
}

export function removePreference(name: string) {
  document.cookie = `${name}=; Path=/; Max-Age=0; SameSite=Lax${location.protocol === "https:" ? "; Secure" : ""}`;
}
