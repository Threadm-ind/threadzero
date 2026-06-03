import { ModuleSummary } from "./types";

export function normalizeModuleSummary(raw: any): ModuleSummary {
  return {
    file: String(raw?.file || ""),
    summary: String(raw?.file_summary || raw?.summary || ""),
    topSymbols: Array.isArray(raw?.symbols)
      ? raw.symbols.map((symbol: any) => ({
          id: String(symbol.id || ""),
          name: String(symbol.name || ""),
          kind: String(symbol.kind || ""),
          line: symbol.line ? Number(symbol.line) : undefined,
          summary: symbol.summary ? String(symbol.summary) : undefined,
        }))
      : [],
  };
}
