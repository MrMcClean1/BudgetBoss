import { describe, it, expect } from "vitest";
import {
  parseAmount,
  parseDate,
  parseCsvText,
  detectCsvColumns,
  parseCSV,
  parseOFX,
  parseJSON,
  detectFormat,
  parseFile,
} from "@/lib/import-parsers";

// ── parseAmount ───────────────────────────────────────────────────────────────

describe("parseAmount", () => {
  it("parses a plain decimal", () => expect(parseAmount("42.50")).toBe(42.5));
  it("strips dollar sign", () => expect(parseAmount("$12.99")).toBe(12.99));
  it("strips commas", () => expect(parseAmount("1,234.56")).toBe(1234.56));
  it("handles negative", () => expect(parseAmount("-50.00")).toBe(-50));
  it("handles negative with dollar sign", () => expect(parseAmount("-$50.00")).toBe(-50));
  it("returns null for empty string", () => expect(parseAmount("")).toBeNull());
  it("returns null for non-numeric", () => expect(parseAmount("N/A")).toBeNull());
  it("parses zero", () => expect(parseAmount("0.00")).toBe(0));
  it("strips surrounding spaces", () => expect(parseAmount(" 15.00 ")).toBe(15));
});

// ── parseDate ─────────────────────────────────────────────────────────────────

describe("parseDate", () => {
  it("parses ISO date YYYY-MM-DD", () => {
    const d = parseDate("2026-03-15");
    expect(d).not.toBeNull();
    expect(d!.getUTCFullYear()).toBe(2026);
    expect(d!.getUTCMonth()).toBe(2); // 0-indexed
    expect(d!.getUTCDate()).toBe(15);
  });

  it("parses MM/DD/YYYY", () => {
    const d = parseDate("03/15/2026");
    expect(d).not.toBeNull();
    expect(d!.getFullYear()).toBe(2026);
  });

  it("parses OFX YYYYMMDD format", () => {
    const d = parseDate("20260315");
    expect(d).not.toBeNull();
    expect(d!.getUTCFullYear()).toBe(2026);
    expect(d!.getUTCMonth()).toBe(2);
    expect(d!.getUTCDate()).toBe(15);
  });

  it("parses OFX YYYYMMDD with trailing time component", () => {
    const d = parseDate("20260315120000");
    expect(d).not.toBeNull();
    expect(d!.getFullYear()).toBe(2026);
  });

  it("returns null for empty string", () => expect(parseDate("")).toBeNull());
  it("returns null for garbage", () => expect(parseDate("not-a-date")).toBeNull());
});

// ── parseCsvText ──────────────────────────────────────────────────────────────

describe("parseCsvText", () => {
  it("parses simple CSV", () => {
    const rows = parseCsvText("a,b,c\n1,2,3");
    expect(rows).toHaveLength(2);
    expect(rows[0]).toEqual(["a", "b", "c"]);
    expect(rows[1]).toEqual(["1", "2", "3"]);
  });

  it("handles quoted fields with commas", () => {
    const rows = parseCsvText(`Date,Description,Amount\n03/15/2026,"Whole Foods, Market",$87.43`);
    expect(rows[1][1]).toBe("Whole Foods, Market");
    expect(rows[1][2]).toBe("$87.43");
  });

  it("handles escaped quotes inside quoted fields", () => {
    const rows = parseCsvText(`a,"say ""hello""",c`);
    expect(rows[0][1]).toBe('say "hello"');
  });

  it("skips empty lines", () => {
    const rows = parseCsvText("a,b\n\n1,2\n\n");
    expect(rows).toHaveLength(2);
  });

  it("handles CRLF line endings", () => {
    const rows = parseCsvText("a,b\r\n1,2\r\n3,4");
    expect(rows).toHaveLength(3);
  });
});

// ── detectCsvColumns ──────────────────────────────────────────────────────────

