import { z } from "zod";

export const jsonApiMediaType = "application/vnd.api+json";

export type RawErrorDisclosure = {
  readonly status: number;
  readonly body: string;
};

const errorCodeSchema = z.object({
  errors: z.array(z.object({ code: z.string() }).passthrough()).min(1),
});

export class ApiHttpError extends Error {
  readonly kind = "http";
  readonly disclosure: RawErrorDisclosure;
  readonly code: string | null;
  readonly retryAfterSeconds: number | null;

  constructor(
    disclosure: RawErrorDisclosure,
    retryAfter: string | null = null,
  ) {
    super(`MIA API request failed with HTTP status ${disclosure.status}.`);
    this.name = "ApiHttpError";
    this.disclosure = disclosure;
    this.retryAfterSeconds = parseRetryAfter(retryAfter);

    let parsedBody: unknown;
    try {
      parsedBody = JSON.parse(disclosure.body);
    } catch {
      parsedBody = null;
    }
    const parsedError = errorCodeSchema.safeParse(parsedBody);
    this.code = parsedError.success
      ? (parsedError.data.errors[0]?.code ?? null)
      : null;
  }
}

function parseRetryAfter(value: string | null): number | null {
  if (value === null) return null;
  if (/^\d+$/u.test(value)) {
    const seconds = Number(value);
    return Number.isSafeInteger(seconds) ? seconds : null;
  }
  if (
    !/^[A-Z][a-z]{2}, \d{2} [A-Z][a-z]{2} \d{4} \d{2}:\d{2}:\d{2} GMT$/u.test(
      value,
    )
  )
    return null;
  const date = Date.parse(value);
  if (Number.isNaN(date)) return null;
  return Math.max(0, Math.ceil((date - Date.now()) / 1000));
}

export class ApiProtocolError extends Error {
  readonly kind = "protocol";

  constructor() {
    super("MIA API returned an unexpected response.");
    this.name = "ApiProtocolError";
  }
}

export class ApiTransportError extends Error {
  readonly kind = "transport";

  constructor(cause: unknown) {
    super("MIA API could not be reached.", { cause });
    this.name = "ApiTransportError";
  }
}

export type ApiFailure = ApiHttpError | ApiProtocolError | ApiTransportError;

type ReadJsonApiOptions<T> = {
  readonly path: string;
  readonly schema: z.ZodType<T>;
  readonly initiator: "background" | "user";
  readonly signal?: AbortSignal;
};

export async function readJsonApi<T>({
  path,
  schema,
  initiator,
  signal,
}: ReadJsonApiOptions<T>): Promise<T> {
  void initiator;
  return parseJsonApiResponse(await getJsonApi(path, signal), schema);
}

declare const strongETagBrand: unique symbol;
// The exact strong validator of one reviewed representation (`StrongETag`).
export type StrongETag = string & { readonly [strongETagBrand]: "StrongETag" };
const strongETagPattern = /^"[0-9a-f]{64}"$/u;

// A resource read whose state-dependent mutation needs the reviewed `ETag`.
// A missing or malformed validator is a protocol failure, never a guess.
export async function readJsonApiResource<T>({
  path,
  schema,
  initiator,
  signal,
}: ReadJsonApiOptions<T>): Promise<{
  readonly value: T;
  readonly etag: StrongETag;
}> {
  void initiator;
  const response = await getJsonApi(path, signal);
  const value = await parseJsonApiResponse(response, schema);
  const etag = response.headers.get("ETag");
  if (etag === null || !strongETagPattern.test(etag))
    throw new ApiProtocolError();
  return { value, etag: etag as StrongETag };
}

async function getJsonApi(
  path: string,
  signal: AbortSignal | undefined,
): Promise<Response> {
  try {
    return await fetch(path, {
      cache: "no-store",
      credentials: "same-origin",
      headers: { Accept: jsonApiMediaType },
      method: "GET",
      signal: signal ?? null,
    });
  } catch (error) {
    throw new ApiTransportError(error);
  }
}

// Any other success status than the operation's declared one is malformed.
export async function parseJsonApiResponse<T>(
  response: Response,
  schema: z.ZodType<T>,
  expectedStatus: 200 | 201 = 200,
): Promise<T> {
  const body = await response.text();
  if (!response.ok) {
    throw new ApiHttpError(
      { status: response.status, body },
      response.headers.get("Retry-After"),
    );
  }
  if (
    response.status !== expectedStatus ||
    response.headers.get("Content-Type") !== jsonApiMediaType
  ) {
    throw new ApiProtocolError();
  }

  let value: unknown;
  try {
    value = JSON.parse(body);
  } catch {
    throw new ApiProtocolError();
  }

  const result = schema.safeParse(value);
  if (!result.success) {
    throw new ApiProtocolError();
  }
  return result.data;
}

type UnsafeRequestOptions = {
  readonly method: "POST" | "DELETE";
  readonly path: string;
  readonly csrfToken: string;
  readonly signal?: AbortSignal;
  readonly body?: string;
  // The reviewed strong validator for a state-dependent mutation.
  readonly ifMatch?: StrongETag;
};

export async function sendUnsafeRequest({
  method,
  path,
  csrfToken,
  signal,
  body,
  ifMatch,
}: UnsafeRequestOptions): Promise<Response> {
  try {
    return await fetch(path, {
      cache: "no-store",
      credentials: "same-origin",
      headers: {
        Accept: jsonApiMediaType,
        "X-CSRF-Token": csrfToken,
        ...(body === undefined ? {} : { "Content-Type": jsonApiMediaType }),
        ...(ifMatch === undefined ? {} : { "If-Match": ifMatch }),
      },
      method,
      ...(signal === undefined ? {} : { signal }),
      ...(body === undefined ? {} : { body }),
    });
  } catch (error) {
    throw new ApiTransportError(error);
  }
}
