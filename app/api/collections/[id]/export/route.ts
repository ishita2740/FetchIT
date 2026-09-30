import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import {
  getUserProfileByAuthId,
  getCollectionById,
  getCollectionResult,
  getCollectionSources,
} from "@/lib/db";

// ─── CSV ─────────────────────────────────────────────────────────────────────

function escapeCSV(val: any): string {
  if (val === null || val === undefined) return "";
  const s = Array.isArray(val) ? val.join("; ") : String(val);
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function buildCSV(records: any[], fields: string[]): string {
  // Header
  const internalFields = ["_source_name", "_source_url", "_validation"];
  const allCols = [...fields, ...internalFields.filter(f => records.some(r => r[f] != null))];
  const header = allCols.map(escapeCSV).join(",");
  const rows = records.map(r => allCols.map(col => escapeCSV(r[col])).join(","));
  return [header, ...rows].join("\r\n");
}

// ─── PDF (pure HTML → browser print) ────────────────────────────────────────
// We generate an HTML document that, when rendered, can be saved as PDF.
// No external libraries required.

function buildPDFHtml(params: {
  originalInput: string;
  understoodRequirement: string | null;
  records: any[];
  fields: string[];
  sources: any[];
  processingSummary: any;
  collectionDate: string;
}): string {
  const { originalInput, understoodRequirement, records, fields, sources, processingSummary, collectionDate } = params;

  const headerRow = fields.map(f => `<th>${f.replace(/_/g, " ")}</th>`).join("");
  const dataRows = records.map(r => {
    const cells = fields.map(f => {
      const v = r[f];
      if (v === null || v === undefined) return `<td class="null">—</td>`;
      return `<td>${String(v).replace(/</g, "&lt;").replace(/>/g, "&gt;")}</td>`;
    }).join("");
    return `<tr>${cells}<td class="src">${(r._source_name || r._source_url || "").replace(/</g, "&lt;")}</td></tr>`;
  }).join("");

  const sourcesHtml = sources.map((s, i) =>
    `<li><strong>${i + 1}. ${(s.source_name || s.name || "Unknown").replace(/</g, "&lt;")}</strong><br>
    <a href="${s.source_url || s.url || ""}">${(s.source_url || s.url || "").replace(/</g, "&lt;")}</a></li>`
  ).join("");

  const summaryHtml = processingSummary ? `
    <table class="summary-table">
      <tr><td>Records collected</td><td>${processingSummary.raw_records ?? "—"}</td></tr>
      <tr><td>Valid</td><td>${processingSummary.valid ?? "—"}</td></tr>
      <tr><td>Incomplete</td><td>${processingSummary.incomplete ?? 0}</td></tr>
      <tr><td>Duplicates removed</td><td>${processingSummary.duplicates_removed ?? 0}</td></tr>
      <tr><td>Final records</td><td><strong>${processingSummary.final_count ?? records.length}</strong></td></tr>
    </table>
  ` : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>FetchIT Report</title>
<style>
  @page { size: A4; margin: 22mm 18mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, system-ui, 'Segoe UI', sans-serif; font-size: 11px; color: #18312e; background: white; }
  .cover { margin-bottom: 28px; padding-bottom: 18px; border-bottom: 2px solid #176b61; }
  .logo { font-size: 26px; font-weight: 900; color: #176b61; letter-spacing: -0.04em; margin-bottom: 6px; }
  .logo span { color: #ff9075; }
  .report-label { font-size: 10px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: #4d897d; }
  .date { font-size: 10px; color: #6b9c90; margin-top: 4px; }
  h2 { font-size: 13px; font-weight: 800; color: #176b61; margin: 18px 0 8px; letter-spacing: -0.01em; }
  .request-block { background: #d9eee5; border-radius: 8px; padding: 12px 14px; font-style: italic; font-size: 12px; color: #18312e; margin: 8px 0; }
  .understood { color: #176b61; font-size: 11px; line-height: 1.5; }
  table.main-table { width: 100%; border-collapse: collapse; margin-top: 10px; page-break-inside: auto; }
  table.main-table thead { display: table-header-group; }
  table.main-table th { background: #d9eee5; color: #176b61; font-weight: 800; font-size: 9px; text-transform: uppercase; letter-spacing: 0.06em; padding: 7px 8px; border: 1px solid #b6d9cc; text-align: left; }
  table.main-table td { border: 1px solid #e1efe9; padding: 6px 8px; font-size: 10px; line-height: 1.4; vertical-align: top; page-break-inside: avoid; }
  table.main-table tr:nth-child(even) td { background: #f5fcf7; }
  td.null { color: #a0b8b1; font-style: italic; }
  td.src { font-size: 9px; color: #4d897d; word-break: break-all; }
  table.summary-table { margin-top: 8px; border-collapse: collapse; }
  table.summary-table td { padding: 4px 10px; font-size: 11px; border-bottom: 1px solid #e1efe9; }
  table.summary-table td:first-child { color: #4d897d; font-weight: 600; min-width: 180px; }
  .sources-list { margin-top: 8px; padding-left: 0; list-style: none; }
  .sources-list li { padding: 6px 0; border-bottom: 1px solid #e1efe9; font-size: 10px; }
  .sources-list a { color: #176b61; word-break: break-all; }
  .footer { margin-top: 30px; padding-top: 12px; border-top: 1px solid #c5e2d7; text-align: center; font-size: 9px; color: #6b9c90; }
</style>
</head>
<body>

<div class="cover">
  <div class="logo">Fetch<span>IT</span></div>
  <div class="report-label">AI Data Intelligence Report</div>
  <div class="date">Generated ${collectionDate}</div>
</div>

<h2>Request</h2>
<div class="request-block">${originalInput.replace(/</g, "&lt;")}</div>

${understoodRequirement ? `<h2>What FetchIT understood</h2><p class="understood">${understoodRequirement.replace(/</g, "&lt;")}</p>` : ""}

<h2>Results (${records.length} records)</h2>
<table class="main-table">
  <thead><tr>${headerRow}<th>Source</th></tr></thead>
  <tbody>${dataRows}</tbody>
</table>

${sources.length > 0 ? `<h2>Sources</h2><ol class="sources-list">${sourcesHtml}</ol>` : ""}

${summaryHtml ? `<h2>Processing Summary</h2>${summaryHtml}` : ""}

<div class="footer">Generated by FetchIT &nbsp;·&nbsp; fetchit.app</div>

<script>window.onload = function() { window.print(); }</script>
</body>
</html>`;
}

// ─── ROUTE ───────────────────────────────────────────────────────────────────

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { data: session } = await auth.getSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const profile = await getUserProfileByAuthId(session.user.id);
    if (!profile) {
      return NextResponse.json({ error: "User profile not found" }, { status: 404 });
    }

    const { id } = await context.params;
    const collection = await getCollectionById(id);
    if (!collection) {
      return NextResponse.json({ error: "Collection not found" }, { status: 404 });
    }
    if (collection.user_profile_id !== profile.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const collectionResult = await getCollectionResult(id);
    const sources = await getCollectionSources(id);

    const format = request.nextUrl.searchParams.get("format") || "csv";
    const resultData = collectionResult?.result_data as any;
    const records: any[] = resultData?.records || [];
    const fields: string[] = resultData?.fields || [];
    const processingSummary = resultData?.summary || null;

    // Derive columns from actual records if fields is empty
    const allKeys = new Set<string>();
    for (const r of records) {
      for (const k of Object.keys(r)) {
        if (!k.startsWith("_")) allKeys.add(k);
      }
    }
    const exportFields = fields.length > 0 ? fields.filter(f => allKeys.has(f)) : Array.from(allKeys);

    if (format === "csv") {
      const csv = buildCSV(records, exportFields);
      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="fetchit-${id.slice(0, 8)}.csv"`,
        },
      });
    }

    if (format === "pdf") {
      const date = new Intl.DateTimeFormat("en", {
        dateStyle: "long",
        timeStyle: "short",
      }).format(new Date(collection.created_at || Date.now()));

      const html = buildPDFHtml({
        originalInput: collection.original_input,
        understoodRequirement: collectionResult?.understood_requirement || null,
        records,
        fields: exportFields,
        sources,
        processingSummary,
        collectionDate: date,
      });

      return new NextResponse(html, {
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Content-Disposition": `inline; filename="fetchit-${id.slice(0, 8)}.html"`,
        },
      });
    }

    return NextResponse.json({ error: "Unsupported format" }, { status: 400 });
  } catch (error) {
    console.error("Export error:", error);
    return NextResponse.json({ error: "Export failed" }, { status: 500 });
  }
}
