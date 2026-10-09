import {
  ApiProtocolError,
  ApiTransportError,
  jsonApiMediaType,
} from "../api/client";
import type { MaterialFile, MaterialId } from "../api/materials";
import type {
  AuthenticatedMutationResult,
  SessionController,
} from "../session/sessionController";

export type UploadProgress =
  | {
      readonly kind: "Uploading";
      readonly loaded: number;
      readonly total: number | null;
    }
  | { readonly kind: "Verifying" };
export type UploadAttempt = {
  readonly result: Promise<AuthenticatedMutationResult<MaterialFile>>;
  readonly stopWaiting: () => void;
};

// Session-bound raw-byte adapter; queue policy and handles belong to the route.
export class MaterialUpload {
  private readonly active = new Set<() => void>();
  private readonly routeTeardowns = new Set<() => void>();
  constructor(
    private readonly controller: SessionController,
    private readonly createXhr: () => XMLHttpRequest = () =>
      new XMLHttpRequest(),
  ) {}
  destroy(): void {
    for (const clear of this.routeTeardowns) clear();
    this.routeTeardowns.clear();
    for (const abort of this.active) abort();
    this.active.clear();
  }
  registerRouteTeardown(clear: () => void): () => void {
    this.routeTeardowns.add(clear);
    return () => {
      this.routeTeardowns.delete(clear);
    };
  }
  upload(
    id: MaterialId,
    file: File,
    isCurrent: () => boolean,
    progress: (value: UploadProgress) => void,
  ): UploadAttempt {
    let stopped = false;
    let source: File | null = file;
    let abort: (() => void) | null = null;
    let responseReceived = false;
    const dispose = () => {
      stopped = true;
      source = null;
      abort?.();
      this.active.delete(dispose);
    };
    const stop = () => {
      stopped = true;
      source = null;
      if (!responseReceived) abort?.();
    };
    this.active.add(dispose);
    const current = () => !stopped && isCurrent();
    const result = (async (): Promise<
      AuthenticatedMutationResult<MaterialFile>
    > => {
      let api: typeof import("../api/materials");
      try {
        api = await import("../api/materials");
      } catch (error) {
        return { kind: "not-sent", failure: new ApiTransportError(error) };
      }
      return this.controller.runAuthenticatedMutation(
        {
          send: (csrf) =>
            new Promise<MaterialFile>((resolve, reject) => {
              if (!current() || source === null) {
                reject(new ApiTransportError(null));
                return;
              }
              const xhr = this.createXhr();
              let settled = false;
              let bytesSent = false;
              const finish = (value: MaterialFile | Error) => {
                if (settled) return;
                settled = true;
                xhr.onload = xhr.onerror = xhr.ontimeout = xhr.onabort = null;
                xhr.upload.onprogress = xhr.upload.onload = null;
                this.active.delete(dispose);
                source = null;
                abort = null;
                if (value instanceof Error) reject(value);
                else resolve(value);
              };
              abort = () => {
                finish(new ApiTransportError(null));
                xhr.abort();
              };
              xhr.open("POST", api.materialFilesPath(id));
              xhr.responseType = "blob";
              xhr.timeout = 120000;
              xhr.setRequestHeader("Accept", jsonApiMediaType);
              xhr.setRequestHeader("X-CSRF-Token", csrf);
              xhr.upload.onprogress = (event) => {
                if (current() && !bytesSent)
                  progress({
                    kind: "Uploading",
                    loaded: event.loaded,
                    total: event.lengthComputable ? event.total : null,
                  });
              };
              xhr.upload.onload = () => {
                bytesSent = true;
                if (current()) progress({ kind: "Verifying" });
              };
              xhr.onerror =
                xhr.ontimeout =
                xhr.onabort =
                  () => finish(new ApiTransportError(null));
              xhr.onload = () => {
                responseReceived = true;
                void (async () => {
                  try {
                    const raw: unknown = xhr.response;
                    if (!(raw instanceof Blob) || xhr.status === 0)
                      throw new ApiProtocolError();
                    if (xhr.status >= 400) {
                      if (raw.size > 65536) throw new ApiProtocolError();
                      try {
                        new TextDecoder("utf-8", { fatal: true }).decode(
                          await raw.arrayBuffer(),
                        );
                      } catch {
                        throw new ApiProtocolError();
                      }
                    }
                    const response = new Response(raw, {
                      status: xhr.status,
                      headers: {
                        "Content-Type":
                          xhr.getResponseHeader("Content-Type") ?? "",
                        "Retry-After":
                          xhr.getResponseHeader("Retry-After") ?? "",
                      },
                    });
                    finish(await api.parseUploadedFile(response, id));
                  } catch (error) {
                    finish(
                      error instanceof Error ? error : new ApiProtocolError(),
                    );
                  }
                })();
              };
              const body = new FormData();
              body.append("file", source);
              source = null;
              try {
                progress({ kind: "Uploading", loaded: 0, total: null });
                xhr.send(body);
              } catch (error) {
                finish(new ApiTransportError(error));
              }
            }),
        },
        current,
      );
    })();
    void result.then(() => {
      source = null;
      this.active.delete(dispose);
    });
    return { result, stopWaiting: stop };
  }
}
