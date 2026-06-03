import { DatabaseSync } from "node:sqlite";
import { RetrievalBundle } from "../retrieval/types";
import { createId, nowIso } from "../util";

export interface StoredRetrievalBundle {
  id: string;
  task_id: string;
  repo: string;
  query: string;
  bundle_json: string;
  created_at: string;
}

export class RetrievalRepository {
  constructor(private readonly db: DatabaseSync) {}

  create(bundle: RetrievalBundle): StoredRetrievalBundle {
    const row: StoredRetrievalBundle = {
      id: createId("ret"),
      task_id: bundle.taskId,
      repo: bundle.repo,
      query: bundle.query,
      bundle_json: JSON.stringify(bundle),
      created_at: nowIso(),
    };

    this.db.prepare(`
      INSERT INTO retrieval_bundles (
        id, task_id, repo, query, bundle_json, created_at
      ) VALUES (
        @id, @task_id, @repo, @query, @bundle_json, @created_at
      )
    `).run(row as never);

    return row;
  }

  getLatestByTaskId(taskId: string): StoredRetrievalBundle | null {
    const row = this.db.prepare(`
      SELECT * FROM retrieval_bundles
      WHERE task_id = ?
      ORDER BY created_at DESC
      LIMIT 1
    `).get(taskId) as unknown as StoredRetrievalBundle | undefined;

    return row ?? null;
  }
}
