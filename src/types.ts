export type TaskStatus = "open" | "in_progress" | "blocked" | "done";
export type ExecutorName = "claude-code" | "codex";
export type BenchmarkVariant = "baseline" | "threadzero";
export type EffortLevel = "low" | "medium" | "high" | "xhigh";
export type RouteCategory =
  | "docs"
  | "simple_edit"
  | "verification"
  | "planning"
  | "debugging"
  | "feature"
  | "refactor"
  | "unknown";

export interface ThreadzeroConfig {
  project_name: string;
  primary_executor: ExecutorName;
  secondary_executor: ExecutorName;
  storage: {
    type: "sqlite";
    path: string;
  };
  retrieval: {
    provider: "retrieval-mcp";
    enabled: boolean;
  };
  context: {
    default_budget_tokens: number;
    checkpoint_summary_budget_tokens: number;
  };
  benchmarks: {
    enabled: boolean;
  };
  workflow: {
    enabled: boolean;
    default_repo: string;
    derive_goal_from_gsd_state: boolean;
    auto_checkpoint: boolean;
    auto_benchmark: boolean;
    fallback_to_secondary: boolean;
    auto_index_repo: boolean;
  };
  routing: {
    enabled: boolean;
    default_effort: EffortLevel;
    enable_history_bias: boolean;
    rules: {
      docs: { executor: ExecutorName; effort: EffortLevel };
      simple_edit: { executor: ExecutorName; effort: EffortLevel };
      verification: { executor: ExecutorName; effort: EffortLevel };
      planning: { executor: ExecutorName; effort: EffortLevel };
      debugging: { executor: ExecutorName; effort: EffortLevel };
      feature: { executor: ExecutorName; effort: EffortLevel };
      refactor: { executor: ExecutorName; effort: EffortLevel };
      unknown: { executor: ExecutorName; effort: EffortLevel };
    };
  };
}

export interface Task {
  id: string;
  goal: string;
  status: TaskStatus;
  executor: ExecutorName;
  current_step: string;
  constraints_json: string;
  files_touched_json: string;
  metadata_json: string;
  created_at: string;
  updated_at: string;
}

export interface TaskInput {
  goal: string;
  executor?: ExecutorName;
  currentStep?: string;
  constraints?: string[];
  filesTouched?: string[];
  metadata?: Record<string, unknown>;
}

export interface Checkpoint {
  id: string;
  task_id: string;
  summary: string;
  next_step: string;
  files_touched_json: string;
  symbols_relevant_json: string;
  decisions_json: string;
  open_questions_json: string;
  created_at: string;
}

export interface CheckpointInput {
  taskId: string;
  summary: string;
  nextStep?: string;
  filesTouched?: string[];
  symbolsRelevant?: string[];
  decisions?: string[];
  openQuestions?: string[];
}

export interface BenchmarkCase {
  id: string;
  name: string;
  goal: string;
  repo: string;
  query: string;
  notes_json: string;
  created_at: string;
  updated_at: string;
}

export interface BenchmarkCaseInput {
  name: string;
  goal: string;
  repo?: string;
  query?: string;
  notes?: string[];
}

export interface BenchmarkRun {
  id: string;
  benchmark_case_id: string;
  variant: BenchmarkVariant;
  task_id: string | null;
  execution_run_id: string | null;
  prompt_text: string;
  prompt_tokens: number;
  output_text: string;
  output_tokens: number;
  total_tokens: number;
  quality_rating: number | null;
  quality_note: string;
  notes_json: string;
  created_at: string;
}

export interface RouteDecision {
  id: string;
  task_id: string;
  category: RouteCategory;
  executor: ExecutorName;
  effort: EffortLevel;
  confidence: number;
  reasons_json: string;
  signals_json: string;
  overrides_json: string;
  created_at: string;
}
