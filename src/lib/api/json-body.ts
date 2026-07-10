export class JsonBodyError extends Error {
  constructor(
    message: string,
    readonly status: 400 | 413,
  ) {
    super(message);
    this.name = "JsonBodyError";
  }
}

function declaredLength(headers: Headers) {
  const value = headers.get("content-length");
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

export async function readJsonBody<T = Record<string, unknown>>(request: Request, maxBytes: number): Promise<T> {
  const declared = declaredLength(request.headers);
  if (declared !== null && declared > maxBytes) {
    throw new JsonBodyError("Request body is too large", 413);
  }

  if (!request.body) return {} as T;
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel("request_body_too_large").catch(() => undefined);
        throw new JsonBodyError("Request body is too large", 413);
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  if (total === 0) return {} as T;
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  try {
    return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)) as T;
  } catch (error) {
    if (error instanceof JsonBodyError) throw error;
    throw new JsonBodyError("Invalid JSON body", 400);
  }
}
