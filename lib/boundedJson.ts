export const CRM_JSON_MAX_BYTES = 16 * 1024;

type JsonResult =
  | { ok: true; value: Record<string, unknown> }
  | { ok: false; status: 400 | 413 | 415 };

export async function readBoundedJsonObject(req: Request, maxBytes: number, options: { allowEmpty?: boolean } = {}): Promise<JsonResult> {
  const mediaType = req.headers.get("content-type")?.split(";", 1)[0].trim().toLowerCase();
  if (mediaType !== "application/json") return { ok: false, status: 415 };

  const length = req.headers.get("content-length");
  if (length !== null && /^\d+$/.test(length) && Number(length) > maxBytes) {
    return { ok: false, status: 413 };
  }

  const reader = req.body?.getReader();
  if (!reader) return options.allowEmpty ? { ok: true, value: {} } : { ok: false, status: 400 };

  const decoder = new TextDecoder("utf-8", { fatal: true });
  let size = 0;
  let text = "";
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) {
        void reader.cancel().catch(() => {});
        return { ok: false, status: 413 };
      }
      text += decoder.decode(value, { stream: true });
    }

    text += decoder.decode();
    if (options.allowEmpty && text.length === 0) return { ok: true, value: {} };
    const value: unknown = JSON.parse(text);
    if (value && typeof value === "object" && !Array.isArray(value)) {
      return { ok: true, value: value as Record<string, unknown> };
    }
    return { ok: false, status: 400 };
  } catch {
    void reader.cancel().catch(() => {});
    return { ok: false, status: 400 };
  } finally {
    reader.releaseLock();
  }
}
