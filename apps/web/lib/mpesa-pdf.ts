/**
 * Decrypt and extract text from an M-Pesa statement PDF in the browser.
 * The password is never sent to PesaSense servers.
 */

export async function extractTextFromMpesaPdf(
  file: File,
  password: string,
): Promise<string> {
  const pdfjs = await import("pdfjs-dist");
  if (!pdfjs.GlobalWorkerOptions.workerSrc) {
    pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
  }

  const data = new Uint8Array(await file.arrayBuffer());
  const loadingTask = pdfjs.getDocument({
    data,
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
    throw new Error("Could not read this PDF. Try exporting a fresh M-Pesa statement.");
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

/** Rebuild table rows from positioned PDF glyphs (Safaricom statements are columnar). */
function pageItemsToLines(items: unknown[]): string[] {
  const positioned: { y: number; x: number; str: string }[] = [];
  for (const item of items) {
    if (typeof item !== "object" || item === null || !("str" in item)) continue;
    const row = item as PdfTextItem;
    const text = row.str?.trim();
    if (!text) continue;
    const transform = row.transform;
    if (!Array.isArray(transform) || transform.length < 6) continue;
    positioned.push({ y: transform[5], x: transform[4], str: text });
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
