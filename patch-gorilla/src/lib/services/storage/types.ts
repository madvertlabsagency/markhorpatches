export interface UploadTarget {
  url: string;
  method: "PUT";
  headers: Record<string, string>;
}

export interface StorageAdapter {
  readonly name: string;
  /** Short-lived URL the browser PUTs the file to directly. */
  createUploadUrl(key: string, contentType: string, maxBytes: number): Promise<UploadTarget>;
  /** Short-lived private download URL. */
  getDownloadUrl(key: string, opts?: { filename?: string; inline?: boolean; expiresIn?: number }): Promise<string>;
  /** Size in bytes, or null when the object does not exist. */
  head(key: string): Promise<{ size: number } | null>;
  /** First N bytes — used for magic-byte validation. */
  readHead(key: string, bytes: number): Promise<Buffer>;
  put(key: string, body: Buffer, contentType: string): Promise<void>;
  delete(key: string): Promise<void>;
}
