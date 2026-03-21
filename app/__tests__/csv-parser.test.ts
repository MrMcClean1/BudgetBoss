import { describe, it, expect } from "vitest";

// Extracted pure parsing logic for unit testing
function parseAmount(str: string): number | null {
  if (!str) return null;
  const cleaned = str.replace(/[$,\s]/g, "").trim();
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

function parseDate(str: string): Date | null {
  if (!str) return null;
  const d = new Date(str.trim());
  return isNaN(d.getTime()) ? null : d;
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  for (const line of lines) {
    const row: string[] = [];
    let inQuotes = false;
    let cell = "";
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') { cell += '"'; i++; }
        else inQuotes = !inQuotes;
      } else if (ch === "," && !inQuotes) {
        row.push(cell); cell = "";
      } else {
        cell += ch;
      }
    }
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

describe("parseAmount", () => {
  it("parses a plain number", () => expect(parseAmount("42.50")).toBe(42.5));
  it("strips dollar sign", () => expect(parseAmount("$12.99")).toBe(12.99));
  it("strips commas", () => expect(parseAmount("1,234.56")).toBe(1234.56));
  it("handles negative", () => expect(parseAmount("-50.00")).toBe(-50));
  it("returns null for empty string", () => expect(parseAmount("")).toBeNull());
  it("returns null for non-numeric", () => expect(parseAmount("N/A")).toBeNull());
});

describe("parseDate", () => {
  it("parses ISO date", () => {
    const d = parseDate("2026-03-15");
    expect(d).not.toBeNull();
    expect(d?.getFullYear()).toBe(2026);
    expect(d?.getMonth()).toBe(2); // March = index 2
  });
  it("parses MM/DD/YYYY", () => {
    const d = parseDate("03/15/2026");
    expect(d).not.toBeNull();
    expect(d?.getFullYear()).toBe(2026);
  });
  it("returns null for invalid date", () => {
    expect(parseDate("not-a-date")).toBeNull();
    expect(parseDate("")).toBeNull();
  });
});

describe("parseCsv", () => {
  it("parses a simple CSV", () => {
    const csv = "Date,Description,Amount\n03/15/2026,Starbucks,$6.75\n03/16/2026,Amazon,$43.20";
    const rows = parseCsv(csv);
    expect(rows).toHaveLength(3);
    expect(rows[0]).toEqual(["Date", "Description", "Amount"]);
    expect(rows[1][1]).toBe("Starbucks");
  });

  it("handles quoted fields with commas", () => {
    const csv = `Date,Description,Amount\n03/15/2026,"Whole Foods, Market",$87.43`;
    const rows = parseCsv(csv);
    expect(rows[1][1]).toBe("Whole Foods, Market");
    expect(rows[1][2]).toBe("$87.43");
  });

  it("handles empty rows", () => {
    const csv = "Date,Description,Amount\n\n03/15/2026,Starbucks,$6.75\n\n";
    const rows = parseCsv(csv);
    expect(rows).toHaveLength(2);
  });
});
