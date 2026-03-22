// ── Shared types ──────────────────────────────────────────────────────────────

export interface ParsedTransaction {
  date: Date;
  description: string;
  amount: number; // positive = income, negative = expense
  category?: string;
  notes?: string;
  rawRow: number;
}

export interface ImportError {
  row: number;
  error: string;
}

export interface ParseResult {
  transactions: ParsedTransaction[];
  errors: ImportError[];
  totalRows: number;
}

export type ImportFormat = "csv" | "ofx" | "json";

// ── Shared helpers ────────────────────────────────────────────────────────────

export function parseAmount(str: string): number | null {
  if (!str) return null;
  const cleaned = str.replace(/[$,\s]/g, "").trim();
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

export function parseDate(str: string): Date | null {
  if (!str) return null;
  const trimmed = str.trim();

  // Handle YYYYMMDD (OFX format) — must check before generic Date() parsing
  const yyyymmdd = trimmed.match(/^(\d{4})(\d{2})(\d{2})/);
  if (yyyymmdd) {
    const d = new Date(`${yyyymmdd[1]}-${yyyymmdd[2]}-${yyyymmdd[3]}`);
    if (!isNaN(d.getTime())) return d;
  }

  const d = new Date(trimmed);
  return isNaN(d.getTime()) ? null : d;
}

// ── CSV ───────────────────────────────────────────────────────────────────────

export function parseCsvText(text: string): string[][] {
  const rows: string[][] = [];
  const lines = text.split(/\r?\n/).filter((l) => l.trim());

  for (const line of lines) {
    const row: string[] = [];
    let inQuotes = false;
    let cell = "";

    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (ch === "," && !inQuotes) {
        row.push(cell);
        cell = "";
      } else {
        cell += ch;
      }
    }
    row.push(cell);
    rows.push(row);
  }

  return rows;
}

export function detectCsvColumns(headers: string[]): {
  date: number;
  description: number;
  amount: number | null;
  debit: number | null;
  credit: number | null;
  category: number | null;
} {
  const h = headers.map((h) => h.toLowerCase().trim());

  const find = (...names: string[]) => {
    for (const name of names) {
      const idx = h.findIndex((col) => col.includes(name));
      if (idx !== -1) return idx;
    }
    return -1;
  };

  return {
    date: find("date"),
    description: find("description", "memo", "payee", "name"),
    amount: find("amount") === -1 ? null : find("amount"),
    debit: find("debit", "withdrawal") === -1 ? null : find("debit", "withdrawal"),
    credit: find("credit", "deposit") === -1 ? null : find("credit", "deposit"),
    category: find("category") === -1 ? null : find("category"),
  };
}

export function parseCSV(text: string): ParseResult {
  const rows = parseCsvText(text);
  const errors: ImportError[] = [];
  const transactions: ParsedTransaction[] = [];

  if (rows.length < 2) {
    return { transactions: [], errors: [{ row: 0, error: "File is empty or has no data rows" }], totalRows: 0 };
  }

  const headers = rows[0];
  const cols = detectCsvColumns(headers);

  if (cols.date === -1 || cols.description === -1) {
    return {
      transactions: [],
      errors: [{ row: 0, error: "Could not detect required columns (date, description)" }],
      totalRows: 0,
    };
  }

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const rawDate = row[cols.date]?.trim();
    const rawDesc = row[cols.description]?.trim();

    if (!rawDate && !rawDesc) continue;

    const date = parseDate(rawDate);
    if (!date) {
      errors.push({ row: i + 1, error: `Invalid date: "${rawDate}"` });
      continue;
    }

    if (!rawDesc) {
      errors.push({ row: i + 1, error: "Missing description" });
      continue;
    }

    let amount: number | null = null;

    if (cols.amount !== null && row[cols.amount]) {
      amount = parseAmount(row[cols.amount]);
    } else if (cols.debit !== null || cols.credit !== null) {
      const debit = cols.debit !== null ? parseAmount(row[cols.debit] || "") : null;
      const credit = cols.credit !== null ? parseAmount(row[cols.credit] || "") : null;
      if (credit && credit > 0) amount = credit;
      else if (debit && debit > 0) amount = -debit;
    }

    if (amount === null) {
      errors.push({ row: i + 1, error: "Could not parse amount" });
      continue;
    }

    const rawCategory = cols.category !== null ? row[cols.category]?.trim() : undefined;

    transactions.push({
      date,
      description: rawDesc,
      amount,
      category: rawCategory,
      rawRow: i + 1,
    });
  }

  return { transactions, errors, totalRows: rows.length - 1 };
}

// ── OFX / QFX ─────────────────────────────────────────────────────────────────

function getOFXTag(block: string, tag: string): string {
  // XML style: <TAG>value</TAG>
  const xmlMatch = block.match(new RegExp(`<${tag}>([^<]*)<\/${tag}>`, "i"));
  if (xmlMatch) return xmlMatch[1].trim();
  // SGML style: <TAG>value\n
  const sgmlMatch = block.match(new RegExp(`<${tag}>([^\n<]*)`, "i"));
  if (sgmlMatch) return sgmlMatch[1].trim();
  return "";
}

