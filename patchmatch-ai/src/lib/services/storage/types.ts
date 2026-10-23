/** How the browser sends a file: a direct signed PUT, or a Vercel Blob client upload with a scoped token. */
export type UploadTarget =
  | { kind: "put"; url: string; method: "PUT"; headers: Record<string, string> }
  | { kind: "vercel-blob"; pathname: string; token: string; access: "public" | "private"; contentType: string };

export interface StorageAdapter {
  readonly name: string;
  /** Short-lived target the browser uploads the file to directly. */
  createUploadUrl(key: string, contentType: string, maxBytes: number): Promise<UploadTarget>;
  /** Short-lived private download URL. */
  getDownloadUrl(key: string, opts?: { filename?: string; inline?: boolean; expiresIn?: number }): Promise<string>;
  /** Size in bytes, or null when the object does not exist. */
  head(key: string): Promise<{ size: number } | null>;
  /** First N bytes — used for magic-byte validation. */
  readHead(key: string, bytes: number): Promise<Buffer>;
  /** Whole object — used server-side for preview generation. */
  read(key: string): Promise<Buffer>;
  put(key: string, body: Buffer, contentType: string): Promise<void>;
  delete(key: string): Promise<void>;
}
