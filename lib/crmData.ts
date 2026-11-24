import { hasPermission, type PermissionSubject } from "@/lib/permissions";

type Row = Record<string, unknown>;
type DocumentLike = { toObject(): Row };

function record(value: unknown): Row {
  if (!value || typeof value !== "object") return {};
  const document = value as Partial<DocumentLike>;
  return typeof document.toObject === "function" ? document.toObject() : value as Row;
}

function pick(value: unknown, fields: readonly string[]): Row {
  const source = record(value);
  const result: Row = {};
  for (const key of fields) {
    if (Object.hasOwn(source, key)) result[key] = source[key];
  }
  return result;
}

const TIMESTAMPS = ["createdAt", "updatedAt"];
const CLIENT_FIELDS = ["_id", "companyName", "businessType", "contactPerson", "phone", "email", "location", "website", "description", "notes", "status", ...TIMESTAMPS];
const DEAL_FIELDS = ["_id", "title", "estimatedBudget", "finalPrice", "status", "probability", "expectedCloseDate", "description", "notes", ...TIMESTAMPS];
const PROJECT_FIELDS = ["_id", "name", "type", "deadline", "status", "description", "notes", ...TIMESTAMPS];
export const PROJECT_FINANCIAL_FIELDS = ["price", "agreedExtras", "cost", "profit", "paymentStatus"] as const;

export function canReadProjectFinancials(actor: PermissionSubject) {
  return hasPermission(actor, "finance.read") || hasPermission(actor, "projects.financial.read");
}

export function canManageProjectFinancials(actor: PermissionSubject) {
  return hasPermission(actor, "projects.financial.manage");
}

export function clientLabelDTO(value: unknown, actor: PermissionSubject): unknown {
  if (value === null || value === undefined || typeof value === "string") return value;
  if (!Object.hasOwn(record(value), "_id")) {
    return typeof (value as { toHexString?: unknown }).toHexString === "function" ? String(value) : null;
  }
  return pick(value, hasPermission(actor, "clients.read")
    ? ["_id", "companyName", "contactPerson", "email", "status"]
    : ["_id", "companyName"]);
}

function dealLabelDTO(value: unknown, actor: PermissionSubject): unknown {
  if (value === null || value === undefined || typeof value === "string") return value;
  if (!Object.hasOwn(record(value), "_id")) {
    return typeof (value as { toHexString?: unknown }).toHexString === "function" ? String(value) : null;
  }
  return pick(value, hasPermission(actor, "deals.read")
    ? ["_id", "title", "status", "finalPrice", "estimatedBudget"]
    : ["_id", "title", "status"]);
}

function projectLabelDTO(value: unknown, actor: PermissionSubject, includeClient = false): unknown {
  if (value === null || value === undefined || typeof value === "string") return value;
  if (!Object.hasOwn(record(value), "_id")) {
    return typeof (value as { toHexString?: unknown }).toHexString === "function" ? String(value) : null;
  }
  const label = pick(value, ["_id", "name",
    ...(hasPermission(actor, "projects.read") ? ["type", "status"] : []),
    ...(canReadProjectFinancials(actor) ? PROJECT_FINANCIAL_FIELDS : []),
  ]);

  if (includeClient) {
    const client = record(value).clientId;
    label.clientId = client === null || client === undefined || typeof client === "string"
      ? client
      : pick(client, ["_id", "companyName"]);
  }

  return label;
}

export function clientDTO(value: unknown) {
  return pick(value, CLIENT_FIELDS);
}

export function dealDTO(value: unknown, actor: PermissionSubject) {
  const source = record(value);
  return { ...pick(source, DEAL_FIELDS), clientId: clientLabelDTO(source.clientId, actor) };
}

export function projectDTO(value: unknown, actor: PermissionSubject) {
  const source = record(value);
  return {
    ...pick(source, [...PROJECT_FIELDS, ...(canReadProjectFinancials(actor) ? PROJECT_FINANCIAL_FIELDS : [])]),
    clientId: clientLabelDTO(source.clientId, actor),
    dealId: dealLabelDTO(source.dealId, actor),
  };
}

export function revenueDTO(value: unknown, actor: PermissionSubject) {
  const source = record(value);
  return {
    ...pick(source, ["_id", "amount", "paymentDate", "paymentMethod", "description", "notes", ...TIMESTAMPS]),
    projectId: projectLabelDTO(source.projectId, actor),
    clientId: clientLabelDTO(source.clientId, actor),
  };
}

export function expenseDTO(value: unknown, actor: PermissionSubject) {
  const source = record(value);
  return {
    ...pick(source, ["_id", "title", "amount", "category", "date", "description", "notes", ...TIMESTAMPS]),
    projectId: projectLabelDTO(source.projectId, actor, true),
  };
}

