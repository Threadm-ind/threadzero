export interface SymbolMatch {
  id: string;
  name: string;
  kind: string;
  file: string;
  line?: number;
  signature?: string;
  summary?: string;
}

export interface ModuleSummary {
  file: string;
  summary: string;
  topSymbols: Array<{
    id: string;
    name: string;
    kind: string;
    line?: number;
    summary?: string;
  }>;
}

export interface CallPathResult {
  query: string;
  callers: Array<{
    id: string;
    name: string;
    file: string;
    summary?: string;
  }>;
  callees: Array<{
    id: string;
    name: string;
    file: string;
    summary?: string;
  }>;
}

export interface ConfigMatch {
  file: string;
  line?: number;
  text: string;
}

export interface RetrievalBundle {
  taskId: string;
  repo: string;
  query: string;
  symbols: SymbolMatch[];
  modules: ModuleSummary[];
  calls: CallPathResult | null;
  configs: ConfigMatch[];
  createdAt: string;
}
