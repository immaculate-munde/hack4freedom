/**
 * Server-side M-Pesa PDF text extract for the Telegram bot path.
 * Password is caller-supplied for this call only — do not persist it.
 */

import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";

const require = createRequire(import.meta.url);

function pdfjsAssetUrls(): { workerSrc: string; wasmUrl: string } {
  const pdfjsRoot = dirname(require.resolve("pdfjs-dist/package.json"));
  return {
    workerSrc: pathToFileURL(
      join(pdfjsRoot, "legacy/build/pdf.worker.min.mjs"),
    ).href,
    // Trailing slash required by pdf.js BinaryDataFactory.
    wasmUrl: pathToFileURL(join(pdfjsRoot, "wasm")).href + "/",
  };
}

export async function extractTextFromMpesaPdfBytes(
  data: Uint8Array,
  password: string,
): Promise<string> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const { workerSrc, wasmUrl } = pdfjsAssetUrls();
  // pdf.js ships a default of "./pdf.worker.mjs" which is truthy but broken in
  // Node/Next API routes — always override it with a resolvable file URL.
  pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;

  const loadingTask = pdfjs.getDocument({
    data: data.slice(),
    password: password.trim(),
    useSystemFonts: true,
    wasmUrl,
  });

  let doc;
  try {
    doc = await loadingTask.promise;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (/password/i.test(message)) {
      throw new Error(
        "Could not open the PDF. Check the statement password and try again.",
      );
    }
    throw new Error("Could not read this PDF. Try pasting SMS messages instead.");
  }

  const parts: string[] = [];
  for (let page = 1; page <= doc.numPages; page += 1) {
    const pageDoc = await doc.getPage(page);
    const content = await pageDoc.getTextContent();
    parts.push(...pageItemsToLines(content.items));
  }

  const text = parts.join("\n").trim();
  if (!text) {
    throw new Error("This PDF has no readable text. Try the SMS paste option instead.");
  }
  return text;
}

type PdfTextItem = {
  str: string;
  transform: number[];
  hasEOL?: boolean;
};

function pageItemsToLines(items: unknown[]): string[] {
  const positioned: { y: number; x: number; str: string }[] = [];
  for (const item of items) {
    if (typeof item !== "object" || item === null || !("str" in item)) continue;
    const row = item as PdfTextItem;
    const text = row.str?.trim();
    if (!text) continue;
    const transform = row.transform;
    if (!Array.isArray(transform) || transform.length < 6) continue;
    positioned.push({
      y: Number(transform[5] ?? 0),
      x: Number(transform[4] ?? 0),
      str: text,
    });
  }

  positioned.sort((a, b) => b.y - a.y || a.x - b.x);

  const lines: string[] = [];
  let bucketY: number | null = null;
  let bucket: string[] = [];
  const yTolerance = 3;

  for (const piece of positioned) {
    if (bucketY === null || Math.abs(piece.y - bucketY) > yTolerance) {
      if (bucket.length > 0) {
        lines.push(bucket.join(" ").replace(/\s+/g, " ").trim());
      }
      bucket = [piece.str];
      bucketY = piece.y;
      continue;
    }
    bucket.push(piece.str);
  }
  if (bucket.length > 0) {
    lines.push(bucket.join(" ").replace(/\s+/g, " ").trim());
  }

  return lines;
}