describe("detectCsvColumns", () => {
  it("detects standard columns", () => {
    const cols = detectCsvColumns(["Date", "Description", "Amount", "Category"]);
    expect(cols.date).toBe(0);
    expect(cols.description).toBe(1);
    expect(cols.amount).toBe(2);
    expect(cols.category).toBe(3);
  });

  it("detects debit/credit columns", () => {
    const cols = detectCsvColumns(["Date", "Memo", "Debit", "Credit"]);
    expect(cols.debit).toBe(2);
    expect(cols.credit).toBe(3);
    expect(cols.amount).toBeNull();
  });

  it("detects 'Memo' as description", () => {
    const cols = detectCsvColumns(["Date", "Memo", "Amount"]);
    expect(cols.description).toBe(1);
  });

  it("detects 'Payee' as description", () => {
    const cols = detectCsvColumns(["Date", "Payee", "Amount"]);
    expect(cols.description).toBe(1);
  });

  it("returns -1 for missing required columns", () => {
    const cols = detectCsvColumns(["Foo", "Bar"]);
    expect(cols.date).toBe(-1);
    expect(cols.description).toBe(-1);
  });

  it("is case-insensitive", () => {
    const cols = detectCsvColumns(["DATE", "DESCRIPTION", "AMOUNT"]);
    expect(cols.date).toBe(0);
    expect(cols.description).toBe(1);
    expect(cols.amount).toBe(2);
  });
});

// ── parseCSV ──────────────────────────────────────────────────────────────────

describe("parseCSV", () => {
  const basicCsv = `Date,Description,Amount
03/01/2026,Grocery Store,-45.67
03/02/2026,Paycheck,2500.00
03/03/2026,"Coffee, Shop",-6.50`;

  it("parses basic CSV with single amount column", () => {
    const { transactions, errors, totalRows } = parseCSV(basicCsv);
    expect(totalRows).toBe(3);
    expect(errors).toHaveLength(0);
    expect(transactions).toHaveLength(3);
    expect(transactions[0].description).toBe("Grocery Store");
    expect(transactions[0].amount).toBe(-45.67);
    expect(transactions[1].amount).toBe(2500);
    expect(transactions[2].description).toBe("Coffee, Shop");
  });

  it("parses debit/credit format", () => {
    const csv = `Date,Description,Debit,Credit
03/01/2026,ATM Withdrawal,200.00,
03/02/2026,Direct Deposit,,1500.00`;
    const { transactions, errors } = parseCSV(csv);
    expect(errors).toHaveLength(0);
    expect(transactions[0].amount).toBe(-200);
    expect(transactions[1].amount).toBe(1500);
  });

  it("maps category column", () => {
    const csv = `Date,Description,Amount,Category
03/01/2026,Starbucks,-5.00,Food & Drink`;
    const { transactions } = parseCSV(csv);
    expect(transactions[0].category).toBe("Food & Drink");
  });

  it("errors on invalid date rows", () => {
    const csv = `Date,Description,Amount
bad-date,Starbucks,-5.00
03/01/2026,Coffee,-4.00`;
    const { transactions, errors } = parseCSV(csv);
    expect(errors).toHaveLength(1);
    expect(errors[0].row).toBe(2);
    expect(transactions).toHaveLength(1);
  });

  it("errors on missing description", () => {
    const csv = `Date,Description,Amount
03/01/2026,,-5.00`;
    const { errors } = parseCSV(csv);
    expect(errors.length).toBeGreaterThan(0);
  });

  it("errors on missing amount", () => {
    const csv = `Date,Description,Amount
03/01/2026,Starbucks,`;
    const { errors } = parseCSV(csv);
    expect(errors).toHaveLength(1);
    expect(errors[0].error).toMatch(/amount/i);
  });

  it("returns error for empty file", () => {
    const { errors, totalRows } = parseCSV("");
    expect(totalRows).toBe(0);
    expect(errors.length).toBeGreaterThan(0);
  });

  it("returns error when required columns missing", () => {
    const { errors } = parseCSV("Foo,Bar,Baz\n1,2,3");
    expect(errors[0].error).toMatch(/columns/i);
  });

  it("skips completely blank data rows", () => {
    const csv = `Date,Description,Amount
03/01/2026,Coffee,-4.00

03/02/2026,Tea,-3.00`;
    const { transactions, totalRows } = parseCSV(csv);
    expect(transactions).toHaveLength(2);
    expect(totalRows).toBe(2); // blank line is filtered before counting
  });
});

// ── parseOFX ──────────────────────────────────────────────────────────────────

const SGML_OFX = `OFXHEADER:100
DATA:OFXSGML

<OFX>
<BANKMSGSRSV1>
<STMTTRNRS>
<STMTRS>
<BANKTRANLIST>
<STMTTRN>
<TRNTYPE>DEBIT
<DTPOSTED>20260301
<TRNAMT>-45.00
<NAME>Whole Foods
</STMTTRN>
<STMTTRN>
<TRNTYPE>CREDIT
<DTPOSTED>20260305
<TRNAMT>2500.00
<MEMO>Payroll Deposit
</STMTTRN>
</BANKTRANLIST>
</STMTRS>
</STMTTRNRS>
</BANKMSGSRSV1>
</OFX>`;

