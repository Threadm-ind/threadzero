import { DatabaseSync } from "node:sqlite";
import { Task, TaskInput, TaskStatus } from "../types";
import { createId, nowIso } from "../util";

export class TaskRepository {
  constructor(private readonly db: DatabaseSync) {}

  create(input: TaskInput): Task {
    const now = nowIso();

    const row: Task = {
      id: createId("task"),
      goal: input.goal,
      status: "open",
      executor: input.executor ?? "claude-code",
      current_step: input.currentStep ?? "",
      constraints_json: JSON.stringify(input.constraints ?? []),
      files_touched_json: JSON.stringify(input.filesTouched ?? []),
      metadata_json: JSON.stringify(input.metadata ?? {}),
      created_at: now,
      updated_at: now,
    };

    this.db.prepare(`
      INSERT INTO tasks (
        id, goal, status, executor, current_step,
        constraints_json, files_touched_json, metadata_json,
        created_at, updated_at
      ) VALUES (
        @id, @goal, @status, @executor, @current_step,
        @constraints_json, @files_touched_json, @metadata_json,
        @created_at, @updated_at
      )
    `).run(row as never);

    return row;
  }

  list(): Task[] {
    return this.db.prepare(`
      SELECT * FROM tasks
      ORDER BY updated_at DESC
    `).all() as unknown as Task[];
  }

  getById(id: string): Task | null {
    const row = this.db.prepare(`
      SELECT * FROM tasks
      WHERE id = ?
    `).get(id) as unknown as Task | undefined;

    return row ?? null;
  }

  updateStatus(id: string, status: TaskStatus): void {
    this.db.prepare(`
      UPDATE tasks
      SET status = ?, updated_at = ?
      WHERE id = ?
    `).run(status, nowIso(), id);
  }

  updateExecutor(id: string, executor: string): void {
    this.db.prepare(`
      UPDATE tasks
      SET executor = ?, updated_at = ?
      WHERE id = ?
    `).run(executor, nowIso(), id);
  }
}
