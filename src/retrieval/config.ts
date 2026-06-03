import { ConfigMatch } from "./types";

export function normalizeConfigMatches(raw: any): ConfigMatch[] {
  const results = Array.isArray(raw?.results) ? raw.results : [];
  return results.map((item: any) => ({
    file: String(item.file || ""),
    line: item.line ? Number(item.line) : undefined,
    text: String(item.text || ""),
  }));
}
