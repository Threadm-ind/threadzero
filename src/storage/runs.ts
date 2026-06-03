import { DatabaseSync } from "node:sqlite";
import { createId, nowIso } from "../util";

export interface ExecutionRunRow {
  id: string;
  task_id: string;
  executor: string;
  prompt_text: string;
  stdout_text: string;
  stderr_text: string;
  exit_code: number;
  status: string;
  created_at: string;
}

export class ExecutionRunRepository {
  constructor(private readonly db: DatabaseSync) {}

  create(input: {
    taskId: string;
    executor: string;
    promptText: string;
    stdoutText: string;
    stderrText: string;
    exitCode: number;
    status: string;
  }): ExecutionRunRow {
    const row: ExecutionRunRow = {
      id: createId("run"),
      task_id: input.taskId,
      executor: input.executor,
      prompt_text: input.promptText,
      stdout_text: input.stdoutText,
      stderr_text: input.stderrText,
      exit_code: input.exitCode,
      status: input.status,
      created_at: nowIso(),
    };

    this.db.prepare(`
      INSERT INTO execution_runs (
        id, task_id, executor, prompt_text, stdout_text,
        stderr_text, exit_code, status, created_at
      ) VALUES (
        @id, @task_id, @executor, @prompt_text, @stdout_text,
        @stderr_text, @exit_code, @status, @created_at
      )
    `).run(row as never);

    this.db.prepare(`
      UPDATE tasks
      SET updated_at = ?
      WHERE id = ?
    `).run(row.created_at, input.taskId);

    return row;
  }

  getLatestByTaskId(taskId: string): ExecutionRunRow | null {
    const row = this.db.prepare(`
      SELECT * FROM execution_runs
      WHERE task_id = ?
      ORDER BY created_at DESC
      LIMIT 1
    `).get(taskId) as unknown as ExecutionRunRow | undefined;

    return row ?? null;
  }

  listRecent(limit = 10): ExecutionRunRow[] {
    return this.db.prepare(`
      SELECT * FROM execution_runs
      ORDER BY created_at DESC
      LIMIT ?
    `).all(limit) as unknown as ExecutionRunRow[];
  }
}
