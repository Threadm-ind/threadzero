import { SymbolMatch } from "./types";

export function normalizeSymbolResults(raw: any): SymbolMatch[] {
  const results = Array.isArray(raw?.results) ? raw.results : [];
  return results.map((item: any) => ({
    id: String(item.id || ""),
    name: String(item.name || ""),
    kind: String(item.kind || ""),
    file: String(item.file || ""),
    line: item.line ? Number(item.line) : undefined,
    signature: item.signature ? String(item.signature) : undefined,
    summary: item.summary ? String(item.summary) : undefined,
  }));
}