export function parseOFX(text: string): ParseResult {
  const errors: ImportError[] = [];
  const transactions: ParsedTransaction[] = [];

  const ofxStart = text.indexOf("<OFX>");
  const body = ofxStart >= 0 ? text.slice(ofxStart) : text;

  const trxPattern = /<STMTTRN>([\s\S]*?)<\/STMTTRN>/gi;
  let match: RegExpExecArray | null;
  let rowNum = 0;

  while ((match = trxPattern.exec(body)) !== null) {
    rowNum++;
    const block = match[1];

    const rawDate = getOFXTag(block, "DTPOSTED");
    const rawAmount = getOFXTag(block, "TRNAMT");
    const rawMemo = getOFXTag(block, "MEMO") || getOFXTag(block, "NAME");
    const rawType = getOFXTag(block, "TRNTYPE");

    const date = parseDate(rawDate);
    if (!date) {
      errors.push({ row: rowNum, error: `Invalid date: "${rawDate}"` });
      continue;
    }

    if (!rawMemo) {
      errors.push({ row: rowNum, error: "Missing memo/description" });
      continue;
    }

    const amount = parseAmount(rawAmount);
    if (amount === null) {
      errors.push({ row: rowNum, error: `Could not parse amount: "${rawAmount}"` });
      continue;
    }

    transactions.push({
      date,
      description: rawMemo,
      amount,
      notes: rawType ? `OFX type: ${rawType}` : undefined,
      rawRow: rowNum,
    });
  }

  if (rowNum === 0) {
    errors.push({ row: 0, error: "No transactions found. Ensure the file contains <STMTTRN> blocks." });
  }

  return { transactions, errors, totalRows: rowNum };
}

// ── JSON ──────────────────────────────────────────────────────────────────────

export function parseJSON(text: string): ParseResult {
  const errors: ImportError[] = [];
  const transactions: ParsedTransaction[] = [];

  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return { transactions: [], errors: [{ row: 0, error: "Invalid JSON file" }], totalRows: 0 };
  }

  let rows: unknown[] = [];
  if (Array.isArray(data)) {
    rows = data;
  } else if (data && typeof data === "object" && Array.isArray((data as Record<string, unknown>).transactions)) {
    rows = (data as Record<string, unknown>).transactions as unknown[];
  } else {
    return {
      transactions: [],
      errors: [{ row: 0, error: "JSON must be an array or an object with a 'transactions' array" }],
      totalRows: 0,
    };
  }

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i] as Record<string, unknown>;

    const rawDate = String(row.date ?? row.Date ?? row.DATE ?? "");
    const rawDesc = String(row.description ?? row.memo ?? row.payee ?? row.name ?? row.Description ?? "");
    const rawAmount = row.amount ?? row.Amount ?? row.AMOUNT;
    const rawCategory = String(row.category ?? row.Category ?? row.categoryName ?? "");
    const rawNotes = String(row.notes ?? row.Notes ?? "");

    if (!rawDate && !rawDesc) continue;

    const date = parseDate(rawDate);
    if (!date) {
      errors.push({ row: i + 1, error: `Invalid date: "${rawDate}"` });
      continue;
    }

    if (!rawDesc) {
      errors.push({ row: i + 1, error: "Missing description" });
      continue;
    }

    let amount: number | null = null;
    if (typeof rawAmount === "number") {
      amount = rawAmount;
    } else if (typeof rawAmount === "string") {
      amount = parseAmount(rawAmount);
    }

    // Handle BudgetBoss export format (type + positive amount)
    if (amount !== null && typeof row.type === "string") {
      const type = (row.type as string).toUpperCase();
      if (type === "EXPENSE" && amount > 0) amount = -amount;
    }

    if (amount === null) {
      errors.push({ row: i + 1, error: "Could not parse amount" });
      continue;
    }

    transactions.push({
      date,
      description: rawDesc,
      amount,
      category: rawCategory || undefined,
      notes: rawNotes || undefined,
      rawRow: i + 1,
    });
  }

  return { transactions, errors, totalRows: rows.length };
}

// ── Format detection ──────────────────────────────────────────────────────────

export function detectFormat(fileName: string, text: string): ImportFormat | null {
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".csv")) return "csv";
  if (lower.endsWith(".ofx") || lower.endsWith(".qfx")) return "ofx";
  if (lower.endsWith(".json")) return "json";

  // Content-based detection
  if (text.includes("<OFX>") || text.includes("<STMTTRN>")) return "ofx";
  const trimmed = text.trimStart();
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) return "json";

  return null;
}

export function parseFile(format: ImportFormat, text: string): ParseResult {
  switch (format) {
    case "csv": return parseCSV(text);
    case "ofx": return parseOFX(text);
    case "json": return parseJSON(text);
  }
}
