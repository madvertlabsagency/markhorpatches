export type ActionState = { ok: true; message?: string; redirect?: string; data?: Record<string, unknown> } | { ok: false; error: string; fieldErrors?: Record<string, string> } | null;
