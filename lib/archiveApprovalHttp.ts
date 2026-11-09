export async function readApprovalBody(req: Request): Promise<Record<string, unknown> | null> {
  if (!req.headers.get("content-type")?.toLowerCase().startsWith("application/json")) return null;
  const reader = req.body?.getReader();
  if (!reader) return null;
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 4096) { await reader.cancel(); return null; }
      chunks.push(value);
    }
    const body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    return body && typeof body === "object" && !Array.isArray(body) ? body : null;
  } catch { return null; }
  finally { reader.releaseLock(); }
}
