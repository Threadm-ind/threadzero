import { CallPathResult } from "./types";

export function normalizeCallPath(raw: any): CallPathResult {
  return {
    query: String(raw?.query || ""),
    callers: Array.isArray(raw?.callers)
      ? raw.callers.map((item: any) => ({
          id: String(item.id || ""),
          name: String(item.name || ""),
          file: String(item.file || ""),
          summary: item.summary ? String(item.summary) : undefined,
        }))
      : [],
    callees: Array.isArray(raw?.callees)
      ? raw.callees.map((item: any) => ({
          id: String(item.id || ""),
          name: String(item.name || ""),
          file: String(item.file || ""),
          summary: item.summary ? String(item.summary) : undefined,
        }))
      : [],
  };
}