const PROJECT_INPUT_FIELDS = ["clientId", "dealId", "name", "type", "deadline", "status", "description", "notes", "price", "agreedExtras", "cost", "paymentStatus"];
const MONEY_PATTERN = /^\d+(\.\d{1,2})?$/;
export function parseCrmMoney(value: unknown): number | null {
  if (typeof value !== "string" && typeof value !== "number") return null;
  const text = String(value).trim();
  if (!MONEY_PATTERN.test(text)) return null;

  const amount = Number(text);
  if (!Number.isFinite(amount) || amount > Number.MAX_SAFE_INTEGER / 100) return null;

  // Reject decimal strings whose cents change when converted to a Number.
  const [whole, fraction = ""] = text.split(".");
  const normalized = whole.replace(/^0+(?=\d)/, "") + "." + fraction.padEnd(2, "0");
  const [storedWhole, storedFraction = ""] = String(amount).split(".");
  const storedDecimal = storedWhole + "." + storedFraction.padEnd(2, "0");
  return amount.toFixed(2) === normalized && storedDecimal === normalized ? amount : null;
}

const PAYMENT_STATUSES = ["Unpaid", "Partially Paid", "Paid"];
type FinancialData = { price: number | null; agreedExtras?: number; cost: number | null; profit: number | null; paymentStatus: string };
type InputResult = { data: FinancialData; error?: never; status?: never } | { error: string; status: number; data?: never };

/** Check the write boundary before inspecting hidden fields or validating CRM relationships. */
export function projectFinancialInput(actor: PermissionSubject, body: unknown, current?: unknown): InputResult {
  if (!body || typeof body !== "object" || Array.isArray(body)) return { error: "Invalid request body", status: 400 };
  const input = body as Row;
  if (Object.keys(input).some((key) => !PROJECT_INPUT_FIELDS.includes(key))) return { error: "Unsupported project field", status: 400 };
  for (const [key, value] of Object.entries(input)) {
    if (["price", "agreedExtras", "cost"].includes(key)) continue;
    if (value !== null && typeof value !== "string") return { error: "Invalid project field type", status: 400 };
  }
  const previous = record(current);
  if (!canManageProjectFinancials(actor)) {
    if ([...PROJECT_FINANCIAL_FIELDS].some((key) => Object.hasOwn(input, key))) return { error: "Project financial permission required", status: 403 };
    return { data: { price: previous.price as number ?? null, cost: previous.cost as number ?? null, profit: previous.profit as number ?? null, paymentStatus: previous.paymentStatus as string ?? "Unpaid" } };
  }
  const rawPrice = input.price === undefined ? previous.price : input.price;
  if (rawPrice === undefined || rawPrice === null || rawPrice === "") {
    if (previous.price !== undefined && previous.price !== null) return { error: "Existing pricing cannot be cleared", status: 400 };
    if (input.agreedExtras !== undefined || input.cost !== undefined || input.paymentStatus !== undefined) return { error: "Set a price before financial details", status: 400 };
    return { data: { price: null, cost: null, profit: null, paymentStatus: "Unpaid" } };
  }
  const rawCost = input.cost === undefined ? previous.cost ?? 0 : input.cost;
  const price = parseCrmMoney(rawPrice);
  const cost = parseCrmMoney(rawCost);
  if (price === null || price <= 0 || cost === null || cost < 0) return { error: "Invalid project amount", status: 400 };
  // The existing price field remains the total agreed price. Legacy projects have zero extras.
  const extras = parseCrmMoney(input.agreedExtras === undefined ? previous.agreedExtras ?? 0 : input.agreedExtras);
  if (extras === null || extras >= price) {
    return { error: "Agreed extras must be non-negative and below the total agreed price", status: 400 };
  }
  const paymentStatus = input.paymentStatus ?? previous.paymentStatus ?? "Unpaid";
  if (typeof paymentStatus !== "string" || !PAYMENT_STATUSES.includes(paymentStatus)) return { error: "Invalid payment status", status: 400 };
  return {
    data: {
      price,
      ...(input.agreedExtras !== undefined ? { agreedExtras: extras } : {}),
      cost,
      profit: price - cost,
      paymentStatus,
    },
  };
}


/** Treat search input as bounded literal text, never as a user-supplied regex. */
export function parseCrmListQuery(params: URLSearchParams) {
  const search = (params.get("search") ?? "").trim();

  if (search.length > 200) {
    return { error: "Search must not exceed 200 characters", data: null };
  }

  const pageText = params.get("page") || "1";
  const limitText = params.get("limit") || "10";

  if (!/^\d+$/.test(pageText) || !/^\d+$/.test(limitText)) {
    return { error: "Page and limit must be positive integers", data: null };
  }

  const page = Number(pageText);
  const requestedLimit = Number(limitText);
  const limit = Math.min(requestedLimit, 50);
  const skip = (page - 1) * limit;

  if (!Number.isSafeInteger(page) || page < 1 ||
      !Number.isSafeInteger(requestedLimit) || requestedLimit < 1 ||
      !Number.isSafeInteger(skip) || skip > 1_000_000) {
    return { error: "Page or limit is outside the supported range", data: null };
  }

  const pattern = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  return { error: null, data: { page, limit, skip, search, pattern } };
}
