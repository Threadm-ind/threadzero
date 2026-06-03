import fs from "node:fs";
import path from "node:path";
import { ThreadzeroConfig } from "./types";

const DEFAULT_CONFIG: ThreadzeroConfig = {
  project_name: "threadzero",
  primary_executor: "claude-code",
  secondary_executor: "codex",
  storage: {
    type: "sqlite",
    path: ".threadzero/threadzero.db",
  },
  retrieval: {
    provider: "jcodemunch-mcp",
    enabled: false,
  },
  context: {
    default_budget_tokens: 12000,
    checkpoint_summary_budget_tokens: 1200,
  },
  benchmarks: {
    enabled: false,
  },
  workflow: {
    enabled: true,
    default_repo: "",
    derive_goal_from_gsd_state: true,
    auto_checkpoint: true,
    auto_benchmark: true,
    fallback_to_secondary: true,
    auto_index_repo: true,
  },
  routing: {
    enabled: true,
    default_effort: "medium",
    enable_history_bias: true,
    rules: {
      docs: { executor: "codex", effort: "low" },
      simple_edit: { executor: "codex", effort: "medium" },
      verification: { executor: "codex", effort: "medium" },
      planning: { executor: "claude-code", effort: "high" },
      debugging: { executor: "claude-code", effort: "high" },
      feature: { executor: "claude-code", effort: "high" },
      refactor: { executor: "codex", effort: "xhigh" },
      unknown: { executor: "claude-code", effort: "medium" },
    },
  },
};

export function loadConfig(cwd = process.cwd()): ThreadzeroConfig {
  const configPath = path.join(cwd, "threadzero.config.json");
  if (!fs.existsSync(configPath)) return DEFAULT_CONFIG;

  const raw = JSON.parse(fs.readFileSync(configPath, "utf8"));

  return {
    ...DEFAULT_CONFIG,
    ...raw,
    storage: {
      ...DEFAULT_CONFIG.storage,
      ...(raw.storage ?? {}),
    },
    retrieval: {
      ...DEFAULT_CONFIG.retrieval,
      ...(raw.retrieval ?? {}),
    },
    context: {
      ...DEFAULT_CONFIG.context,
      ...(raw.context ?? {}),
    },
    benchmarks: {
      ...DEFAULT_CONFIG.benchmarks,
      ...(raw.benchmarks ?? {}),
    },
    workflow: {
      ...DEFAULT_CONFIG.workflow,
      ...(raw.workflow ?? {}),
    },
    routing: {
      ...DEFAULT_CONFIG.routing,
      ...(raw.routing ?? {}),
      rules: {
        ...DEFAULT_CONFIG.routing.rules,
        ...(raw.routing?.rules ?? {}),
      },
    },
  };
}
