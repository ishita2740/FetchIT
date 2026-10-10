import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { getSessionUser } from "@/lib/auth/get-session";
import { getUserProfileByAuthId, getCollectionById, getCollectionResult } from "@/lib/db";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const profile = await getUserProfileByAuthId(sessionUser.id);
    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    const { id } = await context.params;

    const collection = await getCollectionById(id);
    if (!collection) {
      return NextResponse.json({ error: "Collection not found" }, { status: 404 });
    }

    if (collection.user_profile_id !== profile.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const result = await getCollectionResult(id);
    const resultDataObj = (result?.result_data as any) ?? {};
    const records: Record<string, any>[] = resultDataObj.records ?? [];
    const fields: string[] = result?.result_data?.fields ?? [];
    const summary = result?.result_data?.summary ?? {};

    // Build PDF
    const pdfDoc = await PDFDocument.create();
    const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const MARGIN = 50;
    const PAGE_WIDTH = 595;
    const PAGE_HEIGHT = 842;
    const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

    // Colors
    const GREEN = rgb(0.09, 0.52, 0.46);
    const DARK = rgb(0.1, 0.1, 0.1);
    const GRAY = rgb(0.4, 0.4, 0.4);
    const LIGHT_GRAY = rgb(0.95, 0.95, 0.95);
    const WHITE = rgb(1, 1, 1);
    const MID_GRAY = rgb(0.7, 0.7, 0.7);

    function addPage() {
      const page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      return { page, y: PAGE_HEIGHT - MARGIN };
    }

    function wrapText(text: string, font: typeof regularFont, size: number, maxWidth: number): string[] {
      const words = String(text ?? "").split(" ");
      const lines: string[] = [];
      let current = "";
      for (const word of words) {
        const test = current ? `${current} ${word}` : word;
        const w = font.widthOfTextAtSize(test, size);
        if (w > maxWidth && current) {
          lines.push(current);
          current = word;
        } else {
          current = test;
        }
      }
      if (current) lines.push(current);
      return lines;
    }

    function drawText(
      page: ReturnType<typeof addPage>["page"],
      text: string,
      x: number,
      y: number,
      opts: { font?: typeof regularFont; size?: number; color?: ReturnType<typeof rgb>; maxWidth?: number } = {}
    ) {
      const font = opts.font ?? regularFont;
      const size = opts.size ?? 10;
      const color = opts.color ?? DARK;
      const str = String(text ?? "");
      if (opts.maxWidth) {
        const lines = wrapText(str, font, size, opts.maxWidth);
        lines.forEach((line, i) => {
          page.drawText(line, { x, y: y - i * (size + 3), font, size, color });
        });
        return lines.length * (size + 3);
      }
      page.drawText(str.slice(0, 120), { x, y, font, size, color });
      return size + 4;
    }

    // ─── PAGE 1: COVER ───────────────────────────────────────────
    let { page, y } = addPage();

    // Header bar
    page.drawRectangle({ x: 0, y: PAGE_HEIGHT - 80, width: PAGE_WIDTH, height: 80, color: GREEN });
    page.drawText("FetchIT", { x: MARGIN, y: PAGE_HEIGHT - 50, font: boldFont, size: 28, color: WHITE });
    page.drawText("Data Intelligence Report", { x: MARGIN, y: PAGE_HEIGHT - 68, font: regularFont, size: 12, color: rgb(0.8, 0.96, 0.92) });

    y = PAGE_HEIGHT - 120;

    // Collection title
    const titleLines = wrapText(collection?.title ?? "Untitled", boldFont, 20, CONTENT_WIDTH);
    titleLines.forEach((line) => {
      page.drawText(line, { x: MARGIN, y, font: boldFont, size: 20, color: DARK });
      y -= 26;
    });
    y -= 8;

    // Original request
    page.drawText("Original Request", { x: MARGIN, y, font: boldFont, size: 11, color: GREEN });
    y -= 16;
    const reqLines = wrapText(collection?.original_input ?? "", regularFont, 10, CONTENT_WIDTH);
    reqLines.slice(0, 6).forEach((line) => {
      page.drawText(line, { x: MARGIN, y, font: regularFont, size: 10, color: GRAY });
      y -= 14;
    });
    y -= 12;

    // Understood requirement
    if (result?.understood_requirement) {
      page.drawText("AI Understanding", { x: MARGIN, y, font: boldFont, size: 11, color: GREEN });
      y -= 16;
      const uLines = wrapText(result.understood_requirement, regularFont, 10, CONTENT_WIDTH);
      uLines.slice(0, 8).forEach((line) => {
        page.drawText(line, { x: MARGIN, y, font: regularFont, size: 10, color: GRAY });
        y -= 14;
      });
      y -= 12;
    }

    // Stats row
    const stats = [
      { label: "Records", value: String(records.length) },
      { label: "Sources", value: String(summary?.sources_found ?? 0) },
      { label: "Duplicates Removed", value: String(summary?.duplicates_removed ?? 0) },
      { label: "Generated", value: new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) },
    ];
    const statW = CONTENT_WIDTH / stats.length;
    y -= 8;
    page.drawRectangle({ x: MARGIN, y: y - 50, width: CONTENT_WIDTH, height: 55, color: LIGHT_GRAY });
    stats.forEach((s, i) => {
      const sx = MARGIN + i * statW + 10;
      page.drawText(s.value, { x: sx, y: y - 20, font: boldFont, size: 16, color: GREEN });
      page.drawText(s.label, { x: sx, y: y - 35, font: regularFont, size: 8, color: GRAY });
    });
    y -= 70;

    // Processing summary
    if (result?.processing_summary) {
      page.drawText("Processing Summary", { x: MARGIN, y, font: boldFont, size: 11, color: GREEN });
      y -= 16;
      const psLines = wrapText(result.processing_summary, regularFont, 9, CONTENT_WIDTH);
      psLines.slice(0, 5).forEach((line) => {
        page.drawText(line, { x: MARGIN, y, font: regularFont, size: 9, color: GRAY });
        y -= 12;
      });
    }

    // Footer on cover
    page.drawLine({ start: { x: MARGIN, y: 40 }, end: { x: PAGE_WIDTH - MARGIN, y: 40 }, thickness: 0.5, color: MID_GRAY });
    page.drawText(`Generated by FetchIT • ${new Date().toLocaleString("en-IN")}`, { x: MARGIN, y: 25, font: regularFont, size: 8, color: GRAY });

    // ─── DATA PAGES ─────────────────────────────────────────────
    if (records.length > 0) {
      // Determine columns (exclude internal fields)
      const internalKeys = new Set(["_source_url", "_source_name", "_source_id", "_validation"]);
      const dataFields = fields.length > 0
        ? fields.filter((f) => !internalKeys.has(f))
        : Object.keys(records[0]).filter((k) => !internalKeys.has(k));
      const displayFields = dataFields.slice(0, 6); // max 6 columns per page

      const COL_W = Math.min(150, Math.floor(CONTENT_WIDTH / displayFields.length));
      const ROW_H = 28;
      const HEADER_H = 30;

      let recPage: ReturnType<typeof addPage>["page"];
      let ry: number;

      function startDataPage() {
        const p = addPage();
        recPage = p.page;
        ry = p.y;

        // Page header
        recPage.drawRectangle({ x: 0, y: PAGE_HEIGHT - 40, width: PAGE_WIDTH, height: 40, color: GREEN });
        recPage.drawText("FetchIT — Dataset", { x: MARGIN, y: PAGE_HEIGHT - 26, font: boldFont, size: 14, color: WHITE });
        ry = PAGE_HEIGHT - 55;

        // Section title
        recPage.drawText(`Collected Records (${records.length} total)`, { x: MARGIN, y: ry, font: boldFont, size: 11, color: DARK });
        ry -= 20;

        // Table header
        recPage.drawRectangle({ x: MARGIN, y: ry - HEADER_H + 8, width: CONTENT_WIDTH, height: HEADER_H, color: GREEN });
        displayFields.forEach((field, ci) => {
          const fx = MARGIN + ci * COL_W + 4;
          const label = field.replace(/_/g, " ").toUpperCase().slice(0, 18);
          recPage.drawText(label, { x: fx, y: ry - 10, font: boldFont, size: 7, color: WHITE });
        });
        ry -= HEADER_H + 2;
      }

      startDataPage();

      records.forEach((rec, ri) => {
        if (ry < 80) {
          // Footer
          recPage.drawLine({ start: { x: MARGIN, y: 40 }, end: { x: PAGE_WIDTH - MARGIN, y: 40 }, thickness: 0.5, color: MID_GRAY });
          recPage.drawText(`Page ${pdfDoc.getPageCount()} • FetchIT Report`, { x: MARGIN, y: 25, font: regularFont, size: 8, color: GRAY });
          startDataPage();
        }

        const rowColor = ri % 2 === 0 ? WHITE : LIGHT_GRAY;
        recPage.drawRectangle({ x: MARGIN, y: ry - ROW_H + 6, width: CONTENT_WIDTH, height: ROW_H, color: rowColor });

        displayFields.forEach((field, ci) => {
          const val = rec[field];
          const cellVal = val === null || val === undefined ? "—" : String(val).slice(0, 40);
          const fx = MARGIN + ci * COL_W + 4;
          recPage.drawText(cellVal, { x: fx, y: ry - 10, font: regularFont, size: 8, color: DARK });
        });

        // Source attribution (small)
        if (rec._source_name) {
          recPage.drawText(`↗ ${String(rec._source_name).slice(0, 60)}`, { x: MARGIN + 4, y: ry - 20, font: regularFont, size: 6, color: GRAY });
        }

        ry -= ROW_H;
      });

      // Last page footer
      recPage!.drawLine({ start: { x: MARGIN, y: 40 }, end: { x: PAGE_WIDTH - MARGIN, y: 40 }, thickness: 0.5, color: MID_GRAY });
      recPage!.drawText(`Page ${pdfDoc.getPageCount()} • FetchIT Report`, { x: MARGIN, y: 25, font: regularFont, size: 8, color: GRAY });
    }

    // Serialize
    const pdfBytes = await pdfDoc.save();

    const title = (collection?.title ?? "fetchit-report").replace(/[^a-z0-9]/gi, "-").toLowerCase();
    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${title}-${id.slice(0, 8)}.pdf"`,
        "Content-Length": String(pdfBytes.byteLength),
      },
    });
  } catch (error) {
    console.error("[PDF Export Error]", error);
    return NextResponse.json({ error: "Failed to generate PDF" }, { status: 500 });
  }
}

export const GET = POST;

