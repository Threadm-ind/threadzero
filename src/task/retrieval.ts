import { normalizeCallPath } from "../retrieval/calls";
import { JCodeMunchClient } from "../retrieval/client";
import { normalizeConfigMatches } from "../retrieval/config";
import { normalizeModuleSummary } from "../retrieval/modules";
import { normalizeSymbolResults } from "../retrieval/symbols";
import { RetrievalBundle } from "../retrieval/types";
import { RetrievalRepository } from "../storage/retrieval";
import { TaskRepository } from "../storage/tasks";
import { nowIso } from "../util";

export class TaskRetrievalService {
  constructor(
    private readonly tasks: TaskRepository,
    private readonly retrievals: RetrievalRepository,
  ) {}

  run(taskId: string, repo: string, query: string): RetrievalBundle {
    const task = this.tasks.getById(taskId);
    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }

    const client = new JCodeMunchClient(repo);
    const symbols = normalizeSymbolResults(client.searchSymbols(query, 8));
    const modules = symbols
      .slice(0, 3)
      .map((symbol) => client.summarizeModule(symbol.file, 6))
      .map((raw) => normalizeModuleSummary(raw));
    const calls = normalizeCallPath(client.traceCallPath(query));
    const configs = normalizeConfigMatches(client.locateConfig(query, 8));

    const bundle: RetrievalBundle = {
      taskId,
      repo,
      query,
      symbols,
      modules,
      calls,
      configs,
      createdAt: nowIso(),
    };

    this.retrievals.create(bundle);
    return bundle;
  }

  latest(taskId: string): RetrievalBundle | null {
    const task = this.tasks.getById(taskId);
    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }

    const row = this.retrievals.getLatestByTaskId(taskId);
    return row ? (JSON.parse(row.bundle_json) as RetrievalBundle) : null;
  }
}