const XML_OFX = `<?xml version="1.0" encoding="UTF-8"?>
<OFX>
  <BANKMSGSRSV1>
    <STMTTRNRS>
      <STMTRS>
        <BANKTRANLIST>
          <STMTTRN>
            <TRNTYPE>DEBIT</TRNTYPE>
            <DTPOSTED>20260301</DTPOSTED>
            <TRNAMT>-25.50</TRNAMT>
            <NAME>Starbucks</NAME>
            <MEMO>Coffee purchase</MEMO>
          </STMTTRN>
          <STMTTRN>
            <TRNTYPE>CREDIT</TRNTYPE>
            <DTPOSTED>20260310</DTPOSTED>
            <TRNAMT>1000.00</TRNAMT>
            <NAME>Bank Transfer</NAME>
          </STMTTRN>
        </BANKTRANLIST>
      </STMTRS>
    </STMTTRNRS>
  </BANKMSGSRSV1>
</OFX>`;

describe("parseOFX", () => {
  it("parses SGML-style OFX (1.x)", () => {
    const { transactions, errors, totalRows } = parseOFX(SGML_OFX);
    expect(totalRows).toBe(2);
    expect(errors).toHaveLength(0);
    expect(transactions).toHaveLength(2);
    expect(transactions[0].description).toBe("Whole Foods");
    expect(transactions[0].amount).toBe(-45);
    expect(transactions[0].date.getFullYear()).toBe(2026);
    expect(transactions[0].notes).toBe("OFX type: DEBIT");
  });

  it("parses XML-style OFX (2.x)", () => {
    const { transactions, errors, totalRows } = parseOFX(XML_OFX);
    expect(totalRows).toBe(2);
    expect(errors).toHaveLength(0);
    expect(transactions[0].description).toBe("Coffee purchase");
    expect(transactions[0].amount).toBe(-25.5);
    expect(transactions[1].amount).toBe(1000);
    expect(transactions[1].description).toBe("Bank Transfer");
  });

  it("prefers MEMO over NAME in XML OFX", () => {
    const { transactions } = parseOFX(XML_OFX);
    // First transaction has both MEMO and NAME — MEMO should win
    expect(transactions[0].description).toBe("Coffee purchase");
  });

  it("falls back to NAME when MEMO is absent (SGML)", () => {
    const { transactions } = parseOFX(SGML_OFX);
    expect(transactions[0].description).toBe("Whole Foods");
  });

  it("returns error when no STMTTRN blocks found", () => {
    const { errors } = parseOFX("<OFX><BANKMSGSRSV1></BANKMSGSRSV1></OFX>");
    expect(errors).toHaveLength(1);
    expect(errors[0].error).toMatch(/no transactions/i);
  });

  it("skips transactions with invalid dates", () => {
    const bad = `<OFX><STMTTRN><DTPOSTED>baddate</DTPOSTED><TRNAMT>-10.00</TRNAMT><MEMO>Test</MEMO></STMTTRN></OFX>`;
    const { transactions, errors } = parseOFX(bad);
    expect(transactions).toHaveLength(0);
    expect(errors).toHaveLength(1);
  });

  it("handles OFX with content before <OFX> tag", () => {
    const { transactions } = parseOFX(SGML_OFX);
    expect(transactions.length).toBeGreaterThan(0);
  });
});

// ── parseJSON ─────────────────────────────────────────────────────────────────

