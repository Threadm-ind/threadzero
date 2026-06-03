import { DatabaseSync } from "node:sqlite";
import { RouteDecision } from "../types";
import { createId, nowIso } from "../util";

export class RouteDecisionRepository {
  constructor(private readonly db: DatabaseSync) {}

  create(input: {
    taskId: string;
    category: string;
    executor: string;
    effort: string;
    confidence: number;
    reasons: string[];
    signals: Record<string, unknown>;
    overrides: Record<string, unknown>;
  }): RouteDecision {
    const row: RouteDecision = {
      id: createId("route"),
      task_id: input.taskId,
      category: input.category as RouteDecision["category"],
      executor: input.executor as RouteDecision["executor"],
      effort: input.effort as RouteDecision["effort"],
      confidence: input.confidence,
      reasons_json: JSON.stringify(input.reasons),
      signals_json: JSON.stringify(input.signals),
      overrides_json: JSON.stringify(input.overrides),
      created_at: nowIso(),
    };

    this.db.prepare(`
      INSERT INTO route_decisions (
        id, task_id, category, executor, effort, confidence,
        reasons_json, signals_json, overrides_json, created_at
      ) VALUES (
        @id, @task_id, @category, @executor, @effort, @confidence,
        @reasons_json, @signals_json, @overrides_json, @created_at
      )
    `).run(row as never);

    return row;
  }

  listByTaskId(taskId: string): RouteDecision[] {
    return this.db.prepare(`
      SELECT * FROM route_decisions
      WHERE task_id = ?
      ORDER BY created_at DESC
    `).all(taskId) as unknown as RouteDecision[];
  }
}
