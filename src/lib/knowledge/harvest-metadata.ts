export const OFFICIAL_SOURCE_EXTRACTION_METHODS = [
  "html",
  "plain_text",
  "pdf_text",
  "binary_metadata",
] as const;

export type OfficialSourceExtractionMethod = typeof OFFICIAL_SOURCE_EXTRACTION_METHODS[number];

export interface OfficialSourceExtractionMetadata {
  extractionMethod: OfficialSourceExtractionMethod | "unknown";
  contentType?: string;
  byteSha256?: string;
  byteLength?: number;
  extractedChars?: number;
  extractionError?: string;
}

function parsePositiveInt(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
}

export function emptyOfficialSourceExtractionStats(): Record<OfficialSourceExtractionMethod, number> {
  return {
    html: 0,
    plain_text: 0,
    pdf_text: 0,
    binary_metadata: 0,
  };
}

export function parseOfficialSourceExtractionMetadata(content: string): OfficialSourceExtractionMetadata {
  const fields = new Map<string, string>();
  for (const line of content.split(/\r?\n/).slice(0, 80)) {
    const match = /^([a-z_]+):\s*(.*)$/.exec(line.trim());
    if (match) fields.set(match[1], match[2]);
  }

  const method = fields.get("extraction_method");
  const extractionMethod = OFFICIAL_SOURCE_EXTRACTION_METHODS.includes(method as OfficialSourceExtractionMethod)
    ? method as OfficialSourceExtractionMethod
    : "unknown";

  return {
    extractionMethod,
    contentType: fields.get("content_type"),
    byteSha256: fields.get("byte_sha256"),
    byteLength: parsePositiveInt(fields.get("byte_length")),
    extractedChars: parsePositiveInt(fields.get("extracted_chars")),
    extractionError: fields.get("extraction_error"),
  };
}