describe("parseJSON", () => {
  it("parses a plain array of transaction objects", () => {
    const json = JSON.stringify([
      { date: "2026-03-01", description: "Grocery Store", amount: -45.67 },
      { date: "2026-03-02", description: "Paycheck", amount: 2500 },
    ]);
    const { transactions, errors } = parseJSON(json);
    expect(errors).toHaveLength(0);
    expect(transactions).toHaveLength(2);
    expect(transactions[0].description).toBe("Grocery Store");
    expect(transactions[0].amount).toBe(-45.67);
  });

  it("parses BudgetBoss export format { transactions: [...] }", () => {
    const json = JSON.stringify({
      transactions: [
        { date: "2026-03-01", description: "Coffee", amount: 5, type: "EXPENSE" },
        { date: "2026-03-02", description: "Salary", amount: 3000, type: "INCOME" },
      ],
    });
    const { transactions, errors } = parseJSON(json);
    expect(errors).toHaveLength(0);
    expect(transactions).toHaveLength(2);
    // EXPENSE type with positive amount should be negated
    expect(transactions[0].amount).toBe(-5);
    expect(transactions[1].amount).toBe(3000);
  });

  it("accepts 'memo' as description field", () => {
    const json = JSON.stringify([{ date: "2026-03-01", memo: "ATM", amount: -100 }]);
    const { transactions } = parseJSON(json);
    expect(transactions[0].description).toBe("ATM");
  });

  it("accepts 'payee' as description field", () => {
    const json = JSON.stringify([{ date: "2026-03-01", payee: "Landlord", amount: -1200 }]);
    const { transactions } = parseJSON(json);
    expect(transactions[0].description).toBe("Landlord");
  });

  it("carries category through", () => {
    const json = JSON.stringify([{ date: "2026-03-01", description: "Groceries", amount: -60, category: "Food" }]);
    const { transactions } = parseJSON(json);
    expect(transactions[0].category).toBe("Food");
  });

  it("accepts string amounts", () => {
    const json = JSON.stringify([{ date: "2026-03-01", description: "Test", amount: "-$25.00" }]);
    const { transactions, errors } = parseJSON(json);
    expect(errors).toHaveLength(0);
    expect(transactions[0].amount).toBe(-25);
  });

  it("returns error for invalid JSON", () => {
    const { errors } = parseJSON("not json {{");
    expect(errors).toHaveLength(1);
    expect(errors[0].error).toMatch(/invalid json/i);
  });

  it("returns error for wrong JSON shape", () => {
    const { errors } = parseJSON(JSON.stringify({ foo: "bar" }));
    expect(errors).toHaveLength(1);
  });

  it("errors on rows with invalid dates", () => {
    const json = JSON.stringify([
      { date: "not-a-date", description: "Test", amount: -5 },
      { date: "2026-03-01", description: "Good", amount: -5 },
    ]);
    const { transactions, errors } = parseJSON(json);
    expect(errors).toHaveLength(1);
    expect(transactions).toHaveLength(1);
  });

  it("errors on rows with missing amounts", () => {
    const json = JSON.stringify([{ date: "2026-03-01", description: "Test", amount: "N/A" }]);
    const { errors } = parseJSON(json);
    expect(errors).toHaveLength(1);
    expect(errors[0].error).toMatch(/amount/i);
  });
});

// ── detectFormat ──────────────────────────────────────────────────────────────

describe("detectFormat", () => {
  it("detects csv by extension", () => expect(detectFormat("export.csv", "")).toBe("csv"));
  it("detects ofx by extension", () => expect(detectFormat("bank.ofx", "")).toBe("ofx"));
  it("detects qfx by extension", () => expect(detectFormat("bank.qfx", "")).toBe("ofx"));
  it("detects json by extension", () => expect(detectFormat("data.json", "")).toBe("json"));
  it("detects ofx by content when no extension match", () => {
    expect(detectFormat("file.txt", "<OFX><STMTTRN>")).toBe("ofx");
  });
  it("detects json array by content", () => {
    expect(detectFormat("file.txt", "[{\"date\": \"2026-01-01\"}]")).toBe("json");
  });
  it("detects json object by content", () => {
    expect(detectFormat("file.txt", "{\"transactions\": []}")).toBe("json");
  });
  it("returns null for unknown format", () => {
    expect(detectFormat("file.pdf", "some random content")).toBeNull();
  });
  it("is case-insensitive for extensions", () => {
    expect(detectFormat("EXPORT.CSV", "")).toBe("csv");
    expect(detectFormat("Bank.OFX", "")).toBe("ofx");
  });
});

// ── parseFile (integration) ───────────────────────────────────────────────────

describe("parseFile", () => {
  it("routes csv format correctly", () => {
    const csv = `Date,Description,Amount\n03/01/2026,Test,-10.00`;
    const result = parseFile("csv", csv);
    expect(result.transactions).toHaveLength(1);
  });

  it("routes ofx format correctly", () => {
    const result = parseFile("ofx", SGML_OFX);
    expect(result.transactions).toHaveLength(2);
  });

  it("routes json format correctly", () => {
    const json = JSON.stringify([{ date: "2026-03-01", description: "Test", amount: -10 }]);
    const result = parseFile("json", json);
    expect(result.transactions).toHaveLength(1);
  });
});
