import { DatabaseSync } from "node:sqlite";
import { Checkpoint, CheckpointInput } from "../types";
import { createId, nowIso } from "../util";

export class CheckpointRepository {
  constructor(private readonly db: DatabaseSync) {}

  create(input: CheckpointInput): Checkpoint {
    const row: Checkpoint = {
      id: createId("ckpt"),
      task_id: input.taskId,
      summary: input.summary,
      next_step: input.nextStep ?? "",
      files_touched_json: JSON.stringify(input.filesTouched ?? []),
      symbols_relevant_json: JSON.stringify(input.symbolsRelevant ?? []),
      decisions_json: JSON.stringify(input.decisions ?? []),
      open_questions_json: JSON.stringify(input.openQuestions ?? []),
      created_at: nowIso(),
    };

    this.db.prepare(`
      INSERT INTO checkpoints (
        id, task_id, summary, next_step,
        files_touched_json, symbols_relevant_json,
        decisions_json, open_questions_json, created_at
      ) VALUES (
        @id, @task_id, @summary, @next_step,
        @files_touched_json, @symbols_relevant_json,
        @decisions_json, @open_questions_json, @created_at
      )
    `).run(row as never);

    return row;
  }

  listByTaskId(taskId: string): Checkpoint[] {
    return this.db.prepare(`
      SELECT * FROM checkpoints
      WHERE task_id = ?
      ORDER BY created_at DESC
    `).all(taskId) as unknown as Checkpoint[];
  }
}
