/**
 * Server-side M-Pesa PDF text extract for the Telegram bot path.
 * Password is caller-supplied for this call only — do not persist it.
 */

export async function extractTextFromMpesaPdfBytes(
  data: Uint8Array,
  password: string,
): Promise<string> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  // Node API route: run without a separate worker thread.
  if (!pdfjs.GlobalWorkerOptions.workerSrc) {
    pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/legacy/build/pdf.worker.min.mjs`;
  }
  const loadingTask = pdfjs.getDocument({
    data: data.slice(),
    password: password.trim(),
    useSystemFonts: true,
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
