import { DatabaseSync } from "node:sqlite";
import {
  BenchmarkCase,
  BenchmarkCaseInput,
  BenchmarkRun,
  BenchmarkVariant,
} from "../types";
import { createId, nowIso } from "../util";

export class BenchmarkRepository {
  constructor(private readonly db: DatabaseSync) {}

  createCase(input: BenchmarkCaseInput): BenchmarkCase {
    const now = nowIso();
    const row: BenchmarkCase = {
      id: createId("bmcase"),
      name: input.name,
      goal: input.goal,
      repo: input.repo ?? "",
      query: input.query ?? "",
      notes_json: JSON.stringify(input.notes ?? []),
      created_at: now,
      updated_at: now,
    };

    this.db.prepare(`
      INSERT INTO benchmark_cases (
        id, name, goal, repo, query, notes_json, created_at, updated_at
      ) VALUES (
        @id, @name, @goal, @repo, @query, @notes_json, @created_at, @updated_at
      )
    `).run(row as never);

    return row;
  }

  listCases(): BenchmarkCase[] {
    return this.db.prepare(`
      SELECT * FROM benchmark_cases
      ORDER BY updated_at DESC, created_at DESC
    `).all() as unknown as BenchmarkCase[];
  }

  getCaseById(id: string): BenchmarkCase | null {
    const row = this.db.prepare(`
      SELECT * FROM benchmark_cases
      WHERE id = ?
    `).get(id) as unknown as BenchmarkCase | undefined;

    return row ?? null;
  }

  findCaseByGoal(goal: string, repo: string, query: string): BenchmarkCase | null {
    const row = this.db.prepare(`
      SELECT * FROM benchmark_cases
      WHERE goal = ? AND repo = ? AND query = ?
      ORDER BY updated_at DESC
      LIMIT 1
    `).get(goal, repo, query) as unknown as BenchmarkCase | undefined;

    return row ?? null;
  }

  createRun(input: {
    benchmarkCaseId: string;
    variant: BenchmarkVariant;
    taskId?: string | null;
    executionRunId?: string | null;
    promptText: string;
    promptTokens: number;
    outputText: string;
    outputTokens: number;
    totalTokens: number;
    qualityRating?: number | null;
    qualityNote?: string;
    notes?: string[];
  }): BenchmarkRun {
    const row: BenchmarkRun = {
      id: createId("bmrun"),
      benchmark_case_id: input.benchmarkCaseId,
      variant: input.variant,
      task_id: input.taskId ?? null,
      execution_run_id: input.executionRunId ?? null,
      prompt_text: input.promptText,
      prompt_tokens: input.promptTokens,
      output_text: input.outputText,
      output_tokens: input.outputTokens,
      total_tokens: input.totalTokens,
      quality_rating: input.qualityRating ?? null,
      quality_note: input.qualityNote ?? "",
      notes_json: JSON.stringify(input.notes ?? []),
      created_at: nowIso(),
    };

    this.db.prepare(`
      INSERT INTO benchmark_runs (
        id, benchmark_case_id, variant, task_id, execution_run_id,
        prompt_text, prompt_tokens, output_text, output_tokens,
        total_tokens, quality_rating, quality_note, notes_json, created_at
      ) VALUES (
        @id, @benchmark_case_id, @variant, @task_id, @execution_run_id,
        @prompt_text, @prompt_tokens, @output_text, @output_tokens,
        @total_tokens, @quality_rating, @quality_note, @notes_json, @created_at
      )
    `).run(row as never);

    this.db.prepare(`
      UPDATE benchmark_cases
      SET updated_at = ?
      WHERE id = ?
    `).run(row.created_at, input.benchmarkCaseId);

    return row;
  }

  listRunsByCaseId(caseId: string): BenchmarkRun[] {
    return this.db.prepare(`
      SELECT * FROM benchmark_runs
      WHERE benchmark_case_id = ?
      ORDER BY created_at DESC
    `).all(caseId) as unknown as BenchmarkRun[];
  }

  getLatestRunByCaseIdAndVariant(
    caseId: string,
    variant: BenchmarkVariant,
  ): BenchmarkRun | null {
    const row = this.db.prepare(`
      SELECT * FROM benchmark_runs
      WHERE benchmark_case_id = ? AND variant = ?
      ORDER BY created_at DESC
      LIMIT 1
    `).get(caseId, variant) as unknown as BenchmarkRun | undefined;

    return row ?? null;
  }
}
